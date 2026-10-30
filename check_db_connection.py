"""Verify the configured PostgreSQL connection with a read-only query."""

import sys

import psycopg
from psycopg.conninfo import make_conninfo

from backend.app.core.config import settings


def build_connection_info() -> str:
    if settings.DATABASE_URL:
        return make_conninfo(settings.DATABASE_URL, sslmode="require")

    required = {
        "DB_HOST": settings.DB_HOST,
        "DB_PORT": settings.DB_PORT,
        "DB_NAME": settings.DB_NAME,
        "DB_USER": settings.DB_USER,
        "DB_PASSWORD": settings.DB_PASSWORD,
    }
    missing = [name for name, value in required.items() if value is None or value == ""]
    if missing:
        raise ValueError("Set DATABASE_URL or provide all of: " + ", ".join(missing))

    return make_conninfo(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        dbname=settings.DB_NAME,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        sslmode="require",
    )


def main() -> int:
    try:
        connection_info = build_connection_info()
    except ValueError as exc:
        print(f"Database configuration error: {exc}", file=sys.stderr)
        return 2
    except psycopg.Error as exc:
        print(f"Invalid database connection settings: {exc}", file=sys.stderr)
        return 2

    try:
        with psycopg.connect(connection_info, connect_timeout=10) as connection:
            result = connection.execute("SELECT 1").fetchone()
    except psycopg.Error as exc:
        print(
            f"Database connection failed ({type(exc).__name__}): {exc}",
            file=sys.stderr,
        )
        return 1

    if result != (1,):
        print(
            "Database check failed: SELECT 1 returned an unexpected result.",
            file=sys.stderr,
        )
        return 1

    print("Database connection successful (SELECT 1 returned 1).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
