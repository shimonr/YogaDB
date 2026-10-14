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
- **Amp agents:** the `deploying-to-oracle` skill; at the end of a session the `version-wrap` skill tries a release candidate on QA, bumps the version, tags, publishes a GitHub release (`scripts/github-release.sh`), deploys QA and production and verifies everything (`scripts/verify-release.sh [qa|prod] [--e2e]`, which also checks backups and the uptime monitor)

Each deploy stamps the version from `VERSION` and the commit into the app; `https://<site>/api/health` shows them, and the deploy scripts fail if the site does not report the expected version.

Both scripts refuse to run when your checkout has unpushed commits. They SSH to the VM and run [`deploy/oracle/server-deploy.sh`](../deploy/oracle/server-deploy.sh), which is safe to rerun and on every deploy:

1. opens ports 80/443 in the VM firewall (Oracle images block them by default)
2. clones or updates the repo in `/opt/apps/yogadb` to `origin/master`
3. creates `/opt/apps/yogadb/deploy/oracle/.env` with random `SECRET_KEY`, `POSTGRES_PASSWORD` and `ADMIN_PASSWORD` on the first run (never overwritten)
4. starts the shared Caddy proxy and rebuilds/restarts the YogaDB containers
5. checks the backend health and HTTPS, then the deploy script checks the public URL

SSH key: the scripts use your default SSH key. To use another key file set `DEPLOY_SSH_KEY=C:\path\to\key` (Windows) or `DEPLOY_SSH_KEY=~/.ssh/key` (bash). In an Amp orb, `scripts/deploy.sh` also accepts the key text in an `ORACLE_SSH_PRIVATE_KEY` secret.

### QA copy

`deploy/oracle/qa.env` overrides the production settings: checkout `/opt/apps/yogadb-qa`, Docker Compose project `yogadb-qa` (separate database and upload volumes), backups in `/opt/backups/yogadb-qa`. Every QA deploy re-imports the asana CSV and photos from `/opt/apps/yogadb-data/asanas` and adds the sample transitions, flows and classes (`python -m app.services.sample_content`). Its admin password is in `/opt/apps/yogadb-qa/deploy/oracle/.env`.

QA extras (`QA_MODE=1`, `MAILPIT=1` in `qa.env`):
- **Reset QA:** Admin → QA Tools → "Reset QA now" deletes every user except the admin, all ratings, logs, uploads, transitions, flows and classes, then re-imports the asanas and adds the sample content again. The endpoint returns 404 on production.
- **Test mailbox:** QA sends all email (password reset links) to Mailpit, whose inbox is https://mail.qa.yogadb.129-159-8-242.sslip.io (user `qa`, password `MAILPIT_PASSWORD` in the QA `.env`). No real email leaves QA.
- **Browser tests:** `cd frontend && npx playwright install chromium && npm run e2e` runs the read-only smoke tests. `E2E_QA_FLOWS=1` adds tests that create data (register, rate, upload, password reset via Mailpit; needs `E2E_MAILPIT_PASSWORD`), and `E2E_QA_RESET=1` adds the reset test. Don't use those two while people are testing QA by hand.

### Monitoring and backups off the VM

- `.github/workflows/uptime.yml` checks production every 30 minutes; GitHub emails the repository owner when a run fails.
- Production's `backup-offsite` container copies each daily backup to Cloudinary as private files (`yogadb-backups/yogadb/`, kept 30 days; files over 10 MB are uploaded as `.partNN` pieces: restore with `cat file.part* > file`). Copying pauses once the backup account uses `OFFSITE_MAX_USAGE_PERCENT` (80) of its monthly Cloudinary credits. It uses `BACKUP_CLOUDINARY_*` in the server `.env`, separate from the photo settings, so the app keeps storing photos on the VM. Without those variables it idles.
- `download-backups.cmd` copies `/opt/backups/yogadb` (database dumps and user uploads) to `Documents\YogaDB-backups` on the PC.

### Email (password reset)

"Forgot password?" emails a one-hour reset link when SMTP is configured. Production has no email provider yet: requests appear in Admin → Overview → "Password reset requests", where the admin creates a 24-hour link and sends it by hand ("Reset link" also works for any user). To turn on email:

1. Create a free SMTP account. Brevo (300 emails a day, verify one sender address, no domain needed) or a Gmail app password both work.
2. Put `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` (the verified sender) in your shell or Amp project secrets and copy them to the server without printing them: `scripts/set-server-env.sh prod SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM`. Or edit `/opt/apps/yogadb/deploy/oracle/.env` by hand.
3. Redeploy (`scripts/deploy.sh`), then press Admin → Overview → "Send me a test email".

### Upload limits

Uploads are capped so the site stays inside the free tier: each photo at most `UPLOAD_MAX_FILE_MB` (10), all uploaded photos at most `UPLOADS_MAX_TOTAL_MB` (20 GB), and at least `MIN_FREE_DISK_MB` (5 GB) left on the disk. With Cloudinary photo storage, uploads stop at `CLOUDINARY_MAX_USAGE_PERCENT` (80) of the monthly credits. Admin → Overview → "Photo storage" shows usage against the limits; change them in the server `.env` (`scripts/set-server-env.sh`) and redeploy.

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
