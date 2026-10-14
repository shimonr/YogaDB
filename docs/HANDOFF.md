# Session handoff — version 0.3.3 (2026-10-14)

Snapshot of where YogaDB stands; the `version-wrap` skill rewrites it at the end of each session. History of changes: `CHANGELOG.md` and git tags. Earlier session threads: https://ampcode.com/threads/T-01a126c7-3226-76bb-9da0-c62acc7157e3

## Where things stand

- **Version 0.3.3** (tag `v0.3.3`, [GitHub release](https://github.com/shimonr/YogaDB/releases/tag/v0.3.3)): the app is the same as 0.3.1 (password reset, QA reset and test mailbox, off-site backups, new design); 0.3.2 and 0.3.3 only improve the release tooling (first `version-wrap` run). The QA testing phase runs on this version. CI (lint, tests, migrations check, build) passes on every push.
- **Production:** https://yogadb.129-159-8-242.sslip.io on the Oracle VM `ubuntu@129.159.8.242` (Ubuntu 24.04 ARM, 4 cores, 23 GB RAM, 96 GB disk). 106 asanas, 1,059 photos, real data.
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
- Games only use asanas with a photo and a distinct Sanskrit name.
- Password reset tokens are stored hashed and are one-time; the forgot-password answer is the same for unknown emails. Without SMTP, admins create reset links by hand.
- Off-site backups go to the existing Cloudinary account (private "authenticated" raw files) through separate `BACKUP_CLOUDINARY_*` variables, so photo storage stays on the VM.
- Data-changing browser tests are opt-in (`E2E_QA_FLOWS`, `E2E_QA_RESET`) so they never disturb manual QA.

## Still open

- **Data:** 12 fitness exercises have no Sanskrit name (rows 77, 79–82, 85, 92–94, 97–99 of the CSV); rows 93 and 99 are both "Standing Quad Stretch". The owner's PC CSV matches the VM again (copied back on 2026-10-13, including the 12 filled Sanskrit names).
- **Email on production:** no email provider configured, so production reset links are sent by the admin by hand (add `SMTP_*` to the production `.env` to automate). The admin email is still `shimon@example.com` until changed on the Account page.
- **Backups:** off-site copies skip files over 10 MB (Cloudinary free plan limit); large upload archives would only be on the VM and the PC (`download-backups.cmd`).
- **Free-tier backup:** not exercised since the Oracle move; Cloudinary cloud name capitalization may break uploads there.
- **Tests:** no browser tests yet for admin editing of asanas/transitions/flows/classes.
- **Uptime monitor:** GitHub never ran the original :00/:30 schedule; it now runs at :17/:47. `verify-release.sh prod` warns while no scheduled run has happened in the last 3 hours; if it still warns at the next wrap, the schedule is not firing (check https://www.githubstatus.com and the Actions tab).
- **QA findings:** none reported yet; collect them for the next session.
