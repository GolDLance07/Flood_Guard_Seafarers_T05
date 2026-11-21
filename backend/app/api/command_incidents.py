from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Depends, Header
from pydantic import BaseModel, Field

from backend.app.schemas.incident import (
    IncidentDetailResponse,
    IncidentStatusUpdateRequest,
    IncidentVerificationRequest,
    IncidentAssignTeamRequest,
)
from backend.app.services.incident_service import incident_service
from backend.app.services.dispatch_advisor import dispatch_advisor
from backend.app.core.auth import get_current_profile, UserProfile

router = APIRouter(prefix="/api/command/incidents", tags=["Command Incident Management"])

@router.get("", response_model=List[Dict[str, Any]])
def list_command_incidents(
    status: Optional[str] = Query(None, description="Filter by incident status"),
    severity: Optional[str] = Query(None, description="Filter by incident severity"),
    region: Optional[str] = Query(None, description="Filter by region slug"),
    category: Optional[str] = Query(None, description="Filter by hazard category"),
    search: Optional[str] = Query(None, description="Text search in title, address, or tracking number")
):
    """
    Authority incoming incident queue with filtering, urgency sorting, and triage metadata.
    """
    return incident_service.list_all_incidents(
        status=status,
        severity=severity,
        region_slug=region,
        category=category,
        search_query=search
    )

@router.get("/clusters")
def get_incident_clusters(
    region: Optional[str] = Query(None, description="Filter by region slug"),
    radius_meters: float = Query(1500.0, description="Clustering radius threshold in meters"),
    min_reports: int = Query(2, description="Minimum report density to constitute a hotspot cluster"),
    hours: float = Query(48.0, description="Temporal window in hours")
):
    """
    Groups geographically and temporally proximate incident reports into spatial clusters.
    Identifies high-density disaster hotspots and emerging community distress centers.
    """
    return incident_service.cluster_incidents(
        region_slug=region,
        radius_meters=radius_meters,
        min_reports=min_reports,
        time_window_hours=hours
    )

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident_detail(incident_id: str):
    """
    Detailed incident view for disaster authorities, including duplicate suggestions,
    evidence attachments, internal notes, and audit timeline.
    """
    detail = incident_service.get_incident_detail(incident_id)
    if not detail:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "INCIDENT_NOT_FOUND", "message": f"Incident '{incident_id}' not found."}}
        )
    return detail

@router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdateRequest,
    actor_role: str = Header("district_authority", alias="X-Actor-Role"),
    actor_name: str = Header("Command Duty Officer", alias="X-Actor-Name")
):
    """
    Transitions incident lifecycle state with strict state machine validation and audit logging.
    """
    try:
        result = incident_service.transition_incident_status(
            incident_id=incident_id,
            new_status=payload.new_status,
            actor_id="auth-duty-officer-01",
            actor_role=actor_role,
            actor_name=actor_name,
            reason=payload.reason,
            public_note=payload.public_note,
            internal_note=payload.internal_note
        )
        return result
    except KeyError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "INCIDENT_NOT_FOUND", "message": str(e)}})
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "TRANSITION_REJECTED", "message": str(e)}})

@router.post("/{incident_id}/verify")
def verify_incident(
    incident_id: str,
    payload: IncidentVerificationRequest,
    actor_role: str = Header("district_authority", alias="X-Actor-Role"),
    actor_name: str = Header("Field Verifier", alias="X-Actor-Name")
):
    """
    Records official ground or authority verification.
    Transitions verified reports to VERIFIED or REJECTED.
    """
    target_status = "VERIFIED" if payload.decision == "confirmed" else "REJECTED"
    if payload.decision == "duplicate":
        target_status = "DUPLICATE"

    try:
        result = incident_service.transition_incident_status(
            incident_id=incident_id,
            new_status=target_status,
            actor_id="auth-duty-officer-01",
            actor_role=actor_role,
            actor_name=actor_name,
            reason=payload.verification_notes,
            public_note=payload.public_note,
            internal_note=f"Verification decision: {payload.decision}. Confidence: {payload.confidence_score}. Notes: {payload.verification_notes}"
        )
        return {
            "status": "success",
            "decision": payload.decision,
            "verification_status": "OFFICIALLY_VERIFIED" if payload.decision == "confirmed" else "VERIFICATION_FAILED",
            "details": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "VERIFICATION_ERROR", "message": str(e)}})

@router.post("/{incident_id}/assign")
def assign_responder_team(
    incident_id: str,
    payload: IncidentAssignTeamRequest,
    actor_role: str = Header("district_authority", alias="X-Actor-Role"),
    actor_name: str = Header("Dispatch Controller", alias="X-Actor-Name")
):
    """
    Assigns a qualified responder team to an incident and sets state to ACTION_DISPATCHED.
    """
    try:
        result = incident_service.transition_incident_status(
            incident_id=incident_id,
            new_status="ACTION_DISPATCHED",
            actor_id="auth-duty-officer-01",
            actor_role=actor_role,
            actor_name=actor_name,
            reason=f"Dispatched team {payload.team_id}. Priority: {payload.priority}. Notes: {payload.assignment_notes or 'Standard dispatch'}",
            public_note="Emergency response unit has been dispatched to this location.",
            internal_note=f"Assigned team ID: {payload.team_id}"
        )
        return {
            "status": "success",
            "incident_id": incident_id,
            "assigned_team_id": payload.team_id,
            "priority": payload.priority,
            "lifecycle_state": "ACTION_DISPATCHED",
            "dispatch_timestamp": result["updated_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "DISPATCH_ERROR", "message": str(e)}})

@router.get("/{incident_id}/dispatch-recommendations")
def get_dispatch_recommendations(
    incident_id: str,
    limit: int = Query(5, ge=1, le=20, description="Max candidate teams to return")
):
    """
    Ranks responder teams for an incident based on capability matching,
    staging proximity, availability, and unit capacity.
    """
    try:
        return dispatch_advisor.get_dispatch_recommendations(incident_id=incident_id, max_recommendations=limit)
    except KeyError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "INCIDENT_NOT_FOUND", "message": str(e)}})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": {"code": "DISPATCH_ADVISOR_ERROR", "message": str(e)}})
