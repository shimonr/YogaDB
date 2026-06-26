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
pip install -r requirements.txt
copy .env.example .env   # or cp on Unix

cd ../frontend
npm install
copy .env.example .env
```

### 2. Configure environment

Edit `backend/.env` (copy from `backend/.env.example`):

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | JWT signing (change in production) |
| `DATABASE_URL` | Default `sqlite:///./yogadb.db` (file lives in `backend/`) |
| `CORS_ORIGINS` | Frontend origin, e.g. `http://localhost:5173` |
| `ASANAS_IMAGES_DIR` | **Required for photo serving.** Absolute path to your asana image folders |

Edit `frontend/.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Default `http://localhost:8000/api` |

See [ENVIRONMENT.md](./ENVIRONMENT.md) for the full list.

### 3. Add asana images

Folder layout (see `data/asanas/README.md`):

```
<ASANAS_IMAGES_DIR>/
  1-mountain-pose/
    1-mountain-pose-1.jpg
    1-mountain-pose-2.jpg
  2-downward-dog/
    ...
```

Subfolder names: `<id>-<slug>` (e.g. `42-warrior-ii`).

Optional metadata: `asanas.json` in that folder or `data/asanas/asanas.json` (see `data/asanas/asanas.metadata.example.json`).

### 4. Initialize database

From **repo root** (not `backend/`):

```bash
python scripts/init_db.py --images-dir "C:/full/path/to/your/asanas"
```

Or, if `ASANAS_IMAGES_DIR` is already set in `backend/.env`:

```bash
python scripts/init_db.py
```

Creates `backend/yogadb.db` with asanas, photos, and admin user.

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

**Default admin:** `shimon` / `adm`

### 6. Verify setup

```bash
python scripts/check_setup.py
cd backend && python -m pytest tests -q
```

## Moving or renaming the project

1. Copy or move the entire project folder (include `backend/`, `frontend/`, `scripts/`, `data/`, `docs/`, lockfiles).
2. Do **not** rely on copied `node_modules/` or `.venv/` — rerun `scripts/setup.ps1` or `setup.sh`.
3. Update `backend/.env`:
   - Set `ASANAS_IMAGES_DIR` to the **new absolute path** to your images folder.
4. Update `frontend/.env` if API URL changed.
5. Re-run `python scripts/init_db.py --images-dir "<new-path>"` if the DB was not copied or paths in `photos.local_path` no longer exist.
6. Run `python scripts/check_setup.py`.

See [MOVING_PROJECT.md](./MOVING_PROJECT.md) for a checklist.

## What is implemented

- **Backend:** FastAPI, SQLAlchemy, JWT auth, bcrypt, Alembic scaffold, SQLite default
- **Models:** Asanas, Users, Transitions, Flows, Ranking, Photos
- **APIs:** Auth, asanas (search/pagination), transitions, flows, photos (multipart upload + file serve), ranking, admin users
- **Frontend:** Home, Asanas, detail, Transitions, Flows, Search, About, Auth, Admin panel
- **Data:** Loaded from local image folders via `scripts/init_db.py` (no remote fetch script)

## Common issues

| Problem | Fix |
|---------|-----|
| Photos 403/404 in browser | Set `ASANAS_IMAGES_DIR` in `backend/.env` to the folder containing image files; paths must stay under `data/` or `ASANAS_IMAGES_DIR` |
| Empty asana list | Run `init_db.py` with a valid `--images-dir` containing `<id>-<slug>/` subfolders |
| CORS errors | Add frontend URL to `CORS_ORIGINS` in `backend/.env` |
| Login fails after move | Re-run `init_db.py` to reset admin password, or register a new user |

## Next steps (optional enhancements)

- Alembic migrations workflow (`alembic upgrade head`)
- Postgres in production (Neon/Supabase) + update `DATABASE_URL`
- Rate limiting middleware
- Frontend photo upload UI on asana detail page
- CI workflow (pytest + `npm run build`)
