from datetime import datetime, timezone
from typing import Dict, Any, List
from .imd_service import imd_service
from .cwc_service import cwc_service
from .sachet_service import sachet_service
from .sentinel_service import sentinel_service
from .monitoring_cache import monitoring_cache

class MonitoringAggregator:
    """
    Coordinates and normalizes live telemetry from official environmental monitoring providers:
    - IMD (India Meteorological Department): weather observations, rainfall, district warnings
    - CWC & CEMS GloFAS: river water levels, gauge stations, delta inflow discharge
    - NDMA SACHET: official Common Alerting Protocol (CAP) disaster alerts
    - Copernicus CDSE: Sentinel-1 SAR acquisition discovery and pass tracking
    """

    def get_monitoring_overview(self) -> Dict[str, Any]:
        """Returns the full aggregated environmental monitoring state with cache protection."""
        cached = monitoring_cache.get("overview")
        if cached:
            return cached

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Fetch telemetry from providers in parallel or sequentially with defensive error isolation
        weather = self.get_weather()
        rainfall = self.get_rainfall()
        rivers = self.get_rivers()
        alerts = self.get_alerts()
        satellites = self.get_satellites()

        # Combine environmental risk indicator according to documented rubric
        rain_24h = rainfall.get("rainfall_24h_mm") or 0.0
        discharge = rivers.get("current_discharge_m3_s") or 0.8
        median = rivers.get("median_discharge_m3_s") or 0.8
        active_alerts_count = alerts.get("active_alerts_kerala", 0)

        risk_level = "NORMAL"
        risk_badge = "Normal Conditions"
        risk_summary = "Stable meteorological conditions and normal river inflow across the Alappuzha & Kuttanad delta."

        if active_alerts_count > 0 or rain_24h > 65.0 or discharge > (median * 2.5):
            risk_level = "ADVISORY"
            risk_badge = "Flood Watch / Advisory In Effect"
            risk_summary = f"Elevated precursor indicators: 24h rainfall {rain_24h:.1f} mm, delta discharge {discharge:.1f} m³/s, or active NDMA alerts."
        elif rain_24h > 20.0 or discharge > (median * 1.5):
            risk_level = "ELEVATED"
            risk_badge = "Elevated Precursor Inflow"
            risk_summary = f"Moderate precipitation ({rain_24h:.1f} mm/24h) and elevated runoff into Vembanad Lake."

        result = {
            "status": "success",
            "mode": "live_monitoring",
            "timestamp": now_iso,
            "region": {
                "name": "Alappuzha & Kuttanad Basin, Kerala, India",
                "center": [76.3350, 9.4950],
                "aoi_bbox": [76.30, 9.30, 76.60, 9.60]
            },
            "environmental_readiness": {
                "level": risk_level,
                "badge": risk_badge,
                "summary": risk_summary,
                "methodology": "Precursor correlation of observed 24h precipitation (IMD/Open-Meteo), river inflow ratio (GloFAS/CWC), and official CAP alerts (NDMA SACHET).",
                "scientific_disclaimer": "Rainfall and river discharge are environmental precursors, not confirmed surface inundation detection. Satellite radar confirmation is required for physical flood extent classification."
            },
            "weather": weather,
            "rainfall": rainfall,
            "rivers": rivers,
            "alerts": alerts,
            "satellites": satellites,
            "provider_status": self.get_provider_status()
        }

        monitoring_cache.set("overview", result, now_iso)
        return result

    def get_weather(self) -> Dict[str, Any]:
        cached = monitoring_cache.get("weather")
        if cached:
            return cached
        data = imd_service.fetch_weather()
        monitoring_cache.set("weather", data, data.get("fetch_timestamp", ""))
        return data

    def get_rainfall(self) -> Dict[str, Any]:
        cached = monitoring_cache.get("rainfall")
        if cached:
            return cached
        data = imd_service.fetch_rainfall()
        monitoring_cache.set("rainfall", data, data.get("fetch_timestamp", ""))
        return data

    def get_rivers(self) -> Dict[str, Any]:
        cached = monitoring_cache.get("rivers")
        if cached:
            return cached
        data = cwc_service.fetch_river_telemetry()
        monitoring_cache.set("rivers", data, data.get("fetch_timestamp", ""))
        return data

    def get_alerts(self) -> Dict[str, Any]:
        cached = monitoring_cache.get("alerts")
        if cached:
            return cached
        data = sachet_service.fetch_alerts()
        monitoring_cache.set("alerts", data, data.get("fetch_timestamp", ""))
        return data

    def get_satellites(self) -> Dict[str, Any]:
        cached = monitoring_cache.get("satellites")
        if cached:
            return cached
        data = sentinel_service.search_acquisitions(limit=5)
        monitoring_cache.set("satellites", data, data.get("fetch_timestamp", ""))
        return data

    def get_stations(self) -> List[Dict[str, Any]]:
        return cwc_service.get_stations()

    def get_provider_status(self) -> Dict[str, Any]:
        return {
            "imd": {
                "name": "India Meteorological Department",
                "status": "AUTHENTICATED" if imd_service.api_key and imd_service.bearer_token else "FALLBACK_ACTIVE_OPEN_METEO",
                "credentials_required": "IMD_API_KEY, IMD_BEARER_TOKEN",
                "endpoint": imd_service.base_url
            },
            "cwc": {
                "name": "Central Water Commission",
                "status": "STATION_ATLAS_ACTIVE",
                "telemetry_note": "NWDP certificate unreachable; CWC 2018 threshold atlas loaded",
                "endpoint": cwc_service.cwc_base_url
            },
            "sachet": {
                "name": "NDMA SACHET National Alert Portal",
                "status": "LIVE",
                "endpoint": f"{sachet_service.base_url}/cap_public_website/FetchAllAlertDetails"
            },
            "copernicus": {
                "name": "Copernicus Data Space Ecosystem (CDSE)",
                "status": "LIVE_CATALOGUE_SEARCH",
                "endpoint": sentinel_service.catalogue_url
            }
        }

monitoring_aggregator = MonitoringAggregator()
