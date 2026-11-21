import os
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

class SachetService:
    """
    Client for NDMA SACHET — National Disaster Alert Portal.
    Official portal: https://sachet.ndma.gov.in/
    Ingests genuine official Common Alerting Protocol (CAP) alerts from NDMA
    and filters them dynamically by state and district.
    """
    def __init__(self):
        self.base_url = os.environ.get("SACHET_BASE_URL", "https://sachet.ndma.gov.in")
        self.default_state = "kerala"
        self.default_district = "alappuzha"

    def fetch_alerts(
        self,
        state_name: Optional[str] = None,
        district_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch official disaster early warnings and alerts from NDMA SACHET.
        Filters alerts dynamically for the requested state and district.
        """
        target_state = (state_name or self.default_state).strip().lower()
        target_district = (district_name or self.default_district).strip().lower()
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        url = f"{self.base_url}/cap_public_website/FetchAllAlertDetails"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        try:
            resp = requests.post(url, json={}, headers=headers, timeout=10)
            if resp.status_code == 200:
                raw_alerts = resp.json()
                if not isinstance(raw_alerts, list):
                    raw_alerts = []

                region_alerts = []
                for a in raw_alerts:
                    alert_str = str(a).lower()
                    # Check if alert matches state or district
                    if target_state in alert_str or (target_district and target_district in alert_str):
                        region_alerts.append({
                            "identifier": str(a.get("identifier", "")),
                            "sender": a.get("sender", f"NDMA / {target_state.upper()} SDMA"),
                            "disaster_type": a.get("disaster_type", "Flood / Hydrological"),
                            "severity": a.get("severity", "Advisory"),
                            "headline": a.get("headline", a.get("area_description", "Official Early Warning Alert")),
                            "area_description": a.get("area_description", state_name or "Regional Area"),
                            "sent_timestamp": a.get("sent", now_iso),
                            "source": "NDMA SACHET CAP Feed",
                            "status": "ACTIVE"
                        })

                coverage_status = "ALERTS_FOUND" if region_alerts else "NO_ACTIVE_ALERTS"
                notice = None if region_alerts else f"No active emergency weather or flood alerts currently issued by NDMA SACHET for {state_name or target_state.title()}."

                return {
                    "provider": "National Disaster Management Authority (NDMA SACHET)",
                    "observation_type": "disaster_alerts",
                    "data_provenance": "OFFICIAL_GOVERNMENT_CAP_FEED",
                    "region": f"{district_name or state_name or 'All India'}, India",
                    "state": state_name or target_state.title(),
                    "total_active_alerts_india": len(raw_alerts),
                    "active_alerts_count": len(region_alerts),
                    "active_alerts_kerala": len(region_alerts),
                    "alerts": region_alerts,
                    "coverage_status": coverage_status,
                    "notice": notice,
                    "observation_timestamp": now_iso,
                    "fetch_timestamp": now_iso,
                    "freshness_status": "LIVE",
                    "source_reference": "NDMA SACHET CAP Portal (https://sachet.ndma.gov.in/)"
                }
        except Exception as e:
            return {
                "provider": "National Disaster Management Authority (NDMA SACHET)",
                "observation_type": "disaster_alerts",
                "data_provenance": "UNAVAILABLE",
                "region": f"{district_name or state_name or 'All India'}, India",
                "state": state_name or target_state.title(),
                "total_active_alerts_india": 0,
                "active_alerts_count": 0,
                "active_alerts_kerala": 0,
                "alerts": [],
                "coverage_status": "PROVIDER_UNAVAILABLE",
                "notice": "NDMA SACHET gateway temporarily unavailable.",
                "observation_timestamp": now_iso,
                "fetch_timestamp": now_iso,
                "freshness_status": "UNAVAILABLE",
                "error": str(e),
                "source_reference": "NDMA SACHET CAP Portal"
            }

sachet_service = SachetService()
