# Yoga DB — install dependencies (run from repo root)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==> Backend: Python venv + pip install"
Push-Location "$Root\backend"
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\pip.exe install -r requirements-dev.txt
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "    Created backend/.env from .env.example (loads the sample asanas)"
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
Write-Host "  1. Optional: point ASANAS_CSV_PATH / ASANAS_IMAGES_DIR in backend/.env at your own data"
Write-Host "  2. cd backend; .\.venv\Scripts\activate; python -m uvicorn app.main:app --reload"
Write-Host "  3. cd frontend; npm run dev"
Write-Host "See docs/DEVELOPMENT.md for full instructions."
