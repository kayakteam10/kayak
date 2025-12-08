#!/bin/bash
set -e

REGION="us-west-1"
ACCOUNT_ID=623653227185
ECR=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

SERVICES=("platform-service" "flight-service" "hotel-service" "car-service" "booking-service" "payment-billing-service" "review-service" "ai-service")

echo "==========================================="
echo " Rebuilding for AMD64 (linux/amd64)"
echo "==========================================="

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "=== $SERVICE ==="
  cd ../services/$SERVICE
  docker buildx build --platform linux/amd64 -t $ECR/kayak/$SERVICE:latest --push .
  cd ../../k8s
  echo "✅ $SERVICE"
done

echo ""
echo "✅ All services rebuilt for AMD64!"
