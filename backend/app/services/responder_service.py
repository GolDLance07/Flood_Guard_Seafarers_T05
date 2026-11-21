import os
import uuid
import logging
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from backend.app.config import BASE_DIR
from backend.app.services.database import database_service
from backend.app.services.citizen_service import CITIZEN_DB_PATH

logger = logging.getLogger("floodguard.responder")

DEFAULT_SEED_TEAMS = [
    {
        "id": "b0000000-0000-0000-0000-000000000001",
        "region_id": "kerala-alappuzha",
        "name": "Kerala NDRF 04 Battalion Alpha Unit",
        "callsign": "NDRF-ALP-ALPHA",
        "capabilities": ["rescue", "boat_ops", "evacuation", "medical"],
        "operational_status": "AVAILABLE",
        "contact_phone": "+91-477-2238630",
        "base_latitude": 9.4981,
        "base_longitude": 76.3388,
        "metadata": {"boats": 4, "personnel": 18, "satellite_comms": True}
    },
    {
        "id": "b0000000-0000-0000-0000-000000000002",
        "region_id": "kerala-alappuzha",
        "name": "Alappuzha Fire & Rescue Water Wing",
        "callsign": "FRS-ALP-WATER-1",
        "capabilities": ["boat_ops", "rescue", "logistics"],
        "operational_status": "AVAILABLE",
        "contact_phone": "101",
        "base_latitude": 9.4920,
        "base_longitude": 76.3260,
        "metadata": {"boats": 2, "personnel": 10, "diving_gear": True}
    },
    {
        "id": "b0000000-0000-0000-0000-000000000003",
        "region_id": "assam-guwahati",
        "name": "Kamrup Metropolitan SDRF Quick Response",
        "callsign": "SDRF-GHY-QR1",
        "capabilities": ["rescue", "boat_ops", "supply_delivery"],
        "operational_status": "AVAILABLE",
        "contact_phone": "+91-361-2735622",
        "base_latitude": 26.1450,
        "base_longitude": 91.7370,
        "metadata": {"boats": 3, "personnel": 14}
    },
    {
        "id": "b0000000-0000-0000-0000-000000000004",
        "region_id": "bihar-patna",
        "name": "Patna Civil Defense Medical Triage Unit",
        "callsign": "MED-PAT-TRIAGE",
        "capabilities": ["medical", "evacuation", "relief_distribution"],
        "operational_status": "AVAILABLE",
        "contact_phone": "+91-612-2217636",
        "base_latitude": 25.5940,
        "base_longitude": 85.1380,
        "metadata": {"ambulances": 3, "paramedics": 8}
    },
    {
        "id": "b0000000-0000-0000-0000-000000000005",
        "region_id": "gujarat-ahmedabad",
        "name": "Ahmedabad Municipal Rapid Drainage Wing",
        "callsign": "AMC-AHM-RAPID",
        "capabilities": ["infrastructure_inspection", "logistics", "rescue"],
        "operational_status": "AVAILABLE",
        "contact_phone": "+91-79-25391811",
        "base_latitude": 23.0220,
        "base_longitude": 72.5710,
        "metadata": {"pumps": 8, "heavy_vehicles": 4}
    }
]

class ResponderService:
    """
    Field-team management, assignment workflow, and permission-controlled location sharing.
    """

    def __init__(self):
        self._init_responder_storage()

    def _init_responder_storage(self):
        """Initializes tables in local database to mirror Supabase entities."""
        try:
            with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS responder_teams (
                        id TEXT PRIMARY KEY,
                        region_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        callsign TEXT UNIQUE NOT NULL,
                        capabilities TEXT NOT NULL,
                        operational_status TEXT NOT NULL DEFAULT 'AVAILABLE',
                        contact_phone TEXT,
                        base_latitude REAL,
                        base_longitude REAL,
                        metadata TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS incident_assignments (
                        id TEXT PRIMARY KEY,
                        incident_id TEXT NOT NULL,
                        team_id TEXT NOT NULL,
                        assigned_by TEXT,
                        status TEXT NOT NULL DEFAULT 'PENDING',
                        priority TEXT NOT NULL DEFAULT 'high',
                        notes TEXT,
                        decline_reason TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS team_locations (
                        id TEXT PRIMARY KEY,
                        team_id TEXT NOT NULL,
                        latitude REAL NOT NULL,
                        longitude REAL NOT NULL,
                        heading REAL,
                        speed_kmh REAL,
                        is_sharing_active INTEGER NOT NULL DEFAULT 1,
                        recorded_at TEXT NOT NULL
                    )
                """)
                # Populate default seed teams if empty
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM responder_teams")
                if cursor.fetchone()[0] == 0:
                    now = datetime.now(timezone.utc).isoformat()
                    for t in DEFAULT_SEED_TEAMS:
                        import json
                        conn.execute("""
                            INSERT INTO responder_teams (
                                id, region_id, name, callsign, capabilities,
                                operational_status, contact_phone, base_latitude,
                                base_longitude, metadata, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            t["id"], t["region_id"], t["name"], t["callsign"],
                            json.dumps(t["capabilities"]), t["operational_status"],
                            t["contact_phone"], t["base_latitude"], t["base_longitude"],
                            json.dumps(t["metadata"]), now, now
                        ))
        except Exception as e:
            logger.warning(f"Error initializing responder sqlite storage: {e}")

    # --------------------------------------------------------------------------
    # 1. Team Management
    # --------------------------------------------------------------------------
    def list_teams(self, region_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        import json
        teams = []
        try:
            with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM responder_teams ORDER BY name ASC")
                for row in cursor.fetchall():
                    d = dict(row)
                    d["capabilities"] = json.loads(d["capabilities"]) if isinstance(d["capabilities"], str) else d["capabilities"]
                    d["metadata"] = json.loads(d["metadata"]) if isinstance(d["metadata"], str) else d["metadata"]
                    teams.append(d)
        except Exception as e:
            logger.error(f"Error reading teams: {e}")

        if region_id and region_id != "ALL":
            teams = [t for t in teams if region_id in t.get("region_id", "")]
        if status and status != "ALL":
            teams = [t for t in teams if t.get("operational_status") == status]
        return teams

    def get_team_by_id(self, team_id: str) -> Optional[Dict[str, Any]]:
        teams = self.list_teams()
        return next((t for t in teams if t["id"] == team_id or t["callsign"] == team_id), None)

    # --------------------------------------------------------------------------
    # 2. Assignment Workflow (Authority Assign -> Team Respond -> Status Update)
    # --------------------------------------------------------------------------
    def assign_team_to_incident(
        self,
        incident_id: str,
        team_id: str,
        assigned_by: str,
        priority: str = "high",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        assignment_id = str(uuid.uuid4())

        # Update team operational status
        with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
            conn.execute("""
                INSERT INTO incident_assignments (
                    id, incident_id, team_id, assigned_by, status, priority, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
            """, (assignment_id, incident_id, team_id, assigned_by, priority, notes, now_iso, now_iso))
            conn.execute("UPDATE responder_teams SET operational_status = 'DISPATCHED', updated_at = ? WHERE id = ?", (now_iso, team_id))

        database_service.record_audit_event(
            actor_id=assigned_by,
            action="TEAM_ASSIGNED_TO_INCIDENT",
            resource_type="incident_assignment",
            resource_id=assignment_id,
            details={"incident_id": incident_id, "team_id": team_id, "priority": priority}
        )

        return {
            "assignment_id": assignment_id,
            "incident_id": incident_id,
            "team_id": team_id,
            "status": "PENDING",
            "priority": priority,
            "created_at": now_iso
        }

    def respond_to_assignment(
        self,
        assignment_id: str,
        team_id: str,
        decision: str, # 'ACCEPTED' or 'DECLINED'
        decline_reason: Optional[str] = None,
        responder_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if decision not in ("ACCEPTED", "DECLINED"):
            raise ValueError("Decision must be 'ACCEPTED' or 'DECLINED'.")

        now_iso = datetime.now(timezone.utc).isoformat()
        new_team_status = "DISPATCHED" if decision == "ACCEPTED" else "AVAILABLE"

        with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
            conn.execute("""
                UPDATE incident_assignments
                SET status = ?, decline_reason = ?, updated_at = ?
                WHERE id = ? AND team_id = ?
            """, (decision, decline_reason, now_iso, assignment_id, team_id))
            conn.execute("UPDATE responder_teams SET operational_status = ?, updated_at = ? WHERE id = ?", (new_team_status, now_iso, team_id))

        database_service.record_audit_event(
            actor_id=responder_id,
            action=f"ASSIGNMENT_{decision}",
            resource_type="incident_assignment",
            resource_id=assignment_id,
            details={"decision": decision, "decline_reason": decline_reason}
        )

        return {
            "assignment_id": assignment_id,
            "status": decision,
            "team_status": new_team_status,
            "updated_at": now_iso
        }

    def update_assignment_lifecycle(
        self,
        assignment_id: str,
        team_id: str,
        new_status: str, # 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'
        notes: Optional[str] = None,
        responder_id: Optional[str] = None
    ) -> Dict[str, Any]:
        valid_states = ("EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED", "ABORTED")
        if new_status not in valid_states:
            raise ValueError(f"Invalid status '{new_status}'. Permitted: {valid_states}")

        now_iso = datetime.now(timezone.utc).isoformat()
        team_op_status = "AVAILABLE" if new_status in ("COMPLETED", "ABORTED") else "ON_SCENE" if new_status in ("ARRIVED", "IN_PROGRESS") else "DISPATCHED"

        with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
            conn.execute("""
                UPDATE incident_assignments
                SET status = ?, notes = COALESCE(?, notes), updated_at = ?
                WHERE id = ? AND team_id = ?
            """, (new_status, notes, now_iso, assignment_id, team_id))
            conn.execute("UPDATE responder_teams SET operational_status = ?, updated_at = ? WHERE id = ?", (team_op_status, now_iso, team_id))

        return {
            "assignment_id": assignment_id,
            "status": new_status,
            "team_status": team_op_status,
            "updated_at": now_iso
        }

    def get_my_tasks(self, team_id: str) -> List[Dict[str, Any]]:
        tasks = []
        try:
            with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT a.*, i.title, i.category, i.severity, i.latitude, i.longitude, i.address, i.tracking_number
                    FROM incident_assignments a
                    LEFT JOIN citizen_incidents i ON a.incident_id = i.incident_id
                    WHERE a.team_id = ?
                    ORDER BY a.created_at DESC
                """, (team_id,))
                for row in cursor.fetchall():
                    tasks.append(dict(row))
        except Exception as e:
            logger.error(f"Error fetching tasks: {e}")
        return tasks

    # --------------------------------------------------------------------------
    # 3. Location Sharing (Permission-Controlled & Stale-Aware)
    # --------------------------------------------------------------------------
    def record_location_update(
        self,
        team_id: str,
        latitude: float,
        longitude: float,
        heading: Optional[float] = None,
        speed_kmh: Optional[float] = None,
        is_sharing_active: bool = True
    ) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        loc_id = str(uuid.uuid4())

        with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
            conn.execute("""
                INSERT INTO team_locations (id, team_id, latitude, longitude, heading, speed_kmh, is_sharing_active, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (loc_id, team_id, latitude, longitude, heading, speed_kmh, 1 if is_sharing_active else 0, now_iso))

        return {
            "status": "success",
            "team_id": team_id,
            "latitude": latitude,
            "longitude": longitude,
            "is_sharing_active": is_sharing_active,
            "recorded_at": now_iso
        }

    def get_active_team_locations(self, max_age_minutes: int = 60) -> List[Dict[str, Any]]:
        """Returns recent positions of teams that have opted into location sharing."""
        locations = []
        try:
            with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT l.*, t.name as team_name, t.callsign, t.operational_status, t.capabilities
                    FROM team_locations l
                    JOIN responder_teams t ON l.team_id = t.id
                    WHERE l.is_sharing_active = 1
                    ORDER BY l.recorded_at DESC
                """)
                seen = set()
                now = datetime.now(timezone.utc)
                for row in cursor.fetchall():
                    tid = row["team_id"]
                    if tid in seen:
                        continue
                    seen.add(tid)
                    d = dict(row)
                    # Check staleness
                    dt = datetime.fromisoformat(d["recorded_at"].replace("Z", "+00:00"))
                    age_min = (now - dt).total_seconds() / 60.0
                    d["is_stale"] = age_min > max_age_minutes
                    d["age_minutes"] = round(age_min, 1)
                    locations.append(d)
        except Exception as e:
            logger.error(f"Error fetching team locations: {e}")
        return locations

responder_service = ResponderService()
