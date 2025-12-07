"""
External Service Clients

HTTP clients for communicating with other microservices:
- Flight Service (port 8001)
- Hotel Service (port 8002)  
- Booking Service (port 8004)
"""

import logging
import os
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class ServiceClient:
    """Base client for microservice communication"""
    
    def __init__(self, base_url: str, service_name: str):
        self.base_url = base_url.rstrip("/")
        self.service_name = service_name
        self._client = httpx.AsyncClient(timeout=5.0)
        logger.info(f"Initialized {service_name} client: {base_url}")
    
    async def _get(self, endpoint: str, params: dict = None) -> Optional[dict]:
        """Generic GET request with error handling"""
        try:
            url = f"{self.base_url}{endpoint}"
            response = await self._client.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"{self.service_name} GET {endpoint} failed: {e}")
            return None
    
    async def _post(self, endpoint: str, data: dict) -> Optional[dict]:
        """Generic POST request with error handling"""
        try:
            url = f"{self.base_url}{endpoint}"
            response = await self._client.post(url, json=data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"{self.service_name} POST {endpoint} failed: {e}")
            return None
    
    async def health_check(self) -> bool:
        """Check if service is healthy"""
        result = await self._get("/health")
        return result is not None


class FlightServiceClient(ServiceClient):
    """Client for Flight Service API"""
    
    def __init__(self, base_url: str = None):
        base_url = base_url or os.getenv("FLIGHT_SERVICE_URL", "http://flight-service:8001")
        super().__init__(base_url, "FlightService")
    
    async def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        return_date: str = None,
        adults: int = 1
    ) -> List[Dict]:
        """Search for flights"""
        params = {
            "origin": origin,
            "destination": destination,
            "departureDate": departure_date,
            "adults": adults
        }
        if return_date:
            params["returnDate"] = return_date
        
        result = await self._get("/api/flights/search", params=params)
        return result.get("flights", []) if result else []
    
    async def get_flight_details(self, flight_id: int) -> Optional[Dict]:
        """Get detailed flight information"""
        return await self._get(f"/api/flights/{flight_id}")


class HotelServiceClient(ServiceClient):
    """Client for Hotel Service API"""
    
    def __init__(self, base_url: str = None):
        base_url = base_url or os.getenv("HOTEL_SERVICE_URL", "http://hotel-service:8002")
        super().__init__(base_url, "HotelService")
    
    async def search_hotels(
        self,
        city: str,
        check_in: str,
        check_out: str,
        adults: int = 1,
        min_price: float = None,
        max_price: float = None
    ) -> List[Dict]:
        """Search for hotels"""
        params = {
            "city": city,
            "checkIn": check_in,
            "checkOut": check_out,
            "adults": adults
        }
        if min_price:
            params["minPrice"] = min_price
        if max_price:
            params["maxPrice"] = max_price
        
        result = await self._get("/api/hotels/search", params=params)
        return result.get("hotels", []) if result else []
    
    async def get_hotel_details(self, hotel_id: int) -> Optional[Dict]:
        """Get detailed hotel information"""
        return await self._get(f"/api/hotels/{hotel_id}")


class BookingServiceClient(ServiceClient):
    """Client for Booking Service API"""
    
    def __init__(self, base_url: str = None):
        base_url = base_url or os.getenv("BOOKING_SERVICE_URL", "http://booking-service:8004")
        super().__init__(base_url, "BookingService")
    
    async def create_booking(
        self,
        user_id: int,
        flight_id: int = None,
        hotel_id: int = None,
        **kwargs
    ) -> Optional[Dict]:
        """Create a new booking"""
        booking_data = {
            "userId": user_id,
            **kwargs
        }
        if flight_id:
            booking_data["flightId"] = flight_id
        if hotel_id:
            booking_data["hotelId"] = hotel_id
        
        return await self._post("/api/bookings", booking_data)
    
    async def get_user_bookings(self, user_id: int) -> List[Dict]:
        """Get all bookings for a user"""
        result = await self._get(f"/api/bookings/user/{user_id}")
        return result.get("bookings", []) if result else []


# Global client instances (initialized on app startup)
flight_client: Optional[FlightServiceClient] = None
hotel_client: Optional[HotelServiceClient] = None
booking_client: Optional[BookingServiceClient] = None


async def initialize_clients():
    """Initialize all service clients"""
    global flight_client, hotel_client, booking_client
    
    flight_client = FlightServiceClient()
    hotel_client = HotelServiceClient()
    booking_client = BookingServiceClient()
    
    logger.info("✅ Service clients initialized")


async def health_check_all_services() -> Dict[str, bool]:
    """Check health of all external services"""
    results = {}
    
    if flight_client:
        results["flight_service"] = await flight_client.health_check()
    if hotel_client:
        results["hotel_service"] = await hotel_client.health_check()
    if booking_client:
        results["booking_service"] = await booking_client.health_check()
    
    return results
