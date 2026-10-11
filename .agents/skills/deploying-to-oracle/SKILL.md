---
name: deploying-to-oracle
description: Deploys YogaDB to the production Oracle Cloud VM (129.159.8.242) with scripts/deploy.sh and checks the live site. Use when asked to deploy, release, ship to the server/production, or check or debug the Oracle deployment.
---

# Deploying YogaDB to the Oracle VM

The VM runs what is pushed to `origin/master`. Settings: `deploy/oracle/config.env`. Full docs: `docs/DEPLOYMENT.md`.

## Deploy

1. Make sure the change is committed and pushed to `origin/master`. Pushing needs the user's approval unless they already asked for it; `scripts/deploy.sh` refuses to run with unpushed commits.
2. Make an SSH key available, in this order:
   - `~/.ssh/oracle_deploy` exists → `export DEPLOY_SSH_KEY=~/.ssh/oracle_deploy`
   - the `ORACLE_SSH_PRIVATE_KEY` environment variable is set (Amp secret) → nothing to do
   - otherwise stop and ask the user to add an `ORACLE_SSH_PRIVATE_KEY` secret containing a private key whose public key is in the server user's `~/.ssh/authorized_keys`
3. Run `scripts/deploy.sh` from the repo root (a first deploy can take several minutes while images build).
4. Report the commit deployed and the URL from the script's last line, `Deployed: https://...`.

## When it fails

- `Permission denied (publickey)`: the key is not authorized on the server; ask the user to add the public key.
- Backend not healthy: the script prints the backend log; fix the code, push, deploy again.
- Public URL unreachable but the server checks passed: TCP 80/443 are probably closed in the Oracle VCN security list (only the user can change that in the Oracle console).
- Inspect the server: `ssh <SSH_TARGET> 'cd /opt/apps/yogadb/deploy/oracle && sudo docker compose --env-file .env ps && sudo docker compose --env-file .env logs --tail 50 backend'`

Never print the contents of the server's `deploy/oracle/.env`; it holds the production secrets and admin password.
