from typing import Optional, List, Dict, Any, Literal
from fastapi import APIRouter, Query, HTTPException, Header
from pydantic import BaseModel, Field

from backend.app.services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Alerts Engine"])

class BroadcastAlertRequest(BaseModel):
    title: str = Field(..., min_length=4, max_length=150)
    message: str = Field(..., min_length=10, max_length=1000)
    severity: Literal["info", "advisory", "warning", "critical"] = "warning"
    category: Literal["alert", "incident_update", "task_assignment", "shelter_status", "system"] = "alert"
    region_slug: Optional[str] = None
    source: str = "District Emergency Operations Center"

@router.get("", response_model=List[Dict[str, Any]])
def list_notifications(
    region: Optional[str] = Query(None, description="Filter by region slug"),
    user_id: Optional[str] = Query(None, description="Optional user ID for direct alerts")
):
    """Retrieve public emergency advisories and targeted incident notifications."""
    return notification_service.list_notifications(recipient_id=user_id, region_slug=region)

@router.patch("/{notification_id}/read")
def mark_notification_as_read(notification_id: str):
    """Mark a notification as read."""
    notification_service.mark_as_read(notification_id)
    return {"status": "success", "id": notification_id, "is_read": True}

@router.post("/broadcast")
def broadcast_emergency_notification(
    payload: BroadcastAlertRequest,
    actor_role: str = Header("district_authority", alias="X-Actor-Role")
):
    """Authority endpoint to broadcast an urgent regional warning to citizen and responder channels."""
    if actor_role not in ("district_authority", "administrator"):
        raise HTTPException(status_code=403, detail={"error": {"code": "FORBIDDEN", "message": "Broadcasts restricted to authorities."}})

    return notification_service.create_notification(
        title=payload.title,
        message=payload.message,
        severity=payload.severity,
        category=payload.category,
        source=payload.source,
        region_slug=payload.region_slug
    )
