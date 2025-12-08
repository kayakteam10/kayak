#!/bin/bash
set -e

REGION="us-west-1"
PROJECT_PREFIX="kayak-build"

SERVICES=("platform-service" "flight-service" "hotel-service" "car-service" "booking-service" "payment-billing-service" "review-service" "ai-service")

echo "==========================================="
echo " Starting CodeBuild for All Services"
echo "==========================================="
echo ""

BUILD_IDS=()

for SERVICE in "${SERVICES[@]}"; do
  PROJECT_NAME="$PROJECT_PREFIX-$SERVICE"
  
  echo "Starting build for $SERVICE..."
  
  BUILD_ID=$(aws codebuild start-build \
    --project-name $PROJECT_NAME \
    --region $REGION \
    --query 'build.id' \
    --output text)
  
  BUILD_IDS+=("$BUILD_ID")
  echo "✅ Build started: $BUILD_ID"
done

echo ""
echo "==========================================="
echo " All Builds Started!"
echo "==========================================="
echo ""
echo "Build IDs:"
for BUILD_ID in "${BUILD_IDS[@]}"; do
  echo "  $BUILD_ID"
done

echo ""
echo "==========================================="
echo " Monitor Builds"
echo "==========================================="
echo ""
echo "View in AWS Console:"
echo "  https://console.aws.amazon.com/codesuite/codebuild/$REGION/projects?region=$REGION"
echo ""
echo "Monitor via CLI:"
echo "  ./monitor-builds.sh"
echo ""
echo "Check specific build:"
echo "  aws codebuild batch-get-builds --ids <BUILD_ID> --region $REGION"
