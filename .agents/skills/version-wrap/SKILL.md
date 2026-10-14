---
name: version-wrap
description: "Closes a YogaDB working session as a release: updates docs and the handoff, adds missing tests, bumps the version, commits, tags and pushes, deploys to the Oracle VM (QA and production) and verifies the release. Use at the end of every session, or when asked to wrap up, close the session, cut a release, or run version-wrap."
---

# Version wrap

Invoking this skill is the owner's approval to commit, tag, push to `origin/master` and deploy to
the QA and production stacks on the Oracle VM. It does not approve anything else (deleting data,
changing server secrets, rewriting history). Stop and report if a step fails; never skip a failing
check to finish.

## 1. Take stock

- `git fetch --tags origin && git status && git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD`
- Read `docs/HANDOFF.md` and `CHANGELOG.md`, and this session's conversation, to list what changed, what was decided, and what is still open.
- If someone else's uncommitted changes are in the tree, ask before including them.

## 2. Tests for this session's changes

For each behavior added or fixed since the last tag, check that a test would fail without it
(`backend/tests/`, browser smoke tests in `frontend/e2e/`). Add the missing ones; extend existing
test classes before creating new files. Then run everything:

```bash
cd backend && .venv/bin/ruff check . && .venv/bin/python -m pytest tests -q
DATABASE_URL=sqlite:////tmp/wrap.db .venv/bin/alembic upgrade head && DATABASE_URL=sqlite:////tmp/wrap.db .venv/bin/alembic check; rm -f /tmp/wrap.db
cd ../frontend && npm run lint && npm run build
```

## 3. Version and docs

1. Pick the bump: `patch` for fixes only, `minor` for new features or behavior changes, `major` only when the owner asks. Run `scripts/bump-version.sh <patch|minor|major>`; it prints the new version.
2. `CHANGELOG.md`: add `## <version> — <YYYY-MM-DD>` at the top with short user-facing bullets (Added / Changed / Fixed / Data).
3. `docs/HANDOFF.md`: rewrite "Where things stand" for this version (state the version number), update decisions, and replace "Still open" with the current list. Keep it a snapshot, not a log.
4. Update any other doc the changes affect: `README.md`, `AGENTS.md`, `docs/DEPLOYMENT.md`, `docs/ENVIRONMENT.md`, `docs/API.md`, `docs/DEVELOPMENT.md`.

## 4. Commit, tag, push

```bash
git add -A && git commit -m "Release <version>" -m "<two or three lines: what this release contains>"
git tag -a v<version> -m "YogaDB <version>"
git push origin master && git push origin v<version>
```

## 5. Deploy

Load the `deploying-to-oracle` skill for the SSH key, then deploy QA first, check it, then production:

```bash
scripts/deploy.sh qa
scripts/verify-release.sh qa --e2e
scripts/deploy.sh
```

`--e2e` needs Playwright's browser once per machine: `cd frontend && npx playwright install chromium`.

## 6. Verify

```bash
scripts/verify-release.sh prod --e2e
```

It checks version files and changelog, clean and pushed tree, the tag on origin, CI for the pushed
commit (re-run after CI finishes if it is still running), the deployed version and commit, and the
browser smoke tests. Fix any failure, then repeat from the step that owns it.

## 7. Report

Tell the owner: the version, a short summary of what changed, links to the tag and live site,
what was verified, and the open items from `docs/HANDOFF.md`.
