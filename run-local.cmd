@echo off
rem Double-click to pull the latest code, install dependencies, start Yoga DB and open it in the browser.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-local.ps1"
if errorlevel 1 (
  echo.
  echo Something went wrong - see the messages above.
  pause
  exit /b 1
)
timeout /t 5 >nul
