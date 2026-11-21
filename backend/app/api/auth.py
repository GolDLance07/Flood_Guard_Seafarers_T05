from fastapi import APIRouter, Depends, HTTPException, Body, status
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from backend.app.core.auth import (
    get_current_user,
    get_current_profile,
    require_role,
    AuthenticatedUser,
    UserProfile
)
from backend.app.core.supabase import supabase_manager
from backend.app.services.database import database_service

router = APIRouter(prefix="/api/auth", tags=["authentication"])

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=120)
    phone_number: Optional[str] = Field(None, max_length=20)
    district: Optional[str] = Field(None, max_length=80)
    role: Optional[str] = Field(None, description="Privileged role modification attempt")

@router.get("/health")
def get_supabase_health():
    """Returns connectivity and configuration status for Supabase Auth, Storage & Database."""
    return supabase_manager.check_health()

@router.get("/me")
async def get_my_profile(
    user: AuthenticatedUser = Depends(get_current_user),
    profile: UserProfile = Depends(get_current_profile)
):
    """
    Returns the authenticated user's verified identity and authoritative database profile.
    Role is strictly loaded from persistent storage, never trusted from client inputs.
    """
    return {
        "status": "authenticated",
        "user_id": user.user_id,
        "email": user.email,
        "role": profile.role,
        "full_name": profile.full_name,
        "district": profile.district,
        "claims": {
            "aud": user.claims.get("aud"),
            "exp": user.claims.get("exp"),
            "sub": user.claims.get("sub")
        }
    }

@router.patch("/profile")
async def update_my_profile(
    body: ProfileUpdateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    profile: UserProfile = Depends(get_current_profile)
):
    """
    Updates profile fields for the authenticated caller.
    Strictly forbids self-assigning or escalating privileged roles.
    """
    if body.role is not None and body.role != profile.role and profile.role != "administrator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "ROLE_ESCALATION_FORBIDDEN",
                    "message": "Self-assignment of privileged roles is forbidden. Only administrators can alter role assignments."
                }
            }
        )

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    try:
        updated = database_service.update_profile(
            user_id=user.user_id,
            updates=updates,
            actor_role=profile.role,
            actor_id=user.user_id
        )
        return {"status": "success", "profile": updated or updates}
    except PermissionError as pe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": str(pe)}}
        )

# ------------------------------------------------------------------------------
# RBAC Validation Endpoints (Used for automated security policy boundary testing)
# ------------------------------------------------------------------------------

@router.get("/test/citizen")
async def test_citizen_access(
    profile: UserProfile = Depends(require_role(["citizen", "field_team", "district_authority", "administrator"]))
):
    """Allows all registered citizens and elevated roles."""
    return {"access": "granted", "role": profile.role, "scope": "citizen_level"}

@router.get("/test/responder")
async def test_responder_access(
    profile: UserProfile = Depends(require_role(["field_team", "district_authority", "administrator"]))
):
    """Allows field teams, authorities, and administrators; denies standard citizens."""
    return {"access": "granted", "role": profile.role, "scope": "field_responder_level"}

@router.get("/test/authority")
async def test_authority_access(
    profile: UserProfile = Depends(require_role(["district_authority", "administrator"]))
):
    """Allows district authorities and administrators; denies citizens and field teams."""
    return {"access": "granted", "role": profile.role, "scope": "district_authority_level"}

@router.get("/test/admin")
async def test_admin_access(
    profile: UserProfile = Depends(require_role(["administrator"]))
):
    """Allows administrators only; denies all other roles."""
    return {"access": "granted", "role": profile.role, "scope": "admin_system_level"}
