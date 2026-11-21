from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from .common import Coordinate

class RouteRequest(BaseModel):
    event_id: str = Field(default="kerala-2018-demo")
    origin: Coordinate
    destination: Coordinate

class RouteGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]

class RouteResponse(BaseModel):
    status: str
    distance_km: Optional[float] = None
    geometry: Optional[RouteGeometry] = None
    method: str
    warnings: List[str]

class EvacuationRouteRequest(BaseModel):
    origin: Coordinate
    region_slug: Optional[str] = None
    preferred_shelter_id: Optional[str] = None
    travel_mode: Optional[str] = "driving" # "driving" | "walking"

class EvacuationTargetShelter(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    capacity: Optional[int] = None
    current_occupancy: Optional[int] = None
    operational_status: Optional[str] = "ACTIVE"
    contact_phone: Optional[str] = None

class EvacuationRouteResponse(BaseModel):
    status: str # candidate_route | direct_bearing | no_shelters_available | error
    target_shelter: Optional[EvacuationTargetShelter] = None
    distance_km: Optional[float] = None
    estimated_duration_minutes: Optional[int] = None
    travel_mode: str = "driving"
    geometry: Optional[RouteGeometry] = None
    routing_method: str
    is_flood_avoiding: bool = False
    safety_disclaimer: str
    warnings: List[str]
