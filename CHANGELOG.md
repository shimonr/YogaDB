# Changelog

Versions follow `MAJOR.MINOR.PATCH`. The version lives in `VERSION` (and `frontend/package.json`); the app shows it on the About page, in the sidebar and at `/api/health`. Releases are tagged `vX.Y.Z` and produced with the `version-wrap` skill.

## 0.3.1 — 2026-10-14

Fixed
- Asana and class pages no longer reload with a spinner after rating or uploading, so the "Photo uploaded successfully." and "Rank submitted" messages stay visible (found by the new browser tests).

## 0.3.0 — 2026-10-14

Everything planned before QA, plus a new look.

Added
- Forgot password: emailed one-time reset links (1 hour). Without an email provider, requests show in the admin panel, where admins create 24-hour links ("Reset link" per user).
- QA copy: Admin → QA Tools → "Reset QA now" returns QA to a clean state; a Mailpit test mailbox (https://mail.qa.yogadb.129-159-8-242.sslip.io) receives all QA email; a "QA environment" badge.
- Off-site backups: production copies its daily database and upload backups to Cloudinary as private files (30 days).
- Browser tests for registering, rating, uploading, password reset by email and the QA reset (QA only, opt-in).

Changed
- New design: warm sunrise colors, lotus logo, display headings, rounded cards with soft shadows, colored type/category chips, a new home page with top poses and section tiles, gentle page transitions.

## 0.2.1 — 2026-10-13

Fixed
- `scripts/verify-release.sh` reported CI as unknown on Python 3.11.

## 0.2.0 — 2026-10-13

Pre-QA release: production on the Oracle VM with the real asana data, plus a QA copy.

Added
- Oracle VM deployment (default): HTTPS via a shared Caddy proxy, PostgreSQL, daily backups; one-click `deploy.cmd` / `scripts/deploy.sh`.
- QA copy at https://qa.yogadb.129-159-8-242.sslip.io with its own database and sample transitions, flows and classes (`deploy-qa.cmd` / `scripts/deploy.sh qa`).
- `upload-photos.cmd` publishes the asana CSV and photos from the PC; `download-backups.cmd` copies server backups to the PC.
- Account page: change email and password.
- Resized photos (`?w=` on photo URLs) so lists and games load far less data; photos are cached by browsers for a day.
- Phone layout: menu button instead of the full sidebar.
- App version on the About page, in the sidebar and at `/api/health`.
- Uptime check every 30 minutes (GitHub Actions emails on failure); Playwright browser smoke tests (`npm run e2e`).
- Skills: `deploying-to-oracle`, `version-wrap`; `AGENTS.md` project guidance.

Changed
- Login rate limit counts only failed logins, per IP and username, so people sharing a network don't lock each other out.
- Re-importing photos keeps unchanged photos (ids, ratings, links) and asana ranking averages.
- Games only use asanas with a photo and a real Sanskrit name.
- PostgreSQL driver is psycopg 3 (SQLAlchemy 2.1 default).

Fixed
- Security and correctness fixes from the repository review (admin password, photo deletion, SQL console read-only, rate limits, migrations, and more; see git history for 0.1.x).

Data
- Real asana list (106 poses) and 1,059 photos; 12 missing Sanskrit names filled.

## 0.1.0 — 2026-06-26

Initial release: asanas, transitions, flows, classes, ranking, photos, games, admin panel.
