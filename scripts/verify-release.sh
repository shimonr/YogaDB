#!/usr/bin/env bash
# Check that a release is complete and the deployed site is healthy.
# Usage: scripts/verify-release.sh [prod|qa] [--e2e] [--no-wait] [--site-only]
#   release:  version files agree, changelog + handoff mention it, tree clean and pushed, tag and
#             GitHub release exist, CI passed (waits up to 15 minutes for a running CI)
#   site:     the target runs this version at HEAD; prod: backups fresh on the VM and off-site,
#             uptime monitor running; qa: test mailbox up
#   --e2e:    Playwright smoke tests (login credentials are read from the server .env unless
#             E2E_PASSWORD is set; data-changing QA tests only with E2E_QA_FLOWS / E2E_QA_RESET)
#   --site-only: skip the release checks (for a release candidate on QA before bump and tag)
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target=prod run_e2e=0 wait_ci=1 site_only=0
for arg in "$@"; do
  case "$arg" in
    prod|qa) target="$arg" ;;
    --e2e) run_e2e=1 ;;
    --no-wait) wait_ci=0 ;;
    --site-only) site_only=1 ;;
    *) echo "Usage: $0 [prod|qa] [--e2e] [--no-wait] [--site-only]" >&2; exit 2 ;;
  esac
done
# shellcheck source=lib/oracle.sh
source "$root/scripts/lib/oracle.sh"
oracle_load "$target" || exit 2

failures=0
ok() { echo "  ok    $*"; }
bad() { echo "  FAIL  $*"; failures=$((failures + 1)); }
github() { curl -fsS "https://api.github.com/repos/$repo_path/$1" 2>/dev/null; }

version="$(tr -d '[:space:]' < "$root/VERSION")"
repo_path="$(sed -E 's#https://github.com/##; s#\.git$##' <<< "$REPO_URL")"
echo "Release $version ($target: https://$DOMAIN)"

head="$(git -C "$root" rev-parse HEAD)"
# --- release ---
if [[ $site_only == 0 ]]; then
pkg="$(node -p "require('$root/frontend/package.json').version")"
[[ "$pkg" == "$version" ]] && ok "frontend/package.json is $pkg" || bad "frontend/package.json is $pkg, VERSION is $version"
grep -q "^## $version " "$root/CHANGELOG.md" && ok "CHANGELOG.md has a $version entry" || bad "CHANGELOG.md has no '## $version ' entry"
grep -q "$version" "$root/docs/HANDOFF.md" && ok "docs/HANDOFF.md mentions $version" || bad "docs/HANDOFF.md does not mention $version"

git -C "$root" fetch --quiet --tags origin "$BRANCH"
[[ -z "$(git -C "$root" status --porcelain)" ]] && ok "working tree is clean" || bad "uncommitted changes: $(git -C "$root" status --porcelain | wc -l) files"
head="$(git -C "$root" rev-parse HEAD)"
[[ "$head" == "$(git -C "$root" rev-parse "origin/$BRANCH")" ]] && ok "HEAD is pushed to origin/$BRANCH" || bad "HEAD differs from origin/$BRANCH"
if git -C "$root" ls-remote --exit-code --tags origin "refs/tags/v$version" >/dev/null; then ok "tag v$version is on origin"; else bad "tag v$version is not on origin"; fi
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  gh release view "v$version" --repo "$repo_path" >/dev/null 2>&1 && ok "GitHub release v$version exists" || bad "no GitHub release v$version (scripts/github-release.sh)"
fi

ci_status() {
  github "actions/runs?head_sha=$head&per_page=10" | python3 -c 'import json, sys
runs = [r for r in json.load(sys.stdin)["workflow_runs"] if r["name"] == "CI"]
print("%s/%s" % (runs[0]["status"], runs[0]["conclusion"]) if runs else "missing")' 2>/dev/null || echo unknown
}
ci="$(ci_status)"
if [[ $wait_ci == 1 ]]; then  # right after a push CI is "missing" or still running
  for _ in $(seq 1 60); do
    case "$ci" in completed/*|unknown) break ;; esac
    sleep 15
    ci="$(ci_status)"
  done
fi
[[ "$ci" == "completed/success" ]] && ok "CI passed for ${head:0:7}" || bad "CI for ${head:0:7} is $ci"
fi

# --- site ---
health="$(curl -fsS --max-time 15 "https://$DOMAIN/api/health" 2>/dev/null || echo unreachable)"
if [[ "$health" == *"\"version\":\"$version\""* && "$health" == *"\"commit\":\"${head:0:7}"* ]]; then
  ok "$target runs $version at ${head:0:7}"
else
  bad "$target reports $health (expected $version at ${head:0:7}); deploy it"
fi

if [[ "$target" == prod ]]; then
  age_h="$(oracle_ssh "f=\$(ls -t /opt/backups/$PROJECT/*.sql.gz 2>/dev/null | head -1); [ -n \"\$f\" ] && echo \$(( (\$(date +%s) - \$(stat -c %Y \"\$f\")) / 3600 ))" 2>/dev/null)"
  [[ -n "$age_h" && "$age_h" -lt 26 ]] && ok "newest database backup on the VM is ${age_h}h old" || bad "newest database backup on the VM is ${age_h:-missing}h old (expected < 26h)"
  offsite="$(oracle_ssh "cd $APP_DIR/deploy/oracle && docker compose -p $PROJECT --env-file .env exec -T backup-offsite python -c '
from datetime import UTC, datetime
from app.services import offsite_backup as o
if not o.configure(): print(\"off\")
else:
    files = o.remote_files()
    print(int((datetime.now(UTC) - max(files.values())).total_seconds() // 3600) if files else \"none\")'" 2>/dev/null | tail -1)"
  [[ "$offsite" =~ ^[0-9]+$ && "$offsite" -lt 50 ]] && ok "newest off-site backup copy is ${offsite}h old" || bad "off-site backups: ${offsite:-unknown} (expected a copy < 50h old)"
  uptime="$(github "actions/workflows/uptime.yml/runs?per_page=1" | python3 -c 'import json, sys
from datetime import UTC, datetime
runs = json.load(sys.stdin)["workflow_runs"]
r = runs[0] if runs else None
print("%s %d" % (r["conclusion"], (datetime.now(UTC) - datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))).total_seconds() // 3600) if r else "never")' 2>/dev/null || echo unknown)"
  [[ "$uptime" =~ ^success\ ([0-9]+)$ && "${BASH_REMATCH[1]}" -lt 3 ]] && ok "uptime monitor ran successfully ${BASH_REMATCH[1]}h ago" || bad "uptime monitor: last run '$uptime' (expected success < 3h ago; GitHub may be skipping the schedule)"
else
  mail="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://mail.$DOMAIN/" 2>/dev/null)"
  [[ "$mail" == 401 ]] && ok "QA test mailbox is up (asks for login)" || bad "QA test mailbox https://mail.$DOMAIN answered $mail (expected 401)"
fi

# --- browser tests ---
if [[ $run_e2e == 1 ]]; then
  export E2E_BASE_URL="https://$DOMAIN" E2E_USERNAME="${E2E_USERNAME:-shimon}"
  [[ -n "${E2E_PASSWORD:-}" ]] || E2E_PASSWORD="$(oracle_server_env ADMIN_PASSWORD 2>/dev/null)"
  [[ "$target" == qa && -z "${E2E_MAILPIT_PASSWORD:-}" ]] && E2E_MAILPIT_PASSWORD="$(oracle_server_env MAILPIT_PASSWORD 2>/dev/null)"
  export E2E_PASSWORD E2E_MAILPIT_PASSWORD
  log="$(mktemp /tmp/yogadb-e2e.XXXX.log)"
  if (cd "$root/frontend" && npx playwright test >"$log" 2>&1); then
    ok "browser tests passed ($(grep -Eo '[0-9]+ passed' "$log" | tail -1), $(grep -Eo '[0-9]+ skipped' "$log" | tail -1 || echo '0 skipped'))"
  else
    bad "browser tests failed; see $log"
  fi
fi

echo
[[ $failures == 0 ]] && echo "Release $version is complete on $target." || echo "$failures check(s) failed on $target."
exit $((failures > 0))
