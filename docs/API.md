# API reference (summary)

Base URL: `http://localhost:8000/api` (local)

Interactive docs: http://localhost:8000/docs

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register (`username`, `email`, `password` JSON) |
| POST | `/auth/login` | — | Login (form: `username`, `password`) → JWT |

## Asanas

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/asanas` | — | List; query: `q`, `type`, `category`, `difficulty_level`, `skip`, `limit` |
| GET | `/asanas/top` | — | Top ranked; query: `limit` |
| GET | `/asanas/{id}` | — | Detail |
| POST | `/asanas` | Admin | Create |
| DELETE | `/asanas/{id}` | Admin | Delete |

## Photos

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/photos/by-asana/{asana_id}` | — | List photos for asana |
| GET | `/photos/{id}/file` | — | Serve image file from disk |
| POST | `/photos/upload` | User | Multipart: `asana_id`, `rank`, `file` |
| POST | `/photos/create` | User | JSON metadata record |
| GET | `/photos` | Admin | List all |
| DELETE | `/photos/{id}` | Admin | Delete |

## Transitions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/transitions` | — | List; query: `q`, `skip`, `limit` |
| GET | `/transitions/top` | — | Top 10 |
| GET | `/transitions/{id}` | — | Detail |
| POST | `/transitions` | Admin | Create |
| PUT | `/transitions/{id}` | Admin | Update |
| DELETE | `/transitions/{id}` | Admin | Delete |

## Flows

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/flows` | — | List |
| GET | `/flows/top` | — | Top 10 |
| GET | `/flows/{id}` | — | Detail |
| POST | `/flows` | Admin | Create |
| PUT | `/flows/{id}` | Admin | Update |
| DELETE | `/flows/{id}` | Admin | Delete |

## Ranking

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ranking/rank` | User | Body: `type`, `target_id`, `rank` (1–100) |

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Admin | List users |
| DELETE | `/users/{id}` | Admin | Delete user |

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ "status": "ok" }` (no `/api` prefix) |
