#!/bin/bash
set -e

REGION="us-west-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT_PREFIX="kayak-build"

SERVICES=("platform-service" "flight-service" "hotel-service" "car-service" "booking-service" "payment-billing-service" "review-service" "ai-service")

echo "==========================================="
echo " Updating CodeBuild Projects with Inline Buildspec"
echo "==========================================="

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/KayakCodeBuildRole"

# Delete old projects
for SERVICE in "${SERVICES[@]}"; do
  PROJECT_NAME="$PROJECT_PREFIX-$SERVICE"
  echo "Deleting old project: $PROJECT_NAME"
  aws codebuild delete-project --name $PROJECT_NAME --region $REGION 2>/dev/null || true
done

echo ""
echo "Creating new projects with inline buildspec..."

# Create CodeBuild project for each service with inline buildspec
for SERVICE in "${SERVICES[@]}"; do
  PROJECT_NAME="$PROJECT_PREFIX-$SERVICE"
  
  echo "Creating: $PROJECT_NAME"
  
  cat > /tmp/codebuild-project-inline.json <<EOF
{
  "name": "$PROJECT_NAME",
  "source": {
    "type": "GITHUB",
    "location": "https://github.com/kayakteam10/kayak.git",
    "buildspec": "version: 0.2\nphases:\n  pre_build:\n    commands:\n      - echo Logging in to Amazon ECR...\n      - aws ecr get-login-password --region \$AWS_DEFAULT_REGION | docker login --username AWS --password-stdin \$AWS_ACCOUNT_ID.dkr.ecr.\$AWS_DEFAULT_REGION.amazonaws.com\n      - REPOSITORY_URI=\$AWS_ACCOUNT_ID.dkr.ecr.\$AWS_DEFAULT_REGION.amazonaws.com/kayak/\$SERVICE_NAME\n      - IMAGE_TAG=\$(echo \$CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)\n  build:\n    commands:\n      - echo Build started on \`date\`\n      - echo Building the Docker image for \$SERVICE_NAME...\n      - cd services/\$SERVICE_NAME\n      - docker build -t \$REPOSITORY_URI:latest -t \$REPOSITORY_URI:\$IMAGE_TAG .\n  post_build:\n    commands:\n      - echo Build completed on \`date\`\n      - echo Pushing the Docker images...\n      - docker push \$REPOSITORY_URI:latest\n      - docker push \$REPOSITORY_URI:\$IMAGE_TAG\n      - echo Image pushed to \$REPOSITORY_URI:latest"
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
    --cli-input-json file:///tmp/codebuild-project-inline.json \
    --region $REGION 2>/dev/null && echo "✅ Created $PROJECT_NAME" || echo "⚠️  Failed to create $PROJECT_NAME"
done

echo ""
echo "==========================================="
echo " Projects Updated!"
echo "==========================================="
echo ""
echo "Now run: ./trigger-builds.sh"
