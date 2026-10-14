#!/usr/bin/env bash
# Deploy the latest pushed code (origin/$BRANCH) to the Oracle VM.
# Usage: scripts/deploy.sh [qa]      (no argument = production)
# SSH key: your default SSH key, DEPLOY_SSH_KEY=/path/to/key, or the key text in
# ORACLE_SSH_PRIVATE_KEY (e.g. an Amp secret). Settings: deploy/oracle/config.env (+ qa.env).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="${1:-prod}"
PROJECT=yogadb IMPORT_ON_DEPLOY=0 SEED_SAMPLE_CONTENT=0
# shellcheck source=../deploy/oracle/config.env
source "$root/deploy/oracle/config.env"
case "$target" in
  prod) ;;
  qa) source "$root/deploy/oracle/qa.env" ;;
  *) echo "Unknown target '$target' (use: prod or qa)" >&2; exit 2 ;;
esac

ssh_opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
if [[ -n "${ORACLE_SSH_PRIVATE_KEY:-}" && -z "${DEPLOY_SSH_KEY:-}" ]]; then
  DEPLOY_SSH_KEY="$(mktemp)"
  trap 'rm -f "$DEPLOY_SSH_KEY"' EXIT
  printf '%s\n' "$ORACLE_SSH_PRIVATE_KEY" > "$DEPLOY_SSH_KEY"
  chmod 600 "$DEPLOY_SSH_KEY"
fi
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  ssh_opts+=(-i "$DEPLOY_SSH_KEY" -o IdentitiesOnly=yes)
fi

git -C "$root" fetch --quiet origin "$BRANCH"
ahead="$(git -C "$root" rev-list --count "origin/$BRANCH..HEAD")"
if [[ "$ahead" != 0 ]]; then
  echo "Your checkout has $ahead commit(s) not on origin/$BRANCH. The server deploys origin/$BRANCH;" >&2
  echo "push first (git push origin $BRANCH), then run this again." >&2
  exit 1
fi
if [[ -n "$(git -C "$root" status --porcelain)" ]]; then
  echo "Note: uncommitted local changes are not deployed."
fi
version="$(git -C "$root" show "origin/$BRANCH:VERSION" 2>/dev/null || echo dev)"
echo "Deploying $target: version $version, $(git -C "$root" log -1 --format='%h %s' "origin/$BRANCH") to $SSH_TARGET"

server_env="REPO_URL=$REPO_URL APP_DIR=\$app BRANCH=$BRANCH DOMAIN=$DOMAIN PROJECT=$PROJECT IMPORT_ON_DEPLOY=$IMPORT_ON_DEPLOY SEED_SAMPLE_CONTENT=$SEED_SAMPLE_CONTENT"
remote="set -e; app=$APP_DIR; if [ ! -d \$app/.git ]; then sudo mkdir -p \$app; sudo chown \$(id -u):\$(id -g) \$app; git clone -q --branch $BRANCH $REPO_URL \$app; fi; git -C \$app fetch -q origin $BRANCH; git -C \$app reset -q --hard origin/$BRANCH; $server_env bash \$app/deploy/oracle/server-deploy.sh"
ssh "${ssh_opts[@]}" "$SSH_TARGET" "$remote"

echo "==> Check from here: https://$DOMAIN"
health="$(curl -fsS --max-time 15 "https://$DOMAIN/api/health" || true)"
if [[ "$health" == *"\"version\":\"$version\""* ]]; then
  echo "Deployed $target $version: https://$DOMAIN"
else
  echo "https://$DOMAIN/api/health returned '${health:-nothing}', expected version $version." >&2
  echo "If the page is unreachable, check that TCP 80 and 443 are open in the Oracle VCN security list." >&2
  exit 1
fi
