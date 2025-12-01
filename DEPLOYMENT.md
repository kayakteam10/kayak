# Kayak Microservices - Production Deployment Guide

## 🎯 Overview

This guide provides step-by-step instructions for deploying the Kayak microservices platform using Docker Compose with proper service orchestration and health monitoring.

## 📊 Service Architecture

### Dependency Layers

The platform consists of 4 dependency layers that must start in order:

```
Layer 1: Infrastructure
├─ MySQL (3307)
├─ MongoDB (27017)
├─ Redis (6379)
├─ Zookeeper (2182)
└─ Kafka (9094)

Layer 2: Core Application Services
├─ Flight Service (8001) → depends: MySQL, Redis, Kafka
├─ Hotel Service (8002) → depends: MySQL, MongoDB, Redis, Kafka
├─ Car Service (8003) → depends: MySQL, Redis, Kafka
├─ Review Service (8006) → depends: MongoDB
└─ AI Service (8008) → no dependencies

Layer 3: Business Process Services
├─ Booking Service (8004) → depends: MySQL, Kafka
└─ Payment Service (8005) → depends: MySQL, Kafka

Layer 4: API Gateway
└─ Platform Service (8080) → depends: All Layer 2 & 3 services
```

### Management UIs
- Kafka UI (8092)
- Redis Commander (8091)

---

## 🚀 Deployment Steps

### 1. Prerequisites

Ensure you have:
- Docker Desktop running and healthy
- At least 8GB RAM allocated to Docker
- Ports 3307, 6379, 8001-8006, 8008, 8080, 8091-8092, 9094, 27017 available

**Verify Docker is running:**
```bash
docker info
```

### 2. Deploy the Stack

Navigate to the project root and deploy:

```bash
cd /Users/spartan/Documents/KayakSimulation

# Start all services
docker compose -f services/docker-compose.yml up -d --build
```

This command will:
1. Build Docker images for all 7 application services
2. Start infrastructure layer (MySQL, MongoDB, Redis, Kafka)
3. Wait for health checks to pass
4. Start application services in dependency order
5. Start the Platform Service last

**Expected duration**: 2-3 minutes for first deployment

### 3. Monitor Startup

Watch the logs to ensure services start correctly:

```bash
# View all logs
docker compose -f services/docker-compose.yml logs -f

# View specific service
docker compose -f services/docker-compose.yml logs -f platform-service

# Check container status
docker compose -f services/docker-compose.yml ps
```

### 4. Verify Health Status

Use the automated health check script:

```bash
./scripts/health_check.sh
```

**Expected Output:**
```
🏥 Kayak Microservices Health Check
======================================

📦 Infrastructure Services:
----------------------------
✅ MySQL - Running
✅ MongoDB - Running
✅ Redis - Running
✅ Kafka - Running
✅ Zookeeper - Running

🚀 Application Services:
----------------------------
✅ Flight Service - Healthy
✅ Hotel Service - Healthy
✅ Car Service - Healthy
✅ Booking Service - Healthy
✅ Payment Service - Healthy
✅ Review Service - Healthy

🌐 Gateway & Frontend:
----------------------------
✅ Platform Service - Healthy
✅ AI Service - Healthy

======================================
📊 Health Summary: 13/13 services healthy

🎉 All services are healthy!
```

---

## 🔍 Service Startup Sequence

Docker Compose orchestrates startup using `depends_on` with health check conditions:

1. **Infrastructure starts first** (40s warm-up):
   - MySQL initializes schema and data
   - MongoDB starts
   - Redis starts
   - Zookeeper and Kafka initialize

2. **Core services wait for dependencies** (30s warm-up each):
   - Flight, Hotel, Car services wait for MySQL + Redis + Kafka healthy
   - Review service waits for MongoDB healthy

3. **Platform waits for all application services** (45s warm-up):
   - Ensures all microservices are healthy before accepting traffic

### Health Check Configuration

Each service has enhanced health checks:
- **Interval**: 10s between checks
- **Timeout**: 5-10s per check
- **Retries**: 5-15 attempts
- **Start Period**: 20-45s (grace period during initialization)

---

## 🔧 Management and Troubleshooting

### View Service Logs

```bash
# All services
docker compose -f services/docker-compose.yml logs

# Specific service with tail
docker compose -f services/docker-compose.yml logs --tail=100 -f flight-service
```

### Restart a Service

```bash
docker compose -f services/docker-compose.yml restart flight-service
```

### Rebuild a Service

```bash
docker compose -f services/docker-compose.yml up -d --build flight-service
```

### Stop All Services

```bash
docker compose -f services/docker-compose.yml down
```

### Stop and Remove Volumes (Clean Slate)

```bash
docker compose -f services/docker-compose.yml down -v
```

---

## ⚠️ Common Issues

### Issue: Service Won't Start

**Symptoms**: Container exits immediately or restarts continuously

**Diagnosis**:
```bash
docker logs kayak-flight-service
```

**Common Causes**:
- Missing dependencies (MySQL not ready)
- Port already in use
- Environment variable misconfiguration

**Solution**:
1. Check dependency health: `docker ps --filter "health=unhealthy"`
2. Verify ports: `lsof -i :8001` (replace with relevant port)
3. Review logs for specific error messages

### Issue: Database Connection Refused

**Symptoms**: Services log `ECONNREFUSED` for MySQL/MongoDB

**Cause**: Database not fully initialized

**Solution**:
Wait for health checks to pass:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Look for "(healthy)" status on database containers.

### Issue: Kafka Connection Timeout

**Symptoms**: Services can't connect to Kafka

**Cause**: Kafka takes 30-40s to fully initialize

**Solution**:
1. Verify Kafka is healthy: `docker logs kayak-kafka | grep "started"`
2. Check Zookeeper is running: `docker ps | grep zookeeper`
3. Restart services if they started before Kafka was ready

---

## 📈 Performance Optimization

### Resource Limits (Production)

For production deployment, add resource limits to `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

### Scaling Services

To run multiple instances (requires orchestrator like Docker Swarm or Kubernetes):

```bash
docker compose -f services/docker-compose.yml up -d --scale flight-service=3
```

---

## 🔒 Security Considerations

### For Production Deployment:

1. **Use Secrets Management**: Replace hardcoded passwords with Docker secrets or environment-specific configurations
2. **Network Isolation**: Use custom Docker networks to isolate services
3. **TLS/SSL**: Add reverse proxy (Nginx) with SSL certificates
4. **Firewall Rules**: Only expose Platform Service (8080) externally

---

## 📝 Maintenance

### Backup Databases

```bash
# MySQL backup
docker exec kayak-mysql mysqldump -u root -proot123 kayak_db > backup.sql

# MongoDB backup
docker exec kayak-mongodb mongodump --out=/tmp/backup
docker cp kayak-mongodb:/tmp/backup ./mongodb-backup
```

### Update Services

1. Pull latest code
2. Rebuild images: `docker compose -f services/docker-compose.yml build`
3. Rolling update: `docker compose -f services/docker-compose.yml up -d`

---

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `docker compose up -d` | Start all services |
| `docker compose down` | Stop all services |
| `docker compose ps` | List running containers |
| `docker compose logs -f <service>` | View service logs |
| `./scripts/health_check.sh` | Check all service health |
| `docker compose restart <service>` | Restart single service |

---

## ✅ Deployment Checklist

- [ ] Docker Desktop running
- [ ] All ports available (netstat -an | grep LISTEN)
- [ ] Adequate resources allocated (8GB RAM minimum)
- [ ] Code pulled from latest version
- [ ] Run: `docker compose up -d --build`
- [ ] Wait 3 minutes for full startup
- [ ] Run: `./scripts/health_check.sh`
- [ ] Verify: All services show ✅ Healthy
- [ ] Test: Access Platform Service at http://localhost:8080/health
- [ ] Test: Make a flight search via Platform API
- [ ] Monitor: Check logs for errors

**Deployment Status**: Production-Ready ✅
