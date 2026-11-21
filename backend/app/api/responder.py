from typing import Optional, List, Dict, Any, Literal
from fastapi import APIRouter, Query, HTTPException, Header, Depends
from pydantic import BaseModel, Field

from backend.app.services.responder_service import responder_service
from backend.app.core.auth import get_current_profile, UserProfile

router = APIRouter(prefix="/api/responder", tags=["Responder Operations"])

class AssignmentResponseRequest(BaseModel):
    team_id: str
    decision: Literal["ACCEPTED", "DECLINED"]
    decline_reason: Optional[str] = None

class AssignmentStatusRequest(BaseModel):
    team_id: str
    status: Literal["EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED", "ABORTED"]
    notes: Optional[str] = None

class LocationUpdateRequest(BaseModel):
    team_id: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    heading: Optional[float] = None
    speed_kmh: Optional[float] = None
    is_sharing_active: bool = True

@router.get("/teams")
def list_responder_teams(
    region: Optional[str] = Query(None, description="Filter by region slug"),
    status: Optional[str] = Query(None, description="Filter by operational status")
):
    """List responder rescue and medical teams across jurisdictions."""
    return responder_service.list_teams(region_id=region, status=status)

@router.get("/teams/{team_id}")
def get_team_detail(team_id: str):
    """Retrieve detailed unit equipment, capabilities, and assignment status."""
    team = responder_service.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail={"error": {"code": "TEAM_NOT_FOUND", "message": f"Team '{team_id}' not found."}})
    return team

@router.get("/my-tasks")
def get_my_tasks(
    team_id: str = Query("b0000000-0000-0000-0000-000000000001", description="Responder team ID")
):
    """Retrieve active emergency task assignments for the field team."""
    return responder_service.get_my_tasks(team_id=team_id)

@router.post("/assignments/{assignment_id}/respond")
def respond_to_assignment(
    assignment_id: str,
    payload: AssignmentResponseRequest,
    responder_role: str = Header("field_team", alias="X-Actor-Role")
):
    """Field team accepts or declines an emergency dispatch assignment."""
    try:
        return responder_service.respond_to_assignment(
            assignment_id=assignment_id,
            team_id=payload.team_id,
            decision=payload.decision,
            decline_reason=payload.decline_reason
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_RESPONSE", "message": str(e)}})

@router.post("/assignments/{assignment_id}/status")
def update_assignment_status(
    assignment_id: str,
    payload: AssignmentStatusRequest,
    responder_role: str = Header("field_team", alias="X-Actor-Role")
):
    """Field team updates progress lifecycle (EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED)."""
    try:
        return responder_service.update_assignment_lifecycle(
            assignment_id=assignment_id,
            team_id=payload.team_id,
            new_status=payload.status,
            notes=payload.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_STATUS", "message": str(e)}})

@router.post("/location")
def update_team_location(payload: LocationUpdateRequest):
    """Opt-in, permission-controlled location telemetry broadcast from field unit."""
    return responder_service.record_location_update(
        team_id=payload.team_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        heading=payload.heading,
        speed_kmh=payload.speed_kmh,
        is_sharing_active=payload.is_sharing_active
    )

@router.get("/locations")
def get_active_locations(
    actor_role: str = Header("district_authority", alias="X-Actor-Role")
):
    """
    Returns recent positions of active teams with location sharing enabled.
    Access restricted to authenticated field teams and authorities. Never exposed publicly.
    """
    if actor_role not in ("field_team", "district_authority", "administrator"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Live responder telemetry is restricted to operational personnel."}})
    return responder_service.get_active_team_locations()
