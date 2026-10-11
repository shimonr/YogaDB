#!/usr/bin/env bash
# Runs ON the Oracle VM (started by scripts/upload-photos.ps1). Usage: server-import-photos.sh <tarball>
# The tarball holds yoga_asanas.csv and the per-pose image folders. They replace the contents of
# /opt/apps/yogadb-data/asanas, the app is (re)deployed to use them, and the asanas and their
# photos are imported into the database. User-uploaded photos are kept.
set -euo pipefail

tarball="${1:?usage: server-import-photos.sh <tarball>}"
APP_DIR="${APP_DIR:-/opt/apps/yogadb}"
DATA_DIR="${DATA_DIR:-/opt/apps/yogadb-data}"
data="$DATA_DIR/asanas"

echo "==> Photos: unpacking into $data"
sudo mkdir -p "$DATA_DIR"
sudo chown "$(id -u):$(id -g)" "$DATA_DIR"
rm -rf "$data.new"
mkdir -p "$data.new" "$data"
tar -xf "$tarball" -C "$data.new"
rm -f "$tarball"
if [[ ! -f "$data.new/yoga_asanas.csv" ]]; then
  echo "The upload has no yoga_asanas.csv; nothing changed." >&2
  rm -rf "$data.new"
  exit 1
fi
# Sync in place (not rename) so the running backend's bind mount keeps pointing at it.
rsync -a --delete "$data.new/" "$data/"
rm -rf "$data.new"
echo "    $(find "$data" -type f | wc -l) files, $(du -sh "$data" | cut -f1)"

DATA_DIR="$DATA_DIR" bash "$APP_DIR/deploy/oracle/server-deploy.sh"

echo "==> Import: asanas and photos into the database"
docker_cmd=(docker)
docker info >/dev/null 2>&1 || docker_cmd=(sudo docker)
"${docker_cmd[@]}" compose -f "$APP_DIR/deploy/oracle/compose.yml" --env-file "$APP_DIR/deploy/oracle/.env" \
  exec -T backend python -m app.services.asana_import
