"""
Session log service — persists the last 50 analysis results per session to SQLite.
Used for the session history REST endpoint and future replay features.
"""
import json
import logging
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_MAX_PER_SESSION = 50


class SessionLogService:
    def __init__(self, db_path: str = "session_log.db"):
        self._db_path = db_path
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS analysis_log (
                    id       INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    payload  TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_session ON analysis_log(session_id, created_at)"
            )

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def log(self, session_id: str, payload: Dict[str, Any]) -> None:
        """Insert one analysis record, then prune to the last _MAX_PER_SESSION entries."""
        created_at = datetime.now(timezone.utc).isoformat()
        payload_json = json.dumps(payload, default=str)

        with self._lock, self._connect() as conn:
            conn.execute(
                "INSERT INTO analysis_log (session_id, payload, created_at) VALUES (?,?,?)",
                (session_id, payload_json, created_at),
            )
            # Prune: keep only the most recent _MAX_PER_SESSION rows for this session
            conn.execute(
                """
                DELETE FROM analysis_log
                WHERE session_id = ?
                  AND id NOT IN (
                      SELECT id FROM analysis_log
                      WHERE session_id = ?
                      ORDER BY created_at DESC
                      LIMIT ?
                  )
                """,
                (session_id, session_id, _MAX_PER_SESSION),
            )

    def get_session(self, session_id: str) -> List[Dict[str, Any]]:
        """Return up to _MAX_PER_SESSION records for the session, newest first."""
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                """
                SELECT payload, created_at FROM analysis_log
                WHERE session_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (session_id, _MAX_PER_SESSION),
            ).fetchall()

        results = []
        for row in rows:
            try:
                entry = json.loads(row["payload"])
                entry["_logged_at"] = row["created_at"]
                results.append(entry)
            except Exception:
                pass
        return results


# Singleton
session_log = SessionLogService()
