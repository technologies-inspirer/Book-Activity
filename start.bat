@echo off
rem Opens Javed Publishers in the browser. YouTube videos only play over http, so the site runs through a small local server.
rem Uses Python when the PC has it, otherwise the PowerShell server that comes with Windows.
cd /d "%~dp0"
start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & start "" http://127.0.0.1:5173/"
python -c "pass" >nul 2>&1
if %errorlevel%==0 (
  python tools\serve.py
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File tools\serve.ps1
)
pause
