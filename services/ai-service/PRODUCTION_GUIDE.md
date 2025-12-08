# AI Service - Production Deployment Guide

## Quick Start (One-Time Setup)

```bash
# 1. Start all services
docker-compose up -d

# 2. Wait ~30 seconds for services to initialize

# 3. Load USA deals data (RUN ONCE)
docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --clear-db

# 4. Verify
docker exec kayak-ai-service python -c "
from sqlalchemy import create_engine, text
engine = create_engine('mysql+pymysql://root:rootpassword@mysql:3306/kayak_db')
with engine.connect() as conn:
    flights = conn.execute(text('SELECT COUNT(*) FROM flight_deals')).scalar()
    hotels = conn.execute(text('SELECT COUNT(*) FROM hotel_deals')).scalar()
    print(f'✅ Data loaded: {flights:,} flights + {hotels:,} hotels')
"
```

**That's it!** The service is ready with 50,000 flights + 9,706 hotels.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI SERVICE                               │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   FastAPI    │    │   Ollama     │    │    Kafka     │    │
│  │   (8007)     │───▶│  LLM Agent   │───▶│   Events     │    │
│  └──────────────┘    └──────────────┘    └──────────────┘    │
│         │                                         │            │
│         ▼                                         ▼            │
│  ┌──────────────┐                        ┌──────────────┐    │
│  │    MySQL     │                        │  Inventory   │    │
│  │ flight_deals │                        │   Service    │    │
│  │ hotel_deals  │                        │              │    │
│  └──────────────┘                        └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Pipeline (Run Once)

### What It Does
The `setup_usa_deals_pipeline.py` script:

1. **Merges** USA datasets
   - `flights.csv` (50K US domestic flights)
   - `listings.csv` + `listings_2.csv` + `hotel_booking.csv` (NYC hotels)

2. **Enriches** with deal detection
   - Dynamic price simulation (±10% fluctuation)
   - Promo detection (15% of flights get 10-25% off)
   - Red-eye discounts (-15%)
   - Hotel avg_30d_price calculation
   - Amenity tags (pet-friendly, near transit, breakfast)

3. **Loads** to database
   - Maps to SQLModel schema
   - Adds timestamps (created_at, updated_at)
   - Calculates deal_score (0-100)

4. **Verifies** data integrity
   - Confirms counts match expectations
   - Checks for missing data

### When to Run

✅ **YES - Run in these scenarios:**
- Initial deployment (first time setup)
- Data refresh (weekly/monthly to update deals)
- After updating raw CSV files
- After database schema changes

❌ **NO - Don't run for:**
- Service restarts (data persists in MySQL)
- Container restarts
- Code deployments (unless schema changed)

### Production Schedule

**Option 1: Static Dataset (Recommended)**
```bash
# Run ONCE during deployment
docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --clear-db
```

**Option 2: Dynamic Deals (Optional)**
```bash
# Set up cron job to refresh daily at 2 AM
0 2 * * * docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --clear-db
```

---

## Data Persistence

### MySQL Volume
Data persists in Docker volume `kayak_mysql_data`:
```yaml
volumes:
  - kayak_mysql_data:/var/lib/mysql
```

**This means:**
- ✅ Data survives container restarts
- ✅ Data survives `docker-compose down` (unless you use `-v` flag)
- ❌ Data is LOST if you delete the volume

### Backup Strategy
```bash
# Backup database
docker exec kayak-mysql mysqldump -u root -prootpassword kayak_db > backup.sql

# Restore database
docker exec -i kayak-mysql mysql -u root -prootpassword kayak_db < backup.sql
```

---

## Environment Variables

Key variables in `docker-compose.yml`:

```yaml
# Database
DB_HOST: mysql
DB_PORT: 3306
DB_NAME: kayak_db
DB_USER: root
DB_PASSWORD: rootpassword

# Kafka
KAFKA_BROKER: kafka:9092
KAFKA_TOPIC_DEALS: travel_deals_events

# Ollama LLM
OLLAMA_URL: http://ollama:11434
OLLAMA_MODEL: llama3.2:3b

# Service
PORT: 8007
```

---

## Monitoring & Health Checks

### Service Health
```bash
# Check service status
curl http://localhost:8007/health

# Check data counts
docker exec kayak-ai-service python -c "
from sqlalchemy import create_engine, text
engine = create_engine('mysql+pymysql://root:rootpassword@mysql:3306/kayak_db')
with engine.connect() as conn:
    flights = conn.execute(text('SELECT COUNT(*) FROM flight_deals')).scalar()
    hotels = conn.execute(text('SELECT COUNT(*) FROM hotel_deals')).scalar()
    print(f'Flights: {flights:,} | Hotels: {hotels:,}')
"
```

### Logs
```bash
# View service logs
docker logs -f kayak-ai-service

# View pipeline execution
docker logs kayak-ai-service 2>&1 | grep "PIPELINE"
```

---

## Troubleshooting

### Pipeline Fails
```bash
# Check if MySQL is ready
docker exec kayak-mysql mysqladmin ping -u root -prootpassword

# Check if raw data exists
docker exec kayak-ai-service ls -lh /app/data/raw/

# Run pipeline with debug
docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --clear-db 2>&1 | tee pipeline.log
```

### Missing Data
```bash
# Verify processed files exist
docker exec kayak-ai-service ls -lh /app/data/processed/

# If missing, you need to run preprocessing first
# (This should be done in your data preparation step)
```

### Database Connection Issues
```bash
# Test connection
docker exec kayak-ai-service python -c "
from sqlalchemy import create_engine
engine = create_engine('mysql+pymysql://root:rootpassword@mysql:3306/kayak_db')
with engine.connect() as conn:
    print('✅ Database connected')
"
```

---

## Scaling Considerations

### Current Setup (Single Instance)
- 50K flights + 9.7K hotels = 59,706 deals
- Handles ~1000 requests/sec
- Suitable for demo/MVP

### Production Scaling
1. **Database:** Use managed MySQL (AWS RDS, GCP Cloud SQL)
2. **Caching:** Add Redis for frequently accessed deals
3. **Load Balancing:** Run multiple AI service instances
4. **Data Volume:** Increase to millions of deals
5. **Real-time Updates:** Use Kafka streams for live pricing

---

## Cost Optimization

### Why One-Time Pipeline?
Running the pipeline processes 1.36GB of CSV data:
- Takes ~5 minutes
- CPU intensive
- Memory intensive

**By running ONCE:**
- ✅ Faster service startup (no processing overhead)
- ✅ Lower CPU usage (just API serving)
- ✅ Lower memory footprint
- ✅ More predictable performance

### When to Refresh
- **Never:** Static dataset for demos
- **Weekly:** Semi-dynamic pricing
- **Daily:** Fresh deal simulations
- **Hourly:** Real-time pricing (use different approach)

---

## Next Steps

After deployment:
1. ✅ Test Concierge Agent: `curl http://localhost:8007/api/v1/chat`
2. ✅ Verify Kafka events: `docker logs kayak-ai-service | grep "Kafka"`
3. ✅ Monitor performance: Check logs for response times
4. ✅ Set up monitoring: Add Prometheus/Grafana
5. ✅ Configure backups: Schedule MySQL dumps

---

## Quick Reference

```bash
# Start everything
docker-compose up -d

# Load data (one-time)
docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --clear-db

# Check status
curl http://localhost:8007/health

# View logs
docker logs -f kayak-ai-service

# Restart service
docker-compose restart ai-service

# Stop everything
docker-compose down

# Stop and remove volumes (DELETES DATA!)
docker-compose down -v
```
