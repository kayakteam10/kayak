#!/bin/bash

# Enhanced Health Check Script with Debug Logging
# Verifies all services with detailed error reporting

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MAX_RETRIES=10
RETRY_DELAY=3
TOTAL_SERVICES=0
HEALTHY_SERVICES=0
DEBUG_MODE=${DEBUG:-false}

echo ""
echo "🏥 Kayak Microservices Health Check"
echo "======================================"
echo ""

# Debug logging function
debug_log() {
    if [ "$DEBUG_MODE" = "true" ]; then
        echo -e "${CYAN}[DEBUG]${NC} $1"
    fi
}

# Function to check a single service with detailed logging
check_service() {
    local name=$1
    local url=$2
    local retries=0
    
    ((TOTAL_SERVICES++))
    
    echo -e "${BLUE}🔍 Checking${NC} $name at $url..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        # Make the request and capture both response and HTTP code
        response=$(curl -sf --max-time 5 "$url" 2>&1)
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>&1)
        
        debug_log "Attempt $((retries+1))/$MAX_RETRIES - HTTP Code: $http_code"
        debug_log "Response: $response"
        
        if [ "$http_code" = "200" ]; then
            echo -e "${GREEN}✅ $name${NC} - Healthy"
            ((HEALTHY_SERVICES++))
            return 0
        elif [ "$http_code" = "503" ]; then
            echo -e "${YELLOW}⏳ $name${NC} - Service starting (503), checking response..."
            # Try to extract error from response
            if echo "$response" | grep -q "error"; then
                echo -e "${YELLOW}   └─ Error:${NC} $(echo $response | grep -o '"error":"[^"]*"' | cut -d'"' -f4)"
            fi
        elif [ "$http_code" = "000" ]; then
            debug_log "Connection refused or timeout"
        else
            debug_log "Unexpected HTTP code: $http_code"
        fi
        
        ((retries++))
        if [ $retries -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    done
    
    echo -e "${RED}❌ $name${NC} - Unhealthy (failed after $MAX_RETRIES attempts)"
    echo -e "${RED}   └─ Last HTTP Code:${NC} $http_code"
    echo -e "${RED}   └─ URL:${NC} $url"
    if [ -n "$response" ]; then
        echo -e "${RED}   └─ Response:${NC} $response" | head -c 200
    fi
    return 1
}

# Check infrastructure services (Docker containers)
echo "📦 Infrastructure Services:"
echo "----------------------------"

check_docker() {
    local container=$1
    local name=$2
    
    ((TOTAL_SERVICES++))
    
    echo -e "${BLUE}🔍 Checking${NC} $name container..."
    
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "running")
        local state=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
        
        debug_log "Container state: $state, Health: $status"
        
        if [ "$status" = "healthy" ] || [ "$status" = "running" ]; then
            echo -e "${GREEN}✅ $name${NC} - Running (State: $state)"
            ((HEALTHY_SERVICES++))
            return 0
        else
            echo -e "${YELLOW}⚠️  $name${NC} - Running but not healthy (State: $status)"
            # Show last few log lines if unhealthy
            echo -e "${YELLOW}   └─ Recent logs:${NC}"
            docker logs "$container" --tail 5 2>&1 | sed 's/^/      /'
            return 1
        fi
    else
        echo -e "${RED}❌ $name${NC} - Not running"
        echo -e "${RED}   └─ Container '$container' not found${NC}"
        return 1
    fi
}

check_docker "kayak-mysql" "MySQL"
check_docker "kayak-mongodb" "MongoDB"
check_docker "kayak-redis" "Redis"
check_docker "kayak-kafka" "Kafka"
check_docker "kayak-zookeeper" "Zookeeper"

echo ""
echo "🚀 Application Services:"
echo "----------------------------"

# Check application services via health endpoints
check_service "Flight Service" "http://localhost:8001/health"
check_service "Hotel Service" "http://localhost:8002/health"
check_service "Car Service" "http://localhost:8003/health"
check_service "Booking Service" "http://localhost:8004/health"
check_service "Payment Service" "http://localhost:8005/health"
check_service "Review Service" "http://localhost:8006/health"

echo ""
echo "🌐 Gateway & Frontend:"
echo "----------------------------"

check_service "Platform Service" "http://localhost:8080/health"

echo ""
echo "======================================"
echo -e "📊 Health Summary: ${GREEN}${HEALTHY_SERVICES}${NC}/${TOTAL_SERVICES} services healthy"
echo ""

# Provide actionable debugging commands if services are unhealthy
if [ $HEALTHY_SERVICES -lt $TOTAL_SERVICES ]; then
    echo -e "${YELLOW}🔧 Debugging Commands:${NC}"
    echo "  View all container status:"
    echo "    docker compose -f services/docker-compose.yml ps"
    echo ""
    echo "  Check specific service logs:"
    echo "    docker logs kayak-booking-service --tail 50"
    echo "    docker logs kayak-payment-service --tail 50"
    echo "    docker logs kayak-ai-service --tail 50"
    echo ""
    echo "  Restart unhealthy services:"
    echo "    docker compose -f services/docker-compose.yml restart booking-service"
    echo ""
    echo "  Run in debug mode:"
    echo "    DEBUG=true ./scripts/health_check.sh"
    echo ""
fi

if [ $HEALTHY_SERVICES -eq $TOTAL_SERVICES ]; then
    echo -e "${GREEN}🎉 All services are healthy!${NC}"
    exit 0
elif [ $HEALTHY_SERVICES -gt $((TOTAL_SERVICES / 2)) ]; then
    echo -e "${YELLOW}⚠️  Some services are unhealthy${NC}"
    exit 1
else
    echo -e "${RED}❌ Critical: Most services are unhealthy${NC}"
    exit 2
fi
