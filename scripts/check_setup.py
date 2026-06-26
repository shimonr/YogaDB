"""Validate local setup after clone, move, or rename. Run from repo root."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def ok(msg: str) -> None:
    print(f"  OK   {msg}")


def warn(msg: str) -> None:
    print(f"  WARN {msg}")


def fail(msg: str) -> None:
    print(f"  FAIL {msg}")


def main() -> int:
    print("Yoga DB setup check\n")
    errors = 0

    # Python version
    if sys.version_info < (3, 11):
        fail(f"Python 3.11+ required (found {sys.version.split()[0]})")
        errors += 1
    else:
        ok(f"Python {sys.version.split()[0]}")

    # Node
    node = shutil.which("node")
    if not node:
        warn("node not found — install Node.js 20+ for frontend")
    else:
        ver = subprocess.check_output([node, "-v"], text=True).strip()
        ok(f"Node {ver}")

    # Backend files
    for path in (BACKEND / "requirements.txt", BACKEND / "app" / "main.py"):
        if path.is_file():
            ok(str(path.relative_to(ROOT)))
        else:
            fail(f"Missing {path.relative_to(ROOT)}")
            errors += 1

    # Frontend files
    for path in (FRONTEND / "package.json", FRONTEND / "src" / "main.tsx"):
        if path.is_file():
            ok(str(path.relative_to(ROOT)))
        else:
            fail(f"Missing {path.relative_to(ROOT)}")
            errors += 1

    # Env files
    if (BACKEND / ".env").is_file():
        ok("backend/.env exists")
        text = (BACKEND / ".env").read_text(encoding="utf-8")
        if "ASANAS_IMAGES_DIR" in text and "path/to" not in text.lower():
            ok("ASANAS_IMAGES_DIR appears configured")
        else:
            warn("Set ASANAS_IMAGES_DIR in backend/.env to your asana images folder")
        if "ASANAS_CSV_PATH" in text and "path/to" not in text.lower():
            ok("ASANAS_CSV_PATH appears configured")
        else:
            warn("Set ASANAS_CSV_PATH in backend/.env to your asana inventory CSV")
    else:
        warn("backend/.env missing — copy from backend/.env.example")

    if (FRONTEND / ".env").is_file():
        ok("frontend/.env exists")
    else:
        warn("frontend/.env missing — copy from frontend/.env.example")

    # Database
    db = BACKEND / "yogadb.db"
    if db.is_file():
        ok(f"Database found ({db.relative_to(ROOT)})")
    else:
        warn("No backend/yogadb.db — run: python scripts/init_db.py")

    # Venv / node_modules
    if (BACKEND / ".venv").is_dir():
        ok("backend/.venv exists")
    else:
        warn("No backend/.venv — run scripts/setup.ps1 or setup.sh")

    if (FRONTEND / "node_modules").is_dir():
        ok("frontend/node_modules exists")
    else:
        warn("No frontend/node_modules — run npm install in frontend/")

    print()
    if errors:
        print(f"{errors} error(s). See docs/DEVELOPMENT.md")
        return 1
    print("Check finished. Fix any WARN items before running the app.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
