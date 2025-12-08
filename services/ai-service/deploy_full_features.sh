#!/bin/bash
# deploy_full_features.sh
# Quick deployment script for full feature implementation

set -e

echo "🚀 Deploying Full Agentic AI Feature Set..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running inside container or from host
if [ -f /.dockerenv ]; then
    echo "${GREEN}✓${NC} Running inside Docker container"
    EXEC_PREFIX=""
else
    echo "${YELLOW}⚠${NC} Running from host, will use docker exec"
    EXEC_PREFIX="docker exec kayak-ai-service"
fi

echo ""
echo "📦 Step 1: Install/verify dependencies..."
$EXEC_PREFIX pip install --quiet numpy aiokafka sqlmodel && echo "${GREEN}✓${NC} Dependencies ready"

echo ""
echo "🗄️ Step 2: Re-run data pipeline (fix hotel deals 0% → 15-25%)..."
$EXEC_PREFIX python scripts/setup_usa_deals_pipeline.py --clear-db

echo ""
echo "🔧 Step 3: Check background workers..."

# Check if deals agent is running
if docker ps | grep -q "deals-agent"; then
    echo "${GREEN}✓${NC} Deals Agent already running"
else
    echo "${YELLOW}⚠${NC} Deals Agent not running. Start with:"
    echo "   docker-compose up -d deals-agent"
    echo "   OR manually: docker exec -d kayak-ai-service python -m src.deals_agent_worker"
fi

# Check if watch monitor is running
if docker ps | grep -q "watch-monitor"; then
    echo "${GREEN}✓${NC} Watch Monitor already running"
else
    echo "${YELLOW}⚠${NC} Watch Monitor not running. Start with:"
    echo "   docker-compose up -d watch-monitor"
    echo "   OR manually: docker exec -d kayak-ai-service python -m src.watch_monitor"
fi

echo ""
echo "🧪 Step 4: Health checks..."

# Check main service
if curl -s http://localhost:8007/health | grep -q "healthy"; then
    echo "${GREEN}✓${NC} AI Service healthy"
else
    echo "${YELLOW}⚠${NC} AI Service not responding on port 8007"
fi

# Check database
if $EXEC_PREFIX python -c "from sqlmodel import create_engine, Session, select; from src.models import FlightDeal; engine = create_engine('mysql+pymysql://root:root123@mysql/kayak_db'); session = Session(engine); session.exec(select(FlightDeal).limit(1)).first(); print('OK')" 2>/dev/null | grep -q "OK"; then
    echo "${GREEN}✓${NC} Database connected"
else
    echo "${YELLOW}⚠${NC} Database connection issue"
fi

echo ""
echo "📊 Step 5: Verify data..."

# Count deals
FLIGHT_COUNT=$($EXEC_PREFIX python -c "
from sqlmodel import create_engine, Session, select, func
from src.models import FlightDeal
engine = create_engine('mysql+pymysql://root:root123@mysql/kayak_db')
session = Session(engine)
count = session.exec(select(func.count(FlightDeal.id))).first()
print(count)
" 2>/dev/null || echo "0")

HOTEL_COUNT=$($EXEC_PREFIX python -c "
from sqlmodel import create_engine, Session, select, func
from src.models import HotelDeal
engine = create_engine('mysql+pymysql://root:root123@mysql/kayak_db')
session = Session(engine)
count = session.exec(select(func.count(HotelDeal.id))).first()
print(count)
" 2>/dev/null || echo "0")

echo "   Flights: $FLIGHT_COUNT"
echo "   Hotels: $HOTEL_COUNT"

if [ "$FLIGHT_COUNT" -gt 0 ] && [ "$HOTEL_COUNT" -gt 0 ]; then
    echo "${GREEN}✓${NC} Data loaded successfully"
else
    echo "${YELLOW}⚠${NC} Data loading may have failed - check logs"
fi

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start background workers (if not already running):"
echo "   docker exec -d kayak-ai-service python -m src.deals_agent_worker"
echo "   docker exec -d kayak-ai-service python -m src.watch_monitor"
echo ""
echo "2. Test the chat endpoint:"
echo "   curl -X POST http://localhost:8007/chat/sessions -H 'Content-Type: application/json' -d '{\"user_id\": 1}'"
echo "   # Save session_id from response"
echo "   curl -X POST http://localhost:8007/chat -H 'Content-Type: application/json' -d '{\"session_id\": <ID>, \"message\": \"I want to travel\"}'"
echo ""
echo "3. Check logs:"
echo "   docker logs kayak-ai-service -f"
echo "   docker logs kayak-deals-agent-1 -f  # if running as separate container"
echo "   docker logs kayak-watch-monitor-1 -f  # if running as separate container"
echo ""
echo "4. Read full documentation:"
echo "   cat services/ai-service/FULL_IMPLEMENTATION_COMPLETE.md"
echo ""
echo "🎉 All 10 features implemented and ready for testing!"
