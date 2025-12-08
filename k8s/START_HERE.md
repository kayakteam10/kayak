# EKS Deployment Package - Ready to Deploy!

## ✅ What's Been Created

I've created a complete Kubernetes deployment package for your Kayak microservices platform in `/Users/vineet/Documents/kayak/k8s/`.

### 📦 Package Contents

**Scripts (all executable):**
- ✅ `build-and-push.sh` - Builds and pushes Docker images to ECR
- ✅ `create-cluster.sh` - Creates EKS cluster with 3 nodes
- ✅ `create-msk.sh` - Creates Kafka (MSK) cluster
- ✅ `deploy.sh` - Deploys all services to Kubernetes
- ✅ `generate-service-manifests.sh` - Utility to regenerate manifests

**Kubernetes Manifests:**
- ✅ `01-configmap.yaml` - All environment variables
- ✅ `02-secrets.yaml` - Database passwords, API keys
- ✅ `03-platform-service.yaml` - API Gateway with LoadBalancer
- ✅ `04-10` Service manifests for all 7 microservices

**Documentation:**
- ✅ `README.md` - Quick start guide
- ✅ `DEPLOYMENT_GUIDE.md` - Detailed step-by-step instructions

**Dockerfiles:**
- ✅ Created in each service directory (`services/*/Dockerfile`)

## 🎯 Your Deployment Flow (30 minutes)

### Step 1: Build Images (10-15 min)
```bash
cd /Users/vineet/Documents/kayak/k8s
./build-and-push.sh
```

This will:
- Create 8 ECR repositories
- Build Docker images for all services
- Push to Amazon ECR

### Step 2: Create EKS Cluster (15-20 min)
```bash
./create-cluster.sh
```

This will:
- Create cluster "kayak-cluster"
- Launch 3 t3.medium nodes
- Configure kubectl

### Step 3: Update Secrets (2 min)
**IMPORTANT:** Edit `manifests/02-secrets.yaml` and add:
- Your Stripe API keys
- Your Gemini API key
- Strong JWT/Session secrets

### Step 4: Deploy Everything (5 min)
```bash
./deploy.sh
```

This deploys:
- ConfigMap and Secrets
- 8 microservices (2 replicas each = 16 pods)
- LoadBalancer for external access

### Step 5: Get Your API URL
```bash
kubectl get service platform-service
```

Copy the `EXTERNAL-IP` - this is your new API endpoint!

## 🏗️ Architecture Overview

**What You're Deploying:**

```
Internet → AWS Load Balancer → Platform Service (8080)
                                      ↓
                     ┌────────────────┼────────────────┐
                     ↓                ↓                ↓
              Flight (8001)      Hotel (8002)    Car (8003)
              Booking (8004)     Payment (8005)  Review (8006)
              AI (8007)
                     ↓                ↓                ↓
              MySQL RDS      MongoDB Atlas    Redis Cache
              Kafka MSK
```

**Services Deployed:**
1. **Platform Service** - API Gateway, Auth, Admin (Port 8080) - **PUBLIC**
2. **Flight Service** - Flight search and booking (Port 8001)
3. **Hotel Service** - Hotel search and booking (Port 8002)
4. **Car Service** - Car rental (Port 8003)
5. **Booking Service** - Booking management (Port 8004)
6. **Payment Service** - Payment processing (Port 8005)
7. **Review Service** - User reviews (Port 8006)
8. **AI Service** - Recommendations (Port 8007)

**Data Stores (Already Configured):**
- MySQL RDS: `kayak-mysql.cziiq4a6u54j.us-west-1.rds.amazonaws.com`
- MongoDB Atlas: `cluster0.fykdkql.mongodb.net`
- Redis: `kayak-redis.dtrwn4.0001.usw1.cache.amazonaws.com`

## 📋 Pre-Deployment Checklist

- [ ] AWS CLI configured (`aws sts get-caller-identity`)
- [ ] Docker running (`docker ps`)
- [ ] eksctl installed (`eksctl version`)
- [ ] kubectl installed (`kubectl version --client`)
- [ ] Updated secrets in `manifests/02-secrets.yaml`
- [ ] Verified MySQL RDS is accessible
- [ ] Verified MongoDB Atlas credentials work
- [ ] Verified Redis ElastiCache is accessible

## 🔑 Required Secrets to Update

Before deploying, you MUST update these in `manifests/02-secrets.yaml`:

1. **Stripe Keys** (for payments)
   - STRIPE_SECRET_KEY
   - STRIPE_PUBLISHABLE_KEY
   - STRIPE_WEBHOOK_SECRET

2. **Gemini API Key** (for AI service)
   - GEMINI_API_KEY

3. **Security Secrets** (generate strong random strings)
   - JWT_SECRET (generate: `openssl rand -base64 32`)
   - SESSION_SECRET (generate: `openssl rand -base64 32`)

## 🎬 After Deployment

### 1. Verify Everything is Running
```bash
kubectl get pods
# All pods should show STATUS: Running

kubectl get services
# platform-service should have EXTERNAL-IP
```

### 2. Test the API
```bash
PLATFORM_URL=$(kubectl get service platform-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$PLATFORM_URL:8080/health
```

### 3. Update Frontend
```bash
cd /Users/vineet/Documents/kayak/frontend
echo "REACT_APP_API_URL=http://$PLATFORM_URL:8080" > .env.production
npm run build
aws s3 sync build/ s3://kayak-frontend-simulation-demo
```

### 4. Access Your App
- Frontend: `http://kayak-frontend-simulation-demo.s3-website-us-west-1.amazonaws.com`
- API: `http://<PLATFORM_URL>:8080`

## 💡 Key Features

✅ **Auto-scaling**: Kubernetes will automatically restart failed pods
✅ **Load Balancing**: AWS ELB distributes traffic across pod replicas
✅ **Health Checks**: Automatic health monitoring for all services
✅ **Rolling Updates**: Zero-downtime deployments
✅ **Resource Management**: CPU/Memory limits prevent resource exhaustion
✅ **Service Discovery**: Internal DNS for service-to-service communication

## 💰 Cost Estimate

**Running Costs (per month):**
- EKS Cluster: $73 (control plane)
- 3x t3.medium nodes: ~$90
- Load Balancer: ~$20
- **Total: ~$183/month**

**Existing (already running):**
- MySQL RDS: Already provisioned
- Redis ElastiCache: Already provisioned
- MongoDB Atlas: Cloud-hosted

**Optional:**
- MSK Kafka: ~$300/month (use `create-msk.sh` if needed)

**Cost Saving:**
- Pause cluster when not in use: `eksctl scale nodegroup --nodes=0`
- Use t3.micro for dev: Modify `create-cluster.sh` node type

## 🚨 Troubleshooting Common Issues

### Images won't build
```bash
# Make sure Docker is running
docker ps

# Login to ECR manually
aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-west-1.amazonaws.com
```

### Cluster creation fails
```bash
# Check AWS permissions
aws iam get-user

# Ensure you have EKS, EC2, and VPC permissions
```

### Pods crash with database errors
```bash
# Check if ConfigMap has correct DB endpoints
kubectl get configmap kayak-config -o yaml

# Check if Secrets are set
kubectl describe secret kayak-secrets
```

### LoadBalancer stuck in pending
```bash
# This is normal - wait 2-3 minutes
kubectl describe service platform-service

# Check events
kubectl get events --sort-by='.lastTimestamp'
```

## 📊 Monitoring

### View Logs
```bash
# Real-time logs
kubectl logs -f deployment/platform-service

# Logs from specific pod
kubectl logs <pod-name>

# Previous crashed pod logs
kubectl logs <pod-name> --previous
```

### Check Resource Usage
```bash
kubectl top nodes
kubectl top pods
```

## 🔄 Update Workflow

When you make code changes:

```bash
# 1. Rebuild and push image
cd /Users/vineet/Documents/kayak/k8s
./build-and-push.sh

# 2. Restart deployment
kubectl rollout restart deployment/flight-service

# 3. Watch rollout
kubectl rollout status deployment/flight-service
```

## 🎓 Next Steps

1. **Deploy Now**: Follow the 5 steps above to deploy
2. **Set up Kafka**: Run `./create-msk.sh` for event streaming
3. **Enable Monitoring**: Install CloudWatch Container Insights
4. **Set up CI/CD**: Automate builds with GitHub Actions
5. **Add SSL**: Configure HTTPS with AWS Certificate Manager
6. **Custom Domain**: Point your domain to the LoadBalancer

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. View pod logs: `kubectl logs <pod-name>`
3. Check events: `kubectl get events`
4. Describe failing resource: `kubectl describe pod <pod-name>`

---

**You're all set!** Start with `./build-and-push.sh` and follow the deployment flow above. 🚀
