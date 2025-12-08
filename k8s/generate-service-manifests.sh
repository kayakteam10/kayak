#!/bin/bash

# Service configurations: name:port
SERVICES=(
  "flight-service:8001"
  "hotel-service:8002"
  "car-service:8003"
  "booking-service:8004"
  "payment-billing-service:8005"
  "review-service:8006"
  "ai-service:8007"
)

ACCOUNT_ID="623653227185"
REGION="us-west-1"

for entry in "${SERVICES[@]}"; do
  IFS=':' read -r SERVICE PORT <<< "$entry"
  FILE_NUM=$((${PORT:3} + 3))  # 04, 05, 06, etc.
  
  cat > /Users/vineet/Documents/kayak/k8s/manifests/${FILE_NUM}-${SERVICE}.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $SERVICE
  labels:
    app: $SERVICE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: $SERVICE
  template:
    metadata:
      labels:
        app: $SERVICE
    spec:
      containers:
      - name: $SERVICE
        image: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/kayak/$SERVICE:latest
        imagePullPolicy: Always
        ports:
        - containerPort: $PORT
          name: http
        env:
        - name: PORT
          value: "$PORT"
        envFrom:
        - configMapRef:
            name: kayak-config
        - secretRef:
            name: kayak-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: $PORT
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: $PORT
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: $SERVICE
spec:
  selector:
    app: $SERVICE
  ports:
  - protocol: TCP
    port: $PORT
    targetPort: $PORT
  type: ClusterIP
EOF

  echo "✅ Created ${FILE_NUM}-${SERVICE}.yaml"
done

echo ""
echo "All service manifests created!"
