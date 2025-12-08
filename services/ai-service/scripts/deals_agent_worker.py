#!/usr/bin/env python3
"""
Deals Agent - Background Worker
Continuously detects deals, scores them, tags amenities, and emits updates via Kafka

This worker:
1. Consumes from deals.normalized (or polls database periodically)
2. Detects deals using rules (≥15% below avg, limited inventory, promos)
3. Computes Deal Score (0-100)
4. Tags offers with amenities
5. Produces to deals.scored and deals.tagged topics
6. Emits real-time updates via WebSocket
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json

sys.path.append('/app/src')

from sqlmodel import Session, select, create_engine
from models import FlightDeal, HotelDeal, Watch
from logger import get_logger
import numpy as np

# Kafka imports
try:
    from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    print("⚠️  aiokafka not available, running in polling mode")

logger = get_logger("deals-agent")

# Configuration
DB_URL = os.getenv("DB_URL", "mysql+pymysql://root:rootpassword@mysql:3306/kayak_db")
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
SCAN_INTERVAL = int(os.getenv("DEALS_SCAN_INTERVAL", "300"))  # 5 minutes default

# Deal detection thresholds
DEAL_THRESHOLD_PERCENT = 15  # ≥15% below average
LOW_INVENTORY_THRESHOLD = 5  # < 5 seats/rooms = scarce
PROMO_KEYWORDS = ['limited', 'promo', 'special', 'flash', 'sale']


class DealsAgent:
    """Background worker for deal detection and scoring"""
    
    def __init__(self):
        self.engine = create_engine(DB_URL)
        self.producer = None
        self.consumer = None
        self.running = False
        
    async def start(self):
        """Start the deals agent"""
        logger.info("🚀 Starting Deals Agent...")
        
        if KAFKA_AVAILABLE:
            await self._init_kafka()
        
        self.running = True
        
        # Run periodic scans
        while self.running:
            try:
                await self.scan_and_score_deals()
                await asyncio.sleep(SCAN_INTERVAL)
            except Exception as e:
                logger.error(f"❌ Error in deals scan: {e}")
                await asyncio.sleep(60)  # Wait 1 min on error
    
    async def _init_kafka(self):
        """Initialize Kafka producer and consumer"""
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=KAFKA_BROKER,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            await self.producer.start()
            logger.info("✅ Kafka producer initialized")
            
            # Consumer for deals.normalized (if feeding from Kafka)
            self.consumer = AIOKafkaConsumer(
                'deals.normalized',
                bootstrap_servers=KAFKA_BROKER,
                group_id='deals-agent-group',
                value_deserializer=lambda m: json.loads(m.decode('utf-8'))
            )
            await self.consumer.start()
            logger.info("✅ Kafka consumer initialized")
            
        except Exception as e:
            logger.warning(f"⚠️  Kafka initialization failed: {e}")
            self.producer = None
            self.consumer = None
    
    async def scan_and_score_deals(self):
        """Main deal detection loop"""
        logger.info("🔍 Scanning for deals...")
        
        with Session(self.engine) as db:
            # Scan flights
            flights = db.exec(select(FlightDeal)).all()
            flight_updates = await self._score_flights(flights, db)
            
            # Scan hotels
            hotels = db.exec(select(HotelDeal)).all()
            hotel_updates = await self._score_hotels(hotels, db)
            
            # Emit updates
            if self.producer:
                for update in flight_updates + hotel_updates:
                    await self.producer.send('deals.scored', value=update)
                    await self.producer.send('deal.events', value=update)
            
            logger.info(f"✅ Scanned {len(flights)} flights, {len(hotels)} hotels")
            logger.info(f"📊 Updates: {len(flight_updates)} flights, {len(hotel_updates)} hotels")
    
    async def _score_flights(self, flights: List[FlightDeal], db: Session) -> List[Dict]:
        """Score flight deals and detect changes"""
        updates = []
        
        for flight in flights:
            old_score = flight.deal_score
            
            # Calculate new deal score
            new_score = self._calculate_flight_deal_score(flight)
            
            # Update if score changed significantly
            if abs(new_score - old_score) >= 5:
                flight.deal_score = new_score
                flight.updated_at = datetime.utcnow()
                
                # Update tags
                flight.tags = self._generate_flight_tags(flight)
                
                db.add(flight)
                
                updates.append({
                    'type': 'flight',
                    'id': flight.id,
                    'route_key': flight.route_key,
                    'old_score': old_score,
                    'new_score': new_score,
                    'price': flight.price,
                    'seats_left': flight.seats_left,
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        db.commit()
        return updates
    
    async def _score_hotels(self, hotels: List[HotelDeal], db: Session) -> List[Dict]:
        """Score hotel deals and detect changes"""
        updates = []
        
        for hotel in hotels:
            old_score = hotel.deal_score
            
            # Calculate new deal score
            new_score = self._calculate_hotel_deal_score(hotel)
            
            # Update if score changed significantly
            if abs(new_score - old_score) >= 5:
                hotel.deal_score = new_score
                hotel.updated_at = datetime.utcnow()
                
                # Update tags
                hotel.tags = self._generate_hotel_tags(hotel)
                
                db.add(hotel)
                
                updates.append({
                    'type': 'hotel',
                    'id': hotel.id,
                    'listing_id': hotel.listing_id,
                    'old_score': old_score,
                    'new_score': new_score,
                    'price': hotel.price,
                    'rooms_left': hotel.rooms_left,
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        db.commit()
        return updates
    
    def _calculate_flight_deal_score(self, flight: FlightDeal) -> int:
        """
        Calculate deal score for flight (0-100)
        
        Factors:
        - Price vs baseline (if available)
        - Inventory scarcity
        - Red-eye discount
        - Direct flight bonus
        """
        score = 0
        
        # Price discount (from tags/current calculation)
        if 'discount' in flight.tags.lower():
            # Extract discount percentage from tags
            import re
            match = re.search(r'(\d+)%', flight.tags)
            if match:
                discount_pct = int(match.group(1))
                score += min(discount_pct * 3, 60)  # Max 60 points for 20% discount
        
        # Scarcity bonus
        if flight.seats_left <= 3:
            score += 30
        elif flight.seats_left <= 5:
            score += 20
        elif flight.seats_left <= 10:
            score += 10
        
        # Red-eye bonus (cheaper but less convenient)
        if flight.is_red_eye:
            score += 15
        
        # Direct flight bonus (more convenient)
        if flight.is_direct:
            score += 10
        
        return min(score, 100)
    
    def _calculate_hotel_deal_score(self, hotel: HotelDeal) -> int:
        """
        Calculate deal score for hotel (0-100)
        
        Factors:
        - Price vs avg_30d_price
        - Inventory scarcity
        - Amenities count
        - Refundability
        """
        score = 0
        
        # Price vs average
        if hotel.avg_30d_price > 0:
            discount_pct = ((hotel.avg_30d_price - hotel.price) / hotel.avg_30d_price) * 100
            if discount_pct > 0:
                score += min(int(discount_pct * 3), 60)  # Max 60 points
        
        # Scarcity bonus
        if hotel.rooms_left <= 3:
            score += 25
        elif hotel.rooms_left <= 5:
            score += 15
        elif hotel.rooms_left <= 10:
            score += 8
        
        # Amenities bonus (each amenity adds value)
        amenity_count = sum([
            hotel.is_pet_friendly,
            hotel.near_transit,
            hotel.has_breakfast,
            hotel.is_refundable
        ])
        score += amenity_count * 5  # Max 20 points
        
        # Refundability bonus
        if hotel.is_refundable:
            score += 10
        
        return min(score, 100)
    
    def _generate_flight_tags(self, flight: FlightDeal) -> str:
        """Generate descriptive tags for flight"""
        tags = []
        
        # Deal tags
        if flight.deal_score >= 80:
            tags.append('🔥 Hot deal')
        elif flight.deal_score >= 60:
            tags.append('Great value')
        
        # Inventory tags
        if flight.seats_left <= 3:
            tags.append('⚠️ Only {flight.seats_left} seats left')
        elif flight.seats_left <= 5:
            tags.append('Limited availability')
        
        # Flight characteristics
        if flight.is_direct:
            tags.append('Non-stop')
        if flight.is_red_eye:
            tags.append('Red-eye')
        
        # Duration
        hours = flight.duration_minutes // 60
        if hours <= 2:
            tags.append('Quick flight')
        
        return ', '.join(tags) if tags else 'Standard'
    
    def _generate_hotel_tags(self, hotel: HotelDeal) -> str:
        """Generate descriptive tags for hotel"""
        tags = []
        
        # Deal tags
        if hotel.is_deal:
            discount_pct = int(((hotel.avg_30d_price - hotel.price) / hotel.avg_30d_price) * 100)
            if discount_pct >= 20:
                tags.append(f'🔥 {discount_pct}% off')
            elif discount_pct >= 10:
                tags.append(f'{discount_pct}% below avg')
        
        # Inventory tags
        if hotel.rooms_left <= 3:
            tags.append(f'⚠️ Only {hotel.rooms_left} left')
        elif hotel.rooms_left <= 5:
            tags.append('Almost sold out')
        
        # Amenities
        if hotel.is_pet_friendly:
            tags.append('🐾 Pet-friendly')
        if hotel.near_transit:
            tags.append('🚇 Near transit')
        if hotel.has_breakfast:
            tags.append('🍳 Breakfast')
        if hotel.is_refundable:
            tags.append('✅ Refundable')
        
        return ', '.join(tags) if tags else 'Standard'
    
    async def stop(self):
        """Gracefully stop the deals agent"""
        logger.info("🛑 Stopping Deals Agent...")
        self.running = False
        
        if self.producer:
            await self.producer.stop()
        if self.consumer:
            await self.consumer.stop()


async def main():
    """Main entry point"""
    agent = DealsAgent()
    
    try:
        await agent.start()
    except KeyboardInterrupt:
        logger.info("⚠️  Received interrupt signal")
    finally:
        await agent.stop()
        logger.info("✅ Deals Agent stopped")


if __name__ == "__main__":
    asyncio.run(main())
