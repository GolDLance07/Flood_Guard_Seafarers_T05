from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime

class ShelterItem(BaseModel):
    id: str
    region_id: str
    name: str
    facility_type: str = "designated_relief_camp"
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address: Optional[str] = None
    capacity: Optional[int] = Field(None, ge=1)
    current_occupancy: Optional[int] = Field(None, ge=0)
    operational_status: Literal["ACTIVE", "STANDBY", "FULL", "CLOSED"] = "ACTIVE"
    official_source: str = "State Disaster Management Authority (SDMA)"
    last_verified_at: str
    contact_phone: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)
    is_demo_data: bool = False

class SheltersResponse(BaseModel):
    status: str = "success"
    region_id: str
    region_name: str
    total_shelters: int
    shelters: List[ShelterItem]
    has_verified_data: bool
    data_provenance: str
    notice: Optional[str] = None
    data_requirements_notice: Optional[str] = None

class IncidentSubmissionRequest(BaseModel):
    category: Literal[
        "waterlogging",
        "flooded_road",
        "stranded_citizens",
        "infrastructure_damage",
        "medical_emergency",
        "shelter_need",
        "other"
    ] = Field(..., description="Nature of emergency observation")
    severity: Literal["low", "medium", "high", "critical"] = Field(
        default="medium",
        description="Citizen-estimated severity"
    )
    title: str = Field(..., min_length=4, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    latitude: float = Field(..., ge=6.0, le=38.0, description="Valid latitude within India boundaries")
    longitude: float = Field(..., ge=68.0, le=98.0, description="Valid longitude within India boundaries")
    address: Optional[str] = Field(None, max_length=200)
    affected_people_count: Optional[int] = Field(None, ge=0, le=10000)
    contact_phone: Optional[str] = Field(None, max_length=20)
    image_url: Optional[str] = Field(None, max_length=1000)
    region_slug: Optional[str] = Field(None, description="Optional region slug (e.g. kerala-alappuzha)")

    @field_validator("title", "description", mode="before")
    @classmethod
    def sanitize_strings(cls, v):
        if isinstance(v, str):
            # Basic sanitization
            return v.strip().replace("<script", "&lt;script")
        return v

class IncidentSubmissionResponse(BaseModel):
    status: str = "success"
    incident_id: str
    tracking_number: str
    submission_status: Literal["SUBMITTED_UNVERIFIED", "IN_REVIEW", "VERIFIED", "RESOLVED", "REJECTED"] = "SUBMITTED_UNVERIFIED"
    verification_status: str = "PENDING_OFFICIAL_VERIFICATION"
    submitted_at: str
    category: str
    severity: str
    title: str
    location: Dict[str, Any]
    safety_disclaimer: str = (
        "Citizen reports are unverified crowd observations pending ground validation by emergency response teams. "
        "Do not rely solely on unverified reports during acute emergencies. Follow official district instructions."
    )

class IncidentStatusQueryResponse(BaseModel):
    tracking_number: str
    incident_id: str
    submission_status: str
    verification_status: str
    submitted_at: str
    category: str
    severity: str
    title: str
    description: Optional[str] = None
    location: Dict[str, Any]
    verification_notes: Optional[str] = None
    is_verified: bool
