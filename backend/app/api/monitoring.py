from fastapi import APIRouter, Query
from typing import Optional
from backend.app.services.monitoring import monitoring_aggregator

router = APIRouter(prefix="/api/monitoring", tags=["live_monitoring"])

@router.get("/overview")
def get_monitoring_overview():
    """
    Get aggregated live environmental monitoring telemetry for Alappuzha & Kuttanad delta:
    - Current weather (IMD / Open-Meteo baseline)
    - 24-hour rainfall accumulation and departure
    - River water-level gauge stations (CWC Pamba/Manimala/Achankovil)
    - Official NDMA SACHET disaster early warning alerts
    - Copernicus Sentinel-1 SAR acquisition discovery and pass schedules
    """
    return monitoring_aggregator.get_monitoring_overview()

@router.get("/weather")
def get_weather():
    """Get current meteorological observations."""
    return monitoring_aggregator.get_weather()

@router.get("/rainfall")
def get_rainfall():
    """Get district-level rainfall measurements and departure from normal."""
    return monitoring_aggregator.get_rainfall()

@router.get("/rivers")
def get_rivers():
    """Get river telemetry, inflow discharge simulations, and CWC gauge stations."""
    return monitoring_aggregator.get_rivers()

@router.get("/alerts")
def get_alerts():
    """Get official disaster warnings from NDMA SACHET (CAP standard)."""
    return monitoring_aggregator.get_alerts()

@router.get("/satellites")
def get_satellites(limit: int = Query(5, ge=1, le=20)):
    """Search Copernicus Data Space Ecosystem for recent Sentinel-1 SAR acquisitions."""
    return monitoring_aggregator.get_satellites()

@router.get("/stations")
def get_stations():
    """Get list of authoritative CWC river gauge stations monitoring Kuttanad basin."""
    return monitoring_aggregator.get_stations()

@router.get("/status")
def get_status():
    """Get operational connectivity and authentication status for all providers."""
    return monitoring_aggregator.get_provider_status()
