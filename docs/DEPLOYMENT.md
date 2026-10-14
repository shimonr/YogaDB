# Deployment

| Option | What runs where | Status |
|--------|-----------------|--------|
| **1. Oracle Cloud VM (default)** | Everything in Docker on one VM: Caddy (HTTPS) → nginx + React app → FastAPI → PostgreSQL. Photos on the VM's disk. | Default |
| 2. Free services (backup) | Frontend on Vercel, backend on Render or Fly, PostgreSQL on Neon, photos on Cloudinary | Kept working as a fallback |

## Option 1: Oracle Cloud VM (default)

- Production: https://yogadb.129-159-8-242.sslip.io (sslip.io is a free hostname that resolves to the VM's IP; see "Own domain" below)
- QA copy: https://qa.yogadb.129-159-8-242.sslip.io (own database, same photos, sample transitions/flows/classes)
- VM: `129.159.8.242`, SSH user and paths in [`deploy/oracle/config.env`](../deploy/oracle/config.env)

```
Internet ─80/443─▶ Caddy (shared, /opt/apps/yogadb/deploy/oracle/proxy) ─▶ yogadb-frontend (nginx)
                                                                              ├─ /      React app
                                                                              └─ /api ─▶ backend (FastAPI) ─▶ db (PostgreSQL 16)
```

### Deploy

The server always runs what is pushed to `origin/master`. Commit and push, then:

- **Windows:** double-click `deploy.cmd` (production) or `deploy-qa.cmd` (QA copy) in the repo root; it opens the site when done
- **macOS / Linux / Amp orb:** `scripts/deploy.sh` (production) or `scripts/deploy.sh qa`
- **Amp agents:** the `deploying-to-oracle` skill; at the end of a session the `version-wrap` skill bumps the version, deploys QA and production and verifies the release (`scripts/verify-release.sh`)

Each deploy stamps the version from `VERSION` and the commit into the app; `https://<site>/api/health` shows them, and the deploy scripts fail if the site does not report the expected version.

Both scripts refuse to run when your checkout has unpushed commits. They SSH to the VM and run [`deploy/oracle/server-deploy.sh`](../deploy/oracle/server-deploy.sh), which is safe to rerun and on every deploy:

1. opens ports 80/443 in the VM firewall (Oracle images block them by default)
2. clones or updates the repo in `/opt/apps/yogadb` to `origin/master`
3. creates `/opt/apps/yogadb/deploy/oracle/.env` with random `SECRET_KEY`, `POSTGRES_PASSWORD` and `ADMIN_PASSWORD` on the first run (never overwritten)
4. starts the shared Caddy proxy and rebuilds/restarts the YogaDB containers
5. checks the backend health and HTTPS, then the deploy script checks the public URL

SSH key: the scripts use your default SSH key. To use another key file set `DEPLOY_SSH_KEY=C:\path\to\key` (Windows) or `DEPLOY_SSH_KEY=~/.ssh/key` (bash). In an Amp orb, `scripts/deploy.sh` also accepts the key text in an `ORACLE_SSH_PRIVATE_KEY` secret.

### QA copy

`deploy/oracle/qa.env` overrides the production settings: checkout `/opt/apps/yogadb-qa`, Docker Compose project `yogadb-qa` (separate database and upload volumes), backups in `/opt/backups/yogadb-qa`. Every QA deploy re-imports the asana CSV and photos from `/opt/apps/yogadb-data/asanas` and adds the sample transitions, flows and classes (`python -m app.services.sample_content`). Its admin password is in `/opt/apps/yogadb-qa/deploy/oracle/.env`. Run the browser smoke tests against it with `cd frontend && npx playwright install chromium && npm run e2e`.

### Monitoring and backups off the VM

- `.github/workflows/uptime.yml` checks production every 30 minutes; GitHub emails the repository owner when a run fails.
- `download-backups.cmd` copies `/opt/backups/yogadb` (database dumps and user uploads) to `Documents\YogaDB-backups` on the PC. Run it regularly; the VM holds the only other copy.

### Operate

```bash
ssh ubuntu@129.159.8.242
cd /opt/apps/yogadb/deploy/oracle
sudo docker compose --env-file .env ps                 # status
sudo docker compose --env-file .env logs -f backend    # logs
grep ADMIN_PASSWORD .env                               # admin password for user "shimon"
ls /opt/backups/yogadb                                 # daily database dumps (14 days kept)
```

Restore a dump: `gunzip -c /opt/backups/yogadb/yogadb-DATE.sql.gz | sudo docker compose --env-file .env exec -T db psql -U yogadb yogadb` (into an empty database).

Data lives in Docker volumes `yogadb_pgdata` (database), `yogadb_uploads` (photos users upload) and `proxy_caddy_data` (certificates), plus `/opt/apps/yogadb-data/asanas` (asana CSV and images from your PC, see below). Backups in `/opt/backups/yogadb` hold the daily database dump and the user uploads; the asana images are not backed up there because your PC holds the originals.

### Asana list and photos

The real asana list and photos come from yoga-image-collector on your PC (`PHOTOS_CSV` and `PHOTOS_DIR` in `deploy/oracle/config.env`). To publish them, or after you change them, double-click **`upload-photos.cmd`**. It:

1. packs the CSV and the per-pose image folders on your PC and copies them to the VM
2. replaces `/opt/apps/yogadb-data/asanas` with them (files you deleted are removed on the server too)
3. deploys `origin/master` so the backend reads that folder instead of the repo's 10-pose sample
4. imports the asanas and photos into the database (`python -m app.services.asana_import`); rows are matched by CSV row number, imported photos are replaced, photos uploaded by users are kept

Until the first upload, the server shows the sample (`data/asanas/yoga_asanas.sample.csv`, no images).

### First-time server prerequisites

1. Docker installed (done).
2. Oracle console → Networking → Virtual Cloud Networks → VCN → Security Lists → ingress rules for TCP 80 and 443 from `0.0.0.0/0` (done).
3. Your deploy SSH public key in `~/.ssh/authorized_keys` of the SSH user.

### More apps on the same VM

The Caddy proxy is shared. Another app joins the external `web` Docker network and labels its public container:

```yaml
services:
  web:
    labels:
      caddy: otherapp.129-159-8-242.sslip.io
      caddy.reverse_proxy: "{{upstreams 80}}"
    networks: [web]
networks:
  web:
    external: true
```

Attach only the public container to `web`; keep databases and backends on the app's own network.

### Own domain

Point an `A` record at `129.159.8.242`, change `DOMAIN` in `deploy/oracle/config.env`, push and deploy. Caddy gets the certificate automatically.

### Photos: disk or Cloudinary

Imported photos are served from `/opt/apps/yogadb-data/asanas` and user uploads are stored in the `yogadb_uploads` volume, both on the VM's disk. To use Cloudinary instead, add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to the server's `.env` and pass them to the backend in `deploy/oracle/compose.yml`.

## Option 2: Free services (backup)

| Part | Service | Config |
|------|---------|--------|
| Frontend | Vercel | `frontend/vercel.json`; set `VITE_API_BASE_URL=https://<backend>/api` |
| Backend | Render (`render.yaml`) or Fly (`backend/fly.toml`, `backend/Dockerfile`) | `ENV=production`, `SECRET_KEY`, `ADMIN_PASSWORD`, `DATABASE_URL`, `CORS_ORIGINS`, Cloudinary keys |
| Database | Neon (or Render PostgreSQL) | `DATABASE_URL` |
| Photos | Cloudinary | `CLOUDINARY_*`; `backend/scripts/migrate_to_cloudinary.py` uploads local photos |

Migrations run on backend startup. `backend/scripts/seed_production.py` copies a local SQLite database into PostgreSQL. See [ENVIRONMENT.md](ENVIRONMENT.md) for every variable.
