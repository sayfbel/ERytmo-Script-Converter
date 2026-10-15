# DubFlow Studio (v2.0) 🎬

DubFlow is a professional dubbing workflow, script conversion, and studio collaboration platform. It is architected as a clean monorepo with two independent, fully autonomous applications:

```text
DubFlow/
├── desktop/                  # 🖥️ Standalone Desktop App (Electron + Local FastAPI)
│   ├── backend/              # Local FastAPI Backend (SQLite default, Host OS integration)
│   ├── frontend/             # Electron + Next.js 14 Desktop UI
│   ├── run_desktop.sh        # 1-Click Launch Script
│   └── .env                  # Desktop environment configuration
│
└── web/                      # 🌐 Standalone Cloud Web App (Next.js + Cloud FastAPI)
    ├── backend/              # Cloud FastAPI Backend (File streaming, MySQL/PostgreSQL)
    ├── frontend/             # Pure Next.js 14 Web Frontend (Vercel / Browser downloads)
    ├── Dockerfile            # Container deployment manifest
    ├── render.yaml           # Render deployment configuration
    └── .env                  # Cloud environment configuration
```

---

## 🖥️ 1. Desktop Application (`desktop/`)

Designed for local audio/video editors and studio engineers who need direct access to local files and offline capabilities.

### Key Features:
* **Electron Window**: Native desktop window with zero browser address bar distractions.
* **Local File System**: Direct host OS file opening, folder explorer browsing, and automatic reveal in File Explorer / Finder.
* **Zero-Setup Database**: Auto-initializes an embedded SQLite database (`erytmo.db`) locally with no external database server needed.
* **Native Downloads**: Generates `.xlsx` and `.docx` directly into the system's `Downloads` folder.

### Running Desktop App:
```bash
cd desktop
chmod +x run_desktop.sh
./run_desktop.sh
```
*Or manually:*
```bash
# Terminal 1: Backend
cd desktop/backend
source venv/bin/activate
uvicorn backend.main:app --port 8000

# Terminal 2: Frontend & Electron
cd desktop/frontend
npm run desktop
```

---

## 🌐 2. Cloud Web Application (`web/`)

Designed for cloud hosting (e.g. Render, Vercel, Docker, VPS) for distributed teams and clients.

### Key Features:
* **Pure Next.js Web Frontend**: Deploys seamlessly to Vercel or any Node.js hosting platform with zero Electron dependencies.
* **Direct Browser File Streaming**: Uses `FileResponse` to stream `.xlsx` and `.docx` downloads directly into the user's web browser, with automatic background cleanup of temporary server files.
* **Cloud Database Ready**: Built-in support for MySQL (e.g., Aiven, PlanetScale, XAMPP) or PostgreSQL via `DATABASE_URL` with connection pooling and keepalive pinging.
* **Security Hardened**: Advanced rate limiting, reverse proxy IP header resolution, magic byte file inspection, PBKDF2 hashing, and token revocation.

### Running Web App Locally:
```bash
# Terminal 1: Cloud Backend
cd web/backend
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Cloud Frontend
cd web/frontend
npm run dev
# Open http://localhost:3000 in your browser
```

### Deploying Web App with Docker:
```bash
cd web
docker build -t dubflow-web .
docker run -p 7860:7860 dubflow-web
```

---

## 🛡️ Security & Test Suite

Both backend implementations include a comprehensive regression test suite with **81 automated security tests**:
```bash
# Test Desktop backend:
python desktop/backend/tests/run_all_tests.py

# Test Web backend:
python web/backend/tests/run_all_tests.py
```

---

## 📜 License
MIT License. DubFlow Studio 2026.
