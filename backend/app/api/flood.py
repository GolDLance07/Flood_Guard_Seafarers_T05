from fastapi import APIRouter, HTTPException, Query
from ..services.data_loader import data_loader

router = APIRouter(prefix="/api/flood", tags=["Flood"])

@router.get("/extent")
def get_flood_extent(event_id: str = Query("kerala-2018-demo")):
    extent = data_loader.get_flood_extent(event_id)
    if not extent:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATA_NOT_AVAILABLE",
                    "message": f"Flood extent layer not found for event '{event_id}'.",
                    "details": {}
                }
            }
        )
    return extent

@router.get("/metadata")
def get_flood_metadata(event_id: str = Query("kerala-2018-demo")):
    meta = data_loader.get_flood_metadata(event_id)
    if not meta:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATA_NOT_AVAILABLE",
                    "message": f"Flood metadata not found for event '{event_id}'.",
                    "details": {}
                }
            }
        )
    return meta
