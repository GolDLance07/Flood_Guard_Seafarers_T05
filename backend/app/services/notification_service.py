import os
import uuid
import sqlite3
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from backend.app.services.citizen_service import CITIZEN_DB_PATH
from backend.app.services.database import database_service

logger = logging.getLogger("floodguard.notifications")

class NotificationService:
    """
    Central alert and operational notification engine for FloodGuard.
    Handles official alert broadcasts, incident tracking updates, shelter status updates,
    deduplication, and in-app delivery logging.
    """

    def __init__(self):
        self._init_db()

    def _init_db(self):
        try:
            with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS notifications (
                        id TEXT PRIMARY KEY,
                        recipient_id TEXT,
                        region_slug TEXT,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        severity TEXT NOT NULL DEFAULT 'medium',
                        category TEXT NOT NULL,
                        source TEXT NOT NULL,
                        is_read INTEGER NOT NULL DEFAULT 0,
                        delivery_channel TEXT NOT NULL DEFAULT 'in_app',
                        metadata TEXT,
                        created_at TEXT NOT NULL
                    )
                """)
                # Populate initial official advisory if empty
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM notifications")
                if cursor.fetchone()[0] == 0:
                    now = datetime.now(timezone.utc).isoformat()
                    conn.execute("""
                        INSERT INTO notifications (
                            id, recipient_id, region_slug, title, message,
                            severity, category, source, is_read, delivery_channel, created_at
                        ) VALUES (?, NULL, 'kerala-alappuzha', ?, ?, 'advisory', 'alert', 'NDMA / SACHET', 0, 'in_app', ?)
                    """, (
                        "notif-init-alert-01",
                        "Monsoon Hydrological Preparedness Advisory",
                        "District Administration Alappuzha reminds citizens in low-lying Kuttanad polders to observe designated camp locations and avoid flooded arterial causeways.",
                        now
                    ))
        except Exception as e:
            logger.warning(f"Error initializing notification sqlite storage: {e}")

    def list_notifications(
        self,
        recipient_id: Optional[str] = None,
        region_slug: Optional[str] = None,
        limit: int = 30
    ) -> List[Dict[str, Any]]:
        notifications = []
        try:
            with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                query = "SELECT * FROM notifications WHERE (recipient_id = ? OR recipient_id IS NULL)"
                params = [recipient_id]
                if region_slug and region_slug != "ALL":
                    query += " AND (region_slug = ? OR region_slug IS NULL)"
                    params.append(region_slug)
                query += " ORDER BY created_at DESC LIMIT ?"
                params.append(limit)

                cursor.execute(query, params)
                for row in cursor.fetchall():
                    d = dict(row)
                    d["is_read"] = bool(d["is_read"])
                    notifications.append(d)
        except Exception as e:
            logger.error(f"Error reading notifications: {e}")
        return notifications

    def create_notification(
        self,
        title: str,
        message: str,
        severity: str = "medium",
        category: str = "alert",
        source: str = "FloodGuard Emergency Dispatch",
        region_slug: Optional[str] = None,
        recipient_id: Optional[str] = None,
        delivery_channel: str = "in_app"
    ) -> Dict[str, Any]:
        """Creates and logs a persistent alert/notification."""
        notif_id = f"notif-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
            conn.execute("""
                INSERT INTO notifications (
                    id, recipient_id, region_slug, title, message,
                    severity, category, source, is_read, delivery_channel, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """, (notif_id, recipient_id, region_slug, title, message, severity, category, source, delivery_channel, now_iso))

        database_service.record_audit_event(
            actor_id=recipient_id,
            action="NOTIFICATION_DISPATCHED",
            resource_type="notification",
            resource_id=notif_id,
            details={"title": title, "severity": severity, "category": category}
        )

        return {
            "id": notif_id,
            "title": title,
            "message": message,
            "severity": severity,
            "category": category,
            "source": source,
            "created_at": now_iso
        }

    def mark_as_read(self, notification_id: str) -> bool:
        with sqlite3.connect(str(CITIZEN_DB_PATH)) as conn:
            conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notification_id,))
        return True

notification_service = NotificationService()
