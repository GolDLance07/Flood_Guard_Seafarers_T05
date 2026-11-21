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

def test_unknown_region_returns_404():
    """Verify that unknown region raises 404 with code REGION_NOT_FOUND instead of silent fallback."""
    response = client.get("/api/monitoring/overview?region=nonexistent-invalid-slug-99999")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "REGION_NOT_FOUND"
    assert "supported_regions" in data["error"]["details"]

def test_default_region_when_omitted():
    """Verify that omitting region parameter deliberately returns the documented default (kerala-alappuzha)."""
    response = client.get("/api/monitoring/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["region"]["id"] == "kerala-alappuzha"
    assert data["region"]["state"] == "Kerala"

def test_risk_readiness_insufficient_data():
    """Verify that missing rainfall and river discharge returns INSUFFICIENT_DATA, never normal or invented numbers."""
    from backend.app.services.monitoring.monitoring_aggregator import monitoring_aggregator
    result = monitoring_aggregator.compute_environmental_risk(
        rainfall_data={"rainfall_24h_mm": None},
        hydrology_data={"current_discharge_m3_s": None, "median_discharge_m3_s": None},
        warnings_list=[]
    )
    assert result["level"] == "INSUFFICIENT_DATA"
    assert result["data_sufficiency"] == "INADEQUATE"
    assert "telemetry_gap" in result
    assert result["indicator_nature"] == "ENVIRONMENTAL_PRECURSOR_INDICATOR"

def test_zero_rainfall_is_evaluated_as_normal():
    """Verify that legitimate 0.0 mm rainfall is distinguished from missing data and evaluates as NORMAL."""
    from backend.app.services.monitoring.monitoring_aggregator import monitoring_aggregator
    result = monitoring_aggregator.compute_environmental_risk(
        rainfall_data={"rainfall_24h_mm": 0.0},
        hydrology_data={"current_discharge_m3_s": 0.82, "median_discharge_m3_s": 0.80},
        warnings_list=[]
    )
    assert result["level"] == "NORMAL"
    assert result["data_sufficiency"] in ["COMPLETE", "ADEQUATE"]
    assert result["metrics"]["rainfall_24h_mm"] == 0.0

def test_cache_isolation_across_regions():
    """Verify that telemetry cached for one region does not bleed into another region."""
    from backend.app.services.monitoring.region_service import region_service
    from backend.app.services.monitoring.monitoring_aggregator import monitoring_aggregator

    kerala_data = monitoring_aggregator.get_monitoring_overview("kerala-alappuzha")
    assam_data = monitoring_aggregator.get_monitoring_overview("assam-guwahati")

    assert kerala_data["region"]["id"] == "kerala-alappuzha"
    assert assam_data["region"]["id"] == "assam-guwahati"
    assert kerala_data["region"]["state"] != assam_data["region"]["state"]
    # Check that stations returned are geographically separated
    kerala_stations = [s["name"] for s in kerala_data["rivers"]["stations"]]
    assam_stations = [s["name"] for s in assam_data["rivers"]["stations"]]
    assert not set(kerala_stations).intersection(set(assam_stations))
