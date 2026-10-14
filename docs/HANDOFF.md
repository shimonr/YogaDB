# Session handoff — version 0.4.0 (2026-10-14)

Snapshot of where YogaDB stands; the `version-wrap` skill rewrites it at the end of each session. History of changes: `CHANGELOG.md` and git tags. Earlier session threads: https://ampcode.com/threads/T-01a126c7-3226-76bb-9da0-c62acc7157e3

## Where things stand

- **Version 0.4.0** (tag `v0.4.0`, [GitHub release](https://github.com/shimonr/YogaDB/releases/tag/v0.4.0)): adds upload limits (10 MB per photo, 20 GB total, 5 GB free disk, 80% of Cloudinary credits), an admin storage/email status card with a test-email button, a full activity log (logins, registrations, every admin change), "No Sanskrit" for poses without one (skipped by the Sanskrit games), and browser tests for every page and admin action (`frontend/e2e/COVERAGE.md`). The QA testing phase runs on this version. CI (lint, tests, migrations check, build) passes on every push.
- **Production:** https://yogadb.129-159-8-242.sslip.io on the Oracle VM `ubuntu@129.159.8.242` (Ubuntu 24.04 ARM, 4 cores, 23 GB RAM, 96 GB disk). 105 asanas, 1,049 photos, real data.
- **QA copy:** https://qa.yogadb.129-159-8-242.sslip.io, own database, same photos, sample transitions/flows/classes, "Reset QA" in Admin → QA Tools, test mailbox https://mail.qa.yogadb.129-159-8-242.sslip.io (user `qa`, password `MAILPIT_PASSWORD` in the QA `.env`).
- **Free services** (Vercel/Render/Neon/Cloudinary) are a documented backup only; not verified recently.

## How to work

- Local run (Windows): `run-local.cmd`. Orb: `.agents/setup` installs everything; see `AGENTS.md`.
- Deploy: push to `master`, then `deploy.cmd` / `deploy-qa.cmd` or `scripts/deploy.sh [qa]`. Publish asana data/photos from the PC: `upload-photos.cmd`. Backups to the PC: `download-backups.cmd`.
- End of session: `version-wrap` skill (tests, release candidate on QA, version bump, changelog, tag, push, GitHub release, deploy QA then production, `scripts/verify-release.sh qa|prod --e2e`). Its "Lessons" section collects what each run learned.
- Server layout: production checkout `/opt/apps/yogadb`, QA `/opt/apps/yogadb-qa`; secrets incl. admin password in `<checkout>/deploy/oracle/.env`; asana data `/opt/apps/yogadb-data/asanas`; backups `/opt/backups/yogadb[-qa]`; shared Caddy proxy (compose project `proxy`, network `web`).
- SSH keys on the VM: the owner's Oracle key, his PC key (`shimo@Shimon-LT-ACER`), and `amp-deploy@yogadb` (private key only in the 2026-10-11 orb). Agents in new orbs need an `ORACLE_SSH_PRIVATE_KEY` Amp secret.
- Amp project secrets: `CLOUDINARY_CLOUD_NAME` (stored with a capital letter; Cloudinary accepts it lowercased), `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

## Decisions

- One Docker stack definition (`deploy/oracle/compose.yml`) serves production and QA via compose project names; Caddy routes by hostname and issues certificates.
- Alembic baseline `0001_baseline` adopts databases created by older `create_all` versions; migrations run on API startup.
- Photo paths are stored relative to the images folder or `data/`; re-imports keep unchanged photos (ids, ratings) and asana rank averages; user uploads are never touched by imports.
- Asana originals live on the owner's PC (yoga-image-collector); the VM copy is replaced by `upload-photos.cmd`. Imported images are not in server backups for that reason.
- Login limit: 5 failed attempts per IP + username in 5 minutes (successful logins don't count); registrations 10 per IP in 5 minutes. In memory, per process.
- Games only use asanas with a photo and a real Sanskrit name: "No Sanskrit" (the CSV value, or a blank) and names equal to the English name are skipped.
- The asana CSV's `id` column is the asana id; removing a CSV row does not delete the asana (delete it in the admin panel). Deleting an item also deletes its ratings; the ranking log keeps the history.
- Upload limits are settings (`UPLOAD_MAX_FILE_MB`, `UPLOADS_MAX_TOTAL_MB`, `MIN_FREE_DISK_MB`, `CLOUDINARY_MAX_USAGE_PERCENT`) passed through `deploy/oracle/compose.yml`; nginx allows 12 MB per request.
- Password reset tokens are stored hashed and are one-time; the forgot-password answer is the same for unknown emails. Without SMTP, admins create reset links by hand.
- Off-site backups go to the existing Cloudinary account (private "authenticated" raw files) through separate `BACKUP_CLOUDINARY_*` variables, so photo storage stays on the VM.
- Data-changing browser tests are opt-in (`E2E_QA_FLOWS`, `E2E_QA_RESET`) so they never disturb manual QA.

## Still open

- **Data:** 11 fitness exercises are "No Sanskrit" (ids 77, 79–82, 85, 92–94, 97, 98). The VM CSV now has an `id` column and no duplicate row (previous file kept as `yoga_asanas.csv.bak-2026-10-14`); the owner should copy it back to his PC: `scp ubuntu@129.159.8.242:/opt/apps/yogadb-data/asanas/yoga_asanas.csv D:\DEV\yoga-image-collector\input\yoga_asanas.csv`.
- **Email on production:** waiting for the owner to create a free SMTP account (Brevo recommended: 300 emails/day, verify one sender, no domain needed). Then set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` as Amp project secrets, run `scripts/set-server-env.sh prod SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASSWORD SMTP_FROM`, redeploy and press "Send me a test email". Until then reset links are sent by hand. The admin email is still `shimon@example.com` until changed on the Account page.
- **UI gaps:** editing asanas, flows and classes and creating asanas exist only in the API; flows and transitions can't be ranked from their pages.
- **Free-tier backup:** not exercised since the Oracle move; Cloudinary cloud name capitalization may break uploads there.
- **Uptime monitor:** GitHub never ran the original :00/:30 schedule; it now runs at :17/:47. `verify-release.sh prod` warns while no scheduled run has happened in the last 3 hours; if it still warns at the next wrap, the schedule is not firing (check https://www.githubstatus.com and the Actions tab).
- **Data-changing browser tests:** the new admin tests passed against a local stack only; run them on QA (`E2E_QA_FLOWS=1 scripts/verify-release.sh qa --site-only --e2e`) once nobody is testing QA by hand.
- **QA findings:** none reported yet; collect them for the next session.
