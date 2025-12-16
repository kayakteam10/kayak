# TripWeave EKS Deployment - Quick Start

## 🚀 Complete EKS Deployment Package

This directory contains everything needed to deploy the TripWeave microservices platform on Amazon EKS (Elastic Kubernetes Service).

## 📁 Directory Structure

```
k8s/
├── build-and-push.sh              # Build Docker images and push to ECR
├── create-cluster.sh              # Create EKS cluster
├── create-msk.sh                  # Create Kafka (MSK) cluster
├── deploy.sh                      # Deploy all services to EKS
├── generate-service-manifests.sh  # Generate Kubernetes manifests
├── DEPLOYMENT_GUIDE.md            # Detailed step-by-step guide
└── manifests/
    ├── 01-configmap.yaml          # Environment variables
    ├── 02-secrets.yaml            # Sensitive credentials
    ├── 03-platform-service.yaml   # API Gateway (LoadBalancer)
    ├── 04-flight-service.yaml     # Flight microservice
    ├── 05-hotel-service.yaml      # Hotel microservice
    ├── 06-car-service.yaml        # Car microservice
    ├── 07-booking-service.yaml    # Booking microservice
    ├── 08-payment-billing-service.yaml  # Payment microservice
    ├── 09-review-service.yaml     # Review microservice
    └── 10-ai-service.yaml         # AI microservice
```

## ⚡ Quick Deployment (30 minutes total)

### 1. Prerequisites (5 min)
```bash
# Install tools
brew install eksctl kubectl docker

# Verify AWS credentials
aws sts get-caller-identity
```

### 2. Build & Push Images (10-15 min)
```bash
cd /Users/vineet/Documents/kayak/k8s
./build-and-push.sh
```

### 3. Create EKS Cluster (15-20 min)
```bash
./create-cluster.sh
```

### 4. Create Kafka Cluster (15-20 min) - Optional, can do later
```bash
./create-msk.sh
# Update manifests/01-configmap.yaml with the bootstrap servers
```

### 5. Update Secrets (2 min)
```bash
vi manifests/02-secrets.yaml
# Add your real Stripe and Gemini API keys
```

### 6. Deploy Services (5-10 min)
```bash
./deploy.sh
```

### 7. Get API URL
```bash
kubectl get service platform-service
# Wait for EXTERNAL-IP to be assigned (may take 2-3 minutes)
```

## 🏗️ Architecture

**Current Deployment:**
- ✅ 8 Microservices running in Kubernetes pods
- ✅ MySQL RDS (already provisioned)
- ✅ MongoDB Atlas (cloud-hosted)
- ✅ Redis ElastiCache (already provisioned)
- 🔄 Kafka MSK (optional - create with `./create-msk.sh`)
- ✅ Platform Service exposed via AWS Load Balancer
- ✅ Auto-scaling and self-healing enabled

**Services:**
1. Platform Service (8080) - API Gateway + Auth
2. Flight Service (8001)
3. Hotel Service (8002)
4. Car Service (8003)
5. Booking Service (8004)
6. Payment Service (8005)
7. Review Service (8006)
8. AI Service (8007)

## 🔧 Management Commands

### View Status
```bash
kubectl get pods                    # All pods
kubectl get services                # All services
kubectl get deployments             # All deployments
kubectl logs <pod-name>             # View logs
kubectl describe pod <pod-name>     # Debug issues
```

### Scale Services
```bash
kubectl scale deployment flight-service --replicas=3
```

### Update Service
```bash
# After pushing new image
kubectl rollout restart deployment/flight-service
kubectl rollout status deployment/flight-service
```

### Access Logs
```bash
kubectl logs -f deployment/platform-service
```

## 💰 Cost Management

### Pause Cluster (when not in use)
```bash
eksctl scale nodegroup --cluster=tripweave-cluster --name=tripweave-nodes --nodes=0
```

### Resume Cluster
```bash
eksctl scale nodegroup --cluster=tripweave-cluster --name=tripweave-nodes --nodes=3
```

### Delete Everything
```bash
eksctl delete cluster --name tripweave-cluster --region us-west-1
# Also delete MSK cluster if created
```

## 📊 Monitoring

### CloudWatch Container Insights
```bash
# Install CloudWatch agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml
```

### View Metrics
- Go to CloudWatch Console
- Select Container Insights
- View pod and service metrics

## 🔒 Security Notes

⚠️ **IMPORTANT:** Before deploying to production:

1. Update `manifests/02-secrets.yaml` with real credentials
2. Enable SSL/TLS on the Load Balancer
3. Set up VPC security groups properly
4. Configure WAF for the LoadBalancer
5. Enable encryption at rest for all data stores
6. Implement proper RBAC in Kubernetes
7. Use AWS Secrets Manager instead of Kubernetes secrets

## 🐛 Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### Service not accessible
```bash
kubectl get endpoints
kubectl describe service platform-service
```

### Database connection issues
```bash
# Check if ConfigMap is correct
kubectl get configmap tripweave-config -o yaml

# Check if Secrets are loaded
kubectl get secret tripweave-secrets
```

### Image pull errors
```bash
# Verify ECR repos exist
aws ecr describe-repositories --region us-west-1

# Check if nodes have ECR pull permissions
kubectl describe pod <pod-name> | grep -A 10 Events
```

## 📚 Additional Resources

- [Detailed Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## ✅ Success Checklist

- [ ] Prerequisites installed
- [ ] Docker images built and pushed to ECR
- [ ] EKS cluster created
- [ ] ConfigMap and Secrets updated
- [ ] All services deployed
- [ ] LoadBalancer URL obtained
- [ ] Frontend updated with new API URL
- [ ] Health checks passing
- [ ] API endpoints tested

## 🎯 Next Steps After Deployment

1. Update frontend with LoadBalancer URL
2. Test all API endpoints
3. Configure autoscaling policies
4. Set up CI/CD pipeline
5. Configure monitoring and alerts
6. Implement backup strategy
7. Set up SSL/TLS certificates
8. Configure custom domain

---

**Support:** For issues, check the logs and troubleshooting section above.
