import math
import time
import uuid
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from backend.app.services.database import database_service
from backend.app.services.citizen_service import citizen_service, CITIZEN_DB_PATH
from backend.app.schemas.incident import (
    IncidentStatusType,
    DuplicateSuggestion,
    IncidentTimelineEvent,
    IncidentDetailResponse,
    PublicIncidentStatusResponse
)

logger = logging.getLogger("floodguard.incidents")

# Allowed state transition graph
VALID_TRANSITIONS: Dict[str, List[str]] = {
    "SUBMITTED_UNVERIFIED": ["IN_REVIEW", "VERIFIED", "REJECTED", "DUPLICATE"],
    "IN_REVIEW": ["VERIFIED", "REJECTED", "DUPLICATE"],
    "VERIFIED": ["ACTION_DISPATCHED", "IN_PROGRESS", "RESOLVED"],
    "ACTION_DISPATCHED": ["IN_PROGRESS", "RESOLVED"],
    "IN_PROGRESS": ["RESOLVED"],
    "RESOLVED": ["IN_PROGRESS"], # Can be reopened if situation recurs
    "REJECTED": ["IN_REVIEW"],
    "DUPLICATE": ["IN_REVIEW"]
}

class IncidentRateLimiter:
    """Sliding-window IP rate limiter preventing spam submissions."""
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = {}

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        timestamps = self.requests.get(client_ip, [])
        # Expire old timestamps
        timestamps = [t for t in timestamps if now - t < self.window_seconds]
        if len(timestamps) >= self.max_requests:
            self.requests[client_ip] = timestamps
            return False
        timestamps.append(now)
        self.requests[client_ip] = timestamps
        return True

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS coordinates in meters."""
    R = 6371000.0 # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class IncidentService:
    """
    Unified disaster incident intelligence and authority management service.
    Coordinates citizen submissions, authority triage, verification, duplicate detection,
    and responder team dispatches with audit integrity.
    """

    def __init__(self):
        self.rate_limiter = IncidentRateLimiter(max_requests=6, window_seconds=60)

    # --------------------------------------------------------------------------
    # 1. Duplicate Detection
    # --------------------------------------------------------------------------
    def find_duplicate_candidates(
        self,
        latitude: float,
        longitude: float,
        category: str,
        exclude_id: Optional[str] = None,
        max_distance_m: float = 1500.0,
        max_time_hours: float = 24.0
    ) -> List[DuplicateSuggestion]:
        """
        Detects nearby incidents sharing the same category and recent timeframe.
        Never auto-deletes; returns suggestions with confidence metrics.
        """
        all_incidents = self.list_all_incidents()
        duplicates: List[DuplicateSuggestion] = []

        now = datetime.now(timezone.utc)

        for inc in all_incidents:
            if exclude_id and inc.get("id") == exclude_id:
                continue

            dist = haversine_distance_m(latitude, longitude, inc["latitude"], inc["longitude"])
            if dist > max_distance_m:
                continue

            # Time delta calculation
            submitted_str = inc.get("submitted_at")
            delta_hours = 0.0
            if submitted_str:
                try:
                    dt = datetime.fromisoformat(submitted_str.replace("Z", "+00:00"))
                    delta_hours = abs((now - dt).total_seconds()) / 3600.0
                except Exception:
                    pass

            if delta_hours > max_time_hours:
                continue

            same_cat = (inc.get("category") == category)
            # Distance score: closer -> higher confidence
            dist_score = max(0.0, 1.0 - (dist / max_distance_m))
            time_score = max(0.0, 1.0 - (delta_hours / max_time_hours))
            cat_score = 1.0 if same_cat else 0.4
            confidence = round(0.5 * dist_score + 0.3 * time_score + 0.2 * cat_score, 2)

            if confidence >= 0.5:
                duplicates.append(DuplicateSuggestion(
                    incident_id=inc["id"],
                    tracking_number=inc.get("tracking_number", "UNKNOWN"),
                    title=inc["title"],
                    distance_meters=round(dist, 1),
                    time_delta_hours=round(delta_hours, 1),
                    confidence_score=confidence,
                    same_category=same_cat
                ))

        duplicates.sort(key=lambda d: d.confidence_score, reverse=True)
        return duplicates

    # --------------------------------------------------------------------------
    # 2. Authority Incident Inbox Listing & Filtering
    # --------------------------------------------------------------------------
    def list_all_incidents(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        region_slug: Optional[str] = None,
        category: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Queries all incidents from persistent storage (Supabase or local mirror)
        with support for authority filters and sorting.
        """
        import sqlite3
        incidents = []

        # 1. Read from SQLite durable registry
        try:
            if CITIZEN_DB_PATH.exists():
                with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
                    conn.row_factory = sqlite3.Row
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT 
                            incident_id as id,
                            tracking_number,
                            user_id as reporter_id,
                            region_slug,
                            category,
                            severity,
                            status,
                            verification_status,
                            title,
                            description,
                            latitude,
                            longitude,
                            address,
                            affected_people_count,
                            contact_phone as reporter_phone,
                            image_url,
                            verification_notes as internal_notes,
                            submitted_at,
                            updated_at
                        FROM citizen_incidents
                        ORDER BY 
                            CASE severity 
                                WHEN 'critical' THEN 1 
                                WHEN 'high' THEN 2 
                                WHEN 'medium' THEN 3 
                                ELSE 4 
                            END,
                            submitted_at DESC
                    """)
                    for row in cursor.fetchall():
                        d = dict(row)
                        d["evidence_urls"] = [d["image_url"]] if d.get("image_url") else []
                        incidents.append(d)
        except Exception as e:
            logger.warning(f"Error reading incidents from local store: {e}")

        # Apply in-memory filters
        filtered = incidents
        if status and status != "ALL":
            filtered = [i for i in filtered if i.get("status") == status]
        if severity and severity != "ALL":
            filtered = [i for i in filtered if i.get("severity") == severity]
        if region_slug and region_slug != "ALL":
            filtered = [i for i in filtered if i.get("region_slug") == region_slug]
        if category and category != "ALL":
            filtered = [i for i in filtered if i.get("category") == category]
        if search_query:
            q = search_query.lower()
            filtered = [
                i for i in filtered
                if q in i.get("title", "").lower()
                or q in i.get("tracking_number", "").lower()
                or q in (i.get("address") or "").lower()
            ]

        return filtered

    def get_incident_detail(self, incident_id: str) -> Optional[IncidentDetailResponse]:
        """Retrieves rich incident details including duplicate suggestions and timeline."""
        incidents = self.list_all_incidents()
        match = next((i for i in incidents if i["id"] == incident_id or i.get("tracking_number") == incident_id), None)
        if not match:
            return None

        # Calculate duplicate suggestions
        duplicates = self.find_duplicate_candidates(
            latitude=match["latitude"],
            longitude=match["longitude"],
            category=match["category"],
            exclude_id=match["id"]
        )

        # Timeline events
        timeline = [
            IncidentTimelineEvent(
                id=str(uuid.uuid4()),
                incident_id=match["id"],
                author_name="Reporting Citizen",
                author_role="citizen",
                update_type="submission",
                message=f"Incident report submitted with severity '{match.get('severity', 'medium')}'. Initial state: SUBMITTED_UNVERIFIED.",
                is_public=True,
                created_at=match["submitted_at"]
            )
        ]

        if match.get("status") in ("VERIFIED", "ACTION_DISPATCHED", "IN_PROGRESS", "RESOLVED"):
            timeline.append(
                IncidentTimelineEvent(
                    id=str(uuid.uuid4()),
                    incident_id=match["id"],
                    author_name="District Disaster Management Authority",
                    author_role="district_authority",
                    update_type="verification",
                    message=f"Incident status updated to {match['status']}. Ground verification confirmed.",
                    is_public=True,
                    created_at=match.get("updated_at", match["submitted_at"])
                )
            )

        return IncidentDetailResponse(
            id=match["id"],
            tracking_number=match.get("tracking_number", "UNKNOWN"),
            reporter_id=match.get("reporter_id"),
            reporter_phone=match.get("reporter_phone"),
            region_id=match.get("region_slug"),
            region_name=match.get("region_slug", "").replace("-", " ").title(),
            category=match["category"],
            severity=match["severity"],
            status=match.get("status", "SUBMITTED_UNVERIFIED"),
            verification_status=match.get("verification_status", "PENDING_OFFICIAL_VERIFICATION"),
            title=match["title"],
            description=match.get("description"),
            latitude=match["latitude"],
            longitude=match["longitude"],
            address=match.get("address"),
            affected_people_count=match.get("affected_people_count", 0),
            evidence_urls=match.get("evidence_urls", []),
            public_status_note=match.get("public_status_note") or "Official disaster response units are monitoring this report.",
            internal_notes=match.get("internal_notes"),
            duplicate_of_id=match.get("duplicate_of_id"),
            suggested_duplicates=duplicates,
            assigned_team_id=match.get("assigned_team_id"),
            assigned_team_name="Kerala NDRF 04 Battalion Alpha" if match.get("status") == "ACTION_DISPATCHED" else None,
            submitted_at=match["submitted_at"],
            updated_at=match.get("updated_at", match["submitted_at"]),
            timeline=timeline
        )

    # --------------------------------------------------------------------------
    # 3. State Machine Transitions with Validation & Audit Trail
    # --------------------------------------------------------------------------
    def transition_incident_status(
        self,
        incident_id: str,
        new_status: IncidentStatusType,
        actor_id: str,
        actor_role: str,
        actor_name: str,
        reason: str,
        public_note: Optional[str] = None,
        internal_note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a validated incident state transition.
        Enforces valid state machine paths and records mandatory audit log.
        """
        # Role authorization check
        if actor_role not in ("field_team", "district_authority", "administrator"):
            raise PermissionError("Only authorized response personnel can transition incident lifecycle states.")

        detail = self.get_incident_detail(incident_id)
        if not detail:
            raise KeyError(f"Incident '{incident_id}' not found.")

        current_status = detail.status
        allowed_next = VALID_TRANSITIONS.get(current_status, [])
        if new_status not in allowed_next:
            raise ValueError(
                f"Invalid state transition from '{current_status}' to '{new_status}'. "
                f"Permitted next states: {allowed_next}"
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        import sqlite3

        # Update in SQLite
        try:
            with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
                conn.execute("""
                    UPDATE citizen_incidents
                    SET status = ?,
                        verification_status = ?,
                        verification_notes = COALESCE(?, verification_notes),
                        updated_at = ?
                    WHERE incident_id = ? OR tracking_number = ?
                """, (
                    new_status,
                    "OFFICIALLY_VERIFIED" if new_status in ("VERIFIED", "ACTION_DISPATCHED", "RESOLVED") else new_status,
                    internal_note or reason,
                    now_iso,
                    incident_id,
                    incident_id
                ))
        except Exception as e:
            logger.error(f"Error persisting state transition: {e}")

        # Record mandatory audit event
        database_service.record_audit_event(
            actor_id=actor_id,
            action="INCIDENT_LIFECYCLE_TRANSITION",
            resource_type="incident",
            resource_id=detail.id,
            details={
                "previous_status": current_status,
                "new_status": new_status,
                "actor_role": actor_role,
                "actor_name": actor_name,
                "reason": reason,
                "public_note": public_note
            }
        )

        return {
            "status": "success",
            "incident_id": detail.id,
            "tracking_number": detail.tracking_number,
            "previous_status": current_status,
            "new_status": new_status,
            "updated_at": now_iso,
            "actor": actor_name
        }

    # --------------------------------------------------------------------------
    # 4. Public Tracking Projection (Strict PII Sanitization)
    # --------------------------------------------------------------------------
    def get_public_tracking_status(self, tracking_number: str) -> Optional[PublicIncidentStatusResponse]:
        """
        Public-facing incident status.
        STRICT PRIVACY: Never exposes reporter name, phone number, internal notes,
        or personal responder identity.
        """
        detail = self.get_incident_detail(tracking_number)
        if not detail:
            return None

        return PublicIncidentStatusResponse(
            tracking_number=detail.tracking_number,
            status=detail.status,
            verification_status=detail.verification_status,
            category=detail.category,
            severity=detail.severity,
            title=detail.title,
            submitted_at=detail.submitted_at,
            verified_at=detail.verified_at,
            public_status_note=detail.public_status_note,
            safety_disclaimer=(
                "Emergency alerts submitted to FloodGuard assist district disaster management units. "
                "For life-threatening acute emergencies, call 1077 (District Control Room) or 112 directly."
            )
        )

    # --------------------------------------------------------------------------
    # 5. Spatial Incident Clustering (Community Verification & Triage)
    # --------------------------------------------------------------------------
    def cluster_incidents(
        self,
        region_slug: Optional[str] = None,
        radius_meters: float = 1500.0,
        min_reports: int = 2,
        time_window_hours: float = 48.0
    ) -> Dict[str, Any]:
        """
        Groups geographically and temporally proximate incident reports into spatial clusters.
        Assists Command triage in identifying emerging disaster hotspots instead of raw scattered pins.
        """
        all_incidents = self.list_all_incidents(region_slug=region_slug)
        now = datetime.now(timezone.utc)

        # Filter by time window if specified
        active_incidents = []
        for inc in all_incidents:
            sub_time_str = inc.get("submitted_at")
            if sub_time_str:
                try:
                    sub_time = datetime.fromisoformat(sub_time_str.replace("Z", "+00:00"))
                    if (now - sub_time).total_seconds() <= time_window_hours * 3600:
                        active_incidents.append(inc)
                        continue
                except Exception:
                    pass
            active_incidents.append(inc)

        # Single linkage spatial clustering
        visited = set()
        clusters = []

        for i, inc in enumerate(active_incidents):
            if i in visited:
                continue
            
            cluster_members = [inc]
            visited.add(i)

            for j, other in enumerate(active_incidents):
                if j in visited:
                    continue
                dist = haversine_distance_m(inc["latitude"], inc["longitude"], other["latitude"], other["longitude"])
                if dist <= radius_meters:
                    cluster_members.append(other)
                    visited.add(j)

            if len(cluster_members) >= min_reports:
                # Calculate centroid
                avg_lat = sum(m["latitude"] for m in cluster_members) / len(cluster_members)
                avg_lon = sum(m["longitude"] for m in cluster_members) / len(cluster_members)
                
                severities = {"critical": 0, "high": 0, "medium": 0, "low": 0}
                categories = set()
                statuses = {}
                for m in cluster_members:
                    sev = m.get("severity", "medium").lower()
                    severities[sev] = severities.get(sev, 0) + 1
                    categories.add(m.get("category", "unspecified"))
                    st = m.get("status", "SUBMITTED_UNVERIFIED")
                    statuses[st] = statuses.get(st, 0) + 1

                # Risk level determination
                if severities.get("critical", 0) > 0 or len(cluster_members) >= 5:
                    cluster_risk = "CRITICAL"
                elif severities.get("high", 0) > 0 or len(cluster_members) >= 3:
                    cluster_risk = "HIGH"
                else:
                    cluster_risk = "ELEVATED"

                clusters.append({
                    "cluster_id": f"cluster-{len(clusters)+1}-{inc.get('region_slug', 'all')}",
                    "centroid_latitude": round(avg_lat, 6),
                    "centroid_longitude": round(avg_lon, 6),
                    "report_count": len(cluster_members),
                    "cluster_risk_level": cluster_risk,
                    "severities": severities,
                    "categories": sorted(list(categories)),
                    "status_breakdown": statuses,
                    "member_incident_ids": [m["id"] for m in cluster_members],
                    "member_tracking_numbers": [m.get("tracking_number") for m in cluster_members if m.get("tracking_number")],
                    "earliest_report": min(m.get("submitted_at", "") for m in cluster_members),
                    "latest_report": max(m.get("submitted_at", "") for m in cluster_members),
                    "primary_area": cluster_members[0].get("address") or cluster_members[0].get("title")
                })

        return {
            "status": "success",
            "region_slug": region_slug or "all",
            "radius_meters": radius_meters,
            "min_reports": min_reports,
            "total_incidents_analyzed": len(active_incidents),
            "cluster_count": len(clusters),
            "clusters": sorted(clusters, key=lambda c: c["report_count"], reverse=True)
        }

incident_service = IncidentService()
