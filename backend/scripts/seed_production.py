"""Seed production PostgreSQL from local SQLite database.

Usage:
    python scripts/seed_production.py

Requires DATABASE_URL env var pointing to PostgreSQL (Neon).
Reads local SQLite at yogadb.db and copies all data.
"""
import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Asana, Flow, Photo, Ranking, Transition, User

SQLITE_PATH = Path(__file__).resolve().parent.parent / "yogadb.db"


def export_sqlite(db_path: Path) -> dict[str, list[dict]]:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    data = {}
    for table in ["asanas", "users", "photos", "transitions", "ranking", "flows"]:
        c.execute(f"SELECT * FROM {table}")
        data[table] = [dict(row) for row in c.fetchall()]
        print(f"  Exported {len(data[table])} rows from {table}")

    conn.close()
    return data


MODEL_MAP = {
    "asanas": Asana,
    "users": User,
    "photos": Photo,
    "transitions": Transition,
    "ranking": Ranking,
    "flows": Flow,
}

SKIP_COLUMNS: set = set()  # Keep all columns including id


def import_to_postgres(data: dict[str, list[dict]], engine) -> None:
    with Session(engine) as session:
        for table, rows in data.items():
            model = MODEL_MAP[table]
            if not rows:
                print(f"  Skipping {table} (empty)")
                continue

            count = 0
            for row in rows:
                filtered = {k: v for k, v in row.items() if k not in SKIP_COLUMNS}
                obj = model(**filtered)
                session.add(obj)
                count += 1

            session.flush()
            print(f"  Imported {count} rows into {table}")

        session.commit()
        print("\nAll data committed.")


def reset_sequences(engine, data: dict[str, list[dict]]) -> None:
    with Session(engine) as session:
        for table, rows in data.items():
            if not rows:
                continue
            max_id = max(r["id"] for r in rows)
            seq_name = f"{table}_id_seq"
            session.execute(text(f"SELECT setval('{seq_name}', {max_id})"))
        session.commit()
        print("Sequences reset.")


def main():
    settings = get_settings()
    db_url = os.environ.get("DATABASE_URL", settings.database_url)

    if not db_url or "sqlite" in db_url:
        print("ERROR: Set DATABASE_URL to a PostgreSQL connection string.")
        print("  Example: DATABASE_URL=postgresql://user:pass@host/dbname python scripts/seed_production.py")
        sys.exit(1)

    if not SQLITE_PATH.is_file():
        print(f"ERROR: SQLite database not found at {SQLITE_PATH}")
        sys.exit(1)

    print(f"SQLite: {SQLITE_PATH}")
    print(f"PostgreSQL: {db_url[:40]}...")
    print()

    print("Step 1: Exporting from SQLite...")
    data = export_sqlite(SQLITE_PATH)
    print()

    print("Step 2: Resetting tables in PostgreSQL...")
    engine = create_engine(db_url)
    from app.core.database import Base
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for table in ["ranking", "flows", "photos", "transitions", "asanas", "users"]:
            conn.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
        conn.commit()
    print("  Tables truncated.")
    print()

    print("Step 3: Importing data...")
    import_to_postgres(data, engine)
    print()

    print("Step 4: Resetting sequences...")
    reset_sequences(engine, data)
    print()

    print("Done! Production database seeded.")
    engine.dispose()


if __name__ == "__main__":
    main()
