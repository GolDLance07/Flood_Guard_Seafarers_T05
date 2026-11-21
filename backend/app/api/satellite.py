from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from backend.app.services.satellite_pipeline_service import satellite_pipeline_service

router = APIRouter(prefix="/api/satellite", tags=["Satellite SAR Pipeline"])

class TriggerSarJobRequest(BaseModel):
    scene_id: str = Field(..., description="Copernicus Sentinel-1 product ID")
    region_slug: str = Field(..., description="Geographical basin identifier")

@router.get("/jobs", response_model=List[Dict[str, Any]])
def list_satellite_jobs(
    region: Optional[str] = Query(None, description="Filter by region slug")
):
    """List Sentinel-1 SAR processing and analysis jobs with progress and metrics."""
    return satellite_pipeline_service.list_jobs(region_slug=region)

@router.post("/jobs")
def trigger_satellite_job(payload: TriggerSarJobRequest):
    """
    Submits a raw Sentinel-1 radar scene for asynchronous SAR preprocessing,
    radiometric calibration, water thresholding, and permanent water body masking.
    """
    try:
        return satellite_pipeline_service.trigger_analysis_job(
            scene_id=payload.scene_id,
            region_slug=payload.region_slug
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "SAR_JOB_ERROR", "message": str(e)}})

@router.get("/jobs/{job_id}")
def get_satellite_job_status(job_id: str):
    """Poll status, percentage, spatial resolution, and limitations of a SAR analysis job."""
    job = satellite_pipeline_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail={"error": {"code": "JOB_NOT_FOUND", "message": f"Job '{job_id}' not found."}})
    return job

@router.get("/jobs/{job_id}/extent")
def get_satellite_job_extent(job_id: str):
    """Retrieve derived GeoJSON polygon boundaries for a completed satellite analysis job."""
    geojson = satellite_pipeline_service.get_job_extent_geojson(job_id)
    if not geojson:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "EXTENT_NOT_READY", "message": "Polygon extent not found or job has not completed."}}
        )
    return geojson
