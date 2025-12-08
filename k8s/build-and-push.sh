#!/bin/bash
set -e

# Configuration
REGION="us-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Services to build
SERVICES=("platform-service" "flight-service" "hotel-service" "car-service" "booking-service" "payment-billing-service" "review-service" "ai-service")

echo "==========================================="
echo " Building Docker Images for Kayak Services"
echo "==========================================="
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo "ECR Registry: $ECR_REGISTRY"
echo ""

# Login to ECR
echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "==========================================="
  echo "Processing: $SERVICE"
  echo "==========================================="
  
  # Create ECR repository if it doesn't exist
  echo "Creating ECR repository (if needed)..."
  aws ecr describe-repositories --repository-names kayak/$SERVICE --region $REGION 2>/dev/null || \
    aws ecr create-repository --repository-name kayak/$SERVICE --region $REGION
  
  # Build Docker image
  echo "Building Docker image..."
  cd ../services/$SERVICE
  docker build -t kayak/$SERVICE:latest -t kayak/$SERVICE:$(date +%Y%m%d-%H%M%S) .
  
  # Tag for ECR
  docker tag kayak/$SERVICE:latest $ECR_REGISTRY/kayak/$SERVICE:latest
  
  # Push to ECR
  echo "Pushing to ECR..."
  docker push $ECR_REGISTRY/kayak/$SERVICE:latest
  
  cd ../../k8s
  
  echo "✅ $SERVICE completed!"
done

echo ""
echo "==========================================="
echo " All services built and pushed successfully!"
echo "==========================================="
echo ""
echo "Image URIs:"
for SERVICE in "${SERVICES[@]}"; do
  echo "  - $ECR_REGISTRY/kayak/$SERVICE:latest"
done
