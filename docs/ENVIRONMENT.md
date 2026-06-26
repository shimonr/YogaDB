# Environment variables

## Backend (`backend/.env`)

Copy from `backend/.env.example`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_NAME` | No | `Yoga DB API` | API title in OpenAPI |
| `ENV` | No | `development` | Environment label |
| `DEBUG` | No | `true` | FastAPI debug mode |
| `SECRET_KEY` | **Yes (prod)** | `change-me-in-production` | JWT signing secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT lifetime |
| `DATABASE_URL` | No | `sqlite:///./yogadb.db` | SQLAlchemy URL; DB file is relative to `backend/` cwd |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed origins |
| `ASANAS_IMAGES_DIR` | **Yes** | — | Absolute path to root folder of asana image subfolders |

### `ASANAS_IMAGES_DIR` examples

Windows:

```
ASANAS_IMAGES_DIR=C:/Users/you/projects/yoga-images
```

macOS / Linux:

```
ASANAS_IMAGES_DIR=/home/you/yoga-images
```

Can also point at `data/asanas` inside the repo if images live there.

## Frontend (`frontend/.env`)

Copy from `frontend/.env.example`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `http://localhost:8000/api` | Backend API base (include `/api`) |

Production example:

```
VITE_API_BASE_URL=https://api.example.com/api
```

## Init script (`scripts/init_db.py`)

| Variable / flag | Description |
|-----------------|-------------|
| `--images-dir PATH` | Root folder of asana subfolders |
| `ASANAS_IMAGES_DIR` | Same as above; used if `--images-dir` omitted |
| `DATABASE_URL` | Set automatically to `backend/yogadb.db` if unset |

## Docker Compose

Set variables in `backend/.env` before `docker compose up`. For containers, prefer:

```
ASANAS_IMAGES_DIR=/data/asanas
```

with the compose volume `./data:/data`.
