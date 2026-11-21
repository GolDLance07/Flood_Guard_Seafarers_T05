import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "FloodGuard API" in data["service"]

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["data_ready"] is True
    assert "flood_extent" in data["available_layers"]

def test_events():
    response = client.get("/api/events")
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) > 0
    assert data["events"][0]["id"] == "kerala-2018-demo"

def test_event_detail_success():
    response = client.get("/api/events/kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "kerala-2018-demo"
    assert "Alappuzha" in data["region"]

def test_event_detail_not_found():
    response = client.get("/api/events/non-existent-event")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "EVENT_NOT_FOUND"

def test_overview():
    response = client.get("/api/overview?event_id=kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert data["kpis"]["flooded_area_ha"] > 0
    assert data["kpis"]["estimated_exposed_population"] > 0
    assert data["kpis"]["affected_roads_km"] > 0

def test_flood_extent():
    response = client.get("/api/flood/extent?event_id=kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0
    # First feature must have required properties
    props = data["features"][0]["properties"]
    assert "area_ha" in props
    assert props["class"] == "flood_inundation"

def test_flood_metadata():
    response = client.get("/api/flood/metadata?event_id=kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert "event_scene" in data
    assert "S1A_IW_GRDH" in data["event_scene"]["id"]
    assert "baseline_scene" in data
    assert "methodology" in data

def test_impact_summary():
    response = client.get("/api/impact?event_id=kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data

def test_impact_settlements():
    response = client.get("/api/impact/settlements?event_id=kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0

def test_impact_roads():
    response = client.get("/api/impact/roads?event_id=kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0

def test_facilities():
    response = client.get("/api/facilities?event_id=kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "FeatureCollection"
    assert len(data["features"]) > 0
    assert "inside_flood_extent" in data["features"][0]["properties"]

def test_route_valid():
    # Pick two points inside the Alappuzha AOI road network
    payload = {
        "event_id": "kerala-2018-demo",
        "origin": {"longitude": 76.35, "latitude": 9.48},
        "destination": {"longitude": 76.40, "latitude": 9.52}
    }
    response = client.post("/api/routes", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["candidate_route", "no_route_found"]
    assert len(data["warnings"]) > 0
    # Must have the non-negotiable warning text
    assert any("Candidate route only" in w for w in data["warnings"])
    if data["status"] == "candidate_route":
        assert data["distance_km"] > 0
        assert data["geometry"]["type"] == "LineString"

def test_route_out_of_bounds():
    payload = {
        "event_id": "kerala-2018-demo",
        "origin": {"longitude": 0.0, "latitude": 0.0},
        "destination": {"longitude": 76.40, "latitude": 9.52}
    }
    response = client.post("/api/routes", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_route_found"
    assert any("outside the operational event Area of Interest" in w for w in data["warnings"])

def test_route_invalid_payload():
    # Missing origin
    payload = {
        "event_id": "kerala-2018-demo",
        "destination": {"longitude": 76.40, "latitude": 9.52}
    }
    response = client.post("/api/routes", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"]["code"] == "SCHEMA_VALIDATION_ERROR"

def test_report():
    response = client.get("/api/reports/kerala-2018-summary")
    assert response.status_code == 200
    data = response.json()
    assert data["report_id"] == "kerala-2018-summary"
    assert "kpis" in data
    assert "limitations" in data

def test_live_overview():
    response = client.get("/api/live/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["mode"] == "live_monitoring"
    assert "weather" in data
    assert "hydrology" in data
    assert "environmental_alert" in data
    assert "satellite_tracking" in data
    assert "disclaimer" in data["environmental_alert"]

def test_live_satellite_acquisitions():
    response = client.get("/api/live/satellite-acquisitions")
    assert response.status_code == 200
    data = response.json()
    assert "constellation" in data
    assert "repeat_cycle_days" in data
