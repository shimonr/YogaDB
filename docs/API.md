# API reference (summary)

Base URL: `http://localhost:8000/api` (local)

Interactive docs: http://localhost:8000/docs

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register (`username`, `email`, `password` JSON; password 8–72 bytes) |
| POST | `/auth/login` | — | Login (form: `username`, `password`) → JWT. 5 failed attempts per IP + username in 5 minutes → 429 |
| GET | `/auth/me` | User | Current user |
| PUT | `/auth/me` | User | Change email (`email`) |
| POST | `/auth/me/password` | User | Change password (`current_password`, `new_password`) → 204 |
| POST | `/auth/forgot-password` | — | `email` → 202, same answer whether or not the email exists; emails a 1-hour link if SMTP is set |
| POST | `/auth/reset-password` | — | `token`, `new_password` → 204; tokens are one-time |

## Asanas

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/asanas` | — | List; query: `q`, `type`, `category`, `difficulty_level`, `skip`, `limit` |
| GET | `/asanas/top` | — | Top ranked; query: `limit` |
| GET | `/asanas/{id}` | — | Detail |
| POST | `/asanas` | Admin | Create |
| PUT | `/asanas/{id}` | Admin | Update |
| DELETE | `/asanas/{id}` | Admin | Delete |

List endpoints return at most `limit` (≤ 200) items; page with `skip`.

## Photos

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/photos/by-asana/{asana_id}` | — | List photos for asana |
| GET | `/photos/{id}/file` | — | Serve the image; `?w=600` returns a WebP copy at most 600 px wide (GIFs and small images unchanged) |
| POST | `/photos/upload` | User | Multipart: `asana_id`, `rank` (1–100), `file` (jpg/png/webp, ≤ `UPLOAD_MAX_FILE_MB`, default 10 MB). 413 when the file is too large; 507 when the storage limit, free disk minimum or Cloudinary credit limit is reached |
| POST | `/photos/create` | Admin | JSON: `type`, `asana_id`, `local_path` (http(s) URL or a file under `data/` / `ASANAS_IMAGES_DIR`), `original_url`, `rank` |
| GET | `/photos` | Admin | List all; query: `asana_id`, `skip`, `limit` |
| DELETE | `/photos/{id}` | Admin | Delete the record; uploaded files are deleted too, imported source images are kept |

## Transitions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/transitions` | — | List; query: `q`, `skip`, `limit` |
| GET | `/transitions/top` | — | Top 10 |
| GET | `/transitions/{id}` | — | Detail |
| POST | `/transitions` | Admin | Create (start and end asanas must exist and differ) |
| PUT | `/transitions/{id}` | Admin | Update |
| DELETE | `/transitions/{id}` | Admin | Delete |

## Flows

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/flows` | — | List; query: `q`, `skip`, `limit` |
| GET | `/flows/top` | — | Top 10 |
| GET | `/flows/{id}` | — | Detail |
| POST | `/flows` | Admin | Create (all `transition_ids` must exist) |
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
| DELETE | `/users/{id}` | Admin | Delete another user; their rankings are removed and averages recomputed |

## Classes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/classes` | — | List; query: `skip`, `limit` |
| GET | `/classes/top` | — | Top 10 |
| GET | `/classes/{id}` | — | Detail |
| POST | `/classes` | Admin | Create (all `flow_ids` must exist) |
| PUT | `/classes/{id}` | Admin | Update |
| DELETE | `/classes/{id}` | Admin | Delete |

## Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/tables` | Admin | Table names |
| GET | `/admin/table/{name}` | Admin | Browse rows; query: `page`, `per_page` (≤ 200) |
| POST | `/admin/query` | Admin | Run one read-only `SELECT`/`WITH` statement (max 1000 rows) |
| GET | `/admin/ranking-logs` | Admin | Ranking history; query: `page`, `per_page` |
| GET | `/admin/activity-logs` | Admin | Activity history; query: `page`, `per_page`, `user_id`, `action`, `entity_type` |
| GET | `/admin/password-resets` | Admin | Users with an unused reset request from the last day |
| POST | `/admin/users/{id}/reset-link` | Admin | One-time reset link (24 hours) to send to the user |
| GET | `/admin/storage` | Admin | Upload storage use and limits (server disk; Cloudinary credits when used) |
| POST | `/admin/test-email` | Admin | Send a test email to the admin's address; 400 when email is not set up, 502 when sending fails |
| POST | `/admin/qa/reset` | Admin | QA copy only (404 elsewhere): reset QA to a clean state; returns removed/created counts |

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health`, `/api/health` | `{ "status": "ok", "version": "X.Y.Z", "commit": "abc1234" }` |
| GET | `/api/config` | `{ "version", "qa_mode", "email_enabled" }` for the frontend |
