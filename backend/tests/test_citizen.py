import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

# ------------------------------------------------------------------------------
# 1. Citizen Overview & Regional Safety Feeds
# ------------------------------------------------------------------------------

def test_citizen_overview_default():
    response = client.get("/api/citizen/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "region" in data
    assert "environmental_readiness" in data
    assert "official_alerts" in data
    assert "observations" in data
    assert "shelters_summary" in data
    assert "safety_advisory" in data

def test_citizen_overview_assam_unseeded():
    response = client.get("/api/citizen/overview?region=assam-guwahati")
    assert response.status_code == 200
    data = response.json()
    assert data["region"]["id"] == "assam-guwahati"
    # Assam has no verified shelters connected yet - verify honest notice
    assert data["shelters_summary"]["has_verified_data"] is False
    assert data["shelters_summary"]["total_shelters"] == 0
    assert data["shelters_summary"]["data_requirements_notice"] is not None

def test_citizen_overview_unknown_region_404():
    response = client.get("/api/citizen/overview?region=unknown-invalid-basin-999")
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "REGION_NOT_FOUND"

# ------------------------------------------------------------------------------
# 2. Shelter Finder & Data Provenance
# ------------------------------------------------------------------------------

def test_shelters_kerala_returns_verified_camps():
    response = client.get("/api/citizen/shelters?region=kerala-alappuzha")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["has_verified_data"] is True
    assert data["total_shelters"] >= 4
    # Verify first camp has authentic details
    camp = data["shelters"][0]
    assert "Sanatana Dharma" in camp["name"] or "College" in camp["name"]
    assert camp["latitude"] > 9.0 and camp["latitude"] < 10.0
    assert camp["longitude"] > 76.0 and camp["longitude"] < 77.0
    assert camp["capacity"] > 0
    assert camp["operational_status"] in ("ACTIVE", "STANDBY", "FULL")
    assert "official_source" in camp

def test_shelters_unseeded_region_returns_honest_empty_state():
    """Unseeded regions must return an honest empty state, NEVER invented shelters."""
    response = client.get("/api/citizen/shelters?region=bihar-patna")
    assert response.status_code == 200
    data = response.json()
    assert data["has_verified_data"] is False
    assert data["total_shelters"] == 0
    assert len(data["shelters"]) == 0
    assert "No verified official emergency shelters" in data["notice"]
    assert "data_requirements_notice" in data
    assert data["data_provenance"] == "NO_VERIFIED_DATASET_CONNECTED"

def test_shelters_unknown_region_404():
    response = client.get("/api/citizen/shelters?region=nonexistent-place")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "REGION_NOT_FOUND"

# ------------------------------------------------------------------------------
# 3. Incident Submission & Validation
# ------------------------------------------------------------------------------

def test_submit_incident_valid():
    payload = {
        "category": "waterlogging",
        "severity": "high",
        "title": "Severe road waterlogging near convent square",
        "description": "Knee-deep water accumulation on main transit corridor blocking two-wheelers.",
        "latitude": 9.4982,
        "longitude": 76.3315,
        "address": "Convent Square, Alappuzha",
        "affected_people_count": 25,
        "region_slug": "kerala-alappuzha"
    }
    response = client.post("/api/citizen/incidents", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "tracking_number" in data
    assert data["tracking_number"].startswith("FG-")
    # Must be unverified crowd report
    assert data["submission_status"] == "SUBMITTED_UNVERIFIED"
    assert data["verification_status"] == "PENDING_OFFICIAL_VERIFICATION"
    assert "safety_disclaimer" in data

def test_submit_incident_invalid_coordinates():
    """Coordinates outside India boundaries must be rejected."""
    payload = {
        "category": "waterlogging",
        "severity": "low",
        "title": "Out of bounds incident",
        "latitude": 51.5074, # London
        "longitude": -0.1278
    }
    response = client.post("/api/citizen/incidents", json=payload)
    assert response.status_code == 422 # Schema validation error

def test_submit_incident_invalid_category():
    payload = {
        "category": "ufo_sighting", # Invalid category
        "severity": "low",
        "title": "Strange lights",
        "latitude": 9.49,
        "longitude": 76.33
    }
    response = client.post("/api/citizen/incidents", json=payload)
    assert response.status_code == 422

def test_incident_status_tracking():
    # 1. Submit
    payload = {
        "category": "stranded_citizens",
        "severity": "critical",
        "title": "Elderly family stranded on ground floor",
        "description": "Rising water in courtyard reaching 1.2m.",
        "latitude": 9.4756,
        "longitude": 76.3421,
        "affected_people_count": 4
    }
    res = client.post("/api/citizen/incidents", json=payload)
    assert res.status_code == 200
    tracking_no = res.json()["tracking_number"]

    # 2. Query Status
    query_res = client.get(f"/api/citizen/incidents/{tracking_no}")
    assert query_res.status_code == 200
    track_data = query_res.json()
    assert track_data["tracking_number"] == tracking_no
    assert track_data["submission_status"] == "SUBMITTED_UNVERIFIED"
    assert track_data["is_verified"] is False

def test_incident_not_found_returns_404():
    response = client.get("/api/citizen/incidents/FG-9999-NOTFOUND")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "INCIDENT_NOT_FOUND"

# ------------------------------------------------------------------------------
# 4. Attachment Security & Validation
# ------------------------------------------------------------------------------

def test_image_upload_validation_valid_jpeg():
    # Fake JPEG header bytes (\xFF\xD8\xFF)
    jpeg_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00" + b"\x00" * 200
    files = {"file": ("test_flood.jpg", jpeg_bytes, "image/jpeg")}
    response = client.post("/api/citizen/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "valid"
    assert data["mime_type"] == "image/jpeg"

def test_image_upload_validation_invalid_file():
    # Plain text / executable disguised as image
    bad_bytes = b"echo 'malicious script'; rm -rf /"
    files = {"file": ("virus.jpg", bad_bytes, "image/jpeg")}
    response = client.post("/api/citizen/upload", files=files)
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_IMAGE_FILE"

def test_my_reports_tracking():
    # Query with tracking list
    response = client.post("/api/citizen/incidents/my-reports?tracking_numbers=FG-2026-TEST1&tracking_numbers=FG-2026-TEST2")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "privacy_notice" in data
    assert "session_type" in data
