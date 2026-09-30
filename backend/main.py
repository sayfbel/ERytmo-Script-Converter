from fastapi import FastAPI, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
import os
from sqlalchemy.orm import Session
from backend.database.database import engine, Base, init_db, get_db
from backend.routes import api, auth, p2p_signaling
from backend.routes.auth import (
    get_current_user,
    process_google_auth_credential,
    REMEMBER_ME_EXPIRE_DAYS,
    GOOGLE_CLIENT_ID
)

# Initialize database schema and migrations
init_db()

app = FastAPI(
    title="DubFlow Studio API",
    version="2.0",
    docs_url=None,
    redoc_url=None
)

# Setup CORS to allow Next.js frontend (local, preview, and production Vercel)
cors_origins = [
    "https://e-rytmo-script-converter.vercel.app",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
]
frontend_url_env = os.getenv("FRONTEND_URL")
if frontend_url_env:
    for origin in frontend_url_env.split(","):
        clean_origin = origin.strip().rstrip("/")
        if clean_origin and clean_origin not in cors_origins:
            cors_origins.append(clean_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https:\/\/(e-rytmo-script-converter|dubflow-studio)(-[a-z0-9-]+)?\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    is_api_or_auth = (
        path.startswith("/api") or
        path.startswith("/auth") or
        path in ("/", "/login")
    )
    has_set_cookie = "set-cookie" in response.headers

    # Strictly forbid caching for all API endpoints, auth endpoints, any response setting cookies, or HTML pages
    if is_api_or_auth or has_set_cookie:
        response.headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["Vary"] = "Cookie, Authorization, Accept-Encoding"
        response.headers["CDN-Cache-Control"] = "no-store"
        response.headers["Cloudflare-CDN-Cache-Control"] = "no-store"
        response.headers["Surrogate-Control"] = "no-store"
    return response

# Authentication router (public registration/login/verification + self endpoints)
app.include_router(auth.router, prefix="/api")

# P2P Presence & WebSocket Signaling Router
app.include_router(p2p_signaling.router)


@app.get('/')
def read_root():
    return {"status": "ok", "message": "ERytmo API is running."}

# Application business logic routes — strictly protected by server-side authentication
app.include_router(api.router, prefix="/api", dependencies=[Depends(get_current_user)])
