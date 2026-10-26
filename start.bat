@echo off
rem Start the React + Vite development server.
cd /d "%~dp0"
where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js and npm are required. Install Node.js, then run npm install.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run dev -- --host 127.0.0.1 --open
