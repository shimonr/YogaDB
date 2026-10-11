#!/usr/bin/env bash
# Runs ON the Oracle VM (streamed over SSH by scripts/deploy.sh). Idempotent: the first run
# sets everything up, later runs update to the latest pushed code.
#   - opens ports 80/443 in the VM firewall
#   - starts the shared Caddy reverse proxy (HTTPS for all apps on the VM)
#   - clones or updates the repo, creates the secrets file on first run
#   - rebuilds and restarts the YogaDB containers, then checks they respond
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/shimonr/YogaDB.git}"
APP_DIR="${APP_DIR:-/opt/apps/yogadb}"
BRANCH="${BRANCH:-master}"
DOMAIN="${DOMAIN:?DOMAIN is required}"

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
echo "    at $(git -C "$APP_DIR" log -1 --format='%h %s')"

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
# Keep DOMAIN in the env file (sudo would drop an exported variable) so config.env changes apply.
if grep -q '^DOMAIN=' "$env_file"; then
  sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" "$env_file"
else
  echo "DOMAIN=$DOMAIN" >> "$env_file"
fi

step "Proxy: shared Caddy"
dc network inspect web >/dev/null 2>&1 || dc network create web >/dev/null
dc compose -f "$APP_DIR/deploy/oracle/proxy/compose.yml" up -d --quiet-pull

step "App: build and start"
sudo mkdir -p /opt/backups/yogadb
dc compose -f "$APP_DIR/deploy/oracle/compose.yml" --env-file "$env_file" up -d --build --remove-orphans --quiet-pull
dc image prune -f >/dev/null

step "Check: backend health"
compose_app=(compose -f "$APP_DIR/deploy/oracle/compose.yml" --env-file "$env_file")
healthy=0
for _ in $(seq 1 60); do
  if dc "${compose_app[@]}" exec -T frontend wget -qO- http://backend:8000/health >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done
if [[ $healthy != 1 ]]; then
  echo "    backend did not become healthy; last log lines:" >&2
  dc "${compose_app[@]}" logs --tail 40 backend >&2
  exit 1
fi
echo "    backend is healthy"

step "Check: HTTPS through the proxy"
# Resolve to this machine so the check doesn't depend on the cloud firewall; the deploy
# script checks the public URL from outside afterwards.
for _ in $(seq 1 40); do
  if curl -fsS -o /dev/null --max-time 5 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/asanas?limit=1"; then
    echo "    https://$DOMAIN serves the app"
    exit 0
  fi
  sleep 3
done
echo "    The proxy did not serve https://$DOMAIN. On a first deploy the certificate needs ports" >&2
echo "    80/443 reachable from the internet (Oracle VCN security list). Proxy logs:" >&2
dc logs --tail 40 proxy-caddy-1 >&2
exit 1
