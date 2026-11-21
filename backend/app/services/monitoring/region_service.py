import math
import requests
from typing import Dict, Any, List, Optional

class RegionNotFoundError(ValueError):
    """Raised when an explicitly requested region cannot be resolved in catalog or geocoder."""
    def __init__(self, region_id: str):
        self.region_id = region_id
        super().__init__(f"Region '{region_id}' could not be resolved in the regional catalogue or geocoder.")

class RegionService:
    """
    Geographical Region Service for Live Environmental Monitoring.
    Maintains a curated catalog of Indian flood-prone and hydrological regions,
    and supports dynamic OpenStreetMap/Open-Meteo geocoding for arbitrary locations.
    """

    CATALOG: Dict[str, Dict[str, Any]] = {
        "kerala-alappuzha": {
            "id": "kerala-alappuzha",
            "name": "Alappuzha & Kuttanad Basin",
            "state": "Kerala",
            "country": "India",
            "district": "Alappuzha",
            "latitude": 9.4950,
            "longitude": 76.3350,
            "aoi_bbox": [76.30, 9.30, 76.60, 9.60],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "164",
            "cwc_basin": "Pamba & Manimala Basin",
            "is_default": True
        },
        "kerala-ernakulam": {
            "id": "kerala-ernakulam",
            "name": "Ernakulam & Kochi Delta",
            "state": "Kerala",
            "country": "India",
            "district": "Ernakulam",
            "latitude": 9.9816,
            "longitude": 76.2999,
            "aoi_bbox": [76.15, 9.80, 76.45, 10.15],
            "zoom": 10.2,
            "type": "district",
            "imd_district_id": "168",
            "cwc_basin": "Periyar Basin"
        },
        "assam-guwahati": {
            "id": "assam-guwahati",
            "name": "Guwahati & Kamrup (Brahmaputra)",
            "state": "Assam",
            "country": "India",
            "district": "Kamrup Metropolitan",
            "latitude": 26.1844,
            "longitude": 91.7458,
            "aoi_bbox": [91.55, 26.05, 91.95, 26.30],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "28",
            "cwc_basin": "Brahmaputra Basin"
        },
        "assam-dibrugarh": {
            "id": "assam-dibrugarh",
            "name": "Dibrugarh & Upper Assam",
            "state": "Assam",
            "country": "India",
            "district": "Dibrugarh",
            "latitude": 27.4728,
            "longitude": 94.9120,
            "aoi_bbox": [94.70, 27.30, 95.10, 27.65],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "23",
            "cwc_basin": "Upper Brahmaputra Basin"
        },
        "gujarat-ahmedabad": {
            "id": "gujarat-ahmedabad",
            "name": "Ahmedabad & Sabarmati Basin",
            "state": "Gujarat",
            "country": "India",
            "district": "Ahmedabad",
            "latitude": 23.0225,
            "longitude": 72.5714,
            "aoi_bbox": [72.40, 22.88, 72.75, 23.18],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "84",
            "cwc_basin": "Sabarmati Basin"
        },
        "gujarat-surat": {
            "id": "gujarat-surat",
            "name": "Surat & Tapi Delta",
            "state": "Gujarat",
            "country": "India",
            "district": "Surat",
            "latitude": 21.1702,
            "longitude": 72.8311,
            "aoi_bbox": [72.65, 21.05, 73.00, 21.30],
            "zoom": 10.2,
            "type": "district",
            "imd_district_id": "100",
            "cwc_basin": "Tapi Basin"
        },
        "bihar-patna": {
            "id": "bihar-patna",
            "name": "Patna & Ganga-Gandak Confluence",
            "state": "Bihar",
            "country": "India",
            "district": "Patna",
            "latitude": 25.5941,
            "longitude": 85.1376,
            "aoi_bbox": [84.95, 25.45, 85.35, 25.75],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "49",
            "cwc_basin": "Middle Ganga Basin"
        },
        "bihar-darbhanga": {
            "id": "bihar-darbhanga",
            "name": "Darbhanga & Kosi Basin",
            "state": "Bihar",
            "country": "India",
            "district": "Darbhanga",
            "latitude": 26.1542,
            "longitude": 85.8918,
            "aoi_bbox": [85.70, 26.00, 86.10, 26.30],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "39",
            "cwc_basin": "Kosi River Basin"
        },
        "odisha-cuttack": {
            "id": "odisha-cuttack",
            "name": "Cuttack & Mahanadi Delta",
            "state": "Odisha",
            "country": "India",
            "district": "Cuttack",
            "latitude": 20.4625,
            "longitude": 85.8828,
            "aoi_bbox": [85.70, 20.30, 86.10, 20.60],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "248",
            "cwc_basin": "Mahanadi Delta Basin"
        },
        "west-bengal-kolkata": {
            "id": "west-bengal-kolkata",
            "name": "Kolkata & Hooghly Estuary",
            "state": "West Bengal",
            "country": "India",
            "district": "Kolkata",
            "latitude": 22.5726,
            "longitude": 88.3639,
            "aoi_bbox": [88.20, 22.40, 88.55, 22.75],
            "zoom": 10.2,
            "type": "district",
            "imd_district_id": "315",
            "cwc_basin": "Lower Ganga / Hooghly Basin"
        },
        "maharashtra-mumbai": {
            "id": "maharashtra-mumbai",
            "name": "Mumbai Metropolitan & Mithi Basin",
            "state": "Maharashtra",
            "country": "India",
            "district": "Mumbai",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "aoi_bbox": [72.75, 18.90, 73.05, 19.25],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "218",
            "cwc_basin": "West Flowing Coastal Basin"
        },
        "tamil-nadu-chennai": {
            "id": "tamil-nadu-chennai",
            "name": "Chennai & Adyar-Cooum Basin",
            "state": "Tamil Nadu",
            "country": "India",
            "district": "Chennai",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "aoi_bbox": [80.10, 12.95, 80.35, 13.20],
            "zoom": 10.2,
            "type": "district",
            "imd_district_id": "278",
            "cwc_basin": "East Flowing Coastal Basin"
        },
        "jammu-kashmir-srinagar": {
            "id": "jammu-kashmir-srinagar",
            "name": "Srinagar & Jhelum Valley",
            "state": "Jammu & Kashmir",
            "country": "India",
            "district": "Srinagar",
            "latitude": 34.0837,
            "longitude": 74.7973,
            "aoi_bbox": [74.65, 33.95, 74.95, 34.20],
            "zoom": 10.0,
            "type": "district",
            "imd_district_id": "134",
            "cwc_basin": "Jhelum River Basin"
        }
    }

    def get_default_region(self) -> Dict[str, Any]:
        return self.CATALOG["kerala-alappuzha"]

    def get_region_by_id(self, region_id: str) -> Optional[Dict[str, Any]]:
        clean_id = region_id.strip().lower()
        if clean_id in self.CATALOG:
            return self.CATALOG[clean_id]
        
        # Try finding by partial slug match
        for k, v in self.CATALOG.items():
            if clean_id in k or k in clean_id:
                return v
        return None

    def list_regions(self, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return catalog regions, optionally filtered by keyword, or geocode if not found."""
        if not search_query:
            return list(self.CATALOG.values())

        query = search_query.strip().lower()
        matches = [
            r for r in self.CATALOG.values()
            if query in r["name"].lower()
            or query in r["state"].lower()
            or query in r.get("district", "").lower()
            or query in r["id"].lower()
        ]

        # If direct matches found in catalog, return them
        if matches:
            return matches

        # Otherwise, dynamically query geocoder to allow ANY location across India / world
        geocoded = self._geocode_query(search_query)
        return geocoded if geocoded else list(self.CATALOG.values())

    def _geocode_query(self, query: str) -> List[Dict[str, Any]]:
        """Query Open-Meteo / OSM Geocoding API for dynamic region resolution."""
        url = (
            f"https://geocoding-api.open-meteo.com/v1/search"
            f"?name={requests.utils.quote(query)}"
            f"&count=5"
            f"&language=en"
            f"&format=json"
        )
        try:
            r = requests.get(url, headers={"User-Agent": "FloodGuard/1.0"}, timeout=5)
            if r.status_code == 200:
                results = r.json().get("results", [])
                regions = []
                for res in results:
                    lat = float(res.get("latitude", 0.0))
                    lon = float(res.get("longitude", 0.0))
                    name = res.get("name", query.title())
                    state = res.get("admin1", res.get("country", "India"))
                    country = res.get("country", "India")
                    district = res.get("admin2", name)

                    slug = f"{state.lower().replace(' ', '-')}-{name.lower().replace(' ', '-')}"
                    # Compute a 0.25 degree bounding box around the point
                    aoi_bbox = [
                        round(lon - 0.20, 4),
                        round(lat - 0.20, 4),
                        round(lon + 0.20, 4),
                        round(lat + 0.20, 4)
                    ]

                    regions.append({
                        "id": slug,
                        "name": f"{name}, {state}",
                        "state": state,
                        "country": country,
                        "district": district,
                        "latitude": lat,
                        "longitude": lon,
                        "aoi_bbox": aoi_bbox,
                        "zoom": 10.0,
                        "type": "city",
                        "cwc_basin": f"{state} Drainage Area",
                        "is_custom": True
                    })
                return regions
        except Exception:
            pass
        return []

    def resolve_region(self, region_id_or_query: Optional[Any] = None) -> Dict[str, Any]:
        """
        Resolves a region parameter into a guaranteed valid region dictionary.
        - When region_id_or_query is None or empty: returns the deliberate documented default ('kerala-alappuzha').
        - When region_id_or_query is already a region dict: returns it directly.
        - When region_id_or_query is provided but cannot be found in catalog or geocoded: raises RegionNotFoundError.
        """
        if isinstance(region_id_or_query, dict):
            return region_id_or_query

        if not region_id_or_query or not str(region_id_or_query).strip():
            return self.get_default_region()

        cleaned = str(region_id_or_query).strip()
        reg = self.get_region_by_id(cleaned)
        if reg:
            return reg

        # Try dynamic search via geocoder
        search_res = self._geocode_query(cleaned)
        if search_res:
            return search_res[0]

        # Explicit invalid-region handling: do NOT silently substitute Kerala
        raise RegionNotFoundError(cleaned)

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates great-circle distance between two coordinates in kilometers."""
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2.0) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(R * c, 1)

region_service = RegionService()
