#!/usr/bin/env python3
"""
Sync AI Deals to Real Inventory

Takes top-scoring deals from flight_deals/hotel_deals and creates
corresponding entries in flights/hotels tables so users can actually book them.

This solves the UX problem where AI recommends deals that don't exist in
the booking system, causing "Price changed" errors.
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import logging

import httpx
from sqlmodel import Session, create_engine, select

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import FlightDeal, HotelDeal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InventorySyncer:
    """Syncs AI deals to real booking inventory via service APIs"""
    
    def __init__(
        self,
        db_url: str,
        flight_service_url: str = "http://localhost:8001",
        hotel_service_url: str = "http://localhost:8002"
    ):
        self.engine = create_engine(db_url)
        self.flight_service = flight_service_url.rstrip("/")
        self.hotel_service = hotel_service_url.rstrip("/")
        self.client = httpx.Client(timeout=10.0)
    
    def sync_top_flight_deals(self, limit: int = 50):
        """Sync top-rated flight deals to real inventory"""
        logger.info(f"🔄 Syncing top {limit} flight deals to inventory...")
        
        with Session(self.engine) as session:
            # Get top deals by score
            stmt = select(FlightDeal).order_by(FlightDeal.deal_score.desc()).limit(limit)
            deals = session.exec(stmt).all()
            
            synced = 0
            for deal in deals:
                try:
                    # Create flight entry via API
                    flight_data = {
                        "airline": deal.airline,
                        "flightNumber": f"{deal.airline[:2].upper()}{deal.id:04d}",
                        "origin": deal.origin,
                        "destination": deal.destination,
                        "departureTime": deal.depart_date.isoformat() + "T08:00:00Z",
                        "arrivalTime": (
                            deal.depart_date + timedelta(hours=deal.duration_minutes // 60)
                        ).isoformat() + "T12:00:00Z",
                        "price": float(deal.price),
                        "availableSeats": deal.seats_left,
                        "classType": "economy",
                        "duration": deal.duration_minutes,
                        "stops": deal.stops
                    }
                    
                    # POST to flight service
                    response = self.client.post(
                        f"{self.flight_service}/api/flights",
                        json=flight_data
                    )
                    
                    if response.status_code in [200, 201]:
                        synced += 1
                        logger.info(f"✅ Synced flight {deal.origin}→{deal.destination} ${deal.price}")
                    else:
                        # Flight might already exist - skip
                        logger.debug(f"⏭️  Skipped flight {deal.id}: {response.status_code}")
                        
                except Exception as e:
                    logger.warning(f"⚠️  Failed to sync flight {deal.id}: {e}")
                    continue
            
            logger.info(f"✅ Synced {synced}/{len(deals)} flights to inventory")
            return synced
    
    def sync_top_hotel_deals(self, limit: int = 50):
        """Sync top-rated hotel deals to real inventory"""
        logger.info(f"🔄 Syncing top {limit} hotel deals to inventory...")
        
        with Session(self.engine) as session:
            # Get top deals by score
            stmt = select(HotelDeal).order_by(HotelDeal.deal_score.desc()).limit(limit)
            deals = session.exec(stmt).all()
            
            synced = 0
            for deal in deals:
                try:
                    # Build amenities list
                    amenities = []
                    if deal.is_pet_friendly:
                        amenities.append("pet_friendly")
                    if deal.near_transit:
                        amenities.append("near_public_transit")
                    if deal.has_breakfast:
                        amenities.append("breakfast_included")
                    
                    # Create hotel entry via API
                    hotel_data = {
                        "name": f"{deal.city} Hotel #{deal.listing_id}",
                        "city": deal.city,
                        "address": f"{deal.neighbourhood}, {deal.city}",
                        "pricePerNight": float(deal.price),
                        "availableRooms": deal.rooms_left,
                        "rating": 4.0,
                        "amenities": amenities,
                        "description": f"Great deal in {deal.neighbourhood}"
                    }
                    
                    # POST to hotel service
                    response = self.client.post(
                        f"{self.hotel_service}/api/hotels",
                        json=hotel_data
                    )
                    
                    if response.status_code in [200, 201]:
                        synced += 1
                        logger.info(f"✅ Synced hotel in {deal.city} ${deal.price}/night")
                    else:
                        logger.debug(f"⏭️  Skipped hotel {deal.id}: {response.status_code}")
                        
                except Exception as e:
                    logger.warning(f"⚠️  Failed to sync hotel {deal.id}: {e}")
                    continue
            
            logger.info(f"✅ Synced {synced}/{len(deals)} hotels to inventory")
            return synced
    
    def sync_all(self, flights_limit: int = 50, hotels_limit: int = 50):
        """Sync both flights and hotels"""
        logger.info("🚀 Starting full inventory sync...")
        
        flights_synced = self.sync_top_flight_deals(flights_limit)
        hotels_synced = self.sync_top_hotel_deals(hotels_limit)
        
        logger.info(f"✅ Total synced: {flights_synced} flights + {hotels_synced} hotels")
        return flights_synced, hotels_synced


def main():
    """Run inventory sync"""
    db_url = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://kayak_user:kayak_password@localhost:3306/kayak_db"
    )
    
    syncer = InventorySyncer(db_url)
    
    try:
        syncer.sync_all(flights_limit=100, hotels_limit=100)
        logger.info("✅ Inventory sync completed successfully")
    except Exception as e:
        logger.error(f"❌ Inventory sync failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
