#!/usr/bin/env bash
# Yoga DB — install dependencies (run from repo root)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Backend: Python venv + pip install"
cd "$ROOT/backend"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements-dev.txt
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "    Created backend/.env from .env.example (loads the sample asanas)"
fi

echo "==> Frontend: npm install"
cd "$ROOT/frontend"
npm install
if [[ ! -f .env ]]; then
  cp .env.example .env
fi

echo ""
echo "Setup complete."
echo "  1. Optional: point ASANAS_CSV_PATH / ASANAS_IMAGES_DIR in backend/.env at your own data"
echo "  2. cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --reload"
echo "  3. cd frontend && npm run dev"
echo "See docs/DEVELOPMENT.md for full instructions."
