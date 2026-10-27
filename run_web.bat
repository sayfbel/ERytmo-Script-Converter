@echo off
title DubFlow Web Mode
echo ====================================================
echo    Launching DubFlow in Web Mode (Browser)
echo ====================================================

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "DubFlow FastAPI Backend" cmd /k "cd /d \"%~dp0\" && python -m uvicorn backend.main:app --app-dir web --reload --port 8000"

echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
cd /d "%~dp0web\frontend"
call npm run dev
pause

