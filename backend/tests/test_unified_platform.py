import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_ready_endpoint():
    res = client.get("/api/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ready", "partial")
    assert "ready" in data
    assert "database" in data

def test_command_incidents_list_and_filter():
    res = client.get("/api/command/incidents")
    assert res.status_code == 200
    incidents = res.json()
    assert isinstance(incidents, list)

    # Test filtering by status
    res_filter = client.get("/api/command/incidents?status=SUBMITTED_UNVERIFIED")
    assert res_filter.status_code == 200
    assert isinstance(res_filter.json(), list)

def test_command_incident_lifecycle_transitions():
    # First, submit an incident as a citizen
    report_payload = {
        "title": "Severe Street Inundation Near Market",
        "category": "waterlogging",
        "severity": "high",
        "latitude": 9.498,
        "longitude": 76.338,
        "address": "Kuttanad Market Road",
        "description": "Water level reaching 2 feet and rising rapidly",
        "affected_people_count": 15
    }
    submit_res = client.post("/api/citizen/incidents", json=report_payload)
    assert submit_res.status_code == 200
    report_data = submit_res.json()
    incident_id = report_data["incident_id"]
    tracking_number = report_data["tracking_number"]
    assert report_data["submission_status"] == "SUBMITTED_UNVERIFIED"

    # Get Incident Detail in Command
    detail_res = client.get(f"/api/command/incidents/{incident_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == incident_id
    assert detail["status"] == "SUBMITTED_UNVERIFIED"
    assert "suggested_duplicates" in detail
    assert "timeline" in detail

    # Transition: SUBMITTED_UNVERIFIED -> IN_REVIEW
    trans_res = client.patch(
        f"/api/command/incidents/{incident_id}/status",
        json={
            "new_status": "IN_REVIEW",
            "reason": "Under active triage by duty officer",
            "public_note": "Report received and assigned to field verification team."
        },
        headers={"X-Actor-Role": "district_authority", "X-Actor-Name": "Duty Officer Alappuzha"}
    )
    assert trans_res.status_code == 200
    assert trans_res.json()["new_status"] == "IN_REVIEW"

    # Verification: IN_REVIEW -> VERIFIED
    verify_res = client.post(
        f"/api/command/incidents/{incident_id}/verify",
        json={
            "decision": "confirmed",
            "confidence_score": 0.95,
            "verification_notes": "Ground team visual confirmation",
            "public_note": "Officially verified flood hazard area."
        },
        headers={"X-Actor-Role": "district_authority", "X-Actor-Name": "Field Unit Alpha"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["decision"] == "confirmed"

    # Public Tracking Projection check (PII sanitized)
    public_res = client.get(f"/api/citizen/incidents/{tracking_number}")
    assert public_res.status_code == 200
    pub_data = public_res.json()
    assert pub_data["tracking_number"] == tracking_number
    assert pub_data["submission_status"] == "VERIFIED"
    # Reporter phone and internal notes must NOT leak
    assert "contact_phone" not in pub_data or pub_data.get("contact_phone") is None

    # Invalid state transition test (VERIFIED directly back to SUBMITTED_UNVERIFIED is forbidden)
    invalid_trans = client.patch(
        f"/api/command/incidents/{incident_id}/status",
        json={"new_status": "SUBMITTED_UNVERIFIED", "reason": "Illegal transition test"}
    )
    assert invalid_trans.status_code == 400

def test_incident_spatial_clustering():
    # Submit two proximate incidents
    client.post("/api/citizen/incidents", json={
        "title": "Cluster Test Point 1",
        "category": "waterlogging",
        "severity": "high",
        "latitude": 9.501,
        "longitude": 76.340,
        "address": "North Sector A"
    })
    client.post("/api/citizen/incidents", json={
        "title": "Cluster Test Point 2",
        "category": "waterlogging",
        "severity": "critical",
        "latitude": 9.503,
        "longitude": 76.342,
        "address": "North Sector B"
    })

    res = client.get("/api/command/incidents/clusters?radius_meters=2000&min_reports=2")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "clusters" in data
    assert data["cluster_count"] >= 1
    cluster = data["clusters"][0]
    assert "centroid_latitude" in cluster
    assert "centroid_longitude" in cluster
    assert cluster["report_count"] >= 2
    assert "cluster_risk_level" in cluster

def test_dispatch_recommendations():
    # Submit an incident requiring water rescue
    sub_res = client.post("/api/citizen/incidents", json={
        "title": "People Stranded on Rooftop",
        "category": "stranded_citizens",
        "severity": "critical",
        "latitude": 9.495,
        "longitude": 76.330,
        "address": "Kuttanad Lowlands",
        "affected_people_count": 6
    })
    assert sub_res.status_code == 200
    sub = sub_res.json()
    inc_id = sub["incident_id"]

    res = client.get(f"/api/command/incidents/{inc_id}/dispatch-recommendations?limit=3")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["incident_id"] == inc_id
    assert "top_recommendations" in data
    assert len(data["top_recommendations"]) > 0

    top = data["top_recommendations"][0]
    assert "team_id" in top
    assert "score" in top
    assert "scoring_breakdown" in top
    assert "rationale" in top
    assert top["score"] > 0

def test_responder_operations():
    # List teams
    teams_res = client.get("/api/responder/teams")
    assert teams_res.status_code == 200
    teams = teams_res.json()
    assert isinstance(teams, list)
    assert len(teams) > 0
    team_id = teams[0]["id"]

    # Retrieve unit tasks
    tasks_res = client.get(f"/api/responder/my-tasks?team_id={team_id}")
    assert tasks_res.status_code == 200
    assert isinstance(tasks_res.json(), list)

    # Unit location telemetry update
    loc_payload = {
        "team_id": team_id,
        "latitude": 9.502,
        "longitude": 76.345,
        "heading": 180.0,
        "speed_kmh": 22.5,
        "is_sharing_active": True
    }
    loc_res = client.post("/api/responder/location", json=loc_payload)
    assert loc_res.status_code == 200
    assert loc_res.json()["status"] in ("success", "telemetry_recorded")

    # Authority retrieves active field locations
    active_locs_res = client.get("/api/responder/locations")
    assert active_locs_res.status_code == 200
    active_locs = active_locs_res.json()
    assert isinstance(active_locs, list)

def test_satellite_pipeline():
    # List SAR jobs
    jobs_res = client.get("/api/satellite/jobs")
    assert jobs_res.status_code == 200
    jobs = jobs_res.json()
    assert isinstance(jobs, list)

    # Trigger a SAR job
    trigger_payload = {
        "scene_id": "S1A_IW_GRDH_1SDV_20261122T000000_000000_000000_0000",
        "region_slug": "kerala-alappuzha"
    }
    trig_res = client.post("/api/satellite/jobs", json=trigger_payload)
    assert trig_res.status_code == 200
    job_info = trig_res.json()
    assert "job_id" in job_info
    job_id = job_info["job_id"]

    # Poll status
    status_res = client.get(f"/api/satellite/jobs/{job_id}")
    assert status_res.status_code == 200
    job_detail = status_res.json()
    assert job_detail["id"] == job_id or job_detail.get("job_id") == job_id

    # Extent GeoJSON
    extent_res = client.get(f"/api/satellite/jobs/{job_id}/extent")
    assert extent_res.status_code == 200
    geojson = extent_res.json()
    assert geojson["type"] == "FeatureCollection"

def test_explainable_risk_intelligence():
    # Assess risk for Kerala
    res = client.get("/api/intelligence/risk-assessment?region=kerala-alappuzha")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "risk_assessment" in data
    assert "composite_score" in data["risk_assessment"]
    assert "level" in data["risk_assessment"]
    assert "confidence_score" in data["risk_assessment"]
    assert "contributing_factors" in data
    assert "infrastructure_exposure" in data

def test_evacuation_routing_in_aoi():
    req = {
        "origin": {"latitude": 9.498, "longitude": 76.338},
        "region_slug": "kerala-alappuzha",
        "travel_mode": "driving"
    }
    res = client.post("/api/routes/evacuation", json=req)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("candidate_route", "direct_bearing")
    assert data["target_shelter"] is not None
    assert "distance_km" in data
    assert "estimated_duration_minutes" in data
    assert "safety_disclaimer" in data

def test_evacuation_routing_outside_aoi_unseeded():
    req = {
        "origin": {"latitude": 26.144, "longitude": 91.736}, # Guwahati
        "region_slug": "assam-guwahati",
        "travel_mode": "walking"
    }
    res = client.post("/api/routes/evacuation", json=req)
    assert res.status_code == 200
    data = res.json()
    # Assam is unseeded so no verified shelters connected yet
    assert data["status"] == "no_shelters_available"
    assert data["target_shelter"] is None

def test_notifications_lifecycle():
    # List notifications
    list_res = client.get("/api/notifications")
    assert list_res.status_code == 200
    assert isinstance(list_res.json(), list)

    # Authority broadcast alert
    broadcast_payload = {
        "title": "Flash Inundation Warning for Kuttanad Polders",
        "message": "Water discharge rising in Pamba river. Residents in low-lying polders should prepare for evacuation.",
        "severity": "critical",
        "category": "alert",
        "region_slug": "kerala-alappuzha"
    }
    b_res = client.post(
        "/api/notifications/broadcast",
        json=broadcast_payload,
        headers={"X-Actor-Role": "district_authority"}
    )
    assert b_res.status_code == 200
    notif = b_res.json()
    assert notif["title"] == broadcast_payload["title"]
    notif_id = notif["id"]

    # Mark as read
    read_res = client.patch(f"/api/notifications/{notif_id}/read")
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True
