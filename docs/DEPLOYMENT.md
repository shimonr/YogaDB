# Deployment

| Option | What runs where | Status |
|--------|-----------------|--------|
| **1. Oracle Cloud VM (default)** | Everything in Docker on one VM: Caddy (HTTPS) → nginx + React app → FastAPI → PostgreSQL. Photos on the VM's disk. | Default |
| 2. Free services (backup) | Frontend on Vercel, backend on Render or Fly, PostgreSQL on Neon, photos on Cloudinary | Kept working as a fallback |

## Option 1: Oracle Cloud VM (default)

- URL: https://yogadb.129-159-8-242.sslip.io (sslip.io is a free hostname that resolves to the VM's IP; see "Own domain" below)
- VM: `129.159.8.242`, SSH user and paths in [`deploy/oracle/config.env`](../deploy/oracle/config.env)

```
Internet ─80/443─▶ Caddy (shared, /opt/apps/yogadb/deploy/oracle/proxy) ─▶ yogadb-frontend (nginx)
                                                                              ├─ /      React app
                                                                              └─ /api ─▶ backend (FastAPI) ─▶ db (PostgreSQL 16)
```

### Deploy

The server always runs what is pushed to `origin/master`. Commit and push, then:

- **Windows:** double-click `deploy.cmd` in the repo root (opens the site when done)
- **macOS / Linux / Amp orb:** `scripts/deploy.sh`
- **Amp agents:** the `deploying-to-oracle` skill (`.agents/skills/deploying-to-oracle`)

Both scripts refuse to run when your checkout has unpushed commits. They SSH to the VM and run [`deploy/oracle/server-deploy.sh`](../deploy/oracle/server-deploy.sh), which is safe to rerun and on every deploy:

1. opens ports 80/443 in the VM firewall (Oracle images block them by default)
2. clones or updates the repo in `/opt/apps/yogadb` to `origin/master`
3. creates `/opt/apps/yogadb/deploy/oracle/.env` with random `SECRET_KEY`, `POSTGRES_PASSWORD` and `ADMIN_PASSWORD` on the first run (never overwritten)
4. starts the shared Caddy proxy and rebuilds/restarts the YogaDB containers
5. checks the backend health and HTTPS, then the deploy script checks the public URL

SSH key: the scripts use your default SSH key. To use another key file set `DEPLOY_SSH_KEY=C:\path\to\key` (Windows) or `DEPLOY_SSH_KEY=~/.ssh/key` (bash). In an Amp orb, `scripts/deploy.sh` also accepts the key text in an `ORACLE_SSH_PRIVATE_KEY` secret.

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

Data lives in Docker volumes `yogadb_pgdata` (database), `yogadb_uploads` (photo uploads) and `proxy_caddy_data` (certificates). The seed data is `data/asanas/yoga_asanas.sample.csv` (10 poses, no images), imported once when the database is empty.

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

Uploads are stored on the VM (`yogadb_uploads` volume). To use Cloudinary instead, add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to the server's `.env` and pass them to the backend in `deploy/oracle/compose.yml`.

## Option 2: Free services (backup)

| Part | Service | Config |
|------|---------|--------|
| Frontend | Vercel | `frontend/vercel.json`; set `VITE_API_BASE_URL=https://<backend>/api` |
| Backend | Render (`render.yaml`) or Fly (`backend/fly.toml`, `backend/Dockerfile`) | `ENV=production`, `SECRET_KEY`, `ADMIN_PASSWORD`, `DATABASE_URL`, `CORS_ORIGINS`, Cloudinary keys |
| Database | Neon (or Render PostgreSQL) | `DATABASE_URL` |
| Photos | Cloudinary | `CLOUDINARY_*`; `backend/scripts/migrate_to_cloudinary.py` uploads local photos |

Migrations run on backend startup. `backend/scripts/seed_production.py` copies a local SQLite database into PostgreSQL. See [ENVIRONMENT.md](ENVIRONMENT.md) for every variable.
