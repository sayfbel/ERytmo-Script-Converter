#!/bin/bash

echo "========================================="
echo " Starting ERytmo Desktop App (Local Mode)"
echo "========================================="

# 1. Activate Python virtual environment and ensure dependencies
if [ ! -d "backend/venv" ]; then
    echo ">> Creating Backend Virtual Environment..."
    python3 -m venv backend/venv
fi

echo ">> Activating Backend Virtual Environment..."
source backend/venv/bin/activate
pip install -r backend/requirements.txt -q

# 2. Check if Next.js static export exists
if [ ! -d "frontend/out" ]; then
    echo ">> First run detected: Building Next.js frontend (this may take a minute)..."
    cd frontend
    npm run build
    cd ..
fi

# 3. Start the Electron application
echo ">> Launching Desktop Application..."
cd frontend
npm run desktop
