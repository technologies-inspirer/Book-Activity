@echo off
rem Start PostgreSQL, Express and the frontend together.
cd /d "%~dp0"
call npm.cmd run dev -- --open
if errorlevel 1 pause
