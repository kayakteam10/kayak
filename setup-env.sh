#!/bin/bash

# ==================================================
# Kayak Simulation - Environment Setup Script
# ==================================================
# This script helps set up environment variables for different deployment scenarios

set -e

echo "=========================================="
echo "Kayak Simulation - Environment Setup"
echo "=========================================="
echo ""

# Function to prompt for value with default
prompt_with_default() {
    local var_name=$1
    local default_value=$2
    local description=$3
    
    echo "$description"
    read -p "$var_name [$default_value]: " input
    echo "${input:-$default_value}"
}

# Detect environment
echo "Select deployment environment:"
echo "1) Local Development (Docker Compose)"
echo "2) AWS Production (EC2 Instances)"
echo "3) Custom"
read -p "Choice [1]: " env_choice
env_choice=${env_choice:-1}

echo ""

# Create .env file
ENV_FILE=".env"

case $env_choice in
    1)
        echo "Setting up for Local Development..."
        cp .env.example $ENV_FILE
        echo "✓ Created .env file with local defaults"
        echo ""
        echo "Default configuration uses:"
        echo "  - Gateway: http://localhost:8080"
        echo "  - Frontend: http://localhost:8088"
        echo "  - All services running in Docker containers"
        ;;
    
    2)
        echo "Setting up for AWS Production..."
        echo ""
        
        # Prompt for AWS-specific values
        GATEWAY_HOST=$(prompt_with_default "GATEWAY_HOST" "api.yourdomain.com" "Enter your API Gateway domain/IP:")
        FRONTEND_HOST=$(prompt_with_default "FRONTEND_HOST" "yourdomain.com" "Enter your Frontend domain/IP:")
        
        # Database
        echo ""
        echo "Database Configuration:"
        MYSQL_HOST=$(prompt_with_default "MYSQL_HOST" "your-rds-endpoint.region.rds.amazonaws.com" "Enter MySQL/RDS hostname:")
        MYSQL_PASSWORD=$(prompt_with_default "MYSQL_PASSWORD" "" "Enter MySQL password:")
        
        MONGODB_HOST=$(prompt_with_default "MONGODB_HOST" "your-mongodb-host" "Enter MongoDB hostname:")
        REDIS_HOST=$(prompt_with_default "REDIS_HOST" "your-elasticache-endpoint" "Enter Redis/ElastiCache hostname:")
        
        # Kafka
        echo ""
        KAFKA_BROKER=$(prompt_with_default "KAFKA_BROKER" "your-kafka-broker:9092" "Enter Kafka broker address:")
        
        # External Services
        echo ""
        echo "External Services:"
        STRIPE_SECRET=$(prompt_with_default "STRIPE_SECRET_KEY" "" "Enter Stripe Secret Key:")
        GEMINI_KEY=$(prompt_with_default "GEMINI_API_KEY" "" "Enter Google Gemini API Key:")
        
        # Write to .env
        cat > $ENV_FILE <<EOF
# AWS Production Environment Configuration
# Generated on $(date)

# Gateway / Platform
GATEWAY_HOST=$GATEWAY_HOST
GATEWAY_PORT=8080
GATEWAY_URL=https://$GATEWAY_HOST

# Frontend
FRONTEND_HOST=$FRONTEND_HOST
FRONTEND_PORT=3000
PUBLIC_FRONTEND_URL=https://$FRONTEND_HOST

# Databases
MYSQL_HOST=$MYSQL_HOST
MYSQL_PORT=3306
MYSQL_DATABASE=kayak_db
MYSQL_USER=admin
MYSQL_PASSWORD=$MYSQL_PASSWORD

MONGODB_HOST=$MONGODB_HOST
MONGODB_PORT=27017
MONGODB_DATABASE=kayak_reviews
MONGODB_URL=mongodb://$MONGODB_HOST:27017/kayak_reviews

REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379
REDIS_URL=redis://$REDIS_HOST:6379

# Message Queue
KAFKA_BROKER=$KAFKA_BROKER

# External Services
STRIPE_SECRET_KEY=$STRIPE_SECRET
GEMINI_API_KEY=$GEMINI_KEY

# Application
NODE_ENV=production
LOG_LEVEL=info

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
EOF

        echo ""
        echo "✓ Created .env file for AWS Production"
        ;;
        
    3)
        echo "Using custom configuration..."
        cp .env.example $ENV_FILE
        echo "✓ Created .env file"
        echo "Please edit .env file manually with your configuration"
        ;;
esac

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Review and update .env file with your actual values"
echo "2. For frontend, also update frontend/.env file"
echo "3. For AWS deployment, set environment variables in EC2 instances"
echo "4. Never commit .env files to version control"
echo ""
echo "For local development:"
echo "  cd services && docker-compose up -d"
echo ""
echo "For AWS deployment, see DEPLOYMENT.md"
echo ""
