# Shared by scripts/deploy.sh and scripts/verify-release.sh (source it; bash only).
# oracle_load <prod|qa>  loads deploy/oracle/config.env (+ qa.env) and sets ssh_opts.
# oracle_ssh <command>   runs a command on the VM.
# SSH key: your default key, DEPLOY_SSH_KEY=/path/to/key, or the key text in ORACLE_SSH_PRIVATE_KEY.

oracle_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

oracle_load() {
  local target="${1:-prod}"
  PROJECT=yogadb IMPORT_ON_DEPLOY=0 SEED_SAMPLE_CONTENT=0 QA_MODE=0 MAILPIT=0
  # shellcheck source=../../deploy/oracle/config.env
  source "$oracle_root/deploy/oracle/config.env"
  case "$target" in
    prod) ;;
    qa) source "$oracle_root/deploy/oracle/qa.env" ;;
    *) echo "Unknown target '$target' (use: prod or qa)" >&2; return 2 ;;
  esac
  ORACLE_TARGET="$target"

  ssh_opts=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
  if [[ -n "${ORACLE_SSH_PRIVATE_KEY:-}" && -z "${DEPLOY_SSH_KEY:-}" ]]; then
    DEPLOY_SSH_KEY="$(mktemp)"
    trap 'rm -f "$DEPLOY_SSH_KEY"' EXIT
    printf '%s\n' "$ORACLE_SSH_PRIVATE_KEY" > "$DEPLOY_SSH_KEY"
    chmod 600 "$DEPLOY_SSH_KEY"
  fi
  if [[ -z "${DEPLOY_SSH_KEY:-}" && -f "$HOME/.ssh/oracle_deploy" ]]; then
    DEPLOY_SSH_KEY="$HOME/.ssh/oracle_deploy"  # the deploy key an earlier orb session created
  fi
  if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
    ssh_opts+=(-i "$DEPLOY_SSH_KEY" -o IdentitiesOnly=yes)
  fi
}

oracle_ssh() {
  ssh "${ssh_opts[@]}" "$SSH_TARGET" "$@"
}

# Value of KEY from the target's server .env, without printing it.
oracle_server_env() {
  oracle_ssh "grep -m1 '^$1=' '$APP_DIR/deploy/oracle/.env' | cut -d= -f2-"
}
