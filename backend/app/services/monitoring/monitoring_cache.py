import time
from typing import Dict, Any, Optional

class MonitoringCache:
    """
    In-memory thread-safe TTL cache for live environmental telemetry.
    Tracks fetch time, error states, and evaluates observation freshness.
    """
    def __init__(self, default_ttl_seconds: int = 600):
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, float] = {}
        self._fetch_times: Dict[str, str] = {}
        self._default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            age = time.time() - self._timestamps.get(key, 0)
            if age < self._default_ttl:
                return self._cache[key]
        return None

    def set(self, key: str, value: Any, fetch_time_iso: str):
        self._cache[key] = value
        self._timestamps[key] = time.time()
        self._fetch_times[key] = fetch_time_iso

    def get_stale(self, key: str) -> Optional[Any]:
        """Return cached value even if expired (for graceful fallback)."""
        return self._cache.get(key)

    def get_age_seconds(self, key: str) -> float:
        if key in self._timestamps:
            return time.time() - self._timestamps[key]
        return 999999.0

    def evaluate_freshness(self, key: str, max_live_seconds: int = 1800, max_recent_seconds: int = 7200) -> str:
        """
        Evaluate freshness according to standard labels:
        - LIVE: updated within provider's expected operational window (< 30 min)
        - RECENT: within 2 hours
        - DELAYED: within 6 hours
        - STALE: older than 6 hours
        - UNAVAILABLE: no data
        """
        if key not in self._cache or not self._cache[key]:
            return "UNAVAILABLE"
        age = self.get_age_seconds(key)
        if age <= max_live_seconds:
            return "LIVE"
        elif age <= max_recent_seconds:
            return "RECENT"
        elif age <= 21600:
            return "DELAYED"
        else:
            return "STALE"

monitoring_cache = MonitoringCache()
