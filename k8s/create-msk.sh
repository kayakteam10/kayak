#!/bin/bash
set -e

CLUSTER_NAME="kayak-kafka"
REGION="us-west-1"
VPC_ID="vpc-012985669353a4fb2"
SUBNET_1="subnet-047d984e94c5164cd"
SUBNET_2="subnet-05d30fcc7ffe4d29f"
SG_ID="sg-04f68e49b827a8ce7"

echo "==========================================="
echo " Creating Amazon MSK Cluster"
echo "==========================================="

# Create MSK configuration
cat > msk-config.json <<EOF
{
  "Name": "$CLUSTER_NAME",
  "KafkaVersion": "3.5.1",
  "NumberOfBrokerNodes": 2,
  "BrokerNodeGroupInfo": {
    "InstanceType": "kafka.t3.small",
    "ClientSubnets": [
      "$SUBNET_1",
      "$SUBNET_2"
    ],
    "SecurityGroups": [
      "$SG_ID"
    ],
    "StorageInfo": {
      "EbsStorageInfo": {
        "VolumeSize": 100
      }
    }
  },
  "EncryptionInfo": {
    "EncryptionInTransit": {
      "ClientBroker": "TLS_PLAINTEXT",
      "InCluster": true
    }
  },
  "EnhancedMonitoring": "DEFAULT",
  "ClientAuthentication": {
    "Unauthenticated": {
      "Enabled": true
    }
  }
}
EOF

echo "Creating MSK cluster..."
CLUSTER_ARN=$(aws kafka create-cluster \
  --cli-input-json file://msk-config.json \
  --region $REGION \
  --query 'ClusterArn' \
  --output text)

echo "Cluster ARN: $CLUSTER_ARN"
echo ""
echo "Waiting for cluster to be created (this takes 15-20 minutes)..."

# Wait for cluster to be active
while true; do
  STATE=$(aws kafka describe-cluster \
    --cluster-arn $CLUSTER_ARN \
    --region $REGION \
    --query 'ClusterInfo.State' \
    --output text)
  
  echo "Current state: $STATE"
  
  if [ "$STATE" == "ACTIVE" ]; then
    break
  fi
  
  sleep 30
done

echo ""
echo "✅ MSK Cluster is active!"
echo ""

# Get bootstrap servers
BOOTSTRAP_SERVERS=$(aws kafka get-bootstrap-brokers \
  --cluster-arn $CLUSTER_ARN \
  --region $REGION \
  --query 'BootstrapBrokerString' \
  --output text)

echo "==========================================="
echo " MSK Cluster Information"
echo "==========================================="
echo "Cluster ARN: $CLUSTER_ARN"
echo "Bootstrap Servers: $BOOTSTRAP_SERVERS"
echo ""
echo "UPDATE YOUR CONFIGMAP:"
echo "Edit k8s/manifests/01-configmap.yaml and set:"
echo "  KAFKA_BROKER: \"$BOOTSTRAP_SERVERS\""
echo ""

# Save to file
echo "KAFKA_CLUSTER_ARN=$CLUSTER_ARN" > msk-info.txt
echo "KAFKA_BOOTSTRAP_SERVERS=$BOOTSTRAP_SERVERS" >> msk-info.txt

echo "✅ Information saved to msk-info.txt"
