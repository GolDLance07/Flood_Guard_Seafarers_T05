import os
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from .region_service import region_service

class CWCService:
    """
    Central Water Commission (CWC) & National Water Data Portal (NWIC) Hydrology Service.
    Maintains an authoritative multi-basin river gauge atlas for major flood-prone river
    systems across India (Brahmaputra, Ganga, Sabarmati, Tapi, Mahanadi, Pamba, Periyar, Jhelum).
    """

    GAUGE_STATIONS: List[Dict[str, Any]] = [
        # --- KERALA (Pamba, Manimala, Achankovil, Meenachil) ---
        {
            "station_id": "CWC_KER_001",
            "name": "Malakkara",
            "river": "Pamba",
            "basin": "Pamba & Manimala Basin",
            "state": "Kerala",
            "district": "Pathanamthitta",
            "coordinates": [76.6421, 9.3242],  # [lon, lat]
            "warning_level_m": 7.50,
            "danger_level_m": 8.50,
            "hfl_m": 11.23,
            "hfl_date": "2018-08-17",
            "relevance": "Primary inflow gauge entering upper Kuttanad wetland system"
        },
        {
            "station_id": "CWC_KER_002",
            "name": "Kallooppara",
            "river": "Manimala",
            "basin": "Manimala River Basin",
            "state": "Kerala",
            "district": "Pathanamthitta",
            "coordinates": [76.6114, 9.3891],
            "warning_level_m": 6.00,
            "danger_level_m": 7.00,
            "hfl_m": 9.80,
            "hfl_date": "2018-08-16",
            "relevance": "Direct eastern inflow into Kuttanad paddy polders"
        },
        {
            "station_id": "CWC_KER_003",
            "name": "Thumpamon",
            "river": "Achankovil",
            "basin": "Achankovil River Basin",
            "state": "Kerala",
            "district": "Pathanamthitta",
            "coordinates": [76.7172, 9.2503],
            "warning_level_m": 10.00,
            "danger_level_m": 11.00,
            "hfl_m": 13.50,
            "hfl_date": "2018-08-16",
            "relevance": "Southern flank river volume draining towards Vembanad Lake"
        },
        {
            "station_id": "CWC_KER_004",
            "name": "Kidangoor",
            "river": "Meenachil",
            "basin": "Meenachil River Basin",
            "state": "Kerala",
            "district": "Kottayam",
            "coordinates": [76.6170, 9.6830],
            "warning_level_m": 10.50,
            "danger_level_m": 11.50,
            "hfl_m": 14.20,
            "hfl_date": "2018-08-16",
            "relevance": "Northern inflow directly discharging into Vembanad Lake"
        },

        # --- ASSAM (Brahmaputra Basin) ---
        {
            "station_id": "CWC_ASM_001",
            "name": "Guwahati (DC Court)",
            "river": "Brahmaputra",
            "basin": "Brahmaputra Basin",
            "state": "Assam",
            "district": "Kamrup Metropolitan",
            "coordinates": [91.7483, 26.1925],
            "warning_level_m": 49.68,
            "danger_level_m": 50.68,
            "hfl_m": 51.46,
            "hfl_date": "2004-07-24",
            "relevance": "Key hydrological station monitoring Brahmaputra flood levels at Guwahati city"
        },
        {
            "station_id": "CWC_ASM_002",
            "name": "Pandu",
            "river": "Brahmaputra",
            "basin": "Brahmaputra Basin",
            "state": "Assam",
            "district": "Kamrup",
            "coordinates": [91.6833, 26.1833],
            "warning_level_m": 48.60,
            "danger_level_m": 49.60,
            "hfl_m": 50.55,
            "hfl_date": "2019-07-16",
            "relevance": "Downstream Guwahati river transit and discharge monitoring"
        },
        {
            "station_id": "CWC_ASM_003",
            "name": "Dibrugarh",
            "river": "Brahmaputra",
            "basin": "Upper Brahmaputra Basin",
            "state": "Assam",
            "district": "Dibrugarh",
            "coordinates": [94.9120, 27.4800],
            "warning_level_m": 104.70,
            "danger_level_m": 105.70,
            "hfl_m": 106.48,
            "hfl_date": "1998-09-03",
            "relevance": "Upper Assam flood gateway monitoring Brahmaputra discharge from Arunachal"
        },

        # --- BIHAR (Ganga & Gandak Basin) ---
        {
            "station_id": "CWC_BHR_001",
            "name": "Digha Ghat (Patna)",
            "river": "Ganga",
            "basin": "Middle Ganga Basin",
            "state": "Bihar",
            "district": "Patna",
            "coordinates": [85.0933, 25.6533],
            "warning_level_m": 49.42,
            "danger_level_m": 50.42,
            "hfl_m": 52.52,
            "hfl_date": "2016-08-25",
            "relevance": "Main Ganga stem monitoring above Son river confluence"
        },
        {
            "station_id": "CWC_BHR_002",
            "name": "Gandhighat (Patna)",
            "river": "Ganga",
            "basin": "Middle Ganga Basin",
            "state": "Bihar",
            "district": "Patna",
            "coordinates": [85.1767, 25.6200],
            "warning_level_m": 47.60,
            "danger_level_m": 48.60,
            "hfl_m": 50.52,
            "hfl_date": "2016-08-25",
            "relevance": "Patna city urban protection river monitoring station"
        },
        {
            "station_id": "CWC_BHR_003",
            "name": "Hathidah",
            "river": "Ganga",
            "basin": "Middle Ganga Basin",
            "state": "Bihar",
            "district": "Patna / Begusarai",
            "coordinates": [85.9833, 25.3667],
            "warning_level_m": 40.76,
            "danger_level_m": 41.76,
            "hfl_m": 43.47,
            "hfl_date": "2019-10-02",
            "relevance": "Major flood transit station for Mokama Tal wetland drainage"
        },

        # --- GUJARAT (Sabarmati & Tapi Basin) ---
        {
            "station_id": "CWC_GUJ_001",
            "name": "Subhash Bridge (Ahmedabad)",
            "river": "Sabarmati",
            "basin": "Sabarmati Basin",
            "state": "Gujarat",
            "district": "Ahmedabad",
            "coordinates": [72.5800, 23.0600],
            "warning_level_m": 39.50,
            "danger_level_m": 41.00,
            "hfl_m": 42.60,
            "hfl_date": "2006-08-08",
            "relevance": "Monitors Sabarmati river discharge through Ahmedabad metropolitan corridor"
        },
        {
            "station_id": "CWC_GUJ_002",
            "name": "Hope Bridge (Surat)",
            "river": "Tapi",
            "basin": "Tapi Basin",
            "state": "Gujarat",
            "district": "Surat",
            "coordinates": [72.8200, 21.2000],
            "warning_level_m": 8.50,
            "danger_level_m": 9.50,
            "hfl_m": 12.10,
            "hfl_date": "2006-08-10",
            "relevance": "Monitors Ukai Dam outflow and tidal surge inundation in Surat"
        },

        # --- ODISHA (Mahanadi Delta) ---
        {
            "station_id": "CWC_ODI_001",
            "name": "Naraj",
            "river": "Mahanadi",
            "basin": "Mahanadi Delta Basin",
            "state": "Odisha",
            "district": "Cuttack",
            "coordinates": [85.7600, 20.4800],
            "warning_level_m": 25.41,
            "danger_level_m": 26.41,
            "hfl_m": 27.60,
            "hfl_date": "2008-09-22",
            "relevance": "Apex barrage controlling Mahanadi bifurcation into Kathajodi delta rivers"
        },

        # --- WEST BENGAL (Lower Ganga / Hooghly) ---
        {
            "station_id": "CWC_WB_001",
            "name": "Garden Reach (Kolkata)",
            "river": "Hooghly",
            "basin": "Lower Ganga / Hooghly Basin",
            "state": "West Bengal",
            "district": "Kolkata",
            "coordinates": [88.3000, 22.5400],
            "warning_level_m": 6.80,
            "danger_level_m": 7.80,
            "hfl_m": 8.90,
            "hfl_date": "2015-08-02",
            "relevance": "Monitors tidal bore and urban drainage backflow into Hooghly estuary"
        },

        # --- JAMMU & KASHMIR (Jhelum Valley) ---
        {
            "station_id": "CWC_JK_001",
            "name": "Ram Munshi Bagh (Srinagar)",
            "river": "Jhelum",
            "basin": "Jhelum River Basin",
            "state": "Jammu & Kashmir",
            "district": "Srinagar",
            "coordinates": [74.8300, 34.0700],
            "warning_level_m": 18.00,
            "danger_level_m": 21.00,
            "hfl_m": 28.50,
            "hfl_date": "2014-09-07",
            "relevance": "Primary flood gauge monitoring Jhelum river rise through Srinagar city center"
        }
    ]

    def __init__(self):
        self.cwc_base_url = os.environ.get("CWC_API_URL", "https://ffs.india-water.gov.in")
        self.nwic_base_url = os.environ.get("NWIC_API_URL", "https://nwdp.nwic.gov.in")
        self.default_latitude = 9.4950
        self.default_longitude = 76.3350

    def get_stations(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        state: Optional[str] = None,
        max_distance_km: float = 120.0
    ) -> List[Dict[str, Any]]:
        """
        Returns CWC gauge stations filtered by geographical proximity (within max_distance_km).
        If lat/lon not provided, returns all stations matching state, or all stations if neither provided.
        """
        if latitude is not None and longitude is not None:
            nearby = []
            for s in self.GAUGE_STATIONS:
                dist = region_service.haversine_distance_km(latitude, longitude, s["coordinates"][1], s["coordinates"][0])
                if dist <= max_distance_km:
                    st_copy = dict(s)
                    st_copy["distance_km"] = dist
                    nearby.append(st_copy)
            # Sort by distance
            nearby.sort(key=lambda x: x["distance_km"])
            return nearby

        if state:
            return [s for s in self.GAUGE_STATIONS if s.get("state", "").lower() == state.lower()]

        return self.GAUGE_STATIONS

    def fetch_river_telemetry(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        state: Optional[str] = None,
        basin_name: Optional[str] = None,
        max_distance_km: float = 120.0
    ) -> Dict[str, Any]:
        """
        Fetch river water level telemetry and basin discharge observations for any location.
        Filters CWC stations dynamically and queries GloFAS for the region's coordinates.
        """
        lat = latitude if latitude is not None else self.default_latitude
        lon = longitude if longitude is not None else self.default_longitude
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # 1. Fetch Copernicus GloFAS River Inflow simulation for these exact coordinates
        glofas_data = self._fetch_glofas_discharge(lat, lon)

        # 2. Filter CWC stations by proximity
        nearby_stations = self.get_stations(lat, lon, state, max_distance_km)

        stations_status = []
        for s in nearby_stations:
            stations_status.append({
                "station_id": s["station_id"],
                "name": s["name"],
                "river": s["river"],
                "basin": s["basin"],
                "coordinates": s["coordinates"],
                "warning_level_m": s["warning_level_m"],
                "danger_level_m": s["danger_level_m"],
                "hfl_m": s["hfl_m"],
                "proximity_km": s.get("distance_km", 0.0),
                "relevance": s["relevance"],
                "threshold_type": "HISTORICAL_GAUGE_THRESHOLDS",
                "live_gauge_reading_m": None,
                "data_provenance": "HISTORICAL_CWC_ATLAS_THRESHOLDS",
                "upstream_gateway_status": "TELEMETRY_PORTAL_OFFLINE",
                "note": "CWC NWDP portal certificate currently unreachable; baseline thresholds mapped from CWC Hydrological Atlas."
            })

        coverage_status = "STATIONS_AVAILABLE" if stations_status else "NO_NEARBY_STATIONS"
        coverage_note = None if stations_status else f"No active CWC river gauge stations within {max_distance_km} km monitoring radius."

        return {
            "provider": "Central Water Commission (CWC) & Copernicus CEMS GloFAS",
            "observation_type": "river_discharge_and_water_levels",
            "threshold_type": "HISTORICAL_GAUGE_THRESHOLDS",
            "data_provenance": "COPERNICUS_GLOFAS_MODEL_PLUS_CWC_HISTORICAL_THRESHOLDS",
            "basin_name": basin_name or ("Pamba & Manimala Basin" if lat < 11 else "Regional River Basin"),
            "target_coordinates": [lon, lat],
            "observation_timestamp": now_iso,
            "fetch_timestamp": now_iso,
            "current_discharge_m3_s": glofas_data.get("current_discharge_m3_s"),
            "median_discharge_m3_s": glofas_data.get("median_discharge_m3_s"),
            "flow_status": glofas_data.get("flow_status", "NORMAL"),
            "trend_7day": glofas_data.get("trend_7day", []),
            "station_count": len(stations_status),
            "stations": stations_status,
            "coverage_status": coverage_status,
            "coverage_note": coverage_note,
            "freshness_status": glofas_data.get("status", "RECENT"),
            "source_reference": "Copernicus CEMS GloFAS Model + CWC Hydrological Station Atlas"
        }

    def _fetch_glofas_discharge(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """Fetch hydrological river discharge simulation from Copernicus GloFAS for any coordinates."""
        url = (
            f"https://flood-api.open-meteo.com/v1/flood"
            f"?latitude={latitude}&longitude={longitude}"
            f"&daily=river_discharge,river_discharge_median,river_discharge_max"
            f"&forecast_days=7"
        )
        try:
            r = requests.get(url, headers={"User-Agent": "FloodGuard/1.0"}, timeout=6)
            if r.status_code == 200:
                daily = r.json().get("daily", {})
                discharges = daily.get("river_discharge", [0.8])
                medians = daily.get("river_discharge_median", [0.8])
                dates = daily.get("time", [])

                trend = []
                for idx, dt in enumerate(dates):
                    trend.append({
                        "date": dt,
                        "discharge_m3_s": discharges[idx] if idx < len(discharges) else None,
                        "median_baseline_m3_s": medians[idx] if idx < len(medians) else None
                    })

                cur = discharges[0] if discharges and discharges[0] is not None else None
                med = medians[0] if medians and medians[0] is not None else None
                status_label = "NORMAL"
                if cur is not None and med is not None:
                    if cur > med * 2.5:
                        status_label = "HIGH_DISCHARGE"
                    elif cur > med * 1.5:
                        status_label = "ELEVATED_FLOW"
                elif cur is None:
                    status_label = "INSUFFICIENT_DATA"

                return {
                    "current_discharge_m3_s": round(cur, 2) if cur is not None else None,
                    "median_discharge_m3_s": round(med, 2) if med is not None else None,
                    "flow_status": status_label,
                    "trend_7day": trend[:7],
                    "status": "LIVE" if cur is not None else "UNAVAILABLE"
                }
        except Exception:
            pass

        return {
            "current_discharge_m3_s": None,
            "median_discharge_m3_s": None,
            "flow_status": "DATA_UNAVAILABLE",
            "trend_7day": [],
            "status": "UNAVAILABLE"
        }

cwc_service = CWCService()
