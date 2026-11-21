import os
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List

class SachetService:
    """
    Client for NDMA SACHET — National Disaster Alert Portal.
    Official portal: https://sachet.ndma.gov.in/
    Ingests genuine official Common Alerting Protocol (CAP) alerts from NDMA.
    """
    def __init__(self):
        self.base_url = os.environ.get("SACHET_BASE_URL", "https://sachet.ndma.gov.in")
        self.state_filter = "kerala"
        self.district_filter = "alappuzha"

    def fetch_alerts(self) -> Dict[str, Any]:
        """
        Fetch official disaster early warnings and alerts from NDMA SACHET.
        Filters for Kerala and Alappuzha specific alerts.
        """
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

                kerala_alerts = []
                for a in raw_alerts:
                    alert_str = str(a).lower()
                    if self.state_filter in alert_str or self.district_filter in alert_str:
                        kerala_alerts.append({
                            "identifier": str(a.get("identifier", "")),
                            "sender": a.get("sender", "NDMA / KSDMA"),
                            "disaster_type": a.get("disaster_type", "Flood / Hydrological"),
                            "severity": a.get("severity", "Advisory"),
                            "headline": a.get("headline", a.get("area_description", "Official Early Warning Alert")),
                            "area_description": a.get("area_description", "Kerala"),
                            "sent_timestamp": a.get("sent", now_iso),
                            "source": "NDMA SACHET CAP Feed",
                            "status": "ACTIVE"
                        })

                return {
                    "provider": "National Disaster Management Authority (NDMA SACHET)",
                    "observation_type": "disaster_alerts",
                    "region": "Kerala, India",
                    "total_active_alerts_india": len(raw_alerts),
                    "active_alerts_kerala": len(kerala_alerts),
                    "alerts": kerala_alerts,
                    "observation_timestamp": now_iso,
                    "fetch_timestamp": now_iso,
                    "freshness_status": "LIVE",
                    "source_reference": "NDMA SACHET CAP Portal (https://sachet.ndma.gov.in/)"
                }
        except Exception as e:
            return {
                "provider": "National Disaster Management Authority (NDMA SACHET)",
                "observation_type": "disaster_alerts",
                "region": "Kerala, India",
                "total_active_alerts_india": 0,
                "active_alerts_kerala": 0,
                "alerts": [],
                "observation_timestamp": now_iso,
                "fetch_timestamp": now_iso,
                "freshness_status": "UNAVAILABLE",
                "error": str(e),
                "source_reference": "NDMA SACHET CAP Portal"
            }

sachet_service = SachetService()
