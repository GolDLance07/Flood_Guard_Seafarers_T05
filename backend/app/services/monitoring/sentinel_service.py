import os
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

class SentinelService:
    """
    Client for Copernicus Sentinel-1 Synthetic Aperture Radar (SAR) Catalogue.
    Documentation: https://documentation.dataspace.copernicus.eu/APIs/STAC.html

    Queries the Copernicus Data Space Ecosystem (CDSE) catalogue for Sentinel-1 GRD/RAW
    acquisitions dynamically covering any requested Area of Interest (AOI) bounding box.
    """
    def __init__(self):
        self.catalogue_url = os.environ.get(
            "COPERNICUS_CATALOGUE_URL",
            "https://catalogue.dataspace.copernicus.eu/odata/v1"
        )
        self.stac_url = os.environ.get(
            "COPERNICUS_STAC_URL",
            "https://catalogue.dataspace.copernicus.eu/stac"
        )

        # Default fallback AOI (Alappuzha)
        self.default_aoi_bbox = [76.30, 9.30, 76.60, 9.60]
        self.nominal_relative_orbit = 144

    def search_acquisitions(
        self,
        aoi_bbox: Optional[List[float]] = None,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Search for recent Sentinel-1 radar acquisitions covering a given AOI bounding box.
        Uses OData catalogue API with polygon intersection filter.
        """
        bbox = aoi_bbox if (aoi_bbox and len(aoi_bbox) == 4) else self.default_aoi_bbox
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Center coords for browser link
        center_lon = round((bbox[0] + bbox[2]) / 2.0, 4)
        center_lat = round((bbox[1] + bbox[3]) / 2.0, 4)

        # Construct spatial polygon WKT for OData filter
        poly = f"POLYGON(({bbox[0]} {bbox[1]}, {bbox[2]} {bbox[1]}, {bbox[2]} {bbox[3]}, {bbox[0]} {bbox[3]}, {bbox[0]} {bbox[1]}))"
        query_url = (
            f"{self.catalogue_url}/Products"
            f"?$filter=Collection/Name eq 'SENTINEL-1' and "
            f"OData.CSC.Intersects(area=geography'SRID=4326;{poly}')"
            f"&$orderby=ContentDate/Start desc"
            f"&$top={limit}"
        )

        headers = {
            "User-Agent": "FloodGuard/1.0",
            "Accept": "application/json"
        }

        try:
            resp = requests.get(query_url, headers=headers, timeout=12)
            if resp.status_code == 200:
                raw_products = resp.json().get("value", [])
                products = []
                for p in raw_products:
                    name = p.get("Name", "")
                    content_date = p.get("ContentDate", {})
                    products.append({
                        "product_id": p.get("Id"),
                        "product_name": name,
                        "satellite": "Sentinel-1A" if "S1A" in name else "Sentinel-1C" if "S1C" in name else "Sentinel-1",
                        "sensor_mode": "IW" if "_IW_" in name else "SM" if "_SM_" in name else "EW",
                        "polarisation": "VV+VH" if "DV" in name or "2SDV" in name else "Dual",
                        "acquisition_start": content_date.get("Start"),
                        "acquisition_end": content_date.get("End"),
                        "footprint_geojson": p.get("Footprint"),
                        "catalogue_link": f"https://browser.dataspace.copernicus.eu/?zoom=10&lat={center_lat}&lng={center_lon}&item={p.get('Id')}",
                        "processing_status": "CATALOGUE_INDEXED_RAW_READY",
                        "pipeline_capability": "Ready for SAR thresholding ingestion."
                    })

                pass_schedule = self._calculate_orbital_pass_schedule(datetime.now(timezone.utc))

                coverage_status = "ACQUISITIONS_FOUND" if products else "NO_RECENT_ACQUISITIONS"
                notice = None if products else f"No recent Sentinel-1 SAR acquisitions found covering AOI [{bbox[0]}, {bbox[1]}, {bbox[2]}, {bbox[3]}]."

                return {
                    "provider": "Copernicus Data Space Ecosystem (CDSE) / European Space Agency",
                    "observation_type": "satellite_sar_acquisitions",
                    "aoi_bbox": bbox,
                    "target_relative_orbit": self.nominal_relative_orbit,
                    "total_acquisitions_found": len(products),
                    "coverage_status": coverage_status,
                    "notice": notice,
                    "latest_product": products[0] if products else None,
                    "acquisitions": products,
                    "orbital_pass_schedule": pass_schedule,
                    "observation_timestamp": products[0]["acquisition_start"] if products else now_iso,
                    "fetch_timestamp": now_iso,
                    "freshness_status": "LIVE" if products else "RECENT",
                    "source_reference": "ESA Copernicus Data Space Ecosystem Catalogue"
                }
        except Exception as e:
            pass_schedule = self._calculate_orbital_pass_schedule(datetime.now(timezone.utc))
            return {
                "provider": "Copernicus Data Space Ecosystem (CDSE)",
                "observation_type": "satellite_sar_acquisitions",
                "aoi_bbox": bbox,
                "target_relative_orbit": self.nominal_relative_orbit,
                "total_acquisitions_found": 0,
                "coverage_status": "PROVIDER_TIMEOUT",
                "notice": f"CDSE catalogue query timed out or unreachable: {str(e)}",
                "latest_product": None,
                "acquisitions": [],
                "orbital_pass_schedule": pass_schedule,
                "observation_timestamp": now_iso,
                "fetch_timestamp": now_iso,
                "freshness_status": "DELAYED",
                "source_reference": "ESA Copernicus Sentinel-1 Constellation"
            }

    def _calculate_orbital_pass_schedule(self, now_dt: datetime) -> Dict[str, Any]:
        """Calculates nominal repeat cycle (12-day orbital schedule)."""
        ref_epoch = datetime(2018, 8, 21, 0, 41, 9, tzinfo=timezone.utc)
        diff_seconds = (now_dt - ref_epoch).total_seconds()
        cycle_seconds = 12 * 86400

        cycles = diff_seconds / cycle_seconds
        last_pass_seconds = int(cycles) * cycle_seconds
        last_pass_dt = ref_epoch + timedelta(seconds=last_pass_seconds)
        next_pass_dt = last_pass_dt + timedelta(days=12)

        return {
            "constellation": "Copernicus Sentinel-1 (C-SAR)",
            "relative_orbit": self.nominal_relative_orbit,
            "pass_direction": "ASCENDING",
            "repeat_cycle_days": 12,
            "last_scheduled_pass": last_pass_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "next_scheduled_pass": next_pass_dt.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "swath_width_km": 250,
            "incidence_angle_deg": "30.8 - 45.3"
        }

sentinel_service = SentinelService()
