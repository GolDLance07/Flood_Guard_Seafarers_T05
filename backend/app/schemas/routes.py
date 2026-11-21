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
