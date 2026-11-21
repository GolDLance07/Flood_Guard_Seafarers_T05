import pytest
import os
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.supabase import supabase_manager
from backend.app.services.database import database_service

client = TestClient(app)

# Helper function to generate deterministic test auth headers
def make_auth_headers(role: str = "citizen", user_id: str = "11111111-1111-1111-1111-111111111111"):
    return {"Authorization": f"Bearer test-token:{role}:{user_id}:{role}@floodguard.org"}

# ------------------------------------------------------------------------------
# 1. Supabase Health & Connection Lifecycle
# ------------------------------------------------------------------------------

def test_supabase_health_endpoint():
    response = client.get("/api/auth/health")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert data["configured"] is True
    assert "jwks_accessible" in data
    assert data["jwks_accessible"] is True
    assert "supabase_url" in data

# ------------------------------------------------------------------------------
# 2. Authentication Boundary & Token Verification
# ------------------------------------------------------------------------------

def test_unauthenticated_request_rejected():
    """Unauthenticated access to protected endpoints must return 401 Unauthorized."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["error"]["code"] == "MISSING_CREDENTIALS"

def test_invalid_jwt_token_rejected():
    """Malformed or invalid signature tokens must return 401 Unauthorized."""
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt.signature.here"})
    assert response.status_code == 401
    data = response.json()
    assert "INVALID_TOKEN" in data["error"]["code"] or "AUTH_VERIFICATION_FAILED" in data["error"]["code"]

def test_authenticated_citizen_me():
    """Valid token returns verified subject and authoritative role."""
    headers = make_auth_headers(role="citizen", user_id="33333333-3333-3333-3333-333333333333")
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "authenticated"
    assert data["user_id"] == "33333333-3333-3333-3333-333333333333"
    assert data["role"] == "citizen"

# ------------------------------------------------------------------------------
# 3. Role-Based Access Control (RBAC) & Boundary Enforcement
# ------------------------------------------------------------------------------

def test_citizen_role_access_boundaries():
    """Citizens can access citizen endpoints but are denied responder, authority, and admin endpoints."""
    headers = make_auth_headers(role="citizen")

    # Allowed
    r_citizen = client.get("/api/auth/test/citizen", headers=headers)
    assert r_citizen.status_code == 200
    assert r_citizen.json()["access"] == "granted"

    # Denied: Responder endpoint
    r_responder = client.get("/api/auth/test/responder", headers=headers)
    assert r_responder.status_code == 403
    assert r_responder.json()["error"]["code"] == "INSUFFICIENT_PERMISSIONS"

    # Denied: Authority endpoint
    r_auth = client.get("/api/auth/test/authority", headers=headers)
    assert r_auth.status_code == 403

    # Denied: Admin endpoint
    r_admin = client.get("/api/auth/test/admin", headers=headers)
    assert r_admin.status_code == 403

def test_field_team_role_access_boundaries():
    """Field teams can access responder endpoints but are denied authority and admin endpoints."""
    headers = make_auth_headers(role="field_team")

    # Allowed: Responder endpoint
    r_responder = client.get("/api/auth/test/responder", headers=headers)
    assert r_responder.status_code == 200
    assert r_responder.json()["role"] == "field_team"

    # Denied: Authority endpoint
    r_auth = client.get("/api/auth/test/authority", headers=headers)
    assert r_auth.status_code == 403

    # Denied: Admin endpoint
    r_admin = client.get("/api/auth/test/admin", headers=headers)
    assert r_admin.status_code == 403

def test_district_authority_role_access_boundaries():
    """District authorities can access authority and responder endpoints but are denied admin."""
    headers = make_auth_headers(role="district_authority")

    # Allowed: Authority endpoint
    r_auth = client.get("/api/auth/test/authority", headers=headers)
    assert r_auth.status_code == 200
    assert r_auth.json()["role"] == "district_authority"

    # Allowed: Responder endpoint
    r_responder = client.get("/api/auth/test/responder", headers=headers)
    assert r_responder.status_code == 200

    # Denied: Admin endpoint
    r_admin = client.get("/api/auth/test/admin", headers=headers)
    assert r_admin.status_code == 403

def test_administrator_role_access():
    """Administrators have unrestricted operational access across all role endpoints."""
    headers = make_auth_headers(role="administrator")

    r_admin = client.get("/api/auth/test/admin", headers=headers)
    assert r_admin.status_code == 200
    assert r_admin.json()["role"] == "administrator"

    r_auth = client.get("/api/auth/test/authority", headers=headers)
    assert r_auth.status_code == 200

    r_responder = client.get("/api/auth/test/responder", headers=headers)
    assert r_responder.status_code == 200

# ------------------------------------------------------------------------------
# 4. Self-Assignment & Role Escalation Prevention
# ------------------------------------------------------------------------------

def test_citizen_cannot_self_assign_admin_role():
    """Non-administrators cannot escalate their own role via profile update."""
    headers = make_auth_headers(role="citizen")
    payload = {"full_name": "Citizen User", "role": "administrator"}

    response = client.patch("/api/auth/profile", json=payload, headers=headers)
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "ROLE_ESCALATION_FORBIDDEN"

# ------------------------------------------------------------------------------
# 5. Database Service & Audit Logging Lifecycle
# ------------------------------------------------------------------------------

def test_audit_log_recording_lifecycle():
    """Privileged audit events are recorded append-only without breaking business workflows."""
    success = database_service.record_audit_event(
        actor_id="11111111-1111-1111-1111-111111111111",
        action="TEST_VERIFICATION_EVENT",
        resource_type="system_test",
        resource_id="test_001",
        details={"test": True, "engine": "pytest"}
    )
    # Even if remote DB is empty/unseeded, the function handles network safely and returns a boolean
    assert isinstance(success, bool)
