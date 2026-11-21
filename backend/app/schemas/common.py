from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class Coordinate(BaseModel):
    longitude: float = Field(..., ge=-180.0, le=180.0)
    latitude: float = Field(..., ge=-90.0, le=90.0)

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ErrorResponse(BaseModel):
    error: ErrorDetail
