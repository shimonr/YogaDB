# Yoga DB — Backend

FastAPI + SQLAlchemy + JWT authentication.

## Setup

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix:    source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` — especially `ASANAS_IMAGES_DIR`.

## Run

From this directory (`backend/`):

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://localhost:8000/docs

## Database

Schema + seed data from repo root:

```bash
python scripts/init_db.py --images-dir "/absolute/path/to/asanas"
```

SQLite file: `backend/yogadb.db` (default).

## Tests

```bash
python -m pytest tests -q
```

## Migrations

Alembic is configured (`alembic.ini`). Initial revision: `alembic/versions/0001_initial_schema.py`.

See [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md).
