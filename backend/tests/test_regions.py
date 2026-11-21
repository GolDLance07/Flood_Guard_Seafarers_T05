import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_regions_catalog_endpoint():
    response = client.get("/api/monitoring/regions")
    assert response.status_code == 200
    regions = response.json()
    assert isinstance(regions, list)
    assert len(regions) >= 6

    slugs = [r["id"] for r in regions]
    assert "kerala-alappuzha" in slugs
    assert "assam-guwahati" in slugs
    assert "bihar-patna" in slugs
    assert "gujarat-ahmedabad" in slugs
    assert "odisha-cuttack" in slugs

def test_regions_search_endpoint():
    response = client.get("/api/monitoring/regions?search=Assam")
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    for r in results:
        assert "assam" in r["state"].lower() or "assam" in r["name"].lower()

def test_monitoring_overview_assam():
    response = client.get("/api/monitoring/overview?region=assam-guwahati")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["region"]["id"] == "assam-guwahati"
    assert "Guwahati" in data["region"]["name"]
    assert data["region"]["state"] == "Assam"
    assert data["region"]["cwc_basin"] == "Brahmaputra Basin"
    # Check that Brahmaputra gauge stations are returned
    stations = data["rivers"]["stations"]
    assert isinstance(stations, list)
    station_names = [s["name"] for s in stations]
    assert any("Guwahati" in n or "Pandu" in n for n in station_names)

def test_monitoring_overview_bihar():
    response = client.get("/api/monitoring/overview?region=bihar-patna")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["region"]["id"] == "bihar-patna"
    assert "Patna" in data["region"]["name"]
    assert data["region"]["state"] == "Bihar"

def test_monitoring_overview_gujarat():
    response = client.get("/api/monitoring/overview?region=gujarat-ahmedabad")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["region"]["id"] == "gujarat-ahmedabad"
    assert "Ahmedabad" in data["region"]["name"]
    assert data["region"]["state"] == "Gujarat"

def test_historical_analysis_remains_untouched():
    """Verify that historical Kerala 2018 endpoints are 100% preserved."""
    response = client.get("/api/overview?event_id=kerala-2018-demo")
    assert response.status_code == 200
    data = response.json()
    assert "Kerala" in data.get("aoi", {}).get("name", "")
    assert data["kpis"]["flooded_area_ha"] == 38656.52
    assert data["kpis"]["estimated_exposed_population"] == 257456
    assert data["kpis"]["affected_roads_km"] == 713.06
