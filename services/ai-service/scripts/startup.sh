#!/bin/bash
# Startup script for AI service - waits for dependencies and initializes the service

set -e

echo "🚀 Starting AI Service..."

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Wait for MySQL
echo -e "${YELLOW}⏳ Waiting for MySQL...${NC}"
while ! mysqladmin ping -h"${DB_HOST:-mysql}" --silent; do
    sleep 1
done
echo -e "${GREEN}✅ MySQL is ready${NC}"

# Wait for Kafka
echo -e "${YELLOW}⏳ Waiting for Kafka...${NC}"
KAFKA_HOST=$(echo ${KAFKA_BROKER:-kafka:9092} | cut -d: -f1)
KAFKA_PORT=$(echo ${KAFKA_BROKER:-kafka:9092} | cut -d: -f2)
while ! nc -z "$KAFKA_HOST" "$KAFKA_PORT" 2>/dev/null; do
    sleep 1
done
echo -e "${GREEN}✅ Kafka is ready${NC}"

# Wait for Ollama
echo -e "${YELLOW}⏳ Waiting for Ollama...${NC}"
OLLAMA_HOST=$(echo ${OLLAMA_URL:-http://ollama:11434} | sed 's|http://||' | cut -d: -f1)
while ! curl -f "${OLLAMA_URL:-http://ollama:11434}/api/tags" >/dev/null 2>&1; do
    sleep 2
done
echo -e "${GREEN}✅ Ollama is ready${NC}"

# Check if Llama model is downloaded
echo -e "${YELLOW}📦 Checking for Llama model...${NC}"
if ! curl -s "${OLLAMA_URL:-http://ollama:11434}/api/tags" | grep -q "${OLLAMA_MODEL:-llama3.2:3b}"; then
    echo -e "${YELLOW}📥 Pulling Llama model (this may take a few minutes)...${NC}"
    curl -X POST ${OLLAMA_URL:-http://ollama:11434}/api/pull -d "{\"name\": \"${OLLAMA_MODEL:-llama3.2:3b}\"}"
    echo -e "${GREEN}✅ Model downloaded${NC}"
else
    echo -e "${GREEN}✅ Model already available${NC}"
fi

# Start the service
echo -e "${GREEN}🎯 Starting FastAPI service on port ${PORT:-8007}...${NC}"
exec uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8007}"
