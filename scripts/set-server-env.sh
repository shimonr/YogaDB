#!/usr/bin/env bash
# Copy settings from this machine's environment into the server .env, without printing them.
# Usage: SMTP_HOST=... SMTP_PASSWORD=... scripts/set-server-env.sh [prod|qa] SMTP_HOST SMTP_PASSWORD ...
# (In an Amp orb, project secrets are already environment variables.) Redeploy afterwards.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target=prod
if [[ "${1:-}" == prod || "${1:-}" == qa ]]; then target="$1"; shift; fi
[[ $# -gt 0 ]] || { echo "Usage: $0 [prod|qa] KEY [KEY ...]" >&2; exit 2; }
# shellcheck source=lib/oracle.sh
source "$root/scripts/lib/oracle.sh"
oracle_load "$target"

lines=""
for key in "$@"; do
  [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || { echo "Invalid key: $key" >&2; exit 2; }
  [[ -n "${!key:-}" ]] || { echo "$key is not set in this environment" >&2; exit 1; }
  [[ "${!key}" != *$'\n'* ]] || { echo "$key contains a newline" >&2; exit 1; }
  lines+="$key=${!key}"$'\n'
done
printf '%s' "$lines" | oracle_ssh "f='$APP_DIR/deploy/oracle/.env'; umask 077; while IFS= read -r line; do k=\"\${line%%=*}\"; { grep -v \"^\$k=\" \"\$f\" || true; echo \"\$line\"; } > \"\$f.tmp\"; mv \"\$f.tmp\" \"\$f\"; done; chmod 600 \"\$f\""
echo "Set $* in $target's server .env. Redeploy to apply: scripts/deploy.sh $([[ $target == qa ]] && echo qa)"
