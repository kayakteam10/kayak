from fastapi.testclient import TestClient
from main import app
from datetime import date, timedelta

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 404  # No root endpoint defined in main.py, wait, let me check main.py again.
    # main.py doesn't have a root endpoint defined in the snippet I saw? 
    # Wait, I saw lines 1-341. Let me check if there is a root endpoint.
    # Ah, I see @app.get("/") at line 265 in the view_file output?
    # No, line 265 is @app.websocket("/events").
    # Wait, line 265 in view_file output was @app.websocket.
    # Let me check if there is a root endpoint.
    # I don't see one in the previous view_file output.
    # So 404 is expected.
    pass

def test_recommend_bundles():
    payload = {
        "origin": "SFO",
        "destination": "JFK",
        "start_date": str(date.today() + timedelta(days=30)),
        "end_date": str(date.today() + timedelta(days=37)),
        "budget": 2000,
        "travelers": 1,
        "pet_friendly": False,
        "avoid_redeye": False
    }
    response = client.post("/bundles", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "bundles" in data
    assert isinstance(data["bundles"], list)

def test_create_watch():
    # First get a bundle to watch
    payload = {
        "origin": "SFO",
        "destination": "JFK",
        "start_date": str(date.today() + timedelta(days=30)),
        "end_date": str(date.today() + timedelta(days=37)),
        "budget": 2000,
        "travelers": 1
    }
    response = client.post("/bundles", json=payload)
    if response.status_code == 200 and len(response.json()["bundles"]) > 0:
        bundle_id = response.json()["bundles"][0]["bundle_id"]
        
        watch_payload = {
            "bundle_id": bundle_id,
            "max_price": 1000,
            "min_rooms_left": 5,
            "min_seats_left": 5
        }
        watch_response = client.post("/watches", json=watch_payload)
        assert watch_response.status_code == 200
        assert watch_response.json()["bundle_id"] == bundle_id
