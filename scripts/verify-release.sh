#!/usr/bin/env bash
# Check that a release is complete: version files agree, the changelog has an entry, everything is
# pushed and tagged, CI passed for the pushed commit, and the deployed site runs this version.
# Usage: scripts/verify-release.sh [prod|qa] [--e2e]
set -uo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="${1:-prod}"
run_e2e=0; [[ "${2:-}" == "--e2e" || "${1:-}" == "--e2e" ]] && run_e2e=1
[[ "$target" == "--e2e" ]] && target=prod
source "$root/deploy/oracle/config.env"
[[ "$target" == qa ]] && source "$root/deploy/oracle/qa.env"

failures=0
ok() { echo "  ok    $*"; }
bad() { echo "  FAIL  $*"; failures=$((failures + 1)); }

version="$(tr -d '[:space:]' < "$root/VERSION")"
echo "Release $version ($target: https://$DOMAIN)"

pkg="$(node -p "require('$root/frontend/package.json').version")"
[[ "$pkg" == "$version" ]] && ok "frontend/package.json is $pkg" || bad "frontend/package.json is $pkg, VERSION is $version"
grep -q "^## $version " "$root/CHANGELOG.md" && ok "CHANGELOG.md has a $version entry" || bad "CHANGELOG.md has no '## $version ' entry"
grep -q "$version" "$root/docs/HANDOFF.md" && ok "docs/HANDOFF.md mentions $version" || bad "docs/HANDOFF.md does not mention $version"

git -C "$root" fetch --quiet --tags origin "$BRANCH"
[[ -z "$(git -C "$root" status --porcelain)" ]] && ok "working tree is clean" || bad "uncommitted changes: $(git -C "$root" status --porcelain | wc -l) files"
head="$(git -C "$root" rev-parse HEAD)"
[[ "$head" == "$(git -C "$root" rev-parse "origin/$BRANCH")" ]] && ok "HEAD is pushed to origin/$BRANCH" || bad "HEAD differs from origin/$BRANCH"
if git -C "$root" ls-remote --exit-code --tags origin "refs/tags/v$version" >/dev/null; then ok "tag v$version is on origin"; else bad "tag v$version is not on origin"; fi

repo_path="$(sed -E 's#https://github.com/##; s#\.git$##' <<< "$REPO_URL")"
ci="$(curl -fsS "https://api.github.com/repos/$repo_path/actions/runs?head_sha=$head&per_page=5" 2>/dev/null \
  | python3 -c 'import json,sys; runs=[r for r in json.load(sys.stdin)["workflow_runs"] if r["name"]=="CI"]; print(f"{runs[0][\"status\"]}/{runs[0][\"conclusion\"]}" if runs else "missing")' 2>/dev/null || echo unknown)"
[[ "$ci" == "completed/success" ]] && ok "CI passed for ${head:0:7}" || bad "CI for ${head:0:7} is $ci (wait for it if it is still running)"

health="$(curl -fsS --max-time 15 "https://$DOMAIN/api/health" 2>/dev/null || echo unreachable)"
if [[ "$health" == *"\"version\":\"$version\""* && "$health" == *"\"commit\":\"${head:0:7}"* ]]; then
  ok "$target runs $version at ${head:0:7}"
else
  bad "$target reports $health (expected $version at ${head:0:7}); deploy it"
fi

if [[ $run_e2e == 1 ]]; then
  if (cd "$root/frontend" && E2E_BASE_URL="https://$DOMAIN" npx playwright test >/tmp/yogadb-e2e.log 2>&1); then
    ok "browser smoke tests passed ($(grep -Eo '[0-9]+ passed' /tmp/yogadb-e2e.log | tail -1))"
  else
    bad "browser smoke tests failed; see /tmp/yogadb-e2e.log"
  fi
fi

echo
[[ $failures == 0 ]] && echo "Release $version is complete." || echo "$failures check(s) failed."
exit $((failures > 0))
