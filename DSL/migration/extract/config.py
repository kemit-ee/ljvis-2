"""Shared, explicit connection settings. No production credentials in defaults."""
import os

import psycopg2


def required(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"Set {name}; see .env.example")
    return value


def connect_target():
    return psycopg2.connect(
        host=required("TARGET_PG_HOST"), port=os.getenv("TARGET_PG_PORT", "5432"),
        dbname=required("TARGET_PG_DB"), user=required("TARGET_PG_USER"),
        password=os.getenv("TARGET_PG_PASSWORD", ""),
        sslmode=os.getenv("TARGET_PG_SSLMODE", "prefer"),
        connect_timeout=int(os.getenv("CONNECT_TIMEOUT", "30")),
        application_name="ljvis-migration", options="-c timezone=Europe/Tallinn",
    )
