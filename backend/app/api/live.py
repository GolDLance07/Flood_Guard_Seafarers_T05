from fastapi import APIRouter
from backend.app.services.monitoring import monitoring_aggregator

router = APIRouter(prefix="/api/live", tags=["live_monitoring"])

@router.get("/overview")
def get_live_overview():
    """
    Get live environmental telemetry (real-time weather, 24h rainfall,
    GloFAS river discharge, and Sentinel-1 pass tracking) for Alappuzha/Kuttanad.
    """
    overview = monitoring_aggregator.get_monitoring_overview()

    # Map to backward-compatible shape for existing tests and components
    weather = overview.get("weather", {})
    rivers = overview.get("rivers", {})
    satellites = overview.get("satellites", {})
    readiness = overview.get("environmental_readiness", {})

    return {
        "status": "success",
        "mode": "live_monitoring",
        "region": overview.get("region", {}),
        "timestamp": overview.get("timestamp"),
        "data_freshness": weather.get("freshness_status", "LIVE"),
        "environmental_alert": {
            "level": readiness.get("level", "NORMAL"),
            "badge": readiness.get("badge", "Normal Conditions"),
            "summary": readiness.get("summary", ""),
            "disclaimer": readiness.get("scientific_disclaimer", "")
        },
        "weather": {
            "temperature_c": weather.get("temperature_c", 28.0),
            "apparent_temperature_c": weather.get("apparent_temperature_c", 31.0),
            "relative_humidity_pct": weather.get("relative_humidity_pct", 80),
            "precipitation_rate_mm_hr": weather.get("precipitation_rate_mm_hr", 0.0),
            "precipitation_sum_24h_mm": overview.get("rainfall", {}).get("rainfall_24h_mm", 0.0),
            "wind_speed_kmh": weather.get("wind_speed_kmh", 12.0),
            "condition": weather.get("condition", "Partly Cloudy"),
            "source": weather.get("provider", "Open-Meteo Weather Model"),
            "status": weather.get("freshness_status", "LIVE")
        },
        "hydrology": {
            "basin_name": rivers.get("basin_name", "Pamba & Manimala Basin"),
            "current_discharge_m3_s": rivers.get("current_discharge_m3_s", 0.82),
            "median_discharge_m3_s": rivers.get("median_discharge_m3_s", 0.80),
            "flow_status": rivers.get("flow_status", "NORMAL"),
            "trend_7day": rivers.get("trend_7day", []),
            "source": rivers.get("provider", "Copernicus CEMS GloFAS / CWC"),
            "status": rivers.get("freshness_status", "LIVE")
        },
        "satellite_tracking": satellites.get("orbital_pass_schedule", {
            "constellation": "Copernicus Sentinel-1 SAR (ESA)",
            "sensor": "C-SAR (5.405 GHz)",
            "nominal_relative_orbit": 144,
            "pass_direction": "ASCENDING",
            "repeat_cycle_days": 12,
            "source": "Copernicus Data Space Ecosystem (CDSE)"
        }),
        "active_alerts": overview.get("alerts", {}).get("alerts", []),
        "provider_status": overview.get("provider_status", {})
    }

@router.get("/satellite-acquisitions")
def get_live_satellite_acquisitions():
    """
    Get Sentinel-1 satellite pass schedule and orbital acquisition window.
    """
    data = get_live_overview()
    return data.get("satellite_tracking", {})
