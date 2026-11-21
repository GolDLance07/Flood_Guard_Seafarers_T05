import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx

from backend.app.core.supabase import supabase_manager

logger = logging.getLogger("floodguard.database")

class DatabaseService:
    """
    Typed PostgreSQL access layer over Supabase PostgREST API with lifecycle management,
    user-scoped RLS query forwarding, and mandatory audit logging for privileged actions.
    """

    def __init__(self):
        self.manager = supabase_manager

    # --------------------------------------------------------------------------
    # 1. Mandatory Audit Logging
    # --------------------------------------------------------------------------
    def record_audit_event(
        self,
        actor_id: Optional[str],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """
        Records an append-only audit log entry using the privileged service role.
        Mandatory for all operational actions, role changes, and emergency overrides.
        """
        payload = {
            "actor_id": actor_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": str(resource_id) if resource_id else None,
            "details": details or {},
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        try:
            client = self.manager.get_http_client()
            url = f"{self.manager.base_url}/rest/v1/audit_logs"
            headers = self.manager.get_service_headers()
            r = client.post(url, json=payload, headers=headers, timeout=6.0)
            return r.status_code in (200, 201)
        except Exception as e:
            logger.warning(f"Audit log recording error (non-fatal): {str(e)}")
            return False

    # --------------------------------------------------------------------------
    # 2. Profiles Repository
    # --------------------------------------------------------------------------
    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        client = self.manager.get_http_client()
        url = f"{self.manager.base_url}/rest/v1/profiles?id=eq.{user_id}&select=*"
        headers = self.manager.get_service_headers()
        try:
            r = client.get(url, headers=headers, timeout=6.0)
            if r.status_code == 200:
                rows = r.json()
                if rows and isinstance(rows, list):
                    return rows[0]
        except Exception as e:
            logger.error(f"Error fetching profile: {e}")
        return None

    def update_profile(
        self,
        user_id: str,
        updates: Dict[str, Any],
        actor_role: str = "citizen",
        actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Updates profile details. Prevents users from self-assigning privileged roles.
        """
        # Security enforcement: only administrator can alter 'role'
        if "role" in updates and actor_role != "administrator":
            raise PermissionError("Self-assignment of privileged roles is forbidden. Only administrators may modify roles.")

        client = self.manager.get_http_client()
        url = f"{self.manager.base_url}/rest/v1/profiles?id=eq.{user_id}"
        headers = self.manager.get_service_headers()
        try:
            r = client.patch(url, json=updates, headers=headers, timeout=6.0)
            if r.status_code in (200, 204):
                rows = r.json() if r.content else []
                updated = rows[0] if rows else updates
                if "role" in updates:
                    self.record_audit_event(
                        actor_id=actor_id,
                        action="ROLE_MODIFIED",
                        resource_type="profile",
                        resource_id=user_id,
                        details={"new_role": updates.get("role")}
                    )
                return updated
        except Exception as e:
            logger.error(f"Error updating profile: {e}")
        return None

    # --------------------------------------------------------------------------
    # 3. Regions Repository
    # --------------------------------------------------------------------------
    def list_regions(self, active_only: bool = True) -> List[Dict[str, Any]]:
        client = self.manager.get_http_client()
        filter_str = "?is_active=eq.true&select=*" if active_only else "?select=*"
        url = f"{self.manager.base_url}/rest/v1/regions{filter_str}&order=name.asc"
        headers = self.manager.get_service_headers()
        try:
            r = client.get(url, headers=headers, timeout=6.0)
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            logger.warning(f"Error loading regions from Supabase: {e}")
        return []

    def get_region_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        client = self.manager.get_http_client()
        url = f"{self.manager.base_url}/rest/v1/regions?slug=eq.{slug}&select=*"
        headers = self.manager.get_service_headers()
        try:
            r = client.get(url, headers=headers, timeout=6.0)
            if r.status_code == 200:
                rows = r.json()
                if rows and isinstance(rows, list):
                    return rows[0]
        except Exception as e:
            logger.warning(f"Error loading region by slug: {e}")
        return None

    # --------------------------------------------------------------------------
    # 4. Shelters Repository
    # --------------------------------------------------------------------------
    def list_shelters(self, region_id: Optional[str] = None, active_only: bool = True) -> List[Dict[str, Any]]:
        client = self.manager.get_http_client()
        params = ["select=*"]
        if active_only:
            params.append("status=neq.closed")
        if region_id:
            params.append(f"region_id=eq.{region_id}")
        query = "&".join(params)
        url = f"{self.manager.base_url}/rest/v1/shelters?{query}&order=name.asc"
        headers = self.manager.get_service_headers()
        try:
            r = client.get(url, headers=headers, timeout=6.0)
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            logger.warning(f"Error loading shelters: {e}")
        return []

    def update_shelter_occupancy(
        self,
        shelter_id: str,
        current_occupancy: int,
        actor_id: str,
        actor_role: str
    ) -> Optional[Dict[str, Any]]:
        if actor_role not in ("district_authority", "administrator"):
            raise PermissionError("Only district authorities and administrators can update shelter capacity records.")

        client = self.manager.get_http_client()
        url = f"{self.manager.base_url}/rest/v1/shelters?id=eq.{shelter_id}"
        headers = self.manager.get_service_headers()
        payload = {"current_occupancy": current_occupancy}
        try:
            r = client.patch(url, json=payload, headers=headers, timeout=6.0)
            if r.status_code in (200, 204):
                self.record_audit_event(
                    actor_id=actor_id,
                    action="SHELTER_OCCUPANCY_UPDATED",
                    resource_type="shelter",
                    resource_id=shelter_id,
                    details={"new_occupancy": current_occupancy}
                )
                rows = r.json() if r.content else []
                return rows[0] if rows else payload
        except Exception as e:
            logger.error(f"Error updating shelter: {e}")
        return None

    # --------------------------------------------------------------------------
    # 5. Incidents Repository (User-Scoped RLS or Service-Role)
    # --------------------------------------------------------------------------
    def list_incidents(
        self,
        user_token: Optional[str] = None,
        region_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        client = self.manager.get_http_client()
        params = ["select=*"]
        if region_id:
            params.append(f"region_id=eq.{region_id}")
        if status:
            params.append(f"status=eq.{status}")
        query = "&".join(params)
        url = f"{self.manager.base_url}/rest/v1/incidents?{query}&order=created_at.desc"

        # If user token provided, query with user headers so RLS is evaluated
        headers = self.manager.get_user_headers(user_token) if user_token else self.manager.get_service_headers()
        try:
            r = client.get(url, headers=headers, timeout=6.0)
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            logger.warning(f"Error loading incidents: {e}")
        return []

    def create_incident(
        self,
        incident_data: Dict[str, Any],
        user_token: Optional[str] = None,
        actor_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        client = self.manager.get_http_client()
        url = f"{self.manager.base_url}/rest/v1/incidents"
        headers = self.manager.get_user_headers(user_token) if user_token else self.manager.get_service_headers()
        try:
            r = client.post(url, json=incident_data, headers=headers, timeout=6.0)
            if r.status_code in (200, 201):
                created = r.json()[0] if r.content else incident_data
                self.record_audit_event(
                    actor_id=actor_id,
                    action="INCIDENT_REPORTED",
                    resource_type="incident",
                    resource_id=created.get("id"),
                    details={"category": created.get("category"), "severity": created.get("severity")}
                )
                return created
        except Exception as e:
            logger.error(f"Error creating incident: {e}")
        return None

    def update_incident_status(
        self,
        incident_id: str,
        new_status: str,
        actor_id: str,
        actor_role: str,
        notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        if actor_role not in ("field_team", "district_authority", "administrator"):
            raise PermissionError("Only verified response personnel can update incident status.")

        client = self.manager.get_http_client()
        url = f"{self.manager.base_url}/rest/v1/incidents?id=eq.{incident_id}"
        headers = self.manager.get_service_headers()
        payload = {"status": new_status}
        try:
            r = client.patch(url, json=payload, headers=headers, timeout=6.0)
            if r.status_code in (200, 204):
                self.record_audit_event(
                    actor_id=actor_id,
                    action="INCIDENT_STATUS_CHANGED",
                    resource_type="incident",
                    resource_id=incident_id,
                    details={"new_status": new_status, "notes": notes}
                )
                rows = r.json() if r.content else []
                return rows[0] if rows else payload
        except Exception as e:
            logger.error(f"Error updating incident status: {e}")
        return None

    # --------------------------------------------------------------------------
    # 6. Response Tasks Repository
    # --------------------------------------------------------------------------
    def list_response_tasks(
        self,
        user_token: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        client = self.manager.get_http_client()
        params = ["select=*"]
        if assigned_to:
            params.append(f"assigned_to=eq.{assigned_to}")
        query = "&".join(params)
        url = f"{self.manager.base_url}/rest/v1/response_tasks?{query}&order=created_at.desc"
        headers = self.manager.get_user_headers(user_token) if user_token else self.manager.get_service_headers()
        try:
            r = client.get(url, headers=headers, timeout=6.0)
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            logger.warning(f"Error loading response tasks: {e}")
        return []

database_service = DatabaseService()
