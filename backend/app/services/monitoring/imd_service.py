import os
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List
from backend.app.config import BASE_DIR

class IMDService:
    """
    Client for India Meteorological Department (IMD) official API services.
    Official portal: https://api.imd.gov.in/public/
    API reference: https://api.imd.gov.in/public/api_reference.html

    Requires:
    - IMD_API_KEY (passed via 'X-Api-Key' header)
    - IMD_BEARER_TOKEN (passed via 'Authorization: Bearer <token>' header)
    """
    def __init__(self):
        self.base_url = os.environ.get("IMD_BASE_URL", "https://api.imd.gov.in/api/v1")
        self.api_key = os.environ.get("IMD_API_KEY", "")
        self.bearer_token = os.environ.get("IMD_BEARER_TOKEN", "")

        # Alappuzha & Kuttanad coordinates
        self.latitude = 9.4950
        self.longitude = 76.3350
        self.district_name = "Alappuzha"
        self.district_id = "164"  # IMD District code for Alappuzha
        self.state_name = "Kerala"

    def fetch_weather(self) -> Dict[str, Any]:
        """Fetch current weather observations for Alappuzha."""
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        if self.api_key and self.bearer_token:
            headers = {
                "X-Api-Key": self.api_key,
                "Authorization": f"Bearer {self.bearer_token}",
                "User-Agent": "FloodGuard/1.0"
            }
            try:
                url = f"{self.base_url}/current_wx?id={self.district_id}"
                resp = requests.get(url, headers=headers, timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "provider": "India Meteorological Department (IMD)",
                        "observation_type": "current_weather",
                        "location": f"{self.district_name}, {self.state_name}",
                        "coordinates": [self.longitude, self.latitude],
                        "temperature_c": data.get("temp", 28.0),
                        "relative_humidity_pct": data.get("humidity", 78),
                        "wind_speed_kmh": data.get("wind_speed", 12.0),
                        "condition": data.get("weather_desc", "Partly Cloudy"),
                        "observation_timestamp": data.get("obs_time", now_iso),
                        "fetch_timestamp": now_iso,
                        "source_reference": "IMD Official API (/api/v1/current_wx)",
                        "freshness_status": "LIVE",
                        "credentials_configured": True
                    }
                elif resp.status_code == 401:
                    auth_err = resp.json().get("error", "Unauthorized")
                    return self._fallback_open_weather(now_iso, imd_error=f"IMD Authentication Failed ({auth_err})")
            except Exception as e:
                return self._fallback_open_weather(now_iso, imd_error=str(e))

        return self._fallback_open_weather(now_iso, imd_error="IMD API Key & Bearer Token not configured in environment")

    def fetch_rainfall(self) -> Dict[str, Any]:
        """Fetch rainfall measurements for Alappuzha district."""
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        if self.api_key and self.bearer_token:
            headers = {
                "X-Api-Key": self.api_key,
                "Authorization": f"Bearer {self.bearer_token}",
                "User-Agent": "FloodGuard/1.0"
            }
            try:
                url = f"{self.base_url}/districtrainfall?id={self.district_id}"
                resp = requests.get(url, headers=headers, timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "provider": "India Meteorological Department (IMD)",
                        "observation_type": "district_rainfall",
                        "district": self.district_name,
                        "state": self.state_name,
                        "rainfall_24h_mm": data.get("rainfall_24h", 0.0),
                        "normal_rainfall_mm": data.get("normal", 2.5),
                        "departure_pct": data.get("departure", 0.0),
                        "observation_timestamp": data.get("date", now_iso),
                        "fetch_timestamp": now_iso,
                        "source_reference": "IMD Official API (/api/v1/districtrainfall)",
                        "freshness_status": "LIVE",
                        "credentials_configured": True
                    }
            except Exception as e:
                pass

        # Fallback to Open-Meteo measured precipitation
        return self._fallback_rainfall(now_iso)

    def fetch_warnings(self) -> List[Dict[str, Any]]:
        """Fetch district-level weather and heavy-rainfall warnings for Kerala."""
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        if self.api_key and self.bearer_token:
            headers = {
                "X-Api-Key": self.api_key,
                "Authorization": f"Bearer {self.bearer_token}",
                "User-Agent": "FloodGuard/1.0"
            }
            try:
                url = f"{self.base_url}/districtwarning"
                resp = requests.get(url, headers=headers, timeout=8)
                if resp.status_code == 200:
                    items = resp.json()
                    kerala_warnings = [
                        w for w in items
                        if self.state_name.lower() in str(w).lower() or self.district_name.lower() in str(w).lower()
                    ]
                    return kerala_warnings
            except Exception:
                pass

        return []

    def _fallback_open_weather(self, now_iso: str, imd_error: str) -> Dict[str, Any]:
        """
        Graceful fallback using Open-Meteo global weather model (CC-BY 4.0).
        Explicitly documents that fallback is active and why IMD is not directly serving.
        """
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={self.latitude}&longitude={self.longitude}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m"
            f"&daily=precipitation_sum"
            f"&timezone=Asia%2FKolkata"
        )
        try:
            r = requests.get(url, headers={"User-Agent": "FloodGuard/1.0"}, timeout=6)
            if r.status_code == 200:
                cur = r.json().get("current", {})
                daily = r.json().get("daily", {})
                return {
                    "provider": "Open-Meteo ECMWF/GFS Seamless (IMD Observation Fallback)",
                    "observation_type": "current_weather",
                    "location": f"{self.district_name}, {self.state_name}",
                    "coordinates": [self.longitude, self.latitude],
                    "temperature_c": cur.get("temperature_2m", 28.5),
                    "apparent_temperature_c": cur.get("apparent_temperature", 32.0),
                    "relative_humidity_pct": cur.get("relative_humidity_2m", 78),
                    "precipitation_rate_mm_hr": cur.get("rain", cur.get("precipitation", 0.0)),
                    "precipitation_sum_24h_mm": daily.get("precipitation_sum", [0.0])[0] if daily.get("precipitation_sum") else 0.0,
                    "wind_speed_kmh": cur.get("wind_speed_10m", 11.5),
                    "condition": self._map_weather_code(cur.get("weather_code", 0)),
                    "observation_timestamp": cur.get("time", now_iso),
                    "fetch_timestamp": now_iso,
                    "source_reference": "Open-Meteo High-Resolution Model (CC-BY 4.0)",
                    "freshness_status": "RECENT",
                    "credentials_configured": False,
                    "upstream_status_note": imd_error
                }
        except Exception:
            pass

        return {
            "provider": "India Meteorological Department (IMD)",
            "observation_type": "current_weather",
            "location": f"{self.district_name}, {self.state_name}",
            "coordinates": [self.longitude, self.latitude],
            "temperature_c": None,
            "relative_humidity_pct": None,
            "wind_speed_kmh": None,
            "condition": "Service Unavailable",
            "observation_timestamp": now_iso,
            "fetch_timestamp": now_iso,
            "source_reference": "IMD Official API",
            "freshness_status": "UNAVAILABLE",
            "credentials_configured": False,
            "upstream_status_note": imd_error
        }

    def _fallback_rainfall(self, now_iso: str) -> Dict[str, Any]:
        """Fetch precipitation accumulation from Open-Meteo model."""
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={self.latitude}&longitude={self.longitude}"
            f"&daily=precipitation_sum,precipitation_hours"
            f"&timezone=Asia%2FKolkata"
        )
        try:
            r = requests.get(url, headers={"User-Agent": "FloodGuard/1.0"}, timeout=6)
            if r.status_code == 200:
                daily = r.json().get("daily", {})
                sums = daily.get("precipitation_sum", [0.0])
                rain_24h = sums[0] if sums else 0.0
                return {
                    "provider": "Open-Meteo High-Resolution Model (Precipitation Baseline)",
                    "observation_type": "district_rainfall",
                    "district": self.district_name,
                    "state": self.state_name,
                    "rainfall_24h_mm": rain_24h,
                    "normal_rainfall_mm": 2.5,
                    "departure_pct": round(((rain_24h - 2.5) / 2.5) * 100, 1),
                    "observation_timestamp": daily.get("time", [now_iso])[0],
                    "fetch_timestamp": now_iso,
                    "source_reference": "Open-Meteo API (Fallback)",
                    "freshness_status": "RECENT",
                    "credentials_configured": False,
                    "upstream_status_note": "IMD credentials pending; serving Open-Meteo baseline"
                }
        except Exception:
            pass

        return {
            "provider": "India Meteorological Department (IMD)",
            "observation_type": "district_rainfall",
            "district": self.district_name,
            "state": self.state_name,
            "rainfall_24h_mm": None,
            "observation_timestamp": now_iso,
            "fetch_timestamp": now_iso,
            "source_reference": "IMD API",
            "freshness_status": "UNAVAILABLE",
            "credentials_configured": False,
            "upstream_status_note": "No active rainfall telemetry available"
        }

    @staticmethod
    def _map_weather_code(code: int) -> str:
        if code == 0:
            return "Clear Sky"
        elif code in [1, 2, 3]:
            return "Partly Cloudy / Overcast"
        elif code in [45, 48]:
            return "Fog / Mist"
        elif code in [51, 53, 55]:
            return "Drizzle"
        elif code in [61, 63, 65]:
            return "Rain"
        elif code in [80, 81, 82]:
            return "Rain Showers"
        elif code in [95, 96, 99]:
            return "Thunderstorm"
        return "Overcast"

imd_service = IMDService()
