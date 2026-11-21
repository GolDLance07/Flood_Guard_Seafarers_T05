from fastapi import APIRouter, HTTPException, Query
from ..services.data_loader import data_loader

router = APIRouter(prefix="/api/impact", tags=["Impact"])

@router.get("")
def get_impact_summary(event_id: str = Query("kerala-2018-demo")):
    impact = data_loader.get_impact(event_id)
    if not impact:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATA_NOT_AVAILABLE",
                    "message": f"Impact assessment not generated for event '{event_id}'.",
                    "details": {}
                }
            }
        )
    return impact

@router.get("/settlements")
def get_impact_settlements(event_id: str = Query("kerala-2018-demo")):
    settlements = data_loader.get_settlements(event_id)
    if not settlements:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATA_NOT_AVAILABLE",
                    "message": f"Settlements layer not found for event '{event_id}'.",
                    "details": {}
                }
            }
        )
    return settlements

@router.get("/roads")
def get_impact_roads(event_id: str = Query("kerala-2018-demo")):
    roads = data_loader.get_affected_roads(event_id)
    if not roads:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATA_NOT_AVAILABLE",
                    "message": f"Affected roads layer not found for event '{event_id}'.",
                    "details": {}
                }
            }
        )
    return roads

@router.get("/roads/network")
def get_road_network(event_id: str = Query("kerala-2018-demo")):
    roads = data_loader.get_road_network(event_id)
    if not roads:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATA_NOT_AVAILABLE",
                    "message": f"Full road network layer not found for event '{event_id}'.",
                    "details": {}
                }
            }
        )
    return roads
