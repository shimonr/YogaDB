---
name: deploying-to-oracle
description: Deploys YogaDB to the Oracle Cloud VM (129.159.8.242), production or the QA copy, with scripts/deploy.sh and checks the live site. Use when asked to deploy, ship to the server/production/QA, or check or debug the Oracle deployment.
---

# Deploying YogaDB to the Oracle VM

The VM runs what is pushed to `origin/master`. Settings: `deploy/oracle/config.env`. Full docs: `docs/DEPLOYMENT.md`.

## Deploy

1. Make sure the change is committed and pushed to `origin/master`. Pushing needs the user's approval unless they already asked for it; `scripts/deploy.sh` refuses to run with unpushed commits.
2. Make an SSH key available, in this order:
   - `~/.ssh/oracle_deploy` exists → `export DEPLOY_SSH_KEY=~/.ssh/oracle_deploy`
   - the `ORACLE_SSH_PRIVATE_KEY` environment variable is set (Amp secret) → nothing to do
   - otherwise stop and ask the user to add an `ORACLE_SSH_PRIVATE_KEY` secret containing a private key whose public key is in the server user's `~/.ssh/authorized_keys`
3. Run `scripts/deploy.sh` (production) or `scripts/deploy.sh qa` (QA copy) from the repo root. A first deploy can take several minutes while images build. Deploy QA first when the change is risky.
4. The script fails unless the site reports the pushed version at `/api/health`. Report the version, commit and URL from its last line, `Deployed <target> <version>: https://...`.
5. For a full check (version files, tag, CI, live version, browser smoke tests) run `scripts/verify-release.sh <prod|qa> --e2e`.

## When it fails

- `Permission denied (publickey)`: the key is not authorized on the server; ask the user to add the public key.
- Backend not healthy: the script prints the backend log; fix the code, push, deploy again.
- Public URL unreachable but the server checks passed: TCP 80/443 are probably closed in the Oracle VCN security list (only the user can change that in the Oracle console).
- Inspect the server: `ssh <SSH_TARGET> 'cd /opt/apps/yogadb/deploy/oracle && sudo docker compose --env-file .env ps && sudo docker compose --env-file .env logs --tail 50 backend'`

Never print the contents of the server's `deploy/oracle/.env`; it holds the production secrets and admin password.
