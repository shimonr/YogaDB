---
name: version-wrap
description: "Closes a YogaDB working session as a release: updates docs and the handoff, adds missing tests, tries the release candidate on QA, bumps the version, commits, tags, pushes, publishes a GitHub release, deploys to the Oracle VM (QA and production) and verifies everything. Use at the end of every session, or when asked to wrap up, close the session, cut a release, or run version-wrap."
---

# Version wrap

Invoking this skill is the owner's approval to commit, tag, push to `origin/master`, publish the
GitHub release and deploy to the QA and production stacks on the Oracle VM. It does not approve
anything else (deleting data, changing server secrets, rewriting history, resetting QA). Stop and
report if a step fails; never skip a failing check to finish.

## 0. Preflight (once per machine/orb)

- SSH: `source scripts/lib/oracle.sh && oracle_load prod && oracle_ssh true`. If it fails, see the `deploying-to-oracle` skill (key in `~/.ssh/oracle_deploy` or the `ORACLE_SSH_PRIVATE_KEY` secret).
- GitHub CLI: `gh auth status` (needed for the GitHub release and the CI/uptime checks).
- Browser: `cd frontend && npx playwright install chromium`.
- Python venv and node_modules: `.agents/setup` (already done in project orbs).

## 1. Take stock

```bash
git fetch --tags origin && git status --short
git log --oneline "$(git describe --tags --abbrev=0)"..HEAD
```

- Read `docs/HANDOFF.md`, `CHANGELOG.md` and this session's conversation: what changed, what was decided, what is still open, what the owner reported from QA.
- Review `git status --short` line by line before anything is committed. Unknown files: ask. Someone else's uncommitted work: ask before including it.
- **Nothing changed since the last tag?** Don't bump. Run step 7 (`verify-release.sh` for qa and prod), refresh `docs/HANDOFF.md` only if its "Still open" list is out of date (that change then becomes a patch release), and report.

## 2. Tests

For each behavior added or fixed since the last tag, make sure a test would fail without it (`backend/tests/`, `frontend/e2e/`). Extend existing test classes before adding files. Then:

```bash
cd backend && .venv/bin/ruff check . && .venv/bin/python -m pytest tests -q
DATABASE_URL=sqlite:////tmp/wrap.db .venv/bin/alembic upgrade head && DATABASE_URL=sqlite:////tmp/wrap.db .venv/bin/alembic check; rm -f /tmp/wrap.db
cd ../frontend && npm run lint && npm run build && rm -rf dist tsconfig.tsbuildinfo
```

## 3. Release candidate on QA (before bumping)

Problems found after tagging force an extra patch release, so try the work on QA first:

```bash
git add <reviewed files> && git commit -m "<what changed>"   # skip if already committed
git push origin master
scripts/deploy.sh qa
scripts/verify-release.sh qa --site-only --e2e
```

Fix what fails, push, and repeat this step. New or changed browser tests can be run locally first against the dev server (`frontend/e2e/COVERAGE.md`), which is faster than a QA round trip.

Then improve this skill now, not after the release: add what this session taught you (a failure, a manual workaround, a missing check) to "Lessons" below or fix the step itself, and commit it with the candidate. Changes made after the bump need another release, because verification requires the deployed commit to be HEAD.

## 4. Version, docs, release

1. Bump: `patch` = fixes, docs or tooling only; `minor` = new features or behavior changes; `major` only when the owner asks. `scripts/bump-version.sh <patch|minor|major>` prints the new version.
2. `CHANGELOG.md`: `## <version> — <YYYY-MM-DD>` (owner's date, Europe/Budapest) at the top; short user-facing bullets under Added / Changed / Fixed / Data / Internal.
3. `docs/HANDOFF.md`: rewrite "Where things stand" for the new version (state the number), update "Decisions" and "Still open". It is a snapshot, not a log.
4. Every other doc the changes touch: `README.md`, `AGENTS.md`, `docs/DEPLOYMENT.md`, `docs/ENVIRONMENT.md`, `docs/API.md`, `docs/DEVELOPMENT.md`. Avoid writing the current version number into them (use `X.Y.Z`), or they go stale.
5. Commit, tag, push, publish:

```bash
git add -A && git status --short          # only the reviewed files plus VERSION, package*.json, docs
git commit -m "Release <version>" -m "<two or three lines: what this release contains>"
git tag -a v<version> -m "YogaDB <version>"
git push origin master && git push origin v<version>   # tag push "remote rejected (failed)": retry once
scripts/github-release.sh                  # GitHub release with the changelog section as notes
```

## 5. Deploy

```bash
scripts/deploy.sh qa
scripts/deploy.sh
```

Each deploy fails unless the site reports the pushed version and commit at `/api/health`.

Data changes that need the new code (a new CSV column, a data clean-up) go after the code is on the server: QA re-imports the asana CSV on every deploy, production only when you run the import (`deploying-to-oracle` skill). The CSV in `/opt/apps/yogadb-data/asanas` is shared by both stacks, so upload it only once both run code that understands it, or run the import on QA alone.

## 6. Verify

```bash
scripts/verify-release.sh qa --e2e
scripts/verify-release.sh prod --e2e
```

Checks: version files, changelog and handoff; clean, pushed tree; tag and GitHub release; CI for the commit (waits up to 15 minutes); deployed version and commit; prod: backups on the VM (< 26 h) and off-site (< 50 h), uptime check passed (< 3 h) and its schedule firing (warning only); qa: test mailbox up; browser tests (credentials come from the server `.env`, never printed). Fix any failure and repeat from the step that owns it.

Data-changing QA tests (`E2E_QA_FLOWS=1`, `E2E_QA_RESET=1`) create test users and can wipe QA. Use them only when the owner confirms in this session that nobody is testing QA.

## 7. Report

Version, what changed (from the changelog), links to the GitHub release and both sites, what was verified (paste the verify summaries), anything skipped and why, and the "Still open" list from `docs/HANDOFF.md`.

## Lessons

- 2026-10-14: verification found bugs only after tagging twice (0.2.1, 0.3.1). Step 3 now tries a release candidate on QA before bump and tag.
- 2026-10-14: right after a push the CI run does not exist yet; `verify-release.sh` waits for it instead of reporting "unknown".
- 2026-10-14: the uptime workflow was "active" but GitHub never ran its `*/30` schedule. Its cron now avoids :00/:30 and `verify-release.sh prod` fails when the last run is older than 3 hours. If it keeps failing, trigger it with `gh workflow run uptime.yml` and check GitHub's status page.
- 2026-10-14: the orb's Amp secrets include `CLOUDINARY_*`; tests clear them in `conftest.py`, and a locally started API must unset them (see `AGENTS.md`).
- 2026-10-14: a manual `gh workflow run uptime.yml` made the uptime check pass while the schedule still had not fired; scheduled runs are now checked separately (a warning, so a late GitHub schedule doesn't block a release).
- 2026-10-14: lessons found after the bump forced 0.3.3 right after 0.3.2; skill improvements now happen in step 3, before the bump.
- 2026-10-14 (0.4.0): the tag push failed once with "remote rejected (failed)" and worked on retry; step 4 says so.
- 2026-10-14 (0.4.0): the new asana CSV (with an `id` column) had to wait until the importer that reads it was deployed; step 5 now says where data changes go.
- 2026-10-14 (0.4.0): new browser tests failed on selectors several times; running them locally against the dev server first (vite proxies `/api`) saved QA round trips.
- 2026-10-14: PowerShell variables are case-insensitive (`$Target` = `$target`); keep that in mind when editing `scripts/*.ps1`.
