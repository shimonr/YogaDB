@echo off
rem Double-click to copy the YogaDB server backups to this PC.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\download-backups.ps1"
if errorlevel 1 (
  echo.
  echo Download failed - see the messages above.
  pause
  exit /b 1
)
pause
