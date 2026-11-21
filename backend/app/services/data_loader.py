import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from ..config import PROCESSED_DATA_DIR, METADATA_DIR

class DataLoader:
    def __init__(self):
        self._cache: Dict[str, Any] = {}
        
    def _load_json(self, file_path: Path) -> Optional[Dict[str, Any]]:
        if not file_path.exists():
            return None
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
            
    def get_overview(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        return self._load_json(PROCESSED_DATA_DIR / "overview.json")

    def get_impact(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        overview = self.get_overview(event_id)
        if overview:
            return {
                "event_id": event_id,
                "generated_at": overview.get("generated_at"),
                "kpis": overview.get("kpis"),
                "provenance": overview.get("provenance")
            }
        return None

    def get_flood_extent(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        return self._load_json(PROCESSED_DATA_DIR / "flood_extent.geojson")

    def get_flood_metadata(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        return self._load_json(PROCESSED_DATA_DIR / "flood_metadata.json")

    def get_affected_roads(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        return self._load_json(PROCESSED_DATA_DIR / "affected_roads.geojson")

    def get_road_network(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        return self._load_json(PROCESSED_DATA_DIR / "road_network.geojson")

    def get_facilities(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        return self._load_json(PROCESSED_DATA_DIR / "facilities.geojson")

    def get_settlements(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        return self._load_json(PROCESSED_DATA_DIR / "settlements.geojson")
        
    def get_event_metadata(self, event_id: str = "kerala-2018-demo") -> Optional[Dict[str, Any]]:
        if event_id != "kerala-2018-demo":
            return None
        overview = self.get_overview(event_id)
        flood_meta = self.get_flood_metadata(event_id)
        return {
            "id": "kerala-2018-demo",
            "name": "Kerala Floods — August 2018",
            "event_date": "2018-08-21",
            "region": "Alappuzha & Kuttanad, Kerala, India",
            "aoi": overview.get("aoi") if overview else {},
            "status": "ready",
            "available_layers": ["flood_extent", "affected_roads", "facilities", "settlements"],
            "flood_metadata": flood_meta
        }

data_loader = DataLoader()
