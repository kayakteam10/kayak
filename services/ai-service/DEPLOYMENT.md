# AI Service Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Kaggle API credentials (for dataset downloads)
- Access to MySQL, Kafka, Redis, Ollama

## Quick Start (Development)

1. **Set up environment**
```bash
cd services/ai-service
cp .env.example .env
# Edit .env with your configuration
```

2. **Download datasets** (optional for development)
```bash
cd ../..
bash scripts/download_kaggle_datasets.sh
```

3. **Start services**
```bash
cd services
docker-compose up -d mysql kafka ollama redis
docker-compose up -d ai-service ai-deals-worker
```

4. **Verify health**
```bash
curl http://localhost:8007/health
```

Expected:
```json
{
  "status": "healthy",
  "database": "connected",
  "kafka": "connected",
  "ollama": "connected"
}
```

## Production Deployment

### 1. Database Migration

```bash
# Run migrations
docker exec -i kayak-mysql mysql -uroot -proot123 kayak_db < services/ai-service/database/001_initial_schema.sql
```

### 2. Build Production Image

```bash
cd services/ai-service
docker build -t kayak-ai-service:latest .
```

### 3. Environment Variables

Ensure these are set in production `.env`:
```bash
ENV=production
LOG_LEVEL=INFO
DB_HOST=mysql
KAFKA_BROKER=kafka:9092
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2:3b
```

### 4. Start Services

```bash
docker-compose up -d ai-service ai-deals-worker
```

### 5. Pull LLM Model

```bash
docker exec kayak-ollama ollama pull llama3.2:3b
```

## Monitoring

### Logs
```bash
# AI Service logs
docker logs kayak-ai-service -f

# Deals Worker logs
docker logs kayak-ai-deals-worker -f
```

### Health Checks
```bash
# API health
curl http://localhost:8007/health

# Ollama health
curl http://localhost:11434/api/tags
```

### Kafka Topics
```bash
docker exec kayak-kafka kafka-topics --list --bootstrap-server localhost:9092
```

## Scaling

### Horizontal Scaling
```bash
# Scale API service
docker-compose up -d --scale ai-service=3

# Scale deals worker
docker-compose up -d --scale ai-deals-worker=2
```

### Load Balancer
Add nginx/traefik in front of ai-service instances.

## Troubleshooting

### Service Won't Start
1. Check dependencies: `docker ps`
2. Check logs: `docker logs kayak-ai-service`
3. Verify .env file exists

### Ollama Not Responding
```bash
# Check if model is downloaded
docker exec kayak-ollama ollama list

# Pull model manually
docker exec kayak-ollama ollama pull llama3.2:3b
```

### Kafka Connection Issues
```bash
# Verify Kafka is healthy
docker exec kayak-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Database Connection Failed
```bash
# Check MySQL
docker exec kayak-mysql mysql -uroot -proot123 -e "SHOW DATABASES;"
```

## Performance Tuning

### Database
- Connection pool size: 10-20
- Enable query caching
- Index frequently queried fields

### Kafka
- Increase partitions for high throughput
- Adjust batch size in producer

### Ollama
- Use GPU if available
- Reduce model size for faster responses
- Cache frequent queries in Redis

## Backup & Recovery

### Database Backup
```bash
docker exec kayak-mysql mysqldump -uroot -proot123 kayak_db > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
docker exec -i kayak-mysql mysql -uroot -proot123 kayak_db < backup_20250115.sql
```

## Security Checklist

- [ ] Change default passwords
- [ ] Enable HTTPS/TLS
- [ ] Restrict CORS origins
- [ ] Add rate limiting
- [ ] Enable authentication
- [ ] Encrypt sensitive data
- [ ] Regular security updates
