"""
DubFlow — Test Configuration & Shared Fixtures
===============================================
All tests use an isolated in-memory SQLite database.
No production data is touched. No network calls are made.
"""

import os
import sys
import io

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# ── Force a completely isolated in-memory SQLite DB for tests ────────────────
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-jwt-secret-not-for-production"
os.environ["ENVIRONMENT"] = "test"
# Disable SMTP so no real emails are sent during tests
os.environ["SMTP_USER"] = ""
os.environ["SMTP_PASSWORD"] = ""
os.environ["GOOGLE_CLIENT_ID"] = ""

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker
from starlette.testclient import TestClient

# ── Patch database before importing anything from the app ────────────────────
from backend.database import database as db_module

_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
_TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

db_module.engine = _test_engine
db_module.SessionLocal = _TestSessionLocal
db_module.SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
db_module.is_mysql = False

# ── Now import and initialise the app ────────────────────────────────────────
from backend.database.database import Base, init_db
from backend.models import models

def ensure_tables():
    """(Re-)create all tables on the test engine. Call at start of every setup_method."""
    Base.metadata.create_all(bind=_test_engine)

# Create tables on first import
ensure_tables()


from backend.main import app
from backend.database.database import get_db
from backend.services.auth_service import hash_password
from backend.services import rate_limiter as rl_module


def _get_test_db():
    db = _TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _get_test_db


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_client() -> TestClient:
    """Return a fresh TestClient (cookies reset between uses)."""
    return TestClient(app, raise_server_exceptions=True)


def reset_rate_limiter():
    """Clear all in-memory rate-limiter state between tests."""
    with rl_module._lock:
        rl_module._ip_store.clear()
        rl_module._account_store.clear()
        if hasattr(rl_module, "_registration_ip_store"):
            rl_module._registration_ip_store.clear()
        if hasattr(rl_module, "_forgot_password_ip_store"):
            rl_module._forgot_password_ip_store.clear()


def create_verified_user(
    email: str = "test@dubflow.io",
    password: str = "StudioPass1",
    first_name: str = "Test",
    last_name: str = "User",
    job_type: str = "Sound Engineer",
) -> models.User:
    """Insert a fully verified user directly into the test DB."""
    db = _TestSessionLocal()
    try:
        # Remove existing user with same email if any
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            db.delete(existing)
            db.commit()

        user = models.User(
            first_name=first_name,
            last_name=last_name,
            job_type=job_type,
            email=email,
            password_hash=hash_password(password),
            email_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def make_real_png(width: int = 10, height: int = 10) -> bytes:
    """Generate a minimal valid PNG using Pillow."""
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_real_jpeg(width: int = 10, height: int = 10) -> bytes:
    """Generate a minimal valid JPEG using Pillow."""
    from PIL import Image
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(0, 128, 255))
    img.save(buf, format="JPEG")
    return buf.getvalue()


def make_fake_png() -> bytes:
    """PNG magic bytes followed by garbage — passes magic check, fails Pillow."""
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 50 + b"GARBAGE_DATA_NOT_A_REAL_PNG"


def make_disguised_exe_as_jpg() -> bytes:
    """Windows EXE magic bytes — should be rejected at magic-byte stage."""
    return b"MZ\x90\x00" + b"\x00" * 100
