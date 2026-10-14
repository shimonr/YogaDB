# YogaDB

FastAPI + SQLAlchemy backend (`backend/`), React + Vite + TypeScript frontend (`frontend/`). Owner works on Windows; agents usually work in Amp orbs (`.agents/setup` installs everything).

## Build and test

- Backend: `cd backend && .venv/bin/python -m pytest tests -q && .venv/bin/ruff check .` (tests use SQLite with foreign keys on)
- Frontend: `cd frontend && npm run lint && npm run build`
- Schema changes: add an Alembic migration (`alembic revision --autogenerate`); CI runs `alembic check`. The API runs migrations on startup.
- Python deps: edit `backend/requirements*.in`, regenerate the pinned `.txt` files with the `uv pip compile` commands at the top of `requirements.in`.
- CI (`.github/workflows/ci.yml`) runs all of the above on every push to `master`.

## Deploy

- Production is the Oracle VM: https://yogadb.129-159-8-242.sslip.io. It runs what is pushed to `origin/master`; deploy with the `deploying-to-oracle` skill (`scripts/deploy.sh`). Details: `docs/DEPLOYMENT.md`.
- Free services (Vercel/Render/Neon/Cloudinary) are the documented backup only.
- Never print server secrets (`/opt/apps/yogadb/deploy/oracle/.env`).

## Data

- The asana list comes from a CSV (row number = asana id) and per-pose image folders named after the English name (`Mountain_Pose/`). The owner's originals live on his PC (yoga-image-collector) and are published with `upload-photos.cmd`; on the VM they are in `/opt/apps/yogadb-data/asanas`.
- `python -m app.services.asana_import` (in `backend/` or the backend container) re-imports the CSV and photos; it replaces imported photos and keeps user uploads.
- Photo paths in the database are relative to the images folder or `data/`.

## Session history

`docs/HANDOFF.md` records the current state, decisions and open items. Update it at the end of a working session.
