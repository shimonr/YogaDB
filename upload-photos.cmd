@echo off
rem Double-click to upload the asana CSV and photos from this PC to the Oracle VM (see docs\DEPLOYMENT.md).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\upload-photos.ps1"
if errorlevel 1 (
  echo.
  echo Upload failed - see the messages above.
  pause
  exit /b 1
)
pause
