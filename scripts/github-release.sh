#!/usr/bin/env bash
# Create (or update) the GitHub release for a pushed tag, with its CHANGELOG.md section as notes.
# Usage: scripts/github-release.sh [X.Y.Z]   (default: the version in VERSION). Needs an authenticated gh.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${1:-$(tr -d '[:space:]' < "$root/VERSION")}"
notes="$(awk -v v="$version" '$0 ~ "^## " v " " {on=1; next} on && /^## / {exit} on' "$root/CHANGELOG.md")"
[[ -n "${notes//[[:space:]]/}" ]] || { echo "CHANGELOG.md has no notes for $version" >&2; exit 1; }
if gh release view "v$version" >/dev/null 2>&1; then
  gh release edit "v$version" --title "YogaDB $version" --notes "$notes" >/dev/null
  echo "Updated release v$version"
else
  gh release create "v$version" --verify-tag --title "YogaDB $version" --notes "$notes" >/dev/null
  echo "Created release v$version"
fi
