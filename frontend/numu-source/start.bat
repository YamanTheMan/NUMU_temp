@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org, install it, then run this file again.
  echo Or just double-click NUMU-demo.html instead.
  pause
  exit /b 1
)
echo Starting NUMU at http://127.0.0.1:4173  (close this window to stop)
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:4173"
node server.js
pause
