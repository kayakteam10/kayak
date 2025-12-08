#!/bin/bash
set -e

echo "==========================================="
echo " Deploying Kayak Services to EKS"
echo "==========================================="

# Apply configurations
echo "Applying ConfigMap and Secrets..."
kubectl apply -f manifests/01-configmap.yaml
kubectl apply -f manifests/02-secrets.yaml

# Deploy platform service (API Gateway)
echo ""
echo "Deploying Platform Service (API Gateway)..."
kubectl apply -f manifests/03-platform-service.yaml

# Deploy all microservices
echo ""
echo "Deploying Microservices..."
kubectl apply -f manifests/04-flight-service.yaml
kubectl apply -f manifests/05-hotel-service.yaml
kubectl apply -f manifests/06-car-service.yaml
kubectl apply -f manifests/07-booking-service.yaml
kubectl apply -f manifests/08-payment-billing-service.yaml
kubectl apply -f manifests/09-review-service.yaml
kubectl apply -f manifests/10-ai-service.yaml

echo ""
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all

echo ""
echo "==========================================="
echo " Deployment Status"
echo "==========================================="
kubectl get deployments
echo ""
kubectl get services
echo ""
kubectl get pods

echo ""
echo "==========================================="
echo " Getting Platform Service URL"
echo "==========================================="
kubectl get service platform-service

echo ""
echo "✅ Deployment complete!"
echo ""
echo "NOTE: The LoadBalancer may take a few minutes to provision."
echo "Run this command to get the external URL:"
echo "  kubectl get service platform-service"
