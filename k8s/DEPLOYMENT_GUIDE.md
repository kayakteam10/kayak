# Kayak EKS Deployment Guide

## Prerequisites

1. **Install Required Tools**
   ```bash
   brew install eksctl kubectl docker awscli
   ```

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your Access Key ID, Secret Access Key, and region (us-west-1)
   ```

3. **Verify Docker is Running**
   ```bash
   docker ps
   ```

## Phase 1: Build and Push Docker Images

1. **Make build script executable**
   ```bash
   cd /Users/vineet/Documents/kayak/k8s
   chmod +x build-and-push.sh
   ```

2. **Build and push all images to ECR**
   ```bash
   ./build-and-push.sh
   ```
   
   This will:
   - Create ECR repositories for each service
   - Build Docker images
   - Push images to Amazon ECR
   
   **Expected time:** 10-15 minutes

## Phase 2: Create EKS Cluster

1. **Make cluster creation script executable**
   ```bash
   chmod +x create-cluster.sh
   ```

2. **Create the EKS cluster**
   ```bash
   ./create-cluster.sh
   ```
   
   This will:
   - Create an EKS cluster named "kayak-cluster"
   - Create a node group with 3 t3.medium instances
   - Configure kubectl to use the new cluster
   
   **Expected time:** 15-20 minutes

3. **Verify cluster is running**
   ```bash
   kubectl get nodes
   ```

## Phase 3: Set Up Amazon MSK (Kafka)

1. **Create MSK cluster**
   ```bash
   chmod +x create-msk.sh
   ./create-msk.sh
   ```

2. **Get bootstrap servers and update ConfigMap**
   ```bash
   # The script will output the bootstrap servers
   # Update manifests/01-configmap.yaml with the KAFKA_BROKER value
   ```

## Phase 4: Update Secrets (IMPORTANT!)

Before deploying, update the secrets file with real values:

```bash
vi manifests/02-secrets.yaml
```

Update these values:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key  
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret
- `GEMINI_API_KEY` - Your Google Gemini API key
- `JWT_SECRET` - Generate a strong secret
- `SESSION_SECRET` - Generate a strong secret

## Phase 5: Deploy to EKS

1. **Make deploy script executable**
   ```bash
   chmod +x deploy.sh
   ```

2. **Deploy all services**
   ```bash
   ./deploy.sh
   ```
   
   This will:
   - Apply ConfigMap and Secrets
   - Deploy Platform Service (API Gateway)
   - Deploy all 7 microservices
   - Wait for all deployments to be ready
   
   **Expected time:** 5-10 minutes

3. **Get the Platform Service URL**
   ```bash
   kubectl get service platform-service
   ```
   
   Look for the `EXTERNAL-IP` field. This is your API gateway URL.

## Phase 6: Update Frontend

1. **Update frontend environment**
   ```bash
   cd /Users/vineet/Documents/kayak/frontend
   
   # Get the LoadBalancer URL
   PLATFORM_URL=$(kubectl get service platform-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
   
   echo "REACT_APP_API_URL=http://$PLATFORM_URL:8080" > .env.production
   ```

2. **Build and deploy frontend**
   ```bash
   npm run build
   aws s3 sync build/ s3://kayak-frontend-simulation-demo
   ```

## Monitoring and Troubleshooting

### Check pod status
```bash
kubectl get pods
kubectl logs <pod-name>
kubectl describe pod <pod-name>
```

### Check service endpoints
```bash
kubectl get services
kubectl get endpoints
```

### Test API
```bash
PLATFORM_URL=$(kubectl get service platform-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$PLATFORM_URL:8080/health
```

### Scale services
```bash
kubectl scale deployment flight-service --replicas=3
```

### Update a service
```bash
# After pushing new image to ECR
kubectl rollout restart deployment/flight-service
kubectl rollout status deployment/flight-service
```

## Cost Management

### Stop cluster when not in use
```bash
eksctl scale nodegroup --cluster=kayak-cluster --name=kayak-nodes --nodes=0
```

### Start cluster
```bash
eksctl scale nodegroup --cluster=kayak-cluster --name=kayak-nodes --nodes=3
```

### Delete entire cluster
```bash
eksctl delete cluster --name kayak-cluster --region us-west-1
```

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│           AWS Load Balancer (External)          │
└──────────────────┬──────────────────────────────┘
                   │
    ┌──────────────▼──────────────┐
    │   Platform Service (8080)   │  ← API Gateway
    └──────────────┬──────────────┘
                   │
    ┌──────────────┴──────────────────────────┐
    │                                          │
┌───▼────┐  ┌────────┐  ┌────────┐  ┌────────────┐
│Flight  │  │Hotel   │  │Car     │  │Booking     │
│Service │  │Service │  │Service │  │Service     │
│  8001  │  │  8002  │  │  8003  │  │  8004      │
└────────┘  └────────┘  └────────┘  └────────────┘

┌────────┐  ┌────────┐  ┌────────┐
│Payment │  │Review  │  │AI      │
│Service │  │Service │  │Service │
│  8005  │  │  8006  │  │  8007  │
└────────┘  └────────┘  └────────┘
    │           │           │
    └───────────┴───────────┘
                │
    ┌───────────▼────────────┐
    │   MySQL  RDS           │
    │   MongoDB Atlas        │
    │   Redis ElastiCache    │
    │   Kafka MSK            │
    └────────────────────────┘
```

## Environment Variables Reference

All services receive:
- **Database**: MySQL RDS, MongoDB Atlas, Redis ElastiCache
- **Kafka**: MSK Bootstrap Servers
- **Service URLs**: Internal Kubernetes DNS (service-name:port)
- **Secrets**: JWT, Stripe, Gemini API keys

## Next Steps

1. Set up monitoring with CloudWatch Container Insights
2. Configure horizontal pod autoscaling
3. Set up ingress controller for better routing
4. Implement CI/CD pipeline with GitHub Actions
5. Set up backup strategy for stateful data
