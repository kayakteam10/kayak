#!/bin/bash
set -e

CLUSTER_NAME="kayak-cluster"
REGION="us-west-1"
NODE_TYPE="t3.small"
NODES=2

echo "==========================================="
echo " Creating EKS Cluster: $CLUSTER_NAME"
echo "==========================================="

# Create EKS cluster
eksctl create cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --nodegroup-name kayak-nodes \
  --node-type $NODE_TYPE \
  --nodes $NODES \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed \
  --with-oidc \
  --ssh-access=false \
  --full-ecr-access \
  --version 1.34

echo "✅ EKS Cluster created successfully!"
echo ""
echo "Configuring kubectl..."
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME

echo "✅ kubectl configured!"
echo ""
echo "Cluster Info:"
kubectl cluster-info
echo ""
echo "Nodes:"
kubectl get nodes
