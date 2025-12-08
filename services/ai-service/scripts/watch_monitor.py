#!/usr/bin/env python3
"""
Watch Monitoring Service
Continuously monitors price/inventory watches and sends notifications when triggered

This service:
1. Polls active watches every minute
2. Compares current prices/inventory with thresholds
3. Triggers notifications via WebSocket when conditions met
4. Marks watches as triggered to avoid spam
5. Implements debounce logic (don't notify again within 1 hour)
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json

sys.path.append('/app/src')

from sqlmodel import Session, select, create_engine
from models import Watch, Bundle, FlightDeal, HotelDeal
from logger import get_logger

# Kafka/WebSocket imports
try:
    from aiokafka import AIOKafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

logger = get_logger("watch-monitor")

# Configuration
DB_URL = os.getenv("DB_URL", "mysql+pymysql://root:rootpassword@mysql:3306/kayak_db")
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")
CHECK_INTERVAL = int(os.getenv("WATCH_CHECK_INTERVAL", "60"))  # 1 minute default
DEBOUNCE_MINUTES = 60  # Don't notify again within 1 hour


class WatchMonitor:
    """Background service for monitoring watches"""
    
    def __init__(self):
        self.engine = create_engine(DB_URL)
        self.producer = None
        self.running = False
        self.websocket_clients = {}  # session_id -> WebSocket connection
        
    async def start(self):
        """Start the watch monitor"""
        logger.info("🚀 Starting Watch Monitor...")
        
        if KAFKA_AVAILABLE:
            await self._init_kafka()
        
        self.running = True
        
        # Run periodic checks
        while self.running:
            try:
                await self.check_all_watches()
                await asyncio.sleep(CHECK_INTERVAL)
            except Exception as e:
                logger.error(f"❌ Error checking watches: {e}")
                await asyncio.sleep(60)
    
    async def _init_kafka(self):
        """Initialize Kafka producer for notifications"""
        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=KAFKA_BROKER,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            await self.producer.start()
            logger.info("✅ Kafka producer initialized")
        except Exception as e:
            logger.warning(f"⚠️  Kafka initialization failed: {e}")
            self.producer = None
    
    async def check_all_watches(self):
        """Check all active watches"""
        with Session(self.engine) as db:
            # Get all active watches
            watches = db.exec(
                select(Watch)
                .where(Watch.is_active == True)
            ).all()
            
            if not watches:
                return
            
            logger.info(f"🔍 Checking {len(watches)} active watches...")
            
            triggered_count = 0
            for watch in watches:
                if await self._check_watch(watch, db):
                    triggered_count += 1
            
            if triggered_count > 0:
                logger.info(f"🔔 Triggered {triggered_count} watch notifications")
    
    async def _check_watch(self, watch: Watch, db: Session) -> bool:
        """Check a single watch and trigger if conditions met"""
        
        # Debounce: Don't check if recently triggered
        if watch.triggered_at:
            time_since_trigger = datetime.utcnow() - watch.triggered_at
            if time_since_trigger < timedelta(minutes=DEBOUNCE_MINUTES):
                return False
        
        # Get associated bundle
        bundle = db.get(Bundle, watch.bundle_id)
        if not bundle:
            logger.warning(f"⚠️  Watch {watch.id}: Bundle {watch.bundle_id} not found")
            return False
        
        # Get flight and hotel details
        flight = db.get(FlightDeal, bundle.flight_id)
        hotel = db.get(HotelDeal, bundle.hotel_id)
        
        if not flight or not hotel:
            logger.warning(f"⚠️  Watch {watch.id}: Flight/Hotel not found")
            return False
        
        # Check conditions
        triggered = False
        trigger_reasons = []
        
        # Check price threshold
        if watch.max_price:
            current_price = bundle.total_price
            if current_price <= watch.max_price:
                triggered = True
                discount_amount = bundle.total_price - current_price
                trigger_reasons.append(
                    f"Price dropped to ${current_price:.2f} (${discount_amount:.2f} below your threshold)"
                )
        
        # Check flight seats threshold
        if watch.min_seats_left:
            if flight.seats_left <= watch.min_seats_left:
                triggered = True
                trigger_reasons.append(
                    f"Only {flight.seats_left} seats left on your flight"
                )
        
        # Check hotel rooms threshold
        if watch.min_rooms_left:
            if hotel.rooms_left <= watch.min_rooms_left:
                triggered = True
                trigger_reasons.append(
                    f"Only {hotel.rooms_left} rooms left at your hotel"
                )
        
        if triggered:
            await self._send_notification(watch, bundle, flight, hotel, trigger_reasons, db)
            
            # Update watch status
            watch.triggered_at = datetime.utcnow()
            watch.notification_sent = True
            db.add(watch)
            db.commit()
            
            return True
        
        return False
    
    async def _send_notification(
        self,
        watch: Watch,
        bundle: Bundle,
        flight: FlightDeal,
        hotel: HotelDeal,
        reasons: List[str],
        db: Session
    ):
        """Send notification via Kafka and WebSocket"""
        
        notification = {
            'type': 'watch_triggered',
            'watch_id': watch.id,
            'bundle_id': bundle.id,
            'session_id': watch.session_id,
            'triggered_at': datetime.utcnow().isoformat(),
            'reasons': reasons,
            'bundle': {
                'id': bundle.id,
                'flight': {
                    'origin': flight.origin,
                    'destination': flight.destination,
                    'depart_date': flight.depart_date.isoformat(),
                    'price': flight.price,
                    'seats_left': flight.seats_left,
                    'airline': flight.airline
                },
                'hotel': {
                    'listing_id': hotel.listing_id,
                    'city': hotel.city,
                    'neighbourhood': hotel.neighbourhood,
                    'price': hotel.price,
                    'rooms_left': hotel.rooms_left
                },
                'total_price': bundle.total_price
            },
            'action': {
                'text': 'Book now before it\'s gone!',
                'url': f'/bundles/{bundle.id}'
            }
        }
        
        # Send to Kafka
        if self.producer:
            try:
                await self.producer.send('watch.triggers', value=notification)
                await self.producer.send('deal.events', value=notification)
                logger.info(f"📤 Sent notification to Kafka for watch {watch.id}")
            except Exception as e:
                logger.error(f"❌ Failed to send Kafka notification: {e}")
        
        # Send via WebSocket (if connection exists)
        if watch.session_id and watch.session_id in self.websocket_clients:
            try:
                ws = self.websocket_clients[watch.session_id]
                await ws.send_json(notification)
                logger.info(f"📤 Sent WebSocket notification to session {watch.session_id}")
            except Exception as e:
                logger.error(f"❌ Failed to send WebSocket notification: {e}")
        
        logger.info(f"🔔 Watch {watch.id} triggered: {', '.join(reasons)}")
    
    def register_websocket(self, session_id: int, websocket):
        """Register a WebSocket connection for notifications"""
        self.websocket_clients[session_id] = websocket
        logger.info(f"✅ Registered WebSocket for session {session_id}")
    
    def unregister_websocket(self, session_id: int):
        """Unregister a WebSocket connection"""
        if session_id in self.websocket_clients:
            del self.websocket_clients[session_id]
            logger.info(f"❌ Unregistered WebSocket for session {session_id}")
    
    async def stop(self):
        """Gracefully stop the watch monitor"""
        logger.info("🛑 Stopping Watch Monitor...")
        self.running = False
        
        if self.producer:
            await self.producer.stop()


async def main():
    """Main entry point"""
    monitor = WatchMonitor()
    
    try:
        await monitor.start()
    except KeyboardInterrupt:
        logger.info("⚠️  Received interrupt signal")
    finally:
        await monitor.stop()
        logger.info("✅ Watch Monitor stopped")


if __name__ == "__main__":
    asyncio.run(main())
