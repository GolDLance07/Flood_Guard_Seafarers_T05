from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

IncidentStatusType = Literal[
    "SUBMITTED_UNVERIFIED",
    "IN_REVIEW",
    "VERIFIED",
    "ACTION_DISPATCHED",
    "IN_PROGRESS",
    "RESOLVED",
    "REJECTED",
    "DUPLICATE"
]

IncidentSeverityType = Literal["low", "medium", "high", "critical"]

class DuplicateSuggestion(BaseModel):
    incident_id: str
    tracking_number: str
    title: str
    distance_meters: float
    time_delta_hours: float
    confidence_score: float
    same_category: bool

class IncidentTimelineEvent(BaseModel):
    id: str
    incident_id: str
    author_name: str
    author_role: str
    update_type: str
    message: str
    is_public: bool
    created_at: str

class IncidentDetailResponse(BaseModel):
    id: str
    tracking_number: str
    reporter_id: Optional[str] = None
    reporter_phone: Optional[str] = None
    region_id: Optional[str] = None
    region_name: Optional[str] = None
    category: str
    severity: IncidentSeverityType
    status: IncidentStatusType
    verification_status: str
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    affected_people_count: int = 0
    evidence_urls: List[str] = Field(default_factory=list)
    public_status_note: Optional[str] = None
    internal_notes: Optional[str] = None
    duplicate_of_id: Optional[str] = None
    suggested_duplicates: List[DuplicateSuggestion] = Field(default_factory=list)
    assigned_team_id: Optional[str] = None
    assigned_team_name: Optional[str] = None
    submitted_at: str
    updated_at: str
    verified_at: Optional[str] = None
    timeline: List[IncidentTimelineEvent] = Field(default_factory=list)

class IncidentStatusUpdateRequest(BaseModel):
    new_status: IncidentStatusType
    reason: str = Field(..., min_length=3, max_length=500)
    public_note: Optional[str] = Field(None, max_length=500)
    internal_note: Optional[str] = Field(None, max_length=500)

class IncidentVerificationRequest(BaseModel):
    decision: Literal["confirmed", "refuted", "duplicate", "needs_more_info"]
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    verification_notes: str = Field(..., min_length=3, max_length=1000)
    public_note: Optional[str] = Field(None, max_length=500)

class IncidentAssignTeamRequest(BaseModel):
    team_id: str
    assignment_notes: Optional[str] = Field(None, max_length=500)
    priority: Literal["low", "medium", "high", "urgent"] = "high"

class PublicIncidentStatusResponse(BaseModel):
    tracking_number: str
    status: IncidentStatusType
    verification_status: str
    category: str
    severity: IncidentSeverityType
    title: str
    submitted_at: str
    verified_at: Optional[str] = None
    public_status_note: Optional[str] = None
    safety_disclaimer: str
