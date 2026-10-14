#!/usr/bin/env bash
# Bump the app version in VERSION and frontend/package.json (+ lockfile).
# Usage: scripts/bump-version.sh patch|minor|major|X.Y.Z   (prints the new version)
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
current="$(tr -d '[:space:]' < "$root/VERSION")"
IFS=. read -r major minor patch <<< "$current"
case "${1:-}" in
  patch) next="$major.$minor.$((patch + 1))" ;;
  minor) next="$major.$((minor + 1)).0" ;;
  major) next="$((major + 1)).0.0" ;;
  [0-9]*.[0-9]*.[0-9]*) next="$1" ;;
  *) echo "Usage: $0 patch|minor|major|X.Y.Z" >&2; exit 2 ;;
esac

echo "$next" > "$root/VERSION"
(cd "$root/frontend" && npm version "$next" --no-git-tag-version --allow-same-version >/dev/null)
echo "$next"
