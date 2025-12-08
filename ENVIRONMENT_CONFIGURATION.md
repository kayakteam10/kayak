# Environment Configuration - Production Ready

## Summary of Changes

All hardcoded URLs and ports have been eliminated and replaced with environment variable configuration. The system is now production-ready and can be deployed to AWS with proper configuration.

## What Was Fixed

### 1. Frontend Configuration ✅
**Before:**
- Hardcoded `http://localhost:8080` in multiple files
- Hardcoded `http://localhost:8007` for AI service
- Hardcoded `http://localhost:8088` in docker-compose

**After:**
- All URLs use `process.env.REACT_APP_API_URL`
- Centralized configuration in `.env` file
- Proper environment variable in docker-compose

**Files Fixed:**
- `frontend/src/services/api.js` - Removed hardcoded AI service URL
- `frontend/src/services/aiApi.js` - Uses env variable
- `frontend/src/pages/ProfilePage.js` - Uses env variable (3 instances)
- `frontend/src/components/CardInput.js` - Uses env variable
- `frontend/src/components/StripeProvider.js` - Uses env variable

### 2. Docker Compose Configuration ✅
**Before:**
```yaml
environment:
  REACT_APP_API_URL: http://localhost:8088  # WRONG!
ports:
  - "8088:8088"  # Incorrect port mapping
```

**After:**
```yaml
environment:
  REACT_APP_API_URL: http://localhost:8080  # Gateway
  REACT_APP_WS_URL: ws://localhost:8080
  PORT: 3000
ports:
  - "8088:3000"  # Maps host 8088 to container 3000
```

### 3. Environment Files Created ✅
- `.env.example` - Root configuration template
- `frontend/.env.example` - Frontend configuration template
- `frontend/.env` - Local development configuration
- `setup-env.sh` - Interactive setup script

### 4. AWS Deployment Guide Created ✅
Comprehensive documentation including:
- Architecture diagram
- Step-by-step EC2 setup
- RDS/DocumentDB/ElastiCache configuration
- VPC and Security Groups
- Load Balancer setup
- Environment variable reference
- Cost optimization tips
- Security best practices

## Configuration Structure

```
KayakSimulation/
├── .env.example                  # Root environment template
├── .env                          # Local environment (gitignored)
├── setup-env.sh                  # Interactive setup script
├── AWS_DEPLOYMENT_GUIDE.md       # Comprehensive AWS guide
│
├── frontend/
│   ├── .env.example             # Frontend template
│   ├── .env                     # Frontend local config
│   └── src/
│       ├── services/
│       │   ├── api.js           # ✅ Uses env variables
│       │   ├── aiApi.js         # ✅ Uses env variables
│       │   └── adminApi.js      # ✅ Uses env variables
│       ├── components/
│       │   ├── CardInput.js     # ✅ Uses env variables
│       │   └── StripeProvider.js # ✅ Uses env variables
│       └── pages/
│           └── ProfilePage.js    # ✅ Uses env variables
│
└── services/
    ├── docker-compose.yml       # ✅ Proper env configuration
    └── [all services]/
        └── .env.example         # Service-specific config
```

## Environment Variables

### Frontend
```bash
REACT_APP_API_URL=http://localhost:8080    # Gateway URL
REACT_APP_WS_URL=ws://localhost:8080       # WebSocket URL
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_...   # Stripe key
REACT_APP_ENABLE_AI_CHAT=true              # Feature flags
REACT_APP_ENV=development                  # Environment
```

### Backend Services
```bash
# Common for all services
NODE_ENV=production
PORT=<service_port>
LOG_LEVEL=info

# Database
DB_HOST=<mysql_host>
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=<from_secrets_manager>
DB_NAME=kayak_db

# Redis
REDIS_URL=redis://<redis_host>:6379

# Kafka
KAFKA_BROKER=<kafka_host>:9092

# Security
JWT_SECRET=<secret>
SESSION_SECRET=<secret>
```

### Platform Gateway
```bash
PORT=8080
FLIGHT_SERVICE_URL=http://flight-service:8001
HOTEL_SERVICE_URL=http://hotel-service:8002
CAR_SERVICE_URL=http://car-service:8003
BOOKING_SERVICE_URL=http://booking-service:8004
PAYMENT_SERVICE_URL=http://payment-service:8005
REVIEW_SERVICE_URL=http://review-service:8006
AI_SERVICE_URL=http://ai-service:8007
STRIPE_SECRET_KEY=<secret>
CORS_ORIGIN=http://localhost:8088
```

## Local Development

```bash
# 1. Set up environment
./setup-env.sh

# 2. Update .env with your keys
nano .env

# 3. Update frontend/.env
nano frontend/.env

# 4. Start services
cd services
docker-compose up -d

# 5. Access application
# Frontend: http://localhost:8088
# Gateway: http://localhost:8080
```

## AWS Production Deployment

```bash
# 1. Run setup for AWS
./setup-env.sh
# Select option 2 (AWS Production)

# 2. Follow AWS_DEPLOYMENT_GUIDE.md
# - Create VPC and subnets
# - Set up RDS, ElastiCache, MSK
# - Launch EC2 instances
# - Configure Load Balancer

# 3. Set environment variables on each EC2 instance
ssh ec2-user@<instance-ip>
sudo mkdir -p /etc/kayak
sudo nano /etc/kayak/.env

# 4. Or use AWS Systems Manager Parameter Store
aws ssm put-parameter \
  --name "/kayak/db/password" \
  --value "<password>" \
  --type "SecureString"
```

## Service Communication Flow

### Local Development
```
Browser (localhost:8088) 
    → Frontend Container (port 3000)
    → API calls to localhost:8080
    → Platform Gateway (port 8080)
    → Microservices (ports 8001-8007)
```

### AWS Production
```
Browser (yourdomain.com)
    → CloudFront/ALB
    → Frontend EC2 (port 3000)
    → API calls to api.yourdomain.com
    → ALB → Platform Gateway EC2 (port 8080)
    → Internal ALB → Microservice EC2s (ports 8001-8007)
```

## Configuration by Environment

### Development (Docker Compose)
- Services communicate via Docker service names
- Frontend uses `localhost:8080` for API calls
- All services in same Docker network

### Staging/Production (AWS)
- Services communicate via private IPs or service discovery
- Frontend uses public domain for API calls
- Services distributed across availability zones
- Load balancers for high availability

## Security Considerations

### ✅ What We Did Right
1. **No hardcoded credentials** - All use env variables
2. **Separate configurations** - Dev/Prod separation
3. **Environment isolation** - Different configs per environment
4. **Secrets management ready** - Easy AWS Secrets Manager integration

### 🔐 Additional Security (Production)
1. Use AWS Secrets Manager or Parameter Store
2. Enable IAM roles for EC2 instances
3. Encrypt environment variables at rest
4. Use VPC endpoints for AWS services
5. Enable CloudTrail for audit logging

## Monitoring Setup

### CloudWatch Logs
Each service sends logs to CloudWatch:
```javascript
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

winston.add(new CloudWatchTransport({
  logGroupName: '/kayak/<service-name>',
  logStreamName: process.env.INSTANCE_ID,
  awsRegion: process.env.AWS_REGION
}));
```

### Metrics
- CPU/Memory utilization
- Request count and latency
- Error rates
- Database connections

## Cost Estimation (AWS)

### Minimum Production Setup
- EC2 Instances (8x t3.medium): ~$250/month
- RDS MySQL (db.t3.medium): ~$80/month
- ElastiCache Redis: ~$30/month
- MSK Kafka (2 brokers): ~$200/month
- Data Transfer: ~$50/month
- **Total: ~$610/month**

### Optimized Setup
- Use spot instances for non-critical services
- Reserved instances for 1-year commitment (40% savings)
- Auto-scaling for variable workloads
- **Estimated: ~$400/month**

## Troubleshooting

### Issue: Frontend showing 404 errors
**Solution:** Check REACT_APP_API_URL points to gateway (port 8080), not frontend (port 8088)

### Issue: Services can't connect to database
**Solution:** 
1. Check security groups allow traffic
2. Verify DB_HOST environment variable
3. Test connection: `mysql -h $DB_HOST -u $DB_USER -p`

### Issue: CORS errors in browser
**Solution:** Set CORS_ORIGIN in platform gateway to match frontend URL

### Issue: Environment variables not loading
**Solution:**
1. Restart service after changing .env
2. For docker-compose: `docker-compose down && docker-compose up -d`
3. For EC2: `sudo systemctl restart kayak-service`

## Next Steps

1. ✅ Configuration system implemented
2. ✅ All hardcoded URLs removed
3. ✅ Docker Compose updated
4. ✅ AWS deployment guide created
5. ⏭️ Set up CI/CD pipeline
6. ⏭️ Implement AWS deployment scripts
7. ⏭️ Add infrastructure as code (Terraform/CloudFormation)

## Support

For issues or questions:
- See AWS_DEPLOYMENT_GUIDE.md for detailed deployment steps
- Check environment variable reference in .env.example
- Review service-specific .env.example files

---

**Status:** ✅ System is production-ready with proper environment configuration
