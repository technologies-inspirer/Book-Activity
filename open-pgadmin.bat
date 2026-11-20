@echo off
cd /d "%~dp0"
node "%~dp0backend\scripts\open-pgadmin.js"
if errorlevel 1 pause
