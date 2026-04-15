import sqlite3
import json
import os
import config


class LocalBuffer:
    """SQLite-based local buffer for offline data storage."""

    def __init__(self, db_path=None):
        self.db_path = db_path or config.LOCAL_BUFFER_DB
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS buffered_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                attempts INT DEFAULT 0
            )
        """)
        conn.commit()
        conn.close()

    def add(self, endpoint, payload):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT INTO buffered_data (endpoint, payload) VALUES (?, ?)",
            (endpoint, json.dumps(payload))
        )
        conn.commit()
        conn.close()

    def get_pending(self, limit=50):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "SELECT id, endpoint, payload FROM buffered_data ORDER BY id ASC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        conn.close()
        return [(r[0], r[1], json.loads(r[2])) for r in rows]

    def remove(self, record_id):
        conn = sqlite3.connect(self.db_path)
        conn.execute("DELETE FROM buffered_data WHERE id = ?", (record_id,))
        conn.commit()
        conn.close()

    def increment_attempts(self, record_id):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "UPDATE buffered_data SET attempts = attempts + 1 WHERE id = ?",
            (record_id,)
        )
        conn.commit()
        conn.close()

    def count(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute("SELECT COUNT(*) FROM buffered_data")
        count = cursor.fetchone()[0]
        conn.close()
        return count

    def cleanup_old(self, max_age_hours=48):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "DELETE FROM buffered_data WHERE created_at < datetime('now', ?)",
            (f'-{max_age_hours} hours',)
        )
        conn.commit()
        conn.close()
