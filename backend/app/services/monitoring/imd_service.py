import os
import requests
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.config import BASE_DIR

# Official IMD Weather Code dictionary (WMO / IMD standard codes 01 - 99)
IMD_WEATHER_CODES = {
    "01": "Clouds generally dissolving or becoming less developed",
    "02": "State of sky on the whole unchanged",
    "03": "Clouds generally forming or developing",
    "04": "Visibility reduced by smoke",
    "05": "Haze",
    "06": "Widespread dust in suspension in air",
    "07": "Dust or sand raised by wind",
    "08": "Well-developed dust/sand whirl(s)",
    "09": "Duststorm or sandstorm within sight",
    "10": "Mist",
    "11": "Patches of shallow fog",
    "12": "Continuous shallow fog",
    "13": "Lightning visible, no thunder heard",
    "14": "Precipitation within sight, not reaching ground",
    "15": "Precipitation within sight, reaching ground, distant (> 5 km)",
    "16": "Precipitation within sight, reaching ground, near station",
    "17": "Thunderstorm, no precipitation at observation time",
    "18": "Squalls at or within sight during preceding hour",
    "19": "Funnel cloud(s) at or within sight",
    "20": "Drizzle (not freezing) not falling as showers",
    "21": "Rain (not freezing) not falling as showers",
    "22": "Snow not falling as showers",
    "23": "Rain and snow / ice pellets",
    "24": "Freezing drizzle / freezing rain",
    "25": "Showers of rain",
    "26": "Showers of snow, or rain and snow",
    "27": "Showers of hail, or rain and hail",
    "28": "Fog or ice fog",
    "29": "Thunderstorm (with or without precipitation)",
    "50": "Drizzle, intermittent slight",
    "51": "Drizzle, continuous slight",
    "52": "Drizzle, intermittent moderate",
    "53": "Drizzle, continuous moderate",
    "54": "Drizzle, intermittent heavy (dense)",
    "55": "Drizzle, continuous heavy (dense)",
    "60": "Rain, intermittent slight",
    "61": "Rain, continuous slight",
    "62": "Rain, intermittent moderate",
    "63": "Rain, continuous moderate",
    "64": "Rain, intermittent heavy",
    "65": "Rain, continuous heavy",
    "80": "Rain shower(s), slight",
    "81": "Rain shower(s), moderate or heavy",
    "82": "Rain shower(s), violent",
    "91": "Slight rain with recent thunderstorm",
    "92": "Moderate/heavy rain with recent thunderstorm",
    "95": "Thunderstorm, slight/moderate, with rain",
    "96": "Thunderstorm, slight/moderate, with hail",
    "97": "Thunderstorm, heavy, with rain",
    "99": "Thunderstorm, heavy, with hail"
}

# Official IMD Wind Direction Code mapping
IMD_WIND_DIRECTIONS = {
    0: "Calm",
    20: "North-northeasterly (NNE)",
    50: "Northeasterly (NE)",
    70: "East-northeasterly (ENE)",
    90: "Easterly (E)",
    110: "East-southeasterly (ESE)",
    140: "Southeasterly (SE)",
    160: "South-southeasterly (SSE)",
    180: "Southerly (S)",
    200: "South-southwesterly (SSW)",
    230: "Southwesterly (SW)",
    250: "West-southwesterly (WSW)",
    270: "Westerly (W)",
    290: "West-northwesterly (WNW)",
    320: "Northwesterly (NW)",
    340: "North-northwesterly (NNW)",
    360: "Northerly (N)"
}

# IMD District Warning Code descriptions
IMD_WARNING_CODES = {
    1: "No Warning",
    2: "Heavy Rain",
    3: "Heavy Snow",
    4: "Thunderstorm & Lightning, Squall",
    5: "Hailstorm",
    6: "Dust Storm",
    7: "Dust Raising Winds",
    8: "Strong Surface Winds",
    9: "Heat Wave",
    10: "Hot Day",
    11: "Warm Night",
    12: "Cold Wave",
    13: "Cold Day",
    14: "Ground Frost",
    15: "Fog",
    16: "Very Heavy Rain",
    17: "Extremely Heavy Rain"
}

# IMD Warning Color Codes
IMD_WARNING_COLORS = {
    1: {"level": "RED", "hex": "#FF0000", "label": "Take Action (Extremely Severe)"},
    2: {"level": "ORANGE", "hex": "#FFA500", "label": "Be Prepared (Severe Weather)"},
    3: {"level": "YELLOW", "hex": "#FFFF00", "label": "Be Aware (Watch Weather Updates)"},
    4: {"level": "GREEN", "hex": "#7CFC00", "label": "No Warning (Normal Conditions)"}
}

# IMD Rainfall Categories
IMD_RAINFALL_CATEGORIES = {
    "LE": "Large Excess (60% or more)",
    "E": "Excess (20% to 59%)",
    "N": "Normal (-19% to 19%)",
    "D": "Deficient (-59% to -20%)",
    "LD": "Large Deficient (-99% to -60%)",
    "NR": "No Rain (-100%)",
    "ND": "No Data"
}

class IMDService:
    """
    Client for India Meteorological Department (IMD) official API services.
    Official portal: https://api.imd.gov.in/public/
    API reference: https://api.imd.gov.in/public/api_reference.html

    Endpoints used:
    1. /current_wx?id=StationId (Current Weather Observations)
    2. /districtrainfall?id=164 (Daily & cumulative rainfall stats)
    3. /districtwarning?id=573  (Official 5-day colour-coded warnings)
    4. /districtnowcast?id=164  (Short-term 3-hour local severe storm warnings)
    5. /basinqpf                (Quantitative Precipitation Forecast for River Basins)

    Authentication:
    - IMD_API_KEY (passed via 'X-Api-Key' header)
    - IMD_BEARER_TOKEN (passed via 'Authorization: Bearer <token>' header)
    """
    def __init__(self):
        self.base_url = os.environ.get("IMD_BASE_URL", "https://api.imd.gov.in/api/v1")
        self.api_key = os.environ.get("IMD_API_KEY", "")
        self.bearer_token = os.environ.get("IMD_BEARER_TOKEN", "")

        # Alappuzha & Kuttanad coordinates and official IMD identifiers
        self.latitude = 9.4950
        self.longitude = 76.3350
        self.district_name = "Alappuzha"
        self.station_name = "ALAPPUZHA"
        self.district_id = "164"  # IMD District code for Alappuzha
        self.state_name = "Kerala"
        self.state_id = "4"       # IMD State code for Kerala

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "User-Agent": "FloodGuard/1.0",
            "Accept": "application/json"
        }
        if self.api_key:
            headers["X-Api-Key"] = self.api_key
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"
        return headers

    def fetch_weather(self) -> Dict[str, Any]:
        """
        Fetch current weather observations from IMD /current_wx API.
        Extracts: Temperature, Humidity, Wind Speed, Wind Direction, Last 24 hrs Rainfall, Weather Code.
        """
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        if self.api_key and self.bearer_token:
            try:
                url = f"{self.base_url}/current_wx?id={self.district_id}"
                resp = requests.get(url, headers=self._get_headers(), timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    # Handle single object or array response
                    if isinstance(data, list) and len(data) > 0:
                        data = data[0]

                    # Parse official IMD field names (with fallbacks to lowercase)
                    temp_raw = data.get("Temperature", data.get("temp", data.get("CURR_TEMP", 28.0)))
                    humidity_raw = data.get("Humidity", data.get("humidity", data.get("RH", 78)))
                    wind_speed_raw = data.get("Wind Speed", data.get("wind_speed", data.get("WIND_SPEED", 12.0)))
                    wind_dir_code = data.get("Wind Direction", data.get("wind_direction", 0))
                    mslp_raw = data.get("M.S.L.P", data.get("mslp", data.get("MSLP", 1008.0)))
                    nebulosity = data.get("Nebulosity", data.get("nebulosity", 4))
                    wx_code = str(data.get("Weather Code", data.get("WEATHER_CODE", "01"))).zfill(2)
                    rain_24h = data.get("Last 24 hrs Rainfall", data.get("rainfall_24h", 0.0))

                    # Map condition and wind direction text
                    condition = IMD_WEATHER_CODES.get(wx_code, data.get("weather_desc", "Partly Cloudy"))
                    wind_dir_name = IMD_WIND_DIRECTIONS.get(int(wind_dir_code) if str(wind_dir_code).isdigit() else 0, "Variable")

                    obs_date = data.get("Date of Observation", data.get("DATE", now_iso[:10]))
                    obs_time = data.get("Time of Observation", data.get("TIME", "00:00:00 UTC"))

                    return {
                        "provider": "India Meteorological Department (IMD)",
                        "observation_type": "current_weather",
                        "location": f"{data.get('Station', self.station_name)}, {self.state_name}",
                        "coordinates": [self.longitude, self.latitude],
                        "temperature_c": float(temp_raw) if temp_raw is not None else 28.0,
                        "relative_humidity_pct": int(float(humidity_raw)) if humidity_raw is not None else 78,
                        "wind_speed_kmh": float(wind_speed_raw) if wind_speed_raw is not None else 12.0,
                        "wind_direction": wind_dir_name,
                        "mslp_hpa": float(mslp_raw) if mslp_raw is not None else 1008.0,
                        "nebulosity_okta": nebulosity,
                        "rainfall_24h_mm": float(rain_24h) if rain_24h is not None else 0.0,
                        "condition": condition,
                        "weather_code": wx_code,
                        "observation_timestamp": f"{obs_date} {obs_time}",
                        "fetch_timestamp": now_iso,
                        "source_reference": "IMD Official API (/api/v1/current_wx)",
                        "freshness_status": "LIVE",
                        "credentials_configured": True
                    }
                elif resp.status_code == 401:
                    auth_err = resp.json().get("error", "Unauthorized") if resp.content else "401 Unauthorized"
                    return self._fallback_open_weather(now_iso, imd_error=f"IMD Authentication Failed ({auth_err})")
            except Exception as e:
                return self._fallback_open_weather(now_iso, imd_error=str(e))

        return self._fallback_open_weather(now_iso, imd_error="IMD API Key & Bearer Token not configured in environment")

    def fetch_rainfall(self) -> Dict[str, Any]:
        """
        Fetch rainfall statistics from IMD /districtrainfall API.
        Extracts: Daily Actual, Daily Normal, Daily Departure Per, Daily Category, Weekly Actual.
        """
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        if self.api_key and self.bearer_token:
            try:
                url = f"{self.base_url}/districtrainfall?id={self.district_id}"
                resp = requests.get(url, headers=self._get_headers(), timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 0:
                        data = data[0]

                    daily_actual = float(data.get("Daily Actual", data.get("rainfall_24h", 0.0)))
                    daily_normal = float(data.get("Daily Normal", data.get("normal", 2.5)))
                    dep_str = str(data.get("Daily Departure Per", data.get("departure", "0%"))).replace("%", "").strip()
                    try:
                        dep_val = float(dep_str)
                    except ValueError:
                        dep_val = 0.0

                    cat_code = data.get("Daily Category", "N")
                    cat_desc = IMD_RAINFALL_CATEGORIES.get(cat_code, cat_code)

                    return {
                        "provider": "India Meteorological Department (IMD)",
                        "observation_type": "district_rainfall",
                        "district": data.get("District", self.district_name),
                        "state": self.state_name,
                        "rainfall_24h_mm": daily_actual,
                        "normal_rainfall_mm": daily_normal,
                        "departure_pct": dep_val,
                        "rainfall_category": cat_desc,
                        "weekly_actual_mm": float(data.get("Weekly Actual", 0.0)),
                        "cumulative_actual_mm": float(data.get("Cumulative Actual", 0.0)),
                        "observation_timestamp": data.get("Date", now_iso[:10]),
                        "fetch_timestamp": now_iso,
                        "source_reference": "IMD Official API (/api/v1/districtrainfall)",
                        "freshness_status": "LIVE",
                        "credentials_configured": True
                    }
            except Exception:
                pass

        # Fallback to Open-Meteo measured precipitation
        return self._fallback_rainfall(now_iso)

    def fetch_warnings(self) -> List[Dict[str, Any]]:
        """
        Fetch district-level weather and heavy-rainfall warnings from IMD /districtwarning API.
        Extracts: Day_1 to Day_5 warning codes and colour codes (Red, Orange, Yellow, Green).
        """
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        if self.api_key and self.bearer_token:
            try:
                url = f"{self.base_url}/districtwarning"
                resp = requests.get(url, headers=self._get_headers(), timeout=8)
                if resp.status_code == 200:
                    items = resp.json()
                    kerala_warnings = []
                    for w in items:
                        dist = str(w.get("District", "")).lower()
                        if self.district_name.lower() in dist or "alappuzha" in dist:
                            day1_code = int(w.get("Day_1", 1)) if str(w.get("Day_1", "1")).isdigit() else 1
                            day1_color_code = int(w.get("Day1_Color", 4)) if str(w.get("Day1_Color", "4")).isdigit() else 4
                            color_info = IMD_WARNING_COLORS.get(day1_color_code, IMD_WARNING_COLORS[4])

                            kerala_warnings.append({
                                "district": w.get("District", self.district_name),
                                "warning_date": w.get("Date", now_iso[:10]),
                                "issue_time_utc": w.get("UTC", "0300"),
                                "primary_warning": IMD_WARNING_CODES.get(day1_code, "No Warning"),
                                "alert_level": color_info["level"],
                                "alert_color": color_info["hex"],
                                "action_advice": color_info["label"],
                                "day_1_warning": IMD_WARNING_CODES.get(day1_code, "No Warning"),
                                "day_2_warning": IMD_WARNING_CODES.get(int(w.get("Day_2", 1)), "No Warning"),
                                "day_3_warning": IMD_WARNING_CODES.get(int(w.get("Day_3", 1)), "No Warning"),
                                "source": "IMD Official API (/api/v1/districtwarning)"
                            })
                    return kerala_warnings
            except Exception:
                pass

        return []

    def fetch_nowcast(self) -> Optional[Dict[str, Any]]:
        """
        Fetch 3-hour severe storm Nowcast from IMD /districtnowcast API.
        Extracts: message, valid-up-to, color code (1=Green, 2=Yellow, 3=Orange, 4=Red).
        """
        if not (self.api_key and self.bearer_token):
            return None

        try:
            url = f"{self.base_url}/districtnowcast?id={self.district_id}"
            resp = requests.get(url, headers=self._get_headers(), timeout=8)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    data = data[0]

                color_num = int(data.get("color", 1))
                color_map = {
                    1: {"level": "GREEN", "hex": "#008000"},
                    2: {"level": "YELLOW", "hex": "#FFFF00"},
                    3: {"level": "ORANGE", "hex": "#FFA500"},
                    4: {"level": "RED", "hex": "#FF0000"}
                }
                color_info = color_map.get(color_num, color_map[1])

                return {
                    "station": data.get("Station", self.station_name),
                    "date": data.get("Date"),
                    "valid_upto": data.get("Vupto"),
                    "time_of_issue": data.get("toi"),
                    "message": data.get("message", "No severe weather nowcast"),
                    "alert_level": color_info["level"],
                    "alert_color": color_info["hex"],
                    "source": "IMD Official API (/api/v1/districtnowcast)"
                }
        except Exception:
            pass
        return None

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
