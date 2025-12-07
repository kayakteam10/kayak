"""
Unit Tests for AI Service

Tests for core functionality, API endpoints, and integrations.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, SQLModel
from sqlmodel.pool import StaticPool

from main import app, get_session
from models import HotelDeal, FlightDeal, Bundle, Watch


# Test database setup
@pytest.fixture(name="session")
def session_fixture():
    """Create in-memory test database"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Create test client with test database"""
    def get_session_override():
        return session
    
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# Health Check Tests
def test_health_check(client: TestClient):
    """Test health endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data


# Bundle Tests
def test_create_bundle(client: TestClient, session: Session):
    """Test bundle creation"""
    # Create test data
    flight = FlightDeal(
        route_key="SFO_LAX_2025_01_15",
        origin="SFO",
        destination="LAX",
        depart_date="2025-01-15",
        airline="United",
        stops=0,
        duration_minutes=90,
        price=150.0,
        is_red_eye=False,
        seats_left=10
    )
    hotel = HotelDeal(
        listing_id="TEST123",
        city="LOS ANGELES",
        neighbourhood="Downtown",
        price=120.0,
        is_pet_friendly=True,
        rooms_left=5
    )
    session.add(flight)
    session.add(hotel)
    session.commit()
    
    # Test bundle endpoint
    query = {
        "origin": "SFO",
        "destination": "LAX",
        "start_date": "2025-01-15",
        "end_date": "2025-01-17",
        "budget": 500.0,
        "adults": 1,
        "pet_friendly": True,
        "avoid_redeye": False
    }
    
    response = client.post("/bundles", json=query)
    assert response.status_code == 200
    data = response.json()
    assert "bundles" in data
    assert len(data["bundles"]) > 0


# Watch Tests
def test_create_watch(client: TestClient, session: Session):
    """Test watch creation"""
    # Create bundle first
    flight = FlightDeal(
        route_key="TEST",
        origin="SFO",
        destination="NYC",
        depart_date="2025-02-01",
        airline="Delta",
        stops=1,
        duration_minutes=300,
        price=200.0,
        seats_left=20
    )
    hotel = HotelDeal(
        listing_id="NYC001",
        city="NEW YORK",
        neighbourhood="Manhattan",
        price=180.0,
        rooms_left=10
    )
    session.add(flight)
    session.add(hotel)
    session.commit()
    session.refresh(flight)
    session.refresh(hotel)
    
    bundle = Bundle(
        flight_id=flight.id,
        hotel_id=hotel.id,
        total_price=560.0,
        fit_score=0.85
    )
    session.add(bundle)
    session.commit()
    session.refresh(bundle)
    
    # Create watch
    watch_data = {
        "bundle_id": bundle.id,
        "max_price": 500.0,
        "min_rooms_left": 5
    }
    
    response = client.post("/watches", json=watch_data)
    assert response.status_code == 200
    data = response.json()
    assert data["bundle_id"] == bundle.id
    assert data["is_active"] is True


# Chat Session Tests
def test_create_chat_session(client: TestClient):
    """Test chat session creation"""
    session_data = {"user_id": 1}
    response = client.post("/chat/sessions", json=session_data)
    
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "session_token" in data
    assert data["is_active"] is True


# Deal Tests
def test_get_latest_deals(client: TestClient, session: Session):
    """Test deals listing"""
    # Create test deals
    hotel = HotelDeal(
        listing_id="DEAL001",
        city="MIAMI",
        neighbourhood="Beach",
        price=95.0,
        is_deal=True,
        deal_score=85,
        tags="beach,breakfast"
    )
    session.add(hotel)
    session.commit()
    
    response = client.get("/deals/latest?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
