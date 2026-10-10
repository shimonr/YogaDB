# Development guide

Use this document to resume work after renaming, moving, or cloning the project into a new folder or machine.

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 20+ |
| npm | 9+ |

Optional: Docker Desktop (for `docker compose`).

## Project layout

```
<project-root>/
  backend/           FastAPI app (run uvicorn from here)
  frontend/          React + Vite app
  scripts/           init_db.py, setup helpers
  data/
    asanas/          Example layout + optional metadata (your images can live here or anywhere)
    uploads/         User-uploaded photos (created at runtime)
  docs/              Extended documentation
  docker-compose.yml
  README.md
```

All paths in code are **relative to the repo root** or resolved via environment variables. No hardcoded machine-specific paths are required.

## First-time setup (new location)

### 1. Install dependencies

**Windows (PowerShell, from repo root):**

```powershell
.\scripts\setup.ps1
```

**macOS / Linux:**

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Manual:**

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Unix:    source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env   # or cp on Unix

cd ../frontend
npm install
copy .env.example .env
```

### 2. Configure environment

Edit `backend/.env` (copy from `backend/.env.example`):

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | JWT signing (required in production) |
| `ADMIN_PASSWORD` | Password for the seeded admin (required in production) |
| `DATABASE_URL` | Default `sqlite:///./yogadb.db` (file lives in `backend/`) |
| `CORS_ORIGINS` | Frontend origin, e.g. `http://localhost:5173` |
| `ASANAS_CSV_PATH` | Asana inventory CSV; defaults to the bundled sample |
| `ASANAS_IMAGES_DIR` | Root of the asana image folders; relative paths resolve from `backend/` |

Edit `frontend/.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Default `http://localhost:8000/api` |

See [ENVIRONMENT.md](./ENVIRONMENT.md) for the full list.

### 3. Asana data (optional)

The defaults load `data/asanas/yoga_asanas.sample.csv` (10 poses, no images). To use your own inventory, point `ASANAS_CSV_PATH` at the CSV and `ASANAS_IMAGES_DIR` at the images folder, one subfolder per pose named after its English name (`Mountain_Pose/Mountain_Pose_01.jpg`). See `data/asanas/README.md`.

### 4. Database

The backend applies Alembic migrations on startup and, when there are no users yet, imports the CSV and creates the admin user. To re-import asanas into an existing database, from the **repo root**:

```bash
python scripts/init_db.py --csv-path "C:/path/to/yoga_asanas.csv" --images-dir "C:/path/to/asana_images"
```

Without flags it uses `ASANAS_CSV_PATH` / `ASANAS_IMAGES_DIR` from `backend/.env`.

### 5. Run the stack

**Terminal 1 — backend:**

```bash
cd backend
# activate venv first
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

| URL | Service |
|-----|---------|
| http://localhost:5173 | Frontend |
| http://localhost:8000/docs | API docs |
| http://localhost:8000/health | Health check |

**Default admin:** `shimon` / `adm` (`ADMIN_PASSWORD`)

### 6. Verify setup

```bash
python scripts/check_setup.py
cd backend && python -m pytest tests -q && ruff check .
cd frontend && npm run lint && npm run build
```

## Moving or renaming the project

1. Copy or move the entire project folder (include `backend/`, `frontend/`, `scripts/`, `data/`, `docs/`, lockfiles).
2. Do **not** rely on copied `node_modules/` or `.venv/` — rerun `scripts/setup.ps1` or `setup.sh`.
3. Update `backend/.env` only if `ASANAS_IMAGES_DIR` / `ASANAS_CSV_PATH` are absolute paths that moved.
4. Update `frontend/.env` if API URL changed.
5. Re-run `python scripts/init_db.py` if the DB was not copied (photo paths are stored relative to the images folder, so a copied DB keeps working).
6. Run `python scripts/check_setup.py`.

See [MOVING_PROJECT.md](./MOVING_PROJECT.md) for a checklist.

## What is implemented

- **Backend:** FastAPI, SQLAlchemy, JWT auth, bcrypt, Alembic migrations (applied on startup), SQLite default
- **Models:** Asanas, Users, Transitions, Flows, Classes, Ranking, Photos, ranking and activity logs
- **APIs:** Auth, asanas (search/pagination), transitions, flows, classes, photos (multipart upload + file serve), ranking, admin (users, logs, read-only DB browser and SQL console)
- **Frontend:** Home, Asanas, detail, Transitions, Flows, Classes, Games, Search, About, Auth, Admin panel
- **Data:** Asana CSV + image folders, imported on first startup or via `scripts/init_db.py`

## Common issues

| Problem | Fix |
|---------|-----|
| Photos 404 in browser | Set `ASANAS_IMAGES_DIR` in `backend/.env` to the folder containing the image subfolders; files must be under `data/` or `ASANAS_IMAGES_DIR` |
| Empty asana list | Check `ASANAS_CSV_PATH`, then run `python scripts/init_db.py` (startup only imports into an empty database) |
| CORS errors | Add frontend URL to `CORS_ORIGINS` in `backend/.env` |
| Login fails after move | Re-run `init_db.py` to reset the admin password to `ADMIN_PASSWORD`, or register a new user |
| `429 Too many …` | Login/registration is limited to 5 attempts per IP per 5 minutes; restart the API to reset |

## Next steps (optional enhancements)

- Shared rate-limit store (the limiter is in memory, per process)
