from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException

from backend.app.services.risk_engine_service import risk_intelligence_service
from backend.app.services.monitoring.region_service import RegionNotFoundError

router = APIRouter(prefix="/api/intelligence", tags=["Risk & Impact Intelligence Engine"])

@router.get("/risk-assessment")
def get_regional_risk_assessment(
    region: Optional[str] = Query(None, description="Geographical region identifier or city name")
):
    """
    Explainable multivariate disaster intelligence and impact assessment.
    Synthesizes meteorological rainfall, river hydrograph discharge, historical susceptibility,
    and verified ground incident clusters with explicit confidence and uncertainty declarations.
    """
    try:
        return risk_intelligence_service.evaluate_regional_risk(region)
    except RegionNotFoundError as e:
        raise HTTPException(status_code=404, detail={"error": {"code": "REGION_NOT_FOUND", "message": str(e)}})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": {"code": "INTELLIGENCE_ENGINE_ERROR", "message": str(e)}})
