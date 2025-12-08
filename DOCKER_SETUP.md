# Docker Setup Guide - Kayak Simulation

## Successfully Deployed! 🚀

Your Kayak Simulation project is now running with Docker Compose.

## Access Points

### Frontend Application
- **URL**: http://localhost or http://localhost:8088
- **Description**: React-based travel booking platform with Nginx
- **Container**: `kayak-frontend`

### Backend Services

#### Platform Service (Gateway)
- **URL**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **Container**: `kayak-platform-service`
- **Description**: Main API gateway aggregating all microservices

#### Microservices
1. **Flight Service**: http://localhost:8001
   - Container: `kayak-flight-service`
   
2. **Hotel Service**: http://localhost:8002
   - Container: `kayak-hotel-service`
   
3. **Car Service**: http://localhost:8003
   - Container: `kayak-car-service`
   
4. **Booking Service**: http://localhost:8004
   - Container: `kayak-booking-service`
   
5. **Payment Service**: http://localhost:8005
   - Container: `kayak-payment-service`
   
6. **Review Service**: http://localhost:8006
   - Container: `kayak-review-service`
   
7. **AI Service**: http://localhost:8008
   - Container: `kayak-ai-service`

### Databases

#### MySQL
- **Host**: localhost:3307
- **Username**: root
- **Password**: root123
- **Database**: kayak_db
- **Container**: `kayak-mysql`

#### MongoDB
- **URL**: mongodb://localhost:27017
- **Container**: `kayak-mongodb`

#### Redis
- **URL**: redis://localhost:6379
- **Container**: `kayak-redis`

### Management UIs

#### Kafka UI
- **URL**: http://localhost:8092
- **Description**: Monitor Kafka topics and messages
- **Container**: `kayak-kafka-ui`

#### Redis Commander
- **URL**: http://localhost:8091
- **Description**: Visual Redis database management
- **Container**: `kayak-redis-commander`

#### Kafka
- **Bootstrap Server**: localhost:9094
- **Container**: `kayak-kafka`

## Docker Commands

### Start All Services
```bash
cd services
docker compose -f docker-compose.yml up -d
```

### Stop All Services
```bash
cd services
docker compose -f docker-compose.yml down
```

### Stop and Remove Volumes (Clean Slate)
```bash
cd services
docker compose -f docker-compose.yml down -v
```

### View Logs
```bash
# All services
docker compose -f docker-compose.yml logs -f

# Specific service
docker compose -f docker-compose.yml logs -f frontend
docker compose -f docker-compose.yml logs -f platform-service
docker compose -f docker-compose.yml logs -f flight-service
```

### Rebuild Services
```bash
cd services
docker compose -f docker-compose.yml up -d --build
```

### Check Service Status
```bash
docker ps
# or
docker compose -f docker-compose.yml ps
```

### Check Container Health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Execute Commands in Container
```bash
# MySQL
docker exec -it kayak-mysql mysql -uroot -proot123 kayak_db

# MongoDB
docker exec -it kayak-mongodb mongosh

# Redis
docker exec -it kayak-redis redis-cli
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                   (React + Nginx)                           │
│                   Port: 80, 8088                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Platform Service                          │
│                   (API Gateway)                             │
│                      Port: 8080                             │
└──────────┬────────────────────────────────────┬─────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐           ┌──────────────────────────┐
│  Business Services   │           │   Support Services       │
│  - Flight (8001)     │           │   - AI Agent (8008)      │
│  - Hotel (8002)      │           │   - Kafka UI (8092)      │
│  - Car (8003)        │           │   - Redis UI (8091)      │
│  - Booking (8004)    │           │                          │
│  - Payment (8005)    │           │                          │
│  - Review (8006)     │           │                          │
└──────────┬───────────┘           └──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  - MySQL (3307)                                             │
│  - MongoDB (27017)                                          │
│  - Redis (6379)                                             │
│  - Kafka (9094)                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features Enabled

✅ **Frontend**: Full React application with routing
✅ **Backend Microservices**: All 7 services running
✅ **Databases**: MySQL + MongoDB + Redis
✅ **Message Queue**: Kafka for async communication
✅ **API Gateway**: Centralized platform service
✅ **Health Checks**: All services have health monitoring
✅ **Auto-restart**: Containers restart on failure
✅ **Database Initialization**: Schema and dummy data loaded automatically

## Troubleshooting

### Check if containers are running
```bash
docker ps
```

### View service logs
```bash
docker compose -f docker-compose.yml logs -f [service-name]
```

### Restart a specific service
```bash
docker compose -f docker-compose.yml restart [service-name]
```

### Check health status
```bash
curl http://localhost:8080/health
```

### Access database
```bash
docker exec -it kayak-mysql mysql -uroot -proot123 kayak_db
```

## Notes

- The frontend proxies API requests to `/api/*` to the platform service at `http://platform-service:8080/`
- All microservices are connected to MySQL, MongoDB, Redis, and Kafka as needed
- Database schemas and initial data are loaded automatically on first startup
- Services have health checks and will automatically restart if they fail
- The platform service waits for all dependent services to be healthy before starting

## Next Steps

1. Open http://localhost in your browser
2. Register a new user account
3. Search for flights, hotels, or cars
4. Make bookings and payments
5. Monitor services using Kafka UI and Redis Commander

---
**Status**: ✅ All services running successfully!
