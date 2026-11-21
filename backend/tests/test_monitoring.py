import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.monitoring import (
    monitoring_aggregator,
    imd_service,
    cwc_service,
    sachet_service,
    sentinel_service,
    monitoring_cache
)

client = TestClient(app)

def test_monitoring_overview_endpoint():
    response = client.get("/api/monitoring/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["mode"] == "live_monitoring"
    assert "region" in data
    assert "environmental_readiness" in data
    assert "weather" in data
    assert "rainfall" in data
    assert "rivers" in data
    assert "alerts" in data
    assert "satellites" in data
    assert "provider_status" in data

def test_monitoring_weather_endpoint():
    response = client.get("/api/monitoring/weather")
    assert response.status_code == 200
    data = response.json()
    assert "provider" in data
    assert "observation_type" in data
    assert data["observation_type"] == "current_weather"
    assert "freshness_status" in data

def test_monitoring_rainfall_endpoint():
    response = client.get("/api/monitoring/rainfall")
    assert response.status_code == 200
    data = response.json()
    assert "provider" in data
    assert "district" in data
    assert data["district"] == "Alappuzha"
    assert "rainfall_24h_mm" in data

def test_monitoring_rivers_endpoint():
    response = client.get("/api/monitoring/rivers")
    assert response.status_code == 200
    data = response.json()
    assert "basin_name" in data
    assert "stations" in data
    assert len(data["stations"]) >= 3
    # Check that Malakkara on Pamba is present
    station_names = [s["name"] for s in data["stations"]]
    assert "Malakkara" in station_names
    assert "Kallooppara" in station_names

def test_monitoring_alerts_endpoint():
    response = client.get("/api/monitoring/alerts")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "National Disaster Management Authority (NDMA SACHET)"
    assert "active_alerts_kerala" in data
    assert isinstance(data["alerts"], list)

def test_monitoring_satellites_endpoint():
    response = client.get("/api/monitoring/satellites?limit=3")
    assert response.status_code == 200
    data = response.json()
    assert "orbital_pass_schedule" in data
    assert data["target_relative_orbit"] == 144
    assert "acquisitions" in data

def test_monitoring_stations_endpoint():
    response = client.get("/api/monitoring/stations")
    assert response.status_code == 200
    stations = response.json()
    assert isinstance(stations, list)
    assert len(stations) >= 4
    for st in stations:
        assert "name" in st
        assert "warning_level_m" in st
        assert "danger_level_m" in st
        assert "coordinates" in st

def test_monitoring_status_endpoint():
    response = client.get("/api/monitoring/status")
    assert response.status_code == 200
    status = response.json()
    assert "imd" in status
    assert "cwc" in status
    assert "sachet" in status
    assert "copernicus" in status

def test_legacy_live_endpoint_backward_compatibility():
    response = client.get("/api/live/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "live_monitoring"
    assert "environmental_alert" in data
    assert "weather" in data
    assert "hydrology" in data
    assert "satellite_tracking" in data

    sat_resp = client.get("/api/live/satellite-acquisitions")
    assert sat_resp.status_code == 200
    sat_data = sat_resp.json()
    assert "nominal_relative_orbit" in sat_data or "relative_orbit" in sat_data

def test_cache_freshness_evaluation():
    monitoring_cache.set("test_key", {"dummy": 1}, "2026-11-21T12:00:00Z")
    assert monitoring_cache.evaluate_freshness("test_key", max_live_seconds=100) == "LIVE"
    assert monitoring_cache.evaluate_freshness("missing_key") == "UNAVAILABLE"

def test_cwc_authoritative_station_thresholds():
    stations = cwc_service.get_stations()
    malakkara = next(s for s in stations if s["name"] == "Malakkara")
    assert malakkara["warning_level_m"] == 7.50
    assert malakkara["danger_level_m"] == 8.50
    assert malakkara["hfl_m"] == 11.23

    kallooppara = next(s for s in stations if s["name"] == "Kallooppara")
    assert kallooppara["warning_level_m"] == 6.00
    assert kallooppara["danger_level_m"] == 7.00
