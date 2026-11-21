from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from backend.app.services.monitoring import monitoring_aggregator
from backend.app.services.monitoring.region_service import region_service, RegionNotFoundError

router = APIRouter(prefix="/api/monitoring", tags=["live_monitoring"])

def _handle_region_error(exc: RegionNotFoundError):
    raise HTTPException(
        status_code=404,
        detail={
            "error": {
                "code": "REGION_NOT_FOUND",
                "message": f"Region '{exc.region_id}' could not be resolved in the regional catalogue or geocoder.",
                "details": {
                    "requested_region": exc.region_id,
                    "supported_regions": [r["id"] for r in region_service.list_regions()]
                }
            }
        }
    )

@router.get("/regions")
def get_regions(search: Optional[str] = Query(None, description="Search keyword for state, district, or city")):
    """
    Get selectable geographical monitoring regions across India.
    Supports catalog lookup and dynamic geocoding for any location.
    """
    return region_service.list_regions(search_query=search)

@router.get("/overview")
def get_monitoring_overview(region: Optional[str] = Query(None, description="Region identifier (e.g. kerala-alappuzha, assam-guwahati)")):
    """
    Get aggregated live environmental monitoring telemetry for a specific region:
    - Current weather (IMD / Open-Meteo baseline)
    - 24-hour rainfall accumulation and departure
    - River water-level gauge stations (CWC basin atlas)
    - Official NDMA SACHET disaster early warning alerts
    - Copernicus Sentinel-1 SAR acquisition discovery and pass schedules
    """
    try:
        return monitoring_aggregator.get_monitoring_overview(region_id=region)
    except RegionNotFoundError as e:
        _handle_region_error(e)

@router.get("/weather")
def get_weather(region: Optional[str] = Query(None)):
    """Get current meteorological observations for the selected region."""
    try:
        return monitoring_aggregator.get_weather(region_id=region)
    except RegionNotFoundError as e:
        _handle_region_error(e)

@router.get("/rainfall")
def get_rainfall(region: Optional[str] = Query(None)):
    """Get district-level rainfall measurements and departure from normal for the selected region."""
    try:
        return monitoring_aggregator.get_rainfall(region_id=region)
    except RegionNotFoundError as e:
        _handle_region_error(e)

@router.get("/rivers")
def get_rivers(region: Optional[str] = Query(None)):
    """Get river telemetry, inflow discharge simulations, and CWC gauge stations for the selected region."""
    try:
        return monitoring_aggregator.get_rivers(region_id=region)
    except RegionNotFoundError as e:
        _handle_region_error(e)

@router.get("/alerts")
def get_alerts(region: Optional[str] = Query(None)):
    """Get official disaster warnings from NDMA SACHET for the selected region."""
    try:
        return monitoring_aggregator.get_alerts(region_id=region)
    except RegionNotFoundError as e:
        _handle_region_error(e)

@router.get("/satellites")
def get_satellites(
    region: Optional[str] = Query(None),
    limit: int = Query(5, ge=1, le=20)
):
    """Search Copernicus Data Space Ecosystem for recent Sentinel-1 SAR acquisitions covering the selected region's AOI."""
    try:
        return monitoring_aggregator.get_satellites(region_id=region, limit=limit)
    except RegionNotFoundError as e:
        _handle_region_error(e)

@router.get("/stations")
def get_stations(region: Optional[str] = Query(None)):
    """Get list of authoritative CWC river gauge stations monitoring the selected region."""
    try:
        return monitoring_aggregator.get_stations(region_id=region)
    except RegionNotFoundError as e:
        _handle_region_error(e)

@router.get("/status")
def get_status():
    """Get operational connectivity and authentication status for all providers."""
    return monitoring_aggregator.get_provider_status()
