# Yoga DB — Backend

FastAPI + SQLAlchemy + JWT authentication.

## Setup

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix:    source .venv/bin/activate
pip install -r requirements-dev.txt   # runtime + test/lint tools; production installs requirements.txt
cp .env.example .env
```

The defaults load the sample asanas from `../data/asanas/`. Point `ASANAS_CSV_PATH` / `ASANAS_IMAGES_DIR` at your own data if you have it.

## Run

From this directory (`backend/`):

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://localhost:8000/docs

## Database

The API applies migrations on startup and seeds an empty database (asanas from the CSV plus the admin user). To re-import asanas into an existing database, from the repo root:

```bash
python scripts/init_db.py --csv-path "/path/to/yoga_asanas.csv" --images-dir "/path/to/asanas"
```

SQLite file: `backend/yogadb.db` (default).

## Tests

```bash
python -m pytest tests -q
ruff check .
```

## Dependencies

`requirements.in` / `requirements-dev.in` list the direct dependencies; `requirements.txt` / `requirements-dev.txt` are pinned lockfiles generated from them with `uv pip compile` (commands at the top of `requirements.in`).

## Migrations

Schema changes go through Alembic. After changing a model, from `backend/`:

```bash
alembic revision --autogenerate -m "describe the change"   # review the generated file
alembic upgrade head                                      # also runs automatically on API startup
alembic check                                             # CI fails if models and migrations differ
```

The baseline revision (`0001_baseline`) adopts databases created by older versions without changing their tables. If an old database has an `alembic_version` row from the removed migrations, run `alembic stamp --purge head` once.

See [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md).
