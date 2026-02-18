import sqlite3
import json
import hashlib
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict

from app.config import settings


class SQLiteCacheService:
    def __init__(self, db_path: str = None, ttl_hours: int = None):
        self.db_path = db_path or settings.PRICING_CACHE_DB
        self.ttl = timedelta(hours=ttl_hours or settings.PRICING_CACHE_TTL_HOURS)
        self._lock = threading.Lock()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        with self._lock:
            conn = self._get_conn()
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pricing_cache (
                    cache_key TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    query TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.commit()
            conn.close()

    def _make_key(self, card_info: Dict) -> str:
        """Stable MD5 hash of the fields relevant to pricing."""
        relevant = {k: card_info.get(k, "") for k in
                    ["player_name", "year", "set_name", "grade", "card_number"]}
        return hashlib.md5(json.dumps(relevant, sort_keys=True).encode()).hexdigest()

    def get(self, card_info: Dict) -> Optional[Dict]:
        key = self._make_key(card_info)
        with self._lock:
            conn = self._get_conn()
            row = conn.execute(
                "SELECT data, created_at FROM pricing_cache WHERE cache_key = ?", (key,)
            ).fetchone()
            conn.close()
        if not row:
            return None
        created = datetime.fromisoformat(row[1])
        if datetime.now() - created > self.ttl:
            return None
        return json.loads(row[0])

    def set(self, card_info: Dict, data: Dict, query: str = ""):
        key = self._make_key(card_info)
        with self._lock:
            conn = self._get_conn()
            conn.execute(
                "INSERT OR REPLACE INTO pricing_cache VALUES (?, ?, ?, ?)",
                (key, json.dumps(data), query, datetime.now().isoformat())
            )
            conn.commit()
            conn.close()

    def purge_expired(self):
        cutoff = (datetime.now() - self.ttl).isoformat()
        with self._lock:
            conn = self._get_conn()
            conn.execute("DELETE FROM pricing_cache WHERE created_at < ?", (cutoff,))
            conn.commit()
            conn.close()


cache_service = SQLiteCacheService()
