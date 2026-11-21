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

        # Precursor readiness evaluation (Strict provenance: never invent numeric defaults for missing inputs)
        active_alerts = alerts.get("alerts", [])
        readiness = self.compute_environmental_risk(
            rainfall_data=rainfall,
            hydrology_data=rivers,
            warnings_list=active_alerts,
            region_name=region["name"],
            region_state=region.get("state", "India")
        )

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
            "environmental_readiness": readiness,
            "weather": weather,
            "rainfall": rainfall,
            "rivers": rivers,
            "alerts": alerts,
            "satellites": satellites,
            "provider_status": self.get_provider_status()
        }

        monitoring_cache.set(cache_key, result, now_iso)
        return result

    def compute_environmental_risk(
        self,
        rainfall_data: Dict[str, Any],
        hydrology_data: Dict[str, Any],
        warnings_list: List[Dict[str, Any]],
        region_name: str = "the region",
        region_state: str = "the region"
    ) -> Dict[str, Any]:
        """
        Computes environmental readiness status strictly adhering to data provenance.
        Never replaces missing telemetry with invented defaults or normal baseline.
        """
        rain_24h = rainfall_data.get("rainfall_24h_mm")
        rainfall_available = rain_24h is not None and rainfall_data.get("freshness_status") != "UNAVAILABLE"

        discharge = hydrology_data.get("current_discharge_m3_s")
        median = hydrology_data.get("median_discharge_m3_s")
        rivers_available = discharge is not None and hydrology_data.get("freshness_status") != "UNAVAILABLE"

        active_alerts_count = len(warnings_list) if warnings_list else 0

        # Distinguish unavailable data from legitimate 0.0 measurements
        if not rainfall_available and not rivers_available:
            risk_level = "INSUFFICIENT_DATA"
            risk_badge = "Insufficient Precursor Telemetry"
            risk_summary = f"Real-time precipitation and hydrological inflow telemetry are currently unavailable for {region_name}. Precursor risk level cannot be determined without active observational data."
            data_sufficiency = "INADEQUATE"
            telemetry_gap = "Missing precipitation and river telemetry"
        elif active_alerts_count > 0:
            risk_level = "ADVISORY"
            risk_badge = "Official Disaster Advisory Active"
            risk_summary = f"Official emergency alerts issued by NDMA SACHET for {region_state}."
            data_sufficiency = "COMPLETE" if (rainfall_available and rivers_available) else "PARTIAL"
            telemetry_gap = None if data_sufficiency == "COMPLETE" else "Partial precursor feeds"
        elif rainfall_available and rain_24h > 65.0:
            risk_level = "ADVISORY"
            risk_badge = "Heavy Precursor Rainfall"
            risk_summary = f"Heavy 24-hour recorded precipitation ({rain_24h:.1f} mm) in {region_name} exceeding flood precursor threshold (65.0 mm)."
            data_sufficiency = "COMPLETE" if rivers_available else "PARTIAL"
            telemetry_gap = None if rivers_available else "Missing river discharge"
        elif rivers_available and median and median > 0 and discharge > (median * 2.5):
            risk_level = "ADVISORY"
            risk_badge = "Critical River Discharge Precursor"
            risk_summary = f"Basin discharge ({discharge:.1f} m³/s) is exceeding 2.5x seasonal median baseline ({median:.1f} m³/s) for {region_name}."
            data_sufficiency = "COMPLETE" if rainfall_available else "PARTIAL"
            telemetry_gap = None if rainfall_available else "Missing precipitation telemetry"
        elif (rainfall_available and rain_24h > 20.0) or (rivers_available and median and median > 0 and discharge > (median * 1.5)):
            risk_level = "ELEVATED"
            risk_badge = "Elevated Precursor Inflow"
            parts = []
            if rainfall_available and rain_24h > 20.0:
                parts.append(f"moderate precipitation ({rain_24h:.1f} mm/24h)")
            if rivers_available and median and median > 0 and discharge > (median * 1.5):
                parts.append(f"elevated river inflow ({discharge:.1f} m³/s)")
            risk_summary = f"Elevated precursor indicators: {', '.join(parts)} detected across {region_name}."
            data_sufficiency = "COMPLETE" if (rainfall_available and rivers_available) else "PARTIAL"
            telemetry_gap = None if data_sufficiency == "COMPLETE" else "Partial telemetry coverage"
        elif rainfall_available and rivers_available:
            risk_level = "NORMAL"
            risk_badge = "Normal Precursor Baseline"
            risk_summary = f"Precursor observations indicate stable meteorological conditions ({rain_24h:.1f} mm/24h) and normal river inflow ({discharge:.1f} m³/s) across {region_name}."
            data_sufficiency = "COMPLETE"
            telemetry_gap = None
        else:
            available_metric = f"precipitation {rain_24h:.1f} mm/24h" if rainfall_available else f"river discharge {discharge:.1f} m³/s"
            missing_metric = "river discharge" if not rivers_available else "precipitation"
            risk_level = "PARTIAL_DATA"
            risk_badge = "Partial Precursor Telemetry"
            risk_summary = f"Observed {available_metric} is within baseline, but {missing_metric} is currently unavailable for {region_name}."
            data_sufficiency = "PARTIAL"
            telemetry_gap = f"Missing {missing_metric}"

        return {
            "level": risk_level,
            "badge": risk_badge,
            "summary": risk_summary,
            "data_sufficiency": data_sufficiency,
            "telemetry_gap": telemetry_gap,
            "indicator_nature": "ENVIRONMENTAL_PRECURSOR_INDICATOR",
            "metrics": {
                "rainfall_24h_mm": rain_24h,
                "current_discharge_m3_s": discharge,
                "median_discharge_m3_s": median,
                "active_warnings_count": active_alerts_count
            },
            "methodology": "Precursor correlation of observed 24h precipitation (IMD/Open-Meteo), river inflow ratio (GloFAS/CWC), and official CAP alerts (NDMA SACHET).",
            "scientific_disclaimer": "Precursor indicators (rainfall, river discharge, official alerts) track meteorological and hydrological potential. They are environmental precursors, NOT confirmed surface water inundation or predicted flood extent boundaries. Satellite SAR radar confirmation is required for physical flood extent classification."
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
