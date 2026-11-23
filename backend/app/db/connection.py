"""Database connection manager for AUREN SOLIAN.

Supports dual-engine architecture:
- SQLite: For local development, isolated testing, and fallback.
- PostgreSQL / Supabase: For production multi-tenant persistent storage.
"""
import logging
import os
import sqlite3
import time
from contextlib import contextmanager
from typing import Generator, Any, Dict, Optional

from app.core.config import settings

logger = logging.getLogger("auren.db.connection")

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False


class DatabaseManager:
    """Manages database connection lifecycle, pooling, and health checks."""

    def __init__(self, database_url: Optional[str] = None, database_path: Optional[str] = None):
        self._custom_url = database_url
        self._custom_path = database_path

    @property
    def database_url(self) -> Optional[str]:
        return self._custom_url or settings.DATABASE_URL

    @property
    def database_path(self) -> str:
        return self._custom_path or settings.DATABASE_PATH

    @property
    def dialect(self) -> str:
        """Returns detected dialect: 'postgres' or 'sqlite'."""
        url = self.database_url
        if url:
            url_lower = url.lower()
            if url_lower.startswith("postgres://") or url_lower.startswith("postgresql://"):
                return "postgres"
        return "sqlite"

    def get_sqlite_connection(self) -> sqlite3.Connection:
        """Returns a properly configured SQLite connection with WAL mode and foreign keys enabled."""
        conn = sqlite3.connect(self.database_path, timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def get_postgres_connection(self):
        """Returns a PostgreSQL connection using psycopg2."""
        if not POSTGRES_AVAILABLE:
            raise RuntimeError(
                "psycopg2 is not installed. Please install psycopg2-binary to connect to PostgreSQL."
            )
        if not self.database_url:
            raise ValueError("DATABASE_URL is required to establish a PostgreSQL connection.")
        return psycopg2.connect(self.database_url, cursor_factory=RealDictCursor)

    @contextmanager
    def connection(self) -> Generator[Any, None, None]:
        """Context manager yielding an active database connection and managing cleanup."""
        if self.dialect == "postgres":
            conn = self.get_postgres_connection()
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()
        else:
            conn = self.get_sqlite_connection()
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

    def check_connection(self) -> Dict[str, Any]:
        """
        Executes a diagnostic query (SELECT 1) to test database connectivity and measure latency.
        """
        start_time = time.perf_counter()
        dialect = self.dialect
        try:
            with self.connection() as conn:
                cur = conn.cursor()
                cur.execute("SELECT 1 as ping;")
                res = cur.fetchone()
                # Handle tuple vs dict/Row result
                ping_val = res["ping"] if isinstance(res, (sqlite3.Row, dict)) else res[0]
                latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

                target_desc = (
                    f"PostgreSQL ({self.database_url.split('@')[-1] if self.database_url and '@' in self.database_url else 'configured'})"
                    if dialect == "postgres"
                    else f"SQLite ({os.path.abspath(self.database_path)})"
                )

                return {
                    "status": "connected",
                    "dialect": dialect,
                    "target": target_desc,
                    "latency_ms": latency_ms,
                    "ping": ping_val,
                }
        except Exception as e:
            latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
            logger.error(f"Database health check failed for {dialect}: {e}")
            return {
                "status": "error",
                "dialect": dialect,
                "latency_ms": latency_ms,
                "error": str(e),
            }


db_manager = DatabaseManager()

