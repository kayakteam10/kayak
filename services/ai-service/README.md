# AI Travel Concierge Service

Multi-agent AI service that provides intelligent travel recommendations using natural language understanding powered by Llama 3B.

## Overview

This service is a **multi-agent travel concierge** that periodically discovers great deals, reasons about user needs in conversation, and turns those insights into actionable trip recommendations. It behaves less like a search box and more like a proactive teammate that plans, explains, and adapts.

### Key Features

- **Natural Language Understanding**: Understands travel intent (dates, budget, constraints) using Llama 3.2 (3B)
- **Deal Detection**: Automatically finds and tags flight + hotel deals using rule-based scoring
- **Bundle Creation**: Composes optimal flight+hotel packages based on user preferences
- **Real-time Notifications**: WebSocket-based alerts for price drops and inventory changes
- **Policy Q&A**: Answers questions about cancellation, refunds, amenities using dataset metadata

## Tech Stack

- **Framework**: FastAPI (async HTTP + WebSockets)
- **Database**: SQLModel with MySQL (shared with other services)
- **Messaging**: Kafka with aiokafka for event streaming
- **LLM**: Ollama with Llama 3.2 (3B) for intent extraction and explanations
- **Validation**: Pydantic v2 for request/response schemas
- **Caching**: Redis (optional, for frequently accessed deals)

## Architecture

### Multi-Agent System

**Deals Agent (Backend Worker)**:
- Feed Ingestion → Deal Detection → Scoring → Tagging → Event Emission
- Kafka topics: `raw_supplier_feeds` → `deals.normalized` → `deals.scored` → `deals.tagged` → `deal.events`

**Concierge Agent (Chat-Facing)**:
- Intent Understanding → Trip Planning → Explanation Generation → Policy Q&A → Watch Management

## Prerequisites

- Python 3.10+
- Ollama (for LLM)
- Kafka & Zookeeper
- MySQL 8.0
- Redis (optional)
- Kaggle API credentials (for dataset downloads)

## Setup Instructions

### 1. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Download Datasets

```bash
# Set up Kaggle credentials first
mkdir -p ~/.kaggle
# Add your kaggle.json file to ~/.kaggle/

# Download and preprocess datasets
bash ../../scripts/download_kaggle_datasets.sh
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run Locally

```bash
# Start the API service
uvicorn src.main:app --host 0.0.0.0 --port 8007 --reload

# Or start the deals worker (in another terminal)
python scripts/start_deals_worker.py
```

### 5. Docker Deployment

```bash
# From services directory
docker-compose up -d ai-service ollama
```

## API Endpoints

### Chat & Recommendations

**POST /chat/sessions**
- Create a new chat session
- Returns: `session_id` and `session_token`

**POST /chat**
- Send a message to the concierge
- Request: `{session_id, message}`
- Returns: Assistant response with bundles

**GET /chat/sessions/{session_id}/history**
- Retrieve conversation history
- Returns: List of messages with timestamps

### Bundles

**POST /bundles**
- Generate travel bundles from structured query
- Request: `ChatQuery` with origin, destination, dates, budget, preferences
- Returns: Top 5 bundles sorted by fit score

**GET /deals/latest**
- Get latest detected deals
- Returns: Top 20 deals sorted by deal score

### Watches

**POST /watches**
- Create price/inventory watch on a bundle
- Request: `{bundle_id, max_price?, min_rooms_left?, min_seats_left?}`
- Returns: `watch_id`

**GET /watches/{watch_id}**
- Get watch details

**DELETE /watches/{watch_id}**
- Cancel a watch

### Policy Q&A

**POST /policies/query**
- Ask questions about entity policies
- Request: `{entity_type, entity_id, question}`
- Returns: Concise answer with source metadata

### Health

**GET /health**
- Service health check
- Returns: DB, Kafka, and Ollama connection status

## WebSocket Events

**Endpoint**: `ws://localhost:8007/events?session_id={session_id}`

**Event Types**:
- `watch.triggered`: Price drop or low inventory alert
- `deal.new`: New deal published
- `connected`: Initial connection confirmation

## Kafka Topics

### Consumed
- `booking.created`: From booking service (optional integration)

### Produced
- `raw_supplier_feeds`: Raw CSV feed data
- `deals.normalized`: Cleaned and normalized deals
- `deals.scored`: Deals with computed scores
- `deals.tagged`: Deals with amenity/policy tags
- `deal.events`: High-value deal events for WebSocket broadcast
- `ai.recommendation.created`: Bundle recommendations
- `ai.bundle.selected`: User selected a bundle for booking

## Dataset Schemas

### Hotels (processed/hotels.csv)
- `listing_id`, `date`, `price`, `availability_365`, `neighbourhood`, `city`
- `is_pet_friendly`, `near_transit`, `has_breakfast`

### Flights (processed/flights.csv)
- `airline`, `source`, `destination`, `duration`, `price`, `total_stops`, `dep_time`
- `is_red_eye`, `seats_left`

### Airports (processed/airports.csv)
- `iata_code`, `name`, `city`, `country`, `latitude`, `longitude`

## Development

### Running Tests

```bash
# Run all tests with coverage
bash scripts/run_tests.sh

# Run specific test file
pytest tests/test_api.py -v
```

### Debugging LLM Prompts

Check logs for LLM request/response:
```bash
docker logs kayak-ai-service --tail 100 -f
```

## Troubleshooting

### Ollama Not Starting
```bash
# Check if model is downloaded
docker exec kayak-ollama ollama list

# Pull model manually
docker exec kayak-ollama ollama pull llama3.2:3b
```

### Kafka Connection Failures
```bash
# Verify Kafka is healthy
docker exec kayak-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Dataset Download Errors
- Ensure Kaggle API credentials are in `~/.kaggle/kaggle.json`
- Check permissions: `chmod 600 ~/.kaggle/kaggle.json`

## Performance Targets

- **LLM Response**: < 3 seconds
- **Bundle Generation**: < 2 seconds
- **WebSocket Latency**: < 100ms
- **Concurrent Sessions**: > 100

## License

Part of the Kayak Simulation Project
