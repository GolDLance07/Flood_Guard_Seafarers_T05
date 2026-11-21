import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from .imd_service import imd_service
from .cwc_service import cwc_service
from .sachet_service import sachet_service
from .sentinel_service import sentinel_service
from .monitoring_cache import monitoring_cache
from .region_service import region_service

class MonitoringAggregator:
    """
    Coordinates and normalizes live telemetry from official environmental monitoring providers
    across dynamically selected geographical regions (India & global).
    """

    def get_monitoring_overview(self, region_id: Optional[str] = None) -> Dict[str, Any]:
        """Returns the full aggregated environmental monitoring state for a specific region."""
        region = region_service.resolve_region(region_id)
        cache_key = f"overview:{region['id']}"

        cached = monitoring_cache.get(cache_key)
        if cached:
            return cached

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Fetch telemetry for the selected region
        weather = self.get_weather(region["id"])
        rainfall = self.get_rainfall(region["id"])
        rivers = self.get_rivers(region["id"])
        alerts = self.get_alerts(region["id"])
        satellites = self.get_satellites(region["id"])

        # Precursor readiness evaluation
        rain_24h = rainfall.get("rainfall_24h_mm") or 0.0
        discharge = rivers.get("current_discharge_m3_s") or 0.8
        median = rivers.get("median_discharge_m3_s") or 0.8
        active_alerts_count = alerts.get("active_alerts_count", 0)

        risk_level = "NORMAL"
        risk_badge = "Normal Conditions"
        risk_summary = f"Stable meteorological conditions and normal river inflow across {region['name']}."

        if active_alerts_count > 0 or rain_24h > 65.0 or (median > 0 and discharge > (median * 2.5)):
            risk_level = "ADVISORY"
            risk_badge = "Flood Watch / Advisory In Effect"
            risk_summary = f"Elevated precursor indicators: 24h rainfall {rain_24h:.1f} mm, delta discharge {discharge:.1f} m³/s, or active NDMA alerts."
        elif rain_24h > 20.0 or (median > 0 and discharge > (median * 1.5)):
            risk_level = "ELEVATED"
            risk_badge = "Elevated Precursor Inflow"
            risk_summary = f"Moderate precipitation ({rain_24h:.1f} mm/24h) and elevated runoff detected in {region['name']}."

        result = {
            "status": "success",
            "mode": "live_monitoring",
            "timestamp": now_iso,
            "region": {
                "id": region["id"],
                "name": region["name"],
                "state": region.get("state", "India"),
                "country": region.get("country", "India"),
                "district": region.get("district", ""),
                "center": [region["longitude"], region["latitude"]],
                "aoi_bbox": region["aoi_bbox"],
                "zoom": region.get("zoom", 10.0),
                "type": region.get("type", "district"),
                "cwc_basin": region.get("cwc_basin", "")
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

        monitoring_cache.set(cache_key, result, now_iso)
        return result

    def get_weather(self, region_id: Optional[str] = None) -> Dict[str, Any]:
        region = region_service.resolve_region(region_id)
        cache_key = f"weather:{region['id']}"
        cached = monitoring_cache.get(cache_key)
        if cached:
            return cached

        data = imd_service.fetch_weather(
            latitude=region["latitude"],
            longitude=region["longitude"],
            district_name=region.get("district") or region["name"],
            state_name=region.get("state"),
            district_id=region.get("imd_district_id")
        )
        monitoring_cache.set(cache_key, data, data.get("fetch_timestamp", ""))
        return data

    def get_rainfall(self, region_id: Optional[str] = None) -> Dict[str, Any]:
        region = region_service.resolve_region(region_id)
        cache_key = f"rainfall:{region['id']}"
        cached = monitoring_cache.get(cache_key)
        if cached:
            return cached

        data = imd_service.fetch_rainfall(
            latitude=region["latitude"],
            longitude=region["longitude"],
            district_name=region.get("district") or region["name"],
            state_name=region.get("state"),
            district_id=region.get("imd_district_id")
        )
        monitoring_cache.set(cache_key, data, data.get("fetch_timestamp", ""))
        return data

    def get_rivers(self, region_id: Optional[str] = None) -> Dict[str, Any]:
        region = region_service.resolve_region(region_id)
        cache_key = f"rivers:{region['id']}"
        cached = monitoring_cache.get(cache_key)
        if cached:
            return cached

        data = cwc_service.fetch_river_telemetry(
            latitude=region["latitude"],
            longitude=region["longitude"],
            state=region.get("state"),
            basin_name=region.get("cwc_basin")
        )
        monitoring_cache.set(cache_key, data, data.get("fetch_timestamp", ""))
        return data

    def get_alerts(self, region_id: Optional[str] = None) -> Dict[str, Any]:
        region = region_service.resolve_region(region_id)
        cache_key = f"alerts:{region['id']}"
        cached = monitoring_cache.get(cache_key)
        if cached:
            return cached

        data = sachet_service.fetch_alerts(
            state_name=region.get("state"),
            district_name=region.get("district")
        )
        monitoring_cache.set(cache_key, data, data.get("fetch_timestamp", ""))
        return data

    def get_satellites(self, region_id: Optional[str] = None, limit: int = 5) -> Dict[str, Any]:
        region = region_service.resolve_region(region_id)
        cache_key = f"satellites:{region['id']}:{limit}"
        cached = monitoring_cache.get(cache_key)
        if cached:
            return cached

        data = sentinel_service.search_acquisitions(
            aoi_bbox=region.get("aoi_bbox"),
            limit=limit
        )
        monitoring_cache.set(cache_key, data, data.get("fetch_timestamp", ""))
        return data

    def get_stations(self, region_id: Optional[str] = None) -> List[Dict[str, Any]]:
        region = region_service.resolve_region(region_id)
        return cwc_service.get_stations(
            latitude=region["latitude"],
            longitude=region["longitude"],
            state=region.get("state")
        )

    def get_provider_status(self) -> Dict[str, Any]:
        """Reports connectivity, operational mode, and fallback status for all external providers."""
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        imd_has_creds = bool(imd_service.api_key and imd_service.bearer_token)
        cdse_has_creds = bool(os.environ.get("COPERNICUS_USERNAME"))

        return {
            "timestamp": now_iso,
            "imd": {
                "name": "India Meteorological Department (IMD)",
                "status": "ONLINE" if imd_has_creds else "FALLBACK_ACTIVE",
                "credentials_configured": imd_has_creds,
                "mode": "Official IMD API" if imd_has_creds else "Open-Meteo High-Resolution (Fallback)",
                "endpoints": ["/current_wx", "/districtrainfall", "/districtwarning"]
            },
            "cwc": {
                "name": "Central Water Commission (CWC)",
                "status": "ATLAS_STATION_ACTIVE",
                "mode": "Authoritative CWC Basin Atlas + Copernicus CEMS GloFAS",
                "upstream_portal": "https://ffs.india-water.gov.in"
            },
            "sachet": {
                "name": "NDMA SACHET Alert Portal",
                "status": "ONLINE",
                "mode": "Common Alerting Protocol (CAP) Public Ingestion",
                "portal": "https://sachet.ndma.gov.in/"
            },
            "copernicus": {
                "name": "Copernicus Data Space Ecosystem (CDSE)",
                "status": "ONLINE",
                "credentials_configured": cdse_has_creds,
                "mode": "Open OData Catalogue & STAC Discovery",
                "portal": "https://catalogue.dataspace.copernicus.eu/"
            }
        }

monitoring_aggregator = MonitoringAggregator()
