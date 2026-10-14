@echo off
rem Double-click to deploy the latest pushed code to the QA copy of YogaDB on the Oracle VM.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\deploy.ps1" -Target qa
if errorlevel 1 (
  echo.
  echo Deploy failed - see the messages above.
  pause
  exit /b 1
)
pause
