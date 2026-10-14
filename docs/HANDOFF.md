# Session handoff — version 0.2.1 (2026-10-13)

Snapshot of where YogaDB stands; the `version-wrap` skill rewrites it at the end of each session. History of changes: `CHANGELOG.md` and git tags. Earlier session threads: https://ampcode.com/threads/T-01a126c7-3226-76bb-9da0-c62acc7157e3

## Where things stand

- **Version 0.2.1** (tag `v0.2.1`), the pre-QA release (0.2.0 plus a release-script fix). CI (lint, tests, migrations check, build) passes on every push.
- **Production:** https://yogadb.129-159-8-242.sslip.io on the Oracle VM `ubuntu@129.159.8.242` (Ubuntu 24.04 ARM, 4 cores, 23 GB RAM, 96 GB disk). 106 asanas, 1,059 photos, real data.
- **QA copy:** https://qa.yogadb.129-159-8-242.sslip.io, own database, same photos, sample transitions/flows/classes. Ready for the QA phase.
- **Free services** (Vercel/Render/Neon/Cloudinary) are a documented backup only; not verified recently.

## How to work

- Local run (Windows): `run-local.cmd`. Orb: `.agents/setup` installs everything; see `AGENTS.md`.
- Deploy: push to `master`, then `deploy.cmd` / `deploy-qa.cmd` or `scripts/deploy.sh [qa]`. Publish asana data/photos from the PC: `upload-photos.cmd`. Backups to the PC: `download-backups.cmd`.
- End of session: `version-wrap` skill (docs, tests, version bump, tag, push, deploy QA then production, `scripts/verify-release.sh`).
- Server layout: production checkout `/opt/apps/yogadb`, QA `/opt/apps/yogadb-qa`; secrets incl. admin password in `<checkout>/deploy/oracle/.env`; asana data `/opt/apps/yogadb-data/asanas`; backups `/opt/backups/yogadb[-qa]`; shared Caddy proxy (compose project `proxy`, network `web`).
- SSH keys on the VM: the owner's Oracle key, his PC key (`shimo@Shimon-LT-ACER`), and `amp-deploy@yogadb` (private key only in the 2026-10-11 orb). Agents in new orbs need an `ORACLE_SSH_PRIVATE_KEY` Amp secret.
- Amp project secrets: `CLOUDINARY_CLOUD_NAME` (stored with a capital letter; Cloudinary accepts it lowercased), `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

## Decisions

- One Docker stack definition (`deploy/oracle/compose.yml`) serves production and QA via compose project names; Caddy routes by hostname and issues certificates.
- Alembic baseline `0001_baseline` adopts databases created by older `create_all` versions; migrations run on API startup.
- Photo paths are stored relative to the images folder or `data/`; re-imports keep unchanged photos (ids, ratings) and asana rank averages; user uploads are never touched by imports.
- Asana originals live on the owner's PC (yoga-image-collector); the VM copy is replaced by `upload-photos.cmd`. Imported images are not in server backups for that reason.
- Login limit: 5 failed attempts per IP + username in 5 minutes (successful logins don't count); registrations 10 per IP in 5 minutes. In memory, per process.
- Games only use asanas with a photo and a distinct Sanskrit name.

## Still open

- **Data:** 12 fitness exercises have no Sanskrit name (rows 77, 79–82, 85, 92–94, 97–99 of the CSV); rows 93 and 99 are both "Standing Quad Stretch". The owner's PC CSV matches the VM again (copied back on 2026-10-13, including the 12 filled Sanskrit names).
- **Backups:** only on the VM plus whatever `download-backups.cmd` copied; no automatic off-site copy (Oracle Object Storage would need OCI credentials).
- **Accounts:** no "forgot password" email flow (needs an email provider); the admin email is still `shimon@example.com` until changed on the Account page.
- **Free-tier backup:** not exercised since the Oracle move; Cloudinary cloud name capitalization may break uploads there.
- **Tests:** browser smoke tests cover the main read-only flows and login; there are no browser tests for admin editing or uploads.
