# Environment variables

## Backend (`backend/.env`)

Copy from `backend/.env.example`. Relative paths are resolved from `backend/`, so the defaults keep working after the project moves.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_NAME` | No | `Yoga DB API` | API title in OpenAPI |
| `ENV` | No | `development` | `production` turns on the checks below and HSTS |
| `DEBUG` | No | `false` | FastAPI debug mode; returns tracebacks in error responses |
| `SECRET_KEY` | **Yes (prod)** | random per process in development | JWT signing secret; at least 32 random characters in production (`openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | **Yes (prod)** | `adm` | Password for the seeded admin user `shimon`; production refuses to seed with the default |
| `ADMIN_EMAIL` | No | `shimon@example.com` | Email of the seeded admin user (change it later on the Account page) |
| `APP_VERSION` / `APP_COMMIT` | No | `VERSION` file / empty | Reported at `/api/health`; deploys set them |
| `PUBLIC_URL` | No | `http://localhost:5173` | Site address used in emailed links (deploys set `https://<DOMAIN>`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_TLS` | No | empty, 587, empty, empty, `YogaDB <no-reply@yogadb.local>`, true | Outgoing email for password reset links; without `SMTP_HOST` admins create reset links in the admin panel |
| `QA_MODE` | No | `false` | QA copy only: enables Admin → QA Tools → reset |
| `UPLOAD_MAX_FILE_MB` | No | `10` | Largest photo a user can upload (413 above it). nginx allows 12 MB per request; raise `client_max_body_size` in `frontend/nginx.conf` too if you raise this |
| `UPLOADS_MAX_TOTAL_MB` | No | `20480` | Uploads stop (507) once photos stored on the server reach this total |
| `MIN_FREE_DISK_MB` | No | `5120` | Uploads stop (507) when the server disk has less free space than this |
| `CLOUDINARY_MAX_USAGE_PERCENT` | No | `80` | With Cloudinary photo storage: uploads stop at this share of the plan's monthly credits |
| `OFFSITE_MAX_USAGE_PERCENT` | No | `80` | Server only: off-site backup copies pause at this share of the backup account's Cloudinary credits |
| `BACKUP_CLOUDINARY_CLOUD_NAME`, `..._API_KEY`, `..._API_SECRET` | No | empty | Server only: off-site copies of the daily backups (backup-offsite container) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` (`.env.example`: `1440`) | JWT lifetime |
| `DATABASE_URL` | No | `sqlite:///./yogadb.db` | SQLAlchemy URL; the SQLite file is relative to the process cwd (`backend/`) |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed origins |
| `ASANAS_CSV_PATH` | No | — | Asana inventory CSV; `.env.example` points at `../data/asanas/yoga_asanas.sample.csv` |
| `ASANAS_IMAGES_DIR` | No | — | Root folder of per-asana image subfolders (see [data/asanas/README.md](../data/asanas/README.md)) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | No | — | Store uploads in Cloudinary instead of `data/uploads/` |

On startup the API applies database migrations and, if the database has no users, imports the CSV (with photos from `ASANAS_IMAGES_DIR`) and creates the admin user.

### `ASANAS_IMAGES_DIR` examples

```
ASANAS_IMAGES_DIR=../data/asanas                      # inside the repo (default)
ASANAS_IMAGES_DIR=C:/Users/you/yoga-image-collector/asana_images
ASANAS_IMAGES_DIR=/home/you/yoga-image-collector/asana_images
```

## Frontend (`frontend/.env`)

Copy from `frontend/.env.example`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `http://localhost:8000/api` | Backend API base (include `/api`); read at **build** time |

Production example:

```
VITE_API_BASE_URL=https://api.example.com/api
```

## Init script (`scripts/init_db.py`)

| Variable / flag | Description |
|-----------------|-------------|
| `--csv-path PATH` | Asana inventory CSV; defaults to `ASANAS_CSV_PATH` |
| `--images-dir PATH` | Root folder of asana subfolders; defaults to `ASANAS_IMAGES_DIR` |
| `DATABASE_URL` | Set automatically to `backend/yogadb.db` if unset |
| `ADMIN_PASSWORD` | Password set for the admin user |

## Docker Compose

`docker-compose.yml` sets `DATABASE_URL`, `ASANAS_IMAGES_DIR`, `ASANAS_CSV_PATH` and `CORS_ORIGINS` for the containers and mounts `./data` at `/data`; other values come from `backend/.env`. The frontend is built with `VITE_API_BASE_URL=/api` and nginx proxies `/api` to the backend.
