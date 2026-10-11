# Yoga DB - pull the latest code, install dependencies, start backend + frontend, open the browser.
# Usually started by double-clicking run-local.cmd in the repo root.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackendUrl = "http://localhost:8000/health"
$FrontendUrl = "http://localhost:5173"

function Test-PortListening([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-ForUrl([string]$Url, [int]$TimeoutSeconds = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 | Out-Null
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    return $false
}

function Start-ServerWindow([string]$Title, [string]$Directory, [string]$Command) {
    $quotedDirectory = $Directory -replace "'", "''"
    $script = "`$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location -LiteralPath '$quotedDirectory'; $Command"
    Start-Process powershell -ArgumentList "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $script
}

Set-Location -LiteralPath $Root

Write-Host "==> Pulling latest code"
git pull --ff-only
if ($LASTEXITCODE -ne 0) {
    throw "git pull failed (local changes or a diverged branch?). Fix it, then run this again."
}

Write-Host "==> Installing dependencies"
& "$PSScriptRoot\setup.ps1"

Write-Host "==> Starting backend (port 8000)"
if (Test-PortListening 8000) {
    Write-Host "    Port 8000 is already in use - assuming the backend is running (close its window to restart it)."
} else {
    Start-ServerWindow "Yoga DB backend" "$Root\backend" ".\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
}

Write-Host "==> Starting frontend (port 5173)"
if (Test-PortListening 5173) {
    Write-Host "    Port 5173 is already in use - assuming the frontend is running (close its window to restart it)."
} else {
    Start-ServerWindow "Yoga DB frontend" "$Root\frontend" "npm run dev"
}

Write-Host "==> Waiting for the servers"
if (-not (Wait-ForUrl $BackendUrl)) { throw "Backend did not respond at $BackendUrl - check the 'Yoga DB backend' window." }
if (-not (Wait-ForUrl $FrontendUrl)) { throw "Frontend did not respond at $FrontendUrl - check the 'Yoga DB frontend' window." }

Write-Host "==> Opening $FrontendUrl"
Start-Process $FrontendUrl
Write-Host ""
Write-Host "Yoga DB is running. Close the 'Yoga DB backend' and 'Yoga DB frontend' windows to stop it."
