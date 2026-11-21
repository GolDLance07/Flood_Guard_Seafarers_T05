from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Form, Depends, Header
from typing import Optional, List, Dict, Any
from backend.app.schemas.citizen import (
    SheltersResponse,
    IncidentSubmissionRequest,
    IncidentSubmissionResponse,
    IncidentStatusQueryResponse
)
from backend.app.services.citizen_service import citizen_service
from backend.app.services.monitoring.region_service import region_service, RegionNotFoundError
from backend.app.services.monitoring import monitoring_aggregator

router = APIRouter(prefix="/api/citizen", tags=["citizen"])

def _handle_region_error(exc: RegionNotFoundError):
    raise HTTPException(
        status_code=404,
        detail={
            "error": {
                "code": "REGION_NOT_FOUND",
                "message": f"Region '{exc.region_id}' could not be resolved in the regional catalogue or geocoder.",
                "details": {
                    "requested_region": exc.region_id,
                    "supported_regions": [r["id"] for r in region_service.list_regions()]
                }
            }
        }
    )

@router.get("/overview")
def get_citizen_overview(
    region: Optional[str] = Query(None, description="Region identifier (e.g. kerala-alappuzha, assam-guwahati)")
):
    """
    Compact public safety overview for citizen landing page.
    Returns current weather observations, official alerts, precursor risk status,
    and verified shelter availability.
    """
    try:
        telemetry = monitoring_aggregator.get_monitoring_overview(region_id=region)
    except RegionNotFoundError as e:
        _handle_region_error(e)

    reg_id = telemetry["region"]["id"]
    shelters_info = citizen_service.get_shelters_for_region(reg_id)

    # Format citizen safety status
    readiness = telemetry.get("environmental_readiness", {})
    weather = telemetry.get("weather", {})
    rainfall = telemetry.get("rainfall", {})
    rivers = telemetry.get("rivers", {})
    alerts = telemetry.get("alerts", {})

    return {
        "status": "success",
        "region": telemetry["region"],
        "timestamp": telemetry["timestamp"],
        "environmental_readiness": readiness,
        "official_alerts": {
            "active_count": alerts.get("active_alerts_count", 0),
            "alerts": alerts.get("alerts", []),
            "source": alerts.get("provider", "NDMA SACHET"),
            "freshness": alerts.get("freshness_status", "LIVE"),
            "coverage_status": alerts.get("coverage_status", "NO_ACTIVE_ALERTS"),
            "notice": alerts.get("notice")
        },
        "observations": {
            "temperature_c": weather.get("temperature_c"),
            "condition": weather.get("condition", "Fair"),
            "rainfall_24h_mm": rainfall.get("rainfall_24h_mm"),
            "weather_freshness": weather.get("freshness_status", "RECENT"),
            "weather_provider": weather.get("provider", "IMD / Open-Meteo"),
            "river_discharge_m3_s": rivers.get("current_discharge_m3_s"),
            "river_flow_status": rivers.get("flow_status", "NORMAL"),
            "river_freshness": rivers.get("freshness_status", "RECENT")
        },
        "shelters_summary": {
            "has_verified_data": shelters_info["has_verified_data"],
            "total_shelters": shelters_info["total_shelters"],
            "active_shelters": len([s for s in shelters_info["shelters"] if s.get("operational_status") == "ACTIVE"]),
            "notice": shelters_info.get("notice"),
            "data_requirements_notice": shelters_info.get("data_requirements_notice")
        },
        "safety_advisory": (
            "Precursor indicators track meteorological and river potential, not physical water inundation. "
            "Never assume an area is safe solely because estimated risk is normal. Official district collectorate "
            "and NDMA instructions take precedence at all times."
        )
    }

@router.get("/shelters", response_model=SheltersResponse)
def get_shelters(
    region: Optional[str] = Query(None, description="Region identifier (e.g. kerala-alappuzha, assam-guwahati)")
):
    """
    Get verified designated emergency relief camps for the selected region.
    - Kerala / Alappuzha: Returns verified DDMA / KSDMA relief camps.
    - Other regions: Returns a clearly labeled empty state with required integration specs.
    Does NOT fabricate shelters, capacity, or status.
    """
    try:
        return citizen_service.get_shelters_for_region(region)
    except RegionNotFoundError as e:
        _handle_region_error(e)

@router.post("/incidents", response_model=IncidentSubmissionResponse)
def submit_incident(
    payload: IncidentSubmissionRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Submit an unverified emergency citizen report (waterlogging, flooded road, stranded citizens).
    Assigns a tracking number and marks status as 'SUBMITTED_UNVERIFIED'.
    """
    user_id = None
    user_token = None
    if authorization and authorization.startswith("Bearer "):
        user_token = authorization.replace("Bearer ", "").strip()
        # Extract user_id if valid
        try:
            from backend.app.core.auth import verify_supabase_jwt
            claims = verify_supabase_jwt(user_token)
            user_id = claims.get("sub")
        except Exception:
            pass

    return citizen_service.submit_incident_report(
        report_data=payload.model_dump(),
        user_id=user_id,
        user_token=user_token
    )

@router.get("/incidents/{tracking_number}", response_model=IncidentStatusQueryResponse)
def get_incident_status(tracking_number: str):
    """
    Query current status and official verification notes of an incident by public tracking number.
    """
    incident = citizen_service.get_incident_by_tracking(tracking_number)
    if not incident:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "INCIDENT_NOT_FOUND",
                    "message": f"No incident report found with tracking number '{tracking_number}'.",
                    "details": {"tracking_number": tracking_number}
                }
            }
        )
    return incident

@router.post("/incidents/my-reports")
def get_my_reports(
    tracking_numbers: List[str] = Query(default_factory=list),
    authorization: Optional[str] = Header(None)
):
    """
    Retrieve citizen report history using client tracking numbers or authenticated user session.
    Protects user privacy: does not store personal location history without explicit user consent.
    """
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            from backend.app.core.auth import verify_supabase_jwt
            claims = verify_supabase_jwt(authorization.replace("Bearer ", "").strip())
            user_id = claims.get("sub")
        except Exception:
            pass

    reports = citizen_service.list_my_reports(user_id=user_id, tracking_numbers=tracking_numbers)
    return {
        "status": "success",
        "total_reports": len(reports),
        "reports": reports,
        "session_type": "authenticated" if user_id else "anonymous_device_session",
        "privacy_notice": (
            "Anonymous session reports are tracked on this device via local tracking codes. "
            "No personal location trails are stored on the server."
        )
    }

@router.post("/upload")
async def upload_evidence_file(file: UploadFile = File(...)):
    """
    Validates and accepts incident photograph or document attachment.
    Enforces 10MB size limit and validates binary file signatures (JPEG, PNG, WEBP, PDF).
    """
    content = await file.read()
    validation = citizen_service.validate_image_upload(content, file.filename or "upload")
    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_IMAGE_FILE",
                    "message": validation["error"]
                }
            }
        )

    # In production with Supabase Storage, client uploads directly or server proxies
    # Return validated file metadata
    return {
        "status": "valid",
        "filename": file.filename,
        "mime_type": validation["mime_type"],
        "size_bytes": validation["file_size_bytes"]
    }
