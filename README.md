# Yoga DB

Full-stack web app for exploring yoga **asanas**, **transitions**, and **flows** with ranking and user contributions.

**Portable:** safe to rename or move this folder. All setup lives inside the repo. See [docs/MOVING_PROJECT.md](docs/MOVING_PROJECT.md).

## Tech stack

| Layer | Stack |
|-------|--------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Alembic, Pydantic, JWT, bcrypt |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios |
| Database | SQLite (local) / PostgreSQL (production) |
| Data | Local image folders (you provide paths) |

## Quick start

**Prerequisites:** Python 3.11+, Node.js 20+, npm

```powershell
# From repo root (Windows)
.\scripts\setup.ps1
```

```bash
# macOS / Linux
./scripts/setup.sh
```

1. Edit `backend/.env` — set `ASANAS_IMAGES_DIR` to your asana images folder (see `data/asanas/README.md`).
2. Load database: `python scripts/init_db.py --images-dir "C:/path/to/your/asanas"`
3. Backend: `cd backend` → activate venv → `python -m uvicorn app.main:app --reload`
4. Frontend: `cd frontend` → `npm run dev`
5. Open http://localhost:5173 (API docs: http://localhost:8000/docs)

**Verify:** `python scripts/check_setup.py`

**Default admin:** `shimon` / `adm`

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Full dev guide — resume work in a new session |
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
| `backend/requirements.txt` | Python dependencies (`pip install -r`) |
| `frontend/package.json` | Node dependencies (`npm install`) |
| `frontend/package-lock.json` | Locked npm versions (commit with project) |
| `backend/.env.example` | Backend env template |
| `frontend/.env.example` | Frontend env template |

## Tests

```bash
cd backend
python -m pytest tests -q
```

## Docker (optional)

1. Copy `backend/.env.example` → `backend/.env` and set `ASANAS_IMAGES_DIR=/data/asanas`
2. `docker compose up --build`

## Deployment (free tier)

- **Backend:** Render / Railway — `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Frontend:** Vercel / Netlify — build `frontend/`, set `VITE_API_BASE_URL`
- **Database:** Neon / Supabase — set `DATABASE_URL`, run `init_db.py` with image volume mounted

Details in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).
