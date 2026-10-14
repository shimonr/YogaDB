#!/usr/bin/env bash
# Runs ON the Oracle VM (started over SSH by scripts/deploy.sh / deploy.ps1). Idempotent: the
# first run sets everything up, later runs update to the latest pushed code.
#   - opens ports 80/443 in the VM firewall
#   - starts the shared Caddy reverse proxy (HTTPS for all apps on the VM)
#   - clones or updates the repo, creates the secrets file on first run
#   - rebuilds and restarts the stack, then checks it responds with the deployed version
# The same script deploys production (PROJECT=yogadb) and QA (PROJECT=yogadb-qa, see qa.env).
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/shimonr/YogaDB.git}"
APP_DIR="${APP_DIR:-/opt/apps/yogadb}"
BRANCH="${BRANCH:-master}"
DOMAIN="${DOMAIN:?DOMAIN is required}"
PROJECT="${PROJECT:-yogadb}"
DATA_DIR="${DATA_DIR:-/opt/apps/yogadb-data}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/$PROJECT}"
IMPORT_ON_DEPLOY="${IMPORT_ON_DEPLOY:-0}"        # re-import the asana CSV + photos after starting
SEED_SAMPLE_CONTENT="${SEED_SAMPLE_CONTENT:-0}"  # add sample transitions/flows/classes
QA_MODE="${QA_MODE:-0}"                          # enable the admin "reset QA" action
MAILPIT="${MAILPIT:-0}"                          # run the Mailpit test mailbox and send email to it

step() { echo "==> $*"; }

command -v docker >/dev/null || { echo "Docker is not installed on the server." >&2; exit 1; }
docker_cmd=(docker)
docker info >/dev/null 2>&1 || docker_cmd=(sudo docker)
dc() { "${docker_cmd[@]}" "$@"; }

step "Firewall: allow HTTP/HTTPS"
if systemctl is-active --quiet firewalld 2>/dev/null; then  # Oracle Linux images
  sudo firewall-cmd --quiet --permanent --add-service=http --add-service=https
  sudo firewall-cmd --quiet --reload
else  # Ubuntu images ship iptables rules that reject everything except SSH
  changed=0
  for port in 80 443; do
    if ! sudo iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
      sudo iptables -I INPUT 1 -p tcp --dport "$port" -m state --state NEW -j ACCEPT
      changed=1
    fi
  done
  if [[ $changed == 1 ]] && command -v netfilter-persistent >/dev/null; then
    sudo netfilter-persistent save >/dev/null
  fi
fi

step "Code: $REPO_URL ($BRANCH) -> $APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown "$(id -u):$(id -g)" "$APP_DIR"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
git -C "$APP_DIR" reset --quiet --hard "origin/$BRANCH"
version="$(cat "$APP_DIR/VERSION" 2>/dev/null || echo dev)"
commit="$(git -C "$APP_DIR" rev-parse --short HEAD)"
echo "    version $version at $(git -C "$APP_DIR" log -1 --format='%h %s')"

env_file="$APP_DIR/deploy/oracle/.env"
if [[ ! -f "$env_file" ]]; then
  step "Secrets: creating $env_file"
  (
    umask 077
    cat > "$env_file" <<EOF
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)
EOF
  )
  echo "    Admin password (user 'shimon') is in $env_file"
fi
set_env() {  # set KEY=VALUE in the env file (compose reads it; sudo would drop exported variables)
  if grep -q "^$1=" "$env_file"; then
    sed -i "s|^$1=.*|$1=$2|" "$env_file"
  else
    echo "$1=$2" >> "$env_file"
  fi
}
set_env DOMAIN "$DOMAIN"
set_env APP_VERSION "$version"
set_env APP_COMMIT "$commit"
set_env BACKUP_DIR "$BACKUP_DIR"
set_env BACKUP_LABEL "$PROJECT"
set_env QA_MODE "$([[ $QA_MODE == 1 ]] && echo true || echo false)"
compose_profiles=()
if [[ "$MAILPIT" == 1 ]]; then
  grep -q '^MAILPIT_PASSWORD=' "$env_file" || set_env MAILPIT_PASSWORD "$(openssl rand -hex 12)"
  set_env MAIL_DOMAIN "mail.$DOMAIN"
  set_env SMTP_HOST mailpit
  set_env SMTP_PORT 1025
  set_env SMTP_TLS false
  set_env SMTP_FROM "YogaDB QA <no-reply@$DOMAIN>"
  compose_profiles=(--profile mail)
fi
# Asana CSV + images uploaded with upload-photos.cmd replace the repo's sample data.
if [[ -f "$DATA_DIR/asanas/yoga_asanas.csv" ]]; then
  set_env ASANAS_DATA_DIR "$DATA_DIR/asanas"
  set_env ASANAS_CSV_FILE yoga_asanas.csv
fi

step "Proxy: shared Caddy"
dc network inspect web >/dev/null 2>&1 || dc network create web >/dev/null
dc compose -f "$APP_DIR/deploy/oracle/proxy/compose.yml" up -d --quiet-pull

step "App: build and start ($PROJECT)"
sudo mkdir -p "$BACKUP_DIR"
compose_app=(compose -p "$PROJECT" -f "$APP_DIR/deploy/oracle/compose.yml" --env-file "$env_file" "${compose_profiles[@]}")
dc "${compose_app[@]}" up -d --build --remove-orphans --quiet-pull
dc image prune -f >/dev/null

step "Check: backend health"
health=""
for _ in $(seq 1 60); do
  if health="$(dc "${compose_app[@]}" exec -T frontend wget -qO- http://backend:8000/health 2>/dev/null)"; then
    break
  fi
  health=""
  sleep 2
done
if [[ -z "$health" ]]; then
  echo "    backend did not become healthy; last log lines:" >&2
  dc "${compose_app[@]}" logs --tail 40 backend >&2
  exit 1
fi
if [[ "$health" != *"\"version\":\"$version\""* ]]; then
  echo "    backend reports $health, expected version $version" >&2
  exit 1
fi
echo "    backend is healthy: $health"

if [[ "$IMPORT_ON_DEPLOY" == 1 ]]; then
  step "Data: import asana CSV and photos"
  dc "${compose_app[@]}" exec -T backend python -m app.services.asana_import
fi
if [[ "$SEED_SAMPLE_CONTENT" == 1 ]]; then
  step "Data: sample transitions, flows and classes"
  dc "${compose_app[@]}" exec -T backend python -m app.services.sample_content
fi

step "Check: HTTPS through the proxy"
# Resolve to this machine so the check doesn't depend on the cloud firewall; the deploy
# script checks the public URL from outside afterwards.
for _ in $(seq 1 40); do
  if curl -fs -o /dev/null --max-time 5 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health"; then
    echo "    https://$DOMAIN serves the app"
    exit 0
  fi
  sleep 3
done
echo "    The proxy did not serve https://$DOMAIN. On a first deploy the certificate needs ports" >&2
echo "    80/443 reachable from the internet (Oracle VCN security list). Proxy logs:" >&2
dc logs --tail 40 proxy-caddy-1 >&2
exit 1
