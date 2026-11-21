from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from ..services.data_loader import data_loader

router = APIRouter(prefix="/api", tags=["Overview"])

@router.get("/overview")
def get_overview(event_id: str = Query("kerala-2018-demo")):
    overview = data_loader.get_overview(event_id)
    if not overview:
        raise HTTPException(
            status_code=503,
            detail={
                "error": {
                    "code": "DATA_NOT_AVAILABLE",
                    "message": f"Overview data has not been generated for event '{event_id}'.",
                    "details": {}
                }
            }
        )
    return overview
