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
pip install -r requirements.txt
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "    Created backend/.env from .env.example — edit ASANAS_IMAGES_DIR"
fi

echo "==> Frontend: npm install"
cd "$ROOT/frontend"
npm install
if [[ ! -f .env ]]; then
  cp .env.example .env
fi

echo ""
echo "Setup complete."
echo "  1. Edit backend/.env  (set ASANAS_IMAGES_DIR)"
echo "  2. python scripts/init_db.py --images-dir <your-asanas-folder>"
echo "  3. cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --reload"
echo "  4. cd frontend && npm run dev"
echo "See docs/DEVELOPMENT.md for full instructions."
