# Yoga DB — install dependencies (run from repo root)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> Backend: Python venv + pip install"
Push-Location "$Root\backend"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\pip.exe install -r requirements.txt
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "    Created backend/.env from .env.example — edit ASANAS_IMAGES_DIR"
}
Pop-Location

Write-Host "==> Frontend: npm install"
Push-Location "$Root\frontend"
npm install
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}
Pop-Location

Write-Host ""
Write-Host "Setup complete."
Write-Host "  1. Edit backend/.env  (set ASANAS_IMAGES_DIR)"
Write-Host "  2. python scripts/init_db.py --images-dir <your-asanas-folder>"
Write-Host "  3. cd backend; .\.venv\Scripts\activate; python -m uvicorn app.main:app --reload"
Write-Host "  4. cd frontend; npm run dev"
Write-Host "See docs/DEVELOPMENT.md for full instructions."
