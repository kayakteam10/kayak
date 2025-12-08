#!/bin/bash

REGION="us-west-1"
PROJECT_PREFIX="kayak-build"

SERVICES=("platform-service" "flight-service" "hotel-service" "car-service" "booking-service" "payment-billing-service" "review-service" "ai-service")

echo "==========================================="
echo " CodeBuild Status Monitor"
echo "==========================================="
echo ""

while true; do
  clear
  echo "==========================================="
  echo " Build Status - $(date '+%H:%M:%S')"
  echo "==========================================="
  echo ""
  
  ALL_COMPLETE=true
  
  for SERVICE in "${SERVICES[@]}"; do
    PROJECT_NAME="$PROJECT_PREFIX-$SERVICE"
    
    # Get latest build
    BUILD_INFO=$(aws codebuild list-builds-for-project \
      --project-name $PROJECT_NAME \
      --region $REGION \
      --max-items 1 \
      --query 'ids[0]' \
      --output text 2>/dev/null)
    
    if [ "$BUILD_INFO" != "None" ] && [ ! -z "$BUILD_INFO" ]; then
      # Get build status
      STATUS=$(aws codebuild batch-get-builds \
        --ids "$BUILD_INFO" \
        --region $REGION \
        --query 'builds[0].buildStatus' \
        --output text 2>/dev/null)
      
      PHASE=$(aws codebuild batch-get-builds \
        --ids "$BUILD_INFO" \
        --region $REGION \
        --query 'builds[0].currentPhase' \
        --output text 2>/dev/null)
      
      # Color output
      if [ "$STATUS" = "SUCCEEDED" ]; then
        echo "✅ $SERVICE: $STATUS"
      elif [ "$STATUS" = "FAILED" ]; then
        echo "❌ $SERVICE: $STATUS"
        ALL_COMPLETE=true
      elif [ "$STATUS" = "IN_PROGRESS" ]; then
        echo "🔄 $SERVICE: $STATUS ($PHASE)"
        ALL_COMPLETE=false
      else
        echo "⏳ $SERVICE: $STATUS"
      fi
    else
      echo "⚪ $SERVICE: No builds found"
    fi
  done
  
  echo ""
  echo "==========================================="
  
  if $ALL_COMPLETE; then
    echo ""
    echo "✅ All builds complete!"
    echo ""
    echo "View build details:"
    echo "  aws codebuild list-builds-for-project --project-name kayak-build-platform-service --region $REGION"
    echo ""
    echo "Next step: Create EKS cluster"
    echo "  cd /Users/vineet/Documents/kayak/k8s"
    echo "  ./create-cluster.sh"
    break
  fi
  
  echo ""
  echo "Refreshing in 10 seconds... (Ctrl+C to stop)"
  sleep 10
done
