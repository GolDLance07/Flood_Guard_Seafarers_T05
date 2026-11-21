from fastapi import APIRouter
from ..services.data_loader import data_loader
from ..config import PROCESSED_DATA_DIR, API_VERSION

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
            
    return {
        "status": "healthy" if len(missing) == 0 else "partial",
        "version": API_VERSION,
        "data_ready": len(missing) == 0,
        "available_layers": available,
        "missing_layers": missing
    }
