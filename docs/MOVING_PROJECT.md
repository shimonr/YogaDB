# Moving or renaming the project

## Checklist

Copy this entire directory tree:

- [ ] `backend/` (source, `requirements.txt`, `alembic/`, tests)
- [ ] `frontend/` (source, `package.json`, `package-lock.json`)
- [ ] `scripts/`
- [ ] `data/` (your asana images and/or metadata)
- [ ] `docs/`
- [ ] `README.md`, `docker-compose.yml`, `.gitignore`

**Optional to copy (can regenerate):**

- `backend/yogadb.db` — SQLite database (or re-run `init_db.py`)
- `backend/.venv/` — recreate with setup script
- `frontend/node_modules/` — recreate with `npm install`
- `frontend/.env`, `backend/.env` — recreate from `.env.example` and update paths

## After moving

1. **Rename** the folder to your new project name (safe — no code references the old name).

2. **Reinstall dependencies:**
   ```powershell
   .\scripts\setup.ps1
   ```

3. **Update `backend/.env`:**
   - `ASANAS_IMAGES_DIR` → new absolute path to image folder
   - `SECRET_KEY` → keep or rotate
   - `CORS_ORIGINS` → unchanged for local dev

4. **Update `frontend/.env`:**
   - `VITE_API_BASE_URL` → unchanged for local dev

5. **Database:**
   - If you copied `backend/yogadb.db` and image paths are still valid → no action
   - If image paths broke (different drive/path) → re-run:
     ```bash
     python scripts/init_db.py --images-dir "<new-absolute-path>"
     ```

6. **Verify:**
   ```bash
   python scripts/check_setup.py
   cd backend && python -m pytest tests -q
   ```

7. **Run:**
   ```bash
   cd backend && python -m uvicorn app.main:app --reload
   cd frontend && npm run dev
   ```

## Path rules

- Application code uses `Path(__file__).resolve()` relative to the repo — **not** the old folder name.
- Photo files are served only if they exist under:
  - `<repo>/data/`, or
  - `ASANAS_IMAGES_DIR` from config
- `init_db.py` stores **absolute** `local_path` values in the database; update `ASANAS_IMAGES_DIR` and re-init if those paths change.
