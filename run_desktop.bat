@echo off
title DubFlow Desktop Application
echo ====================================================
echo    Launching DubFlow Desktop (Local Mode)
echo ====================================================

if not exist frontend\out (
    echo [Info] frontend\out folder not found. Building Next.js static export...
    cd frontend
    call npm run build
    cd ..
)

echo [Info] Starting Desktop App...
cd frontend
call npm run desktop
pause
