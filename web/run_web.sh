#!/bin/bash
# ==============================================================================
# DubFlow Web — Start Script (Backend FastAPI + Frontend Next.js)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================================"
echo "  🚀 Starting DubFlow Web Application"
echo "========================================================"

# Trap SIGINT / SIGTERM to cleanly shut down both servers
cleanup() {
    echo ""
    echo "🛑 Shutting down DubFlow Web servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend (FastAPI on http://localhost:8000)
echo "📦 [1/2] Starting Backend API on http://localhost:8000 ..."
PYTHONPATH="$SCRIPT_DIR" "$SCRIPT_DIR/backend/venv/bin/python" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir "$SCRIPT_DIR/backend" &
BACKEND_PID=$!

# 2. Start Frontend (Next.js on http://localhost:3000)
echo "💻 [2/2] Starting Frontend Next.js on http://localhost:3000 ..."
(cd "$SCRIPT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✨ Both servers are running!"
echo "   - Web App UI:  http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   Press Ctrl+C to stop both servers."
echo "========================================================"

# Wait for background processes
wait
