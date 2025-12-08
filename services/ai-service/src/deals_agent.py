"""
Deals Agent - Background Worker

Multi-stage Kafka pipeline for deal detection and enrichment:
1. Feed Ingestion → raw_supplier_feeds
2. Normalization → deals.normalized
3. Scoring → deals.scored
4. Tagging → deals.tagged
5. Event Emission → deal.events
"""

import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
from sqlmodel import Session, create_engine, select

from .models import FlightDeal, HotelDeal
from .kafka import (
    KafkaProducer,
    KafkaConsumer,
    RAW_SUPPLIER_FEEDS,
    DEALS_NORMALIZED,
    DEALS_SCORED,
    DEALS_TAGGED,
    DEAL_EVENTS,
)

logger = logging.getLogger(__name__)


class DealsWorker:
    """
    Background worker that processes travel deals through a Kafka pipeline.
    
    Stages:
    - ingest_feeds: Read CSV files → raw_supplier_feeds
    - normalize_deals: Clean data → deals.normalized
    - score_deals: Compute deal scores → deals.scored
    - tag_deals: Add amenity tags → deals.tagged
    - emit_updates: Publish events → deal.events
    """
    
    def __init__(
        self,
        kafka_broker: str,
        db_url: str,
        batch_size: int = 100
    ):
        self.kafka_broker = kafka_broker
        self.db_url = db_url
        self.batch_size = batch_size
        self.producer: Optional[KafkaProducer] = None
        self.engine = create_engine(db_url, echo=False)
        self._running = False
    
    async def start(self) -> None:
        """Initialize and start the worker"""
        logger.info("🚀 Starting Deals Worker...")
        
        # Connect Kafka producer
        self.producer = KafkaProducer(broker_url=self.kafka_broker)
        await self.producer.connect()
        logger.info("✅ Kafka producer connected")
        
        self._running = True
    
    async def stop(self) -> None:
        """Stop the worker gracefully"""
        logger.info("Stopping Deals Worker...")
        self._running = False
        
        if self.producer:
            await self.producer.disconnect()
    
    async def ingest_feeds(
        self,
        hotels_path: Path,
        flights_path: Path
    ) -> None:
        """
        Stage 1: Read CSV feeds and publish to raw_supplier_feeds topic.
        
        Publishes in batches for performance.
        """
        logger.info(f"📥 Ingesting feeds from {hotels_path.parent}")
        
        # Ingest hotels
        if hotels_path.exists():
            df = pd.read_csv(hotels_path)
            logger.info(f"Loaded {len(df)} hotels")
            
            batch = []
            for idx, row in df.iterrows():
                message = {
                    "type": "hotel",
                    "source": "kaggle_airbnb",
                    "timestamp": datetime.now().isoformat(),
                    "data": row.to_dict()
                }
                batch.append(message)
                
                if len(batch) >= self.batch_size:
                    for msg in batch:
                        await self.producer.send_message(
                            RAW_SUPPLIER_FEEDS,
                            msg,
                            key=f"hotel_{msg['data'].get('listing_id')}"
                        )
                    batch = []
            
            # Send remaining
            for msg in batch:
                await self.producer.send_message(RAW_SUPPLIER_FEEDS, msg)
            
            logger.info(f"✅ Ingested {len(df)} hotels")
        
        # Ingest flights
        if flights_path.exists():
            df = pd.read_csv(flights_path)
            logger.info(f"Loaded {len(df)} flights")
            
            batch = []
            for idx, row in df.iterrows():
                message = {
                    "type": "flight",
                    "source": "kaggle_flights",
                    "timestamp": datetime.now().isoformat(),
                    "data": row.to_dict()
                }
                batch.append(message)
                
                if len(batch) >= self.batch_size:
                    for msg in batch:
                        await self.producer.send_message(
                            RAW_SUPPLIER_FEEDS,
                            msg,
                            key=f"flight_{msg['data'].get('origin')}_{msg['data'].get('destination')}"
                        )
                    batch = []
            
            for msg in batch:
                await self.producer.send_message(RAW_SUPPLIER_FEEDS, msg)
            
            logger.info(f"✅ Ingested {len(df)} flights")
    
    async def normalize_deals(self) -> None:
        """
        Stage 2: Consume from raw_supplier_feeds, validate and normalize.
        
        Publishes to deals.normalized topic.
        """
        logger.info("🔧 Starting normalization worker...")
        
        consumer = KafkaConsumer(
            broker_url=self.kafka_broker,
            group_id="normalize-worker",
            topics=[RAW_SUPPLIER_FEEDS]
        )
        await consumer.connect()
        
        async def process_message(message: Dict) -> None:
            try:
                deal_type = message.get("type")
                data = message.get("data", {})
                
                # Validate required fields
                if deal_type == "hotel":
                    if not all(k in data for k in ["listing_id", "price", "city"]):
                        logger.warning("Missing required hotel fields")
                        return
                elif deal_type == "flight":
                    if not all(k in data for k in ["origin", "destination", "price"]):
                        logger.warning("Missing required flight fields")
                        return
                
                # Normalize data
                normalized = {
                    "type": deal_type,
                    "timestamp": datetime.now().isoformat(),
                    "data": self._normalize_fields(data, deal_type)
                }
                
                # Publish to normalized topic
                await self.producer.send_message(
                    DEALS_NORMALIZED,
                    normalized,
                    key=f"{deal_type}_{data.get('listing_id' if deal_type == 'hotel' else 'origin')}"
                )
                
            except Exception as e:
                logger.error(f"Normalization error: {e}")
        
        await consumer.consume(process_message)
    
    def _normalize_fields(self, data: Dict, deal_type: str) -> Dict:
        """Normalize field values"""
        normalized = data.copy()
        
        # Normalize price to float
        if "price" in normalized:
            try:
                price = str(normalized["price"]).replace("$", "").replace(",", "")
                normalized["price"] = float(price)
            except:
                normalized["price"] = 0.0
        
        # Normalize text fields
        for field in ["city", "origin", "destination", "airline"]:
            if field in normalized:
                normalized[field] = str(normalized[field]).strip().upper()
        
        return normalized
    
    async def score_deals(self) -> None:
        """
        Stage 3: Consume from deals.normalized, compute deal scores.
        
        Score components:
        - Price discount (60 points): Based on 30-day average
        - Inventory scarcity (30 points): Limited availability
        - Time sensitivity (10 points): Promo expiration
        """
        logger.info("📊 Starting scoring worker...")
        
        consumer = KafkaConsumer(
            broker_url=self.kafka_broker,
            group_id="score-worker",
            topics=[DEALS_NORMALIZED]
        )
        await consumer.connect()
        
        async def process_message(message: Dict) -> None:
            try:
                deal_type = message.get("type")
                data = message.get("data", {})
                
                # Calculate 30-day average price (mock for now)
                current_price = data.get("price", 0)
                avg_30d_price = current_price * 1.2  # Mock: assume 20% higher average
                
                # Compute deal score
                deal_score = 0
                is_deal = False
                
                # Price discount component
                if current_price <= 0.85 * avg_30d_price:
                    is_deal = True
                    discount_ratio = 1 - (current_price / avg_30d_price)
                    deal_score += int(discount_ratio * 60)
                
                # Inventory scarcity component
                availability = data.get("rooms_left" if deal_type == "hotel" else "seats_left", 50)
                if availability < 5:
                    is_deal = True
                    deal_score += int((1 - availability / 50) * 30)
                
                # Time sensitivity (assume some deals expire soon)
                if data.get("promo_end"):
                    deal_score += 10
                
                # Add scoring metadata
                scored = {
                    **message,
                    "deal_score": deal_score,
                    "is_deal": is_deal,
                    "avg_30d_price": avg_30d_price,
                }
                
                # Publish to scored topic
                await self.producer.send_message(
                    DEALS_SCORED,
                    scored,
                    key=message.get("data", {}).get("listing_id" if deal_type == "hotel" else "origin")
                )
                
            except Exception as e:
                logger.error(f"Scoring error: {e}")
        
        await consumer.consume(process_message)
    
    async def tag_deals(self) -> None:
        """
        Stage 4: Consume from deals.scored, extract amenity/policy tags.
        
        Tags:
        - Hotels: pet-friendly, near-transit, has-breakfast, refundable
        - Flights: red-eye, direct
        """
        logger.info("🏷️  Starting tagging worker...")
        
        consumer = KafkaConsumer(
            broker_url=self.kafka_broker,
            group_id="tag-worker",
            topics=[DEALS_SCORED]
        )
        await consumer.connect()
        
        async def process_message(message: Dict) -> None:
            try:
                deal_type = message.get("type")
                data = message.get("data", {})
                tags = []
                
                if deal_type == "hotel":
                    # Extract hotel tags
                    if data.get("is_pet_friendly"):
                        tags.append("pet-friendly")
                    if data.get("near_transit"):
                        tags.append("transit")
                    if data.get("has_breakfast"):
                        tags.append("breakfast")
                    
                    # Check amenities text
                    amenities = str(data.get("amenities", "")).lower()
                    if "refund" in amenities or "cancellation" in amenities:
                        tags.append("refundable")
                
                elif deal_type == "flight":
                    # Extract flight tags
                    if data.get("is_red_eye"):
                        tags.append("red-eye")
                    if data.get("stops", 1) == 0:
                        tags.append("direct")
                
                # Add tags to message
                tagged = {
                    **message,
                    "tags": tags,
                }
                
                # Publish to tagged topic
                await self.producer.send_message(
                    DEALS_TAGGED,
                    tagged,
                    key=f"{deal_type}_{data.get('listing_id' if deal_type == 'hotel' else 'origin')}"
                )
                
            except Exception as e:
                logger.error(f"Tagging error: {e}")
        
        await consumer.consume(process_message)
    
    async def emit_updates(self) -> None:
        """
        Stage 5: Consume from deals.tagged, filter and emit events.
        
        - Only emit deals with is_deal == True
        - Store in database
        - Publish to deal.events for WebSocket broadcast
        """
        logger.info("📤 Starting emission worker...")
        
        consumer = KafkaConsumer(
            broker_url=self.kafka_broker,
            group_id="emit-worker",
            topics=[DEALS_TAGGED]
        )
        await consumer.connect()
        
        async def process_message(message: Dict) -> None:
            try:
                if not message.get("is_deal"):
                    return  # Skip non-deals
                
                deal_type = message.get("type")
                data = message.get("data", {})
                
                # Store in database
                with Session(self.engine) as session:
                    if deal_type == "hotel":
                        deal = HotelDeal(
                            listing_id=data.get("listing_id"),
                            city=data.get("city", ""),
                            neighbourhood=data.get("neighbourhood", ""),
                            price=data.get("price", 0.0),
                            rooms_left=data.get("rooms_left", 10),
                            is_pet_friendly=data.get("is_pet_friendly", False),
                            has_breakfast=data.get("has_breakfast", False),
                        )
                        session.add(deal)
                    elif deal_type == "flight":
                        deal = FlightDeal(
                            origin=data.get("origin", ""),
                            destination=data.get("destination", ""),
                            airline=data.get("airline", ""),
                            price=data.get("price", 0.0),
                            stops=data.get("stops", 0),
                            duration_minutes=data.get("duration_minutes", 0),
                            seats_left=data.get("seats_left", 10),
                            is_red_eye=data.get("is_red_eye", False),
                        )
                        session.add(deal)
                    session.commit()
                
                # Publish event for WebSocket broadcast
                event = {
                    "type": "deal.new",
                    "deal_type": deal_type,
                    "deal_score": message.get("deal_score"),
                    "tags": message.get("tags", []),
                    "timestamp": datetime.now().isoformat(),
                }
                
                await self.producer.send_message(DEAL_EVENTS, event)
                logger.debug(f"✅ Emitted {deal_type} deal (score: {message.get('deal_score')})")
                
            except Exception as e:
                logger.error(f"Emission error: {e}")
        
        await consumer.consume(process_message)
    
    async def run(self) -> None:
        """
        Run all worker stages concurrently.
        
        Usage:
            worker = DealsWorker(kafka_broker="kafka:9092", db_url="...")
            await worker.run()
        """
        await self.start()
        
        try:
            # Run all stages concurrently
            await asyncio.gather(
                self.normalize_deals(),
                self.score_deals(),
                self.tag_deals(),
                self.emit_updates(),
            )
        except asyncio.CancelledError:
            logger.info("Worker cancelled")
        except Exception as e:
            logger.error(f"Worker error: {e}")
        finally:
            await self.stop()


async def refresh_deals_once(hotels_path: Path, flights_path: Path) -> None:
    """
    One-time feed ingestion for demo/testing.
    
    This is called on service startup to populate initial deals.
    """
    import os
    
    worker = DealsWorker(
        kafka_broker=os.getenv("KAFKA_BROKER", "kafka:9092"),
        db_url=os.getenv("DB_URL", "sqlite:///./agentic_ai_deals.db")
    )
    
    await worker.start()
    await worker.ingest_feeds(hotels_path, flights_path)
    await worker.stop()
