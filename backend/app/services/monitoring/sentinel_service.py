import os
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

class SentinelService:
    """
    Client for Copernicus Sentinel-1 Synthetic Aperture Radar (SAR) Catalogue.
    Documentation: https://documentation.dataspace.copernicus.eu/APIs/STAC.html

    Queries the Copernicus Data Space Ecosystem (CDSE) catalogue for Sentinel-1 GRD/RAW
    acquisitions over the Alappuzha & Kuttanad Area of Interest (AOI).

    Catalogue URL is fully configurable via COPERNICUS_CATALOGUE_URL to support
    the Copernicus STAC migration timeline.
    """
    def __init__(self):
        # Configurable catalogue endpoint (OData & STAC compatible)
        self.catalogue_url = os.environ.get(
            "COPERNICUS_CATALOGUE_URL",
            "https://catalogue.dataspace.copernicus.eu/odata/v1"
        )
        self.stac_url = os.environ.get(
            "COPERNICUS_STAC_URL",
            "https://catalogue.dataspace.copernicus.eu/stac"
        )

        # Alappuzha AOI Bounding Box [min_lon, min_lat, max_lon, max_lat]
        self.aoi_bbox = [76.30, 9.30, 76.60, 9.60]
        self.nominal_relative_orbit = 144

    def search_acquisitions(self, limit: int = 5) -> Dict[str, Any]:
        """
        Search for recent Sentinel-1 radar acquisitions covering the Alappuzha AOI.
        Uses OData catalogue API with polygon intersection filter.
        """
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Construct spatial polygon WKT for OData filter
        poly = f"POLYGON(({self.aoi_bbox[0]} {self.aoi_bbox[1]}, {self.aoi_bbox[2]} {self.aoi_bbox[1]}, {self.aoi_bbox[2]} {self.aoi_bbox[3]}, {self.aoi_bbox[0]} {self.aoi_bbox[3]}, {self.aoi_bbox[0]} {self.aoi_bbox[1]}))"
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
                        "catalogue_link": f"https://browser.dataspace.copernicus.eu/?zoom=11&lat=9.45&lng=76.45&item={p.get('Id')}",
                        "processing_status": "CATALOGUE_INDEXED_RAW_READY",
                        "pipeline_capability": "Ready for SAR thresholding ingestion when download credentials are authenticated."
                    })

                # Calculate next upcoming pass based on orbital repeat (12 days)
                pass_schedule = self._calculate_orbital_pass_schedule(datetime.now(timezone.utc))

                return {
                    "provider": "Copernicus Data Space Ecosystem (CDSE) / European Space Agency",
                    "observation_type": "satellite_sar_acquisitions",
                    "aoi_bbox": self.aoi_bbox,
                    "target_relative_orbit": self.nominal_relative_orbit,
                    "total_acquisitions_found": len(products),
                    "latest_product": products[0] if products else None,
                    "acquisitions": products,
                    "orbital_pass_schedule": pass_schedule,
                    "observation_timestamp": products[0]["acquisition_start"] if products else now_iso,
                    "fetch_timestamp": now_iso,
                    "freshness_status": "LIVE",
                    "source_reference": "ESA Copernicus Data Space Ecosystem Catalogue"
                }
        except Exception as e:
            # Fallback to orbital calculator with documented status
            pass_schedule = self._calculate_orbital_pass_schedule(datetime.now(timezone.utc))
            return {
                "provider": "Copernicus Data Space Ecosystem (CDSE)",
                "observation_type": "satellite_sar_acquisitions",
                "aoi_bbox": self.aoi_bbox,
                "target_relative_orbit": self.nominal_relative_orbit,
                "total_acquisitions_found": 0,
                "latest_product": None,
                "acquisitions": [],
                "orbital_pass_schedule": pass_schedule,
                "observation_timestamp": now_iso,
                "fetch_timestamp": now_iso,
                "freshness_status": "DELAYED",
                "error": str(e),
                "source_reference": "ESA Copernicus Sentinel-1 Constellation Orbit 144"
            }

    def _calculate_orbital_pass_schedule(self, now_dt: datetime) -> Dict[str, Any]:
        """Calculates exact pass schedule for relative orbit 144 (12-day repeat)."""
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
