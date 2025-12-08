# AI Service Scripts

## Production Scripts

### 🚀 `setup_usa_deals_pipeline.py` - ONE-COMMAND DATA SETUP
**Use this for production deployment.**

Complete pipeline to process raw CSV data and load to database:
```bash
# Full pipeline (run ONCE after deployment)
docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --clear-db

# Skip steps if already processed
docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --skip-merge --skip-enrich
```

**What it does:**
1. Merges USA datasets (50K flights + 9.7K NYC hotels)
2. Enriches with deal detection & price simulation
3. Loads to database with proper schema mapping
4. Verifies data integrity

**When to run:**
- ✅ **Initial deployment** - Run once with `--clear-db`
- ✅ **Data refresh** - Run periodically to update deals
- ❌ **NOT needed** on every restart - data persists in MySQL

---

### 🔄 `sync_deals_to_inventory.py` - Kafka Sync Worker
Syncs deals from database to inventory service via Kafka.

```bash
# Auto-started by docker-compose
docker exec kayak-ai-service python scripts/sync_deals_to_inventory.py
```

---

### 🎯 `start_deals_worker.py` - Background Worker
Starts Kafka consumer for real-time deal processing.

```bash
# Auto-started by docker-compose
docker exec kayak-ai-service python scripts/start_deals_worker.py
```

---

### 🏃 `startup.sh` - Service Initialization
Waits for dependencies (MySQL, Kafka, Ollama) and starts FastAPI service.

**Auto-executed by Docker** - no manual run needed.

---

## Development/Testing Scripts

### ✅ `run_tests.sh`
Runs unit tests for the service.

```bash
docker exec kayak-ai-service bash scripts/run_tests.sh
```

---

## Production Workflow

### First Deployment
```bash
# 1. Deploy containers
docker-compose up -d

# 2. Wait for services to start (startup.sh handles this)

# 3. Run data pipeline ONCE
docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --clear-db

# 4. Verify data loaded
docker exec kayak-ai-service python -c "
from sqlalchemy import create_engine, text
engine = create_engine('mysql+pymysql://root:rootpassword@mysql:3306/kayak_db')
with engine.connect() as conn:
    flights = conn.execute(text('SELECT COUNT(*) FROM flight_deals')).scalar()
    hotels = conn.execute(text('SELECT COUNT(*) FROM hotel_deals')).scalar()
    print(f'✅ Loaded: {flights:,} flights + {hotels:,} hotels')
"
```

### Subsequent Restarts
```bash
# Just restart containers - data persists in MySQL
docker-compose restart ai-service
```

### Data Refresh (Optional)
```bash
# Re-run pipeline to update deals with new prices
docker exec kayak-ai-service python scripts/setup_usa_deals_pipeline.py --clear-db
```

---

## FAQ

**Q: Do I need to run the pipeline every time I restart?**
No! Data persists in MySQL. Only run once on initial deployment.

**Q: How often should I refresh data?**
Depends on your needs. The pipeline simulates dynamic pricing, so you could run it:
- Daily (for fresh deal simulations)
- Weekly (for moderate freshness)
- On-demand (when updating datasets)

**Q: Can I add new raw data?**
Yes! Add CSV files to `/app/data/raw/`, update the pipeline script, and re-run.

**Q: What if pipeline fails mid-way?**
Use `--skip-merge` or `--skip-enrich` flags to resume from the failed step.

---

## Files Removed (Now Obsolete)

The following scripts were consolidated into `setup_usa_deals_pipeline.py`:
- ❌ `merge_usa_datasets.py`
- ❌ `enrich_flights_with_deals.py`
- ❌ `enrich_hotels_with_deals.py`
- ❌ `load_usa_deals_to_db.py`
- ❌ `verify_loaded_data.py`
- ❌ `preprocess_datasets.py`
- ❌ `preprocess_comprehensive.py`
- ❌ `load_deals_to_db.py`

**Why?** One consolidated script is:
- ✅ Easier to maintain
- ✅ Less error-prone
- ✅ Better for production (single command)
- ✅ Includes verification & error handling
