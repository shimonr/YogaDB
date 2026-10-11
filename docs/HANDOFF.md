# Session handoff — updated 2026-10-11

Previous session: https://ampcode.com/threads/T-01a126c7-3226-76bb-9da0-c62acc7157e3

## Where things stand

- Branch `master`, everything pushed to `origin/master`. Commits from the session, after the orb setup script (`7cae3cf`):

  | Commit | What |
  |--------|------|
  | `e28e667` | Test fix: reset the registration rate limiter between tests |
  | `927bd72` | Backend security/bug fixes, Alembic baseline, pinned deps, ruff |
  | `0ced37d` | Frontend fixes (hook order, 200-item truncation, admin errors), ESLint |
  | `1b2629f` | Render/Docker fixes, sample CSV replaces placeholder images, CI, docs |
  | (latest) | This handoff note |

- Checks at `1b2629f`: 78 backend tests pass, `ruff check` clean, `alembic check` clean, ESLint 0 errors (4 `exhaustive-deps` warnings), `npm run build` OK. Browser-checked admin DB browser, SQL console, flows, games; Docker images built and run together like `docker-compose.yml`.

**Next steps:** confirm the first CI run on GitHub passes (`.github/workflows/ci.yml`), then deploy once the production settings below are in place. Pushing to `master` may already trigger a Render auto-deploy, so check those settings first.

## Production: Oracle VM (default since 2026-10-11)

- Live: https://yogadb.129-159-8-242.sslip.io (Let's Encrypt cert via Caddy). VM `ubuntu@129.159.8.242`: Ubuntu 24.04, ARM64, 4 cores, 23 GB RAM, 96 GB disk.
- Deploy: push to `master`, then `deploy.cmd` (Windows) / `scripts/deploy.sh`; agents use the `deploying-to-oracle` skill. Details: `docs/DEPLOYMENT.md`.
- Server layout: repo at `/opt/apps/yogadb`, secrets (incl. admin password) in `/opt/apps/yogadb/deploy/oracle/.env`, backups in `/opt/backups/yogadb`, shared Caddy proxy (compose project `proxy`, network `web`) for future apps.
- SSH keys authorized on the VM: the user's own key, and `amp-deploy@yogadb`, whose private key exists only in the 2026-10-11 session's orb (`~/.ssh/oracle_deploy`). For agents in new orbs, add an `ORACLE_SSH_PRIVATE_KEY` Amp secret with a key the VM accepts.
- Started fresh from the 10-pose sample CSV; photo uploads go to the VM disk (`yogadb_uploads` volume). Cloudinary/Neon/Render/Vercel remain the documented backup (option 2).
- **Pending:** the real asana list + photos (yoga-image-collector, ~0.16 GB / 1054 files) exist only on the user's PC (`PHOTOS_CSV` / `PHOTOS_DIR` in `deploy/oracle/config.env`). They go live when the user double-clicks `upload-photos.cmd` (packs, uploads to `/opt/apps/yogadb-data/asanas`, redeploys, imports). Tooling is deployed and tested; the upload itself needs the user's PC.

## Before deploying to the free-tier backup

1. Set `ADMIN_PASSWORD` in Render (now in `render.yaml` as `sync: false`). Without it, a fresh production DB gets no admin user.
2. `SECRET_KEY` must be ≥ 32 chars in production or the app refuses to start. Render's `generateValue` should give 44 chars (from docs, not verified).
3. If the production DB ever ran the old Alembic migrations (unlikely — they didn't match the models), run `alembic stamp --purge head` once; otherwise startup fails with "Can't locate revision".

## Decisions made (and why)

- **Alembic:** old migrations 0001–0006 deleted (diverged from the models, never applied the real schema). New `0001_baseline` creates only missing tables, so it adopts databases created by `create_all`. The API runs `upgrade head` on startup (`app/core/migrations.py`). CI runs `alembic check`.
- **Photo paths:** stored relative to `ASANAS_IMAGES_DIR` (imports) or `data/` (uploads); old absolute paths still resolve (`app/services/photo_storage.py`). `local_path` removed from the public photo API.
- **Data:** the 600 images in `data/asanas` were unrelated placeholder photos the importer couldn't match; removed. `data/asanas/yoga_asanas.sample.csv` (10 poses, no images) is the default in `backend/.env.example`, seeded on first startup.
- **Deleting users:** done in app code (rankings + ranking logs deleted, activity logs/photos set to NULL, averages recomputed) instead of a schema change.
- **SQL console:** read-only enforced by the DB (`SET TRANSACTION READ ONLY` on Postgres, `PRAGMA query_only` on SQLite), one statement, `SELECT`/`WITH` only; keyword blocklist removed.
- **SQLite foreign keys** are now enforced (`app/core/database.py`) so local runs match Postgres.
- **Rate limiter:** start commands use `--proxy-headers --forwarded-allow-ips='*'` so it sees real client IPs behind Render/Fly/nginx.
- **Node:** orbs use the preinstalled Node 26 (docs say "Node 20+"); CI uses `.nvmrc` (20).

## Still open (optional)

- Rate limiter is in memory per process.
- 4 ESLint `react-hooks/exhaustive-deps` warnings.
- `scripts/init_db.py` deletes and re-creates imported photo rows on each run, so photo ids change and old photo rankings orphan.
- JWT is kept in `localStorage`; a 401 anywhere hard-redirects to `/auth`.

## Working in an orb

- `.agents/setup` installs everything (uv venv `backend/.venv` with Python 3.12, `npm ci`, `.env` files).
- Run: `amp orb service start yoga-api --command 'cd backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000'` and `amp orb service start yoga-web --command 'cd frontend && npm run dev -- --host 127.0.0.1'`.
- Verify: `cd backend && .venv/bin/python -m pytest tests -q && .venv/bin/ruff check .`; `cd frontend && npm run lint && npm run build`.
- Admin login locally: `shimon` / `adm`.
