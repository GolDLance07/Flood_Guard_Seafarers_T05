from fastapi import APIRouter, HTTPException, Query
from ..services.data_loader import data_loader

router = APIRouter(prefix="/api", tags=["Facilities"])

@router.get("/facilities")
def get_facilities(event_id: str = Query("kerala-2018-demo")):
    fac = data_loader.get_facilities(event_id)
    if not fac:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATA_NOT_AVAILABLE",
                    "message": f"Facilities layer not found for event '{event_id}'.",
                    "details": {}
                }
            }
        )
    return fac
