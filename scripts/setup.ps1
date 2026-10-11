# Yoga DB - install dependencies (run from repo root)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Update-PathFromRegistry {
    # Installers update PATH in the registry; pick that up without opening a new window.
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
}

function Find-Python {
    # Returns the command (as an array) for a real Python 3.11+, or $null.
    # "python" can be the Microsoft Store shortcut, which exists but isn't Python, so run each candidate.
    foreach ($candidate in @(@("py", "-3.12"), @("py", "-3"), @("python"), @("python3"))) {
        if (-not (Get-Command $candidate[0] -ErrorAction SilentlyContinue)) { continue }
        $pyArgs = @($candidate | Select-Object -Skip 1)
        try {
            $out = & $candidate[0] @pyArgs -c "import sys; print(sys.version_info >= (3, 11))" 2>$null
        } catch {
            continue
        }
        if ($LASTEXITCODE -eq 0 -and "$out".Trim() -eq "True") { return , $candidate }
    }
    return $null
}

function Install-WithWinget([string]$Name, [string]$PackageId) {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { return }
    $answer = Read-Host "$Name was not found. Install it now with winget ($PackageId)? [Y/n]"
    if ($answer -match '^(n|no)$') { return }
    winget install -e --id $PackageId --accept-package-agreements --accept-source-agreements
    Update-PathFromRegistry
}

Write-Host "==> Checking Python and Node.js"
$python = Find-Python
if (-not $python) {
    Install-WithWinget "Python 3.11+" "Python.Python.3.12"
    $python = Find-Python
}
if (-not $python) {
    throw "Python 3.11+ is required. Install it from https://www.python.org/downloads/ (tick 'Add python.exe to PATH'), then run this again."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Install-WithWinget "Node.js" "OpenJS.NodeJS.LTS"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js 20+ is required. Install the LTS version from https://nodejs.org/, then run this again."
}

Write-Host "==> Backend: Python venv + pip install"
Push-Location "$Root\backend"
try {
    $venvPython = ".\.venv\Scripts\python.exe"
    if (-not (Test-Path $venvPython)) {
        if (Test-Path ".venv") { Remove-Item -Recurse -Force ".venv" }  # left over from a failed attempt
        $pyArgs = @($python | Select-Object -Skip 1)
        & $python[0] @pyArgs -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw "Creating the Python virtual environment failed." }
    }
    & $venvPython -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw "Upgrading pip failed." }
    & $venvPython -m pip install -r requirements-dev.txt
    if ($LASTEXITCODE -ne 0) { throw "Installing Python dependencies failed." }
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "    Created backend/.env from .env.example (loads the sample asanas)"
    }
} finally {
    Pop-Location
}

Write-Host "==> Frontend: npm install"
Push-Location "$Root\frontend"
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Setup complete."
Write-Host "  1. Optional: point ASANAS_CSV_PATH / ASANAS_IMAGES_DIR in backend/.env at your own data"
Write-Host "  2. cd backend; .\.venv\Scripts\activate; python -m uvicorn app.main:app --reload"
Write-Host "  3. cd frontend; npm run dev"
Write-Host "See docs/DEVELOPMENT.md for full instructions."
