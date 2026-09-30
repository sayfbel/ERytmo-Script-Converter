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
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if (
        request.url.path.startswith("/api/auth") or
        request.url.path.startswith("/auth") or
        request.url.path.startswith("/api/projects") or
        request.url.path.startswith("/api/me")
    ):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Authentication router (public registration/login/verification + self endpoints)
app.include_router(auth.router, prefix="/api")

# P2P Presence & WebSocket Signaling Router
app.include_router(p2p_signaling.router)

# System Browser (Chrome) Google Auth Landing Page
@app.get("/auth/google-browser", response_class=HTMLResponse)
def google_browser_auth_page():
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to ERytmo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://accounts.google.com/gsi/client" async defer></script>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }}
    .card {{
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1.5rem;
      padding: 2.5rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
      text-align: center;
    }}
    .logo-container {{
      width: 52px;
      height: 52px;
      background: #0f172a;
      border-radius: 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }}
    .logo-container img {{
      width: 32px;
      height: 32px;
      object-fit: contain;
    }}
    h1 {{
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }}
    p {{
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.75rem;
    }}
    .btn-container {{
      display: flex;
      justify-content: center;
      margin-bottom: 1.25rem;
      min-height: 44px;
    }}
    .status-box {{
      display: none;
      padding: 1rem;
      border-radius: 0.875rem;
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: 1rem;
    }}
    .status-success {{
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      display: block;
    }}
    .status-error {{
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      display: block;
    }}
    .status-loading {{
      background: #f0f9ff;
      color: #0369a1;
      border: 1px solid #bae6fd;
      display: block;
    }}
    .spinner {{
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid #0284c7;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-right: 0.5rem;
    }}
    @keyframes spin {{
      to {{ transform: rotate(360deg); }}
    }}
    .badge {{
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #e0e7ff;
      color: #4338ca;
      margin-bottom: 1rem;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">ERytmo Desktop Link</div>
    <br>
    <div class="logo-container">
      <img src="/app_logo.png" alt="ERytmo" onerror="this.style.display='none'">
    </div>
    <h1>Sign in with Google</h1>
    <p>Complete authentication in your browser to return to ERytmo Script Converter.</p>

    <div id="btnContainer" class="btn-container"></div>
    <div id="statusBox" class="status-box"></div>
  </div>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const clientId = '{GOOGLE_CLIENT_ID}';

    function setStatus(type, msg) {{
      const box = document.getElementById('statusBox');
      box.className = 'status-box status-' + type;
      if (type === 'loading') {{
        box.innerHTML = '<span class="spinner"></span> ' + msg;
      }} else {{
        box.innerHTML = msg;
      }}
    }}

    async function handleCredentialResponse(response) {{
      if (!sessionId) {{
        setStatus('error', 'Missing session ID. Please restart login from the desktop app.');
        return;
      }}
      setStatus('loading', 'Connecting with ERytmo desktop app...');
      try {{
        const res = await fetch('/api/auth/google/browser-submit', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{
            session_id: sessionId,
            credential: response.credential
          }})
        }});
        const data = await res.json();
        if (res.ok && data.success) {{
          document.getElementById('btnContainer').style.display = 'none';
          setStatus('success', '✓ Authentication successful! You can now close this tab and return to ERytmo.');
          setTimeout(() => {{
            try {{ window.close(); }} catch(e) {{}}
          }}, 2000);
        }} else {{
          setStatus('error', data.detail || 'Authentication failed. Please try again.');
        }}
      }} catch (err) {{
        setStatus('error', 'Connection failed. Please ensure the ERytmo app is running.');
      }}
    }}

    window.onload = function () {{
      if (!clientId) {{
        setStatus('error', 'Google Client ID is not configured in .env.');
        return;
      }}
      google.accounts.id.initialize({{
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: true
      }});
      google.accounts.id.renderButton(
        document.getElementById('btnContainer'),
        {{ theme: 'outline', size: 'large', type: 'standard', shape: 'pill', width: 340 }}
      );
      google.accounts.id.prompt();
    }};
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)

# Redirect /auth/google-popup directly to Google OAuth URL
@app.get("/auth/google-popup")
def google_popup_auth_page(session_id: str = ""):
    from backend.routes.auth import get_google_oauth_url
    oauth_url = get_google_oauth_url(session_id or "desktop_session")
    return RedirectResponse(url=oauth_url)

@app.post("/")
@app.post("/login")
async def google_redirect_callback(request: Request, db: Session = Depends(get_db)):
    """
    Receives Google OAuth form_post callback containing 'id_token' or 'credential'.
    Verifies user, destroys/closes the small Google window, sets session cookie,
    and updates session so the main desktop app immediately redirects to the dashboard.
    """
    form_data = await request.form()
    credential = form_data.get("id_token") or form_data.get("credential")
    state = form_data.get("state")
    if not credential:
        return HTMLResponse(
            content="<html><body><p>Missing credentials. Closing...</p><script>window.close();</script></body></html>"
        )

    try:
        user, token = process_google_auth_credential(str(credential).strip(), db, remember_me=True)
    except ValueError as e:
        return HTMLResponse(
            content=f"<html><body><p>Authentication error: {str(e)}</p><script>setTimeout(function(){{ window.close(); }}, 1500);</script></body></html>"
        )

    # Mark the pending session completed so main window poll triggers immediately
    if state:
        from backend.routes.auth import pending_browser_sessions
        session = pending_browser_sessions.get(state)
        if session:
            session["status"] = "completed"
            session["token"] = token
            session["user"] = {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "phone_number": user.phone_number,
                "email_verified": True
            }

    # Automatically close and hide the small Google window
    try:
        from backend.app import desktop_api
        desktop_api.close_google_auth()
    except Exception as e:
        print(f"[AUTH] desktop_api close notice: {e}")

    # Return auto-closing HTML response to the browser window
    html_close = """<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>✓ Signed in to ERytmo</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f8fafc;
      color: #0f172a;
    }
    .card {
      background: #ffffff;
      padding: 2.5rem 2rem;
      border-radius: 1.5rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      text-align: center;
      max-width: 400px;
      width: 90%;
    }
    .icon {
      width: 52px;
      height: 52px;
      background: #ecfdf5;
      color: #10b981;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: bold;
      margin-bottom: 1.25rem;
    }
    h2 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h2>Signed in successfully!</h2>
    <p>You can close this tab and return to the ERytmo desktop app.</p>
  </div>
  <script>
    setTimeout(function() {
      try { window.close(); } catch(e) {}
    }, 1500);
  </script>
</body>
</html>"""
    response = HTMLResponse(content=html_close)
    response.set_cookie(
        key="erytmo_token",
        value=token,
        httponly=True,
        max_age=REMEMBER_ME_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=False
    )
    return response

# Application business logic routes — strictly protected by server-side authentication
app.include_router(api.router, prefix="/api", dependencies=[Depends(get_current_user)])

# Custom StaticFiles handler that resolves Next.js static export paths
# (e.g. /login -> /login.html or /login/index.html)
class NextStaticFiles(StaticFiles):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1000})
            return
        await super().__call__(scope, receive, send)

    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code != 404:
            return response

        clean_path = path.strip("/")
        if clean_path:
            # Try with .html extension
            html_response = await super().get_response(f"{clean_path}.html", scope)
            if html_response.status_code != 404:
                return html_response

            # Try with /index.html
            index_response = await super().get_response(f"{clean_path}/index.html", scope)
            if index_response.status_code != 404:
                return index_response

        return response

# Serve the static Next.js export
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "out")
if os.path.exists(frontend_dir):
    app.mount("/", NextStaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    @app.get("/")
    def read_root():
        return {"status": "ok", "message": "ERytmo API is running. Frontend build not found."}
