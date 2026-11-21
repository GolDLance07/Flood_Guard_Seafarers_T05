import os
import httpx
from typing import Dict, Any, Optional
from backend.app.config import (
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY,
    SUPABASE_JWKS_URL
)

class SupabaseClientManager:
    """
    Manages HTTP connection pooling and request dispatching to Supabase PostgREST,
    Auth, and Storage services.

    Security Boundaries:
    - Never exposes SUPABASE_SECRET_KEY to client responses or unprivileged code.
    - User queries forward user Bearer tokens so PostgreSQL Row Level Security (RLS)
      is strictly enforced on the database tier.
    - Service-role calls are strictly reserved for administrative maintenance and audit logging.
    """
    def __init__(self):
        self.base_url = SUPABASE_URL.rstrip("/")
        self.publishable_key = SUPABASE_PUBLISHABLE_KEY
        self.secret_key = SUPABASE_SECRET_KEY
        self.jwks_url = SUPABASE_JWKS_URL
        self._http_client: Optional[httpx.Client] = None

    def get_http_client(self) -> httpx.Client:
        """Returns a reused connection-pooled HTTP client."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.Client(
                timeout=12.0,
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=50)
            )
        return self._http_client

    def close(self):
        """Cleanly releases connections during server shutdown."""
        if self._http_client and not self._http_client.is_closed:
            self._http_client.close()

    def get_service_headers(self) -> Dict[str, str]:
        """Headers for privileged server-side operations using the secret key."""
        key = self.secret_key or self.publishable_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def get_user_headers(self, user_token: str) -> Dict[str, str]:
        """Headers forwarding the authenticated citizen's or responder's Bearer JWT."""
        return {
            "apikey": self.publishable_key,
            "Authorization": f"Bearer {user_token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def check_health(self) -> Dict[str, Any]:
        """Evaluates connectivity to Supabase Auth and PostgREST endpoints."""
        status = {
            "configured": bool(self.base_url and self.publishable_key),
            "service_key_present": bool(self.secret_key),
            "jwks_accessible": False,
            "rest_accessible": False,
            "supabase_url": self.base_url
        }
        if not status["configured"]:
            return status

        client = self.get_http_client()
        try:
            r = client.get(self.jwks_url, timeout=5.0)
            status["jwks_accessible"] = (r.status_code == 200)
        except Exception as e:
            status["jwks_error"] = str(e)

        try:
            headers = self.get_service_headers()
            r = client.get(f"{self.base_url}/rest/v1/", headers=headers, timeout=5.0)
            status["rest_accessible"] = (r.status_code == 200)
        except Exception as e:
            status["rest_error"] = str(e)

        return status

supabase_manager = SupabaseClientManager()
