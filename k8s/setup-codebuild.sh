#!/bin/bash
set -e

REGION="us-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT_PREFIX="kayak-build"

SERVICES=("platform-service" "flight-service" "hotel-service" "car-service" "booking-service" "payment-billing-service" "review-service" "ai-service")

echo "==========================================="
echo " Setting up AWS CodeBuild Projects"
echo "==========================================="
echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo ""

# Create IAM role for CodeBuild if it doesn't exist
ROLE_NAME="KayakCodeBuildRole"
echo "Creating IAM role for CodeBuild..."

cat > /tmp/codebuild-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "codebuild.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

# Create role
aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file:///tmp/codebuild-trust-policy.json \
  --region $REGION 2>/dev/null || echo "Role already exists"

# Attach policies
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser \
  --region $REGION 2>/dev/null || true

aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess \
  --region $REGION 2>/dev/null || true

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
echo "✅ IAM Role: $ROLE_ARN"
echo ""

# Wait for role to propagate
sleep 10

# Create CodeBuild project for each service
for SERVICE in "${SERVICES[@]}"; do
  PROJECT_NAME="$PROJECT_PREFIX-$SERVICE"
  
  echo "Creating CodeBuild project: $PROJECT_NAME"
  
  cat > /tmp/codebuild-project.json <<EOF
{
  "name": "$PROJECT_NAME",
  "source": {
    "type": "GITHUB",
    "location": "https://github.com/kayakteam10/kayak.git",
    "buildspec": "buildspec.yml"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:7.0",
    "computeType": "BUILD_GENERAL1_SMALL",
    "privilegedMode": true,
    "environmentVariables": [
      {
        "name": "AWS_DEFAULT_REGION",
        "value": "$REGION"
      },
      {
        "name": "AWS_ACCOUNT_ID",
        "value": "$ACCOUNT_ID"
      },
      {
        "name": "SERVICE_NAME",
        "value": "$SERVICE"
      }
    ]
  },
  "serviceRole": "$ROLE_ARN"
}
EOF

  aws codebuild create-project \
    --cli-input-json file:///tmp/codebuild-project.json \
    --region $REGION 2>/dev/null && echo "✅ Created $PROJECT_NAME" || echo "⚠️  $PROJECT_NAME already exists"
done

echo ""
echo "==========================================="
echo " CodeBuild Projects Created!"
echo "==========================================="
echo ""
echo "Projects created:"
for SERVICE in "${SERVICES[@]}"; do
  echo "  - $PROJECT_PREFIX-$SERVICE"
done
