# Yoga DB

Full-stack web app for exploring yoga **asanas**, **transitions**, and **flows** with ranking and user contributions.

**Portable:** safe to rename or move this folder. All setup lives inside the repo. See [docs/MOVING_PROJECT.md](docs/MOVING_PROJECT.md).

## Tech stack

| Layer | Stack |
|-------|--------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Alembic, Pydantic, JWT, bcrypt |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios |
| Database | SQLite (local) / PostgreSQL (production) |
| Data | Asana CSV + image folders (a 10-pose sample CSV is included) |

## Quick start

**Prerequisites:** Git, Python 3.11+, Node.js 20+, npm

**One click (Windows):** double-click `run-local.cmd` in the repo root. It pulls the latest code (`git pull --ff-only`), installs dependencies, starts the backend and frontend in their own windows, and opens http://localhost:5173 when both respond. Close the two server windows to stop. Running it again while the servers are up reuses them; the backend reloads code changes on its own.

Or step by step:

```powershell
# From repo root (Windows)
.\scripts\setup.ps1
```

```bash
# macOS / Linux
./scripts/setup.sh
```

1. Optional: point `ASANAS_CSV_PATH` / `ASANAS_IMAGES_DIR` in `backend/.env` at your own asana data (see `data/asanas/README.md`). The defaults load the bundled sample.
2. Backend: `cd backend` → activate venv → `python -m uvicorn app.main:app --reload` (applies migrations and seeds an empty database)
3. Frontend: `cd frontend` → `npm run dev`
4. Open http://localhost:5173 (API docs: http://localhost:8000/docs)

**Verify:** `python scripts/check_setup.py`

**Default admin:** `shimon` / `adm` locally (`ADMIN_PASSWORD`; must be set in production)

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Full dev guide — resume work in a new session |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Oracle VM deploy (default) and free-tier backup |
| [docs/MOVING_PROJECT.md](docs/MOVING_PROJECT.md) | Rename/move checklist |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | All environment variables |
| [docs/API.md](docs/API.md) | API endpoint summary |
| [data/asanas/README.md](data/asanas/README.md) | Asana image folder layout |

## Project structure

```
backend/          FastAPI app, models, routes, tests, Alembic
frontend/         React SPA
scripts/          init_db.py, setup.ps1, setup.sh, check_setup.py
data/             asana images (optional), uploads, metadata examples
docs/             Extended documentation
```

## Requirements files

| File | Purpose |
|------|---------|
| `backend/requirements.txt` | Pinned runtime Python dependencies (generated from `requirements.in`) |
| `backend/requirements-dev.txt` | Pinned runtime + test/lint dependencies (generated from `requirements-dev.in`) |
| `frontend/package.json` | Node dependencies (`npm install`) |
| `frontend/package-lock.json` | Locked npm versions (commit with project) |
| `backend/.env.example` | Backend env template |
| `frontend/.env.example` | Frontend env template |

## Tests

```bash
cd backend && python -m pytest tests -q && ruff check .
cd frontend && npm run lint && npm run build
```

CI (`.github/workflows/ci.yml`) runs these plus `alembic check`.

## Docker (optional)

1. Copy `backend/.env.example` → `backend/.env` (compose overrides the database and data paths)
2. `docker compose up --build`, then open http://localhost:4173

## Deployment

- **Default — Oracle Cloud VM:** commit, push, then double-click `deploy.cmd` (Windows) or run `scripts/deploy.sh`. Live at https://yogadb.129-159-8-242.sslip.io.
- **Backup — free services:** Vercel (frontend) + Render/Fly (backend) + Neon (database) + Cloudinary (photos).

Details in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).
