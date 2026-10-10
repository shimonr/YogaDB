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
