import os
from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.config import (
    PROCESSED_DATA_DIR,
    API_VERSION,
    SUPABASE_URL,
    IMD_BASE_URL,
    CWC_API_URL,
    SACHET_BASE_URL,
    COPERNICUS_CATALOGUE_URL,
)
from backend.app.core.supabase import supabase_manager

router = APIRouter(prefix="/api", tags=["Health"])

@router.get("/health")
def get_health():
    overview_exists = (PROCESSED_DATA_DIR / "overview.json").exists()
    flood_exists = (PROCESSED_DATA_DIR / "flood_extent.geojson").exists()
    roads_exists = (PROCESSED_DATA_DIR / "affected_roads.geojson").exists()
    facilities_exists = (PROCESSED_DATA_DIR / "facilities.geojson").exists()

    available = []
    missing = []
    for name, exists in [
        ("flood_extent", flood_exists),
        ("affected_roads", roads_exists),
        ("facilities", facilities_exists),
        ("overview", overview_exists)
    ]:
        if exists:
            available.append(name)
        else:
            missing.append(name)

    # Diagnostic checks (non-sensitive)
    db_status = "connected" if supabase_manager.is_configured else "fallback_sqlite_active"
    
    provider_status = {
        "imd": bool(IMD_BASE_URL),
        "cwc": bool(CWC_API_URL),
        "sachet": bool(SACHET_BASE_URL),
        "copernicus": bool(COPERNICUS_CATALOGUE_URL),
    }

    return {
        "status": "healthy" if len(missing) == 0 else "partial",
        "version": API_VERSION,
        "data_ready": len(missing) == 0,
        "available_layers": available,
        "missing_layers": missing,
        "diagnostics": {
            "platform_architecture": "dual_platform (Citizen + Command)",
            "database_layer": db_status,
            "provider_connectivity": provider_status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }

@router.get("/health/ready")
def get_readiness():
    overview_exists = (PROCESSED_DATA_DIR / "overview.json").exists()
    flood_exists = (PROCESSED_DATA_DIR / "flood_extent.geojson").exists()
    is_ready = overview_exists and flood_exists
    return {
        "ready": is_ready,
        "status": "ready" if is_ready else "initializing",
        "database": "supabase_postgresql" if supabase_manager.is_configured else "resilient_local_storage",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
