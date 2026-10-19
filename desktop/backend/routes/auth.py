from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import subprocess
import shutil
import re
import datetime
import hashlib
import webbrowser
import secrets

from backend.services.rate_limiter import (
    check_login_rate_limit,
    record_failed_login,
    record_successful_login,
    get_client_ip,
    RateLimitExceeded,
    clear_account_lockout,
)


def _detect_image_type(data: bytes) -> Optional[str]:
    """
    Detects image type by inspecting magic bytes (file signature).
    Returns one of: 'jpeg', 'png', 'webp', 'gif', or None if unrecognised.
    Replaces the removed imghdr standard library module (removed in Python 3.13+).
    """
    if len(data) < 4:
        return None
    # JPEG: FF D8 FF
    if data[:3] == b'\xff\xd8\xff':
        return 'jpeg'
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'
    # GIF: 47 49 46 38 (GIF8)
    if data[:4] in (b'GIF8', b'GIF9'):
        return 'gif'
    # WebP: RIFF????WEBP
    if data[:4] == b'RIFF' and len(data) >= 12 and data[8:12] == b'WEBP':
        return 'webp'
    return None

from backend.database.database import get_db
from backend.models import models
from backend.services.auth_service import (
    hash_password,
    verify_password,
    generate_verification_code,
    hash_verification_code,
    verify_verification_code,
    create_access_token,
    decode_access_token,
    send_verification_email,
    verify_google_id_token,
    VERIFICATION_CODE_EXPIRE_MINUTES,
    MAX_VERIFICATION_ATTEMPTS,
    RESEND_COOLDOWN_SECONDS,
    REMEMBER_ME_EXPIRE_DAYS,
    DEFAULT_SESSION_EXPIRE_HOURS,
    GOOGLE_CLIENT_ID
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ==========================================
# In-Memory Store for System Browser Auth
# ==========================================
pending_browser_sessions: dict[str, dict] = {}

def cleanup_expired_browser_sessions():
    now = datetime.datetime.utcnow()
    expired = [
        sid for sid, data in pending_browser_sessions.items()
        if (now - data["created_at"]).total_seconds() > 300  # 5 min expiry
    ]
    for sid in expired:
        pending_browser_sessions.pop(sid, None)


# ==========================================
# Pydantic Request Models
# ==========================================

class RegisterPayload(BaseModel):
    first_name: str
    last_name: str
    job_type: str
    email: str
    password: str
    confirm_password: str
    phone_number: Optional[str] = None

class CompleteProfilePayload(BaseModel):
    first_name: str
    last_name: str
    job_type: str

class VerifyEmailPayload(BaseModel):
    email: str
    code: str

class ResendCodePayload(BaseModel):
    email: str

class LoginPayload(BaseModel):
    email: str
    password: str
    remember_me: bool = False

class GoogleAuthPayload(BaseModel):
    credential: str
    remember_me: bool = True

class BrowserStartPayload(BaseModel):
    remember_me: bool = True

class BrowserSubmitPayload(BaseModel):
    session_id: str
    credential: str

class DesktopClaimPayload(BaseModel):
    session_id: str

class UpdateProfilePayload(BaseModel):
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    job_type: str
    is_private: Optional[bool] = False

class ChangePasswordPayload(BaseModel):
    code: str
    new_password: str
    confirm_password: str

class ForgotPasswordRequestPayload(BaseModel):
    email: str

class ForgotPasswordVerifyCodePayload(BaseModel):
    email: str
    code: str

class ForgotPasswordResetPayload(BaseModel):
    email: Optional[str] = None
    code: Optional[str] = None
    reset_token: Optional[str] = None
    new_password: str
    confirm_password: str


# ==========================================
# Helper: Extract Token from Request
# ==========================================

def get_token_from_request(request: Request) -> Optional[str]:
    # 1. Prefer HttpOnly cookie (primary secure session source)
    cookie_token = request.cookies.get("dubflow_token") or request.cookies.get("erytmo_token")
    if cookie_token:
        return cookie_token.strip()

    # 2. Check Authorization Bearer header as secondary fallback for external tooling
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1].strip()
        
    return None

def set_auth_cookie(response: Response, token: str, max_age_seconds: int):
    """
    Sets the session cookie with cross-origin HTTPS support (samesite=none, secure=True)
    when running in production (e.g. Render / Vercel), and lax for local development.
    """
    is_prod = (
        os.getenv("ENVIRONMENT") == "production" or
        os.getenv("RENDER") is not None or
        os.getenv("SECURE_COOKIES", "").lower() == "true"
    )
    response.set_cookie(
        key="dubflow_token",
        value=token,
        httponly=True,
        max_age=max_age_seconds,
        samesite="none" if is_prod else "lax",
        secure=is_prod,
        path="/"
    )
    response.delete_cookie(key="erytmo_token", path="/")

def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    # Server-side revocation verification
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    revoked = db.query(models.RevokedToken).filter(models.RevokedToken.token_hash == token_hash).first()
    if revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session has been logged out. Please log in again.")
        
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    if payload.get("scope") == "password_reset":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token scope for session")
        
    try:
        user_id = int(payload["sub"])
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Session invalidation: verify token_version against current user token_version
    user_token_version = getattr(user, "token_version", 1) or 1
    token_version = payload.get("token_version")
    if token_version is not None and token_version != user_token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired due to a password change or security update. Please log in again."
        )
    if token_version is None and user_token_version > 1:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired due to a password change or security update. Please log in again."
        )

    # Session invalidation: verify token issuance time against password_changed_at
    if user.password_changed_at and payload.get("iat"):
        if payload["iat"] < int(user.password_changed_at.timestamp()) - 2:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired due to a password change or security update. Please log in again."
            )

    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[models.User]:
    token = get_token_from_request(request)
    if not token:
        return None

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    revoked = db.query(models.RevokedToken).filter(models.RevokedToken.token_hash == token_hash).first()
    if revoked:
        return None

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None

    if payload.get("scope") == "password_reset":
        return None

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        return None

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None

    user_token_version = getattr(user, "token_version", 1) or 1
    token_version = payload.get("token_version")
    if token_version is not None and token_version != user_token_version:
        return None
    if token_version is None and user_token_version > 1:
        return None

    if user.password_changed_at and payload.get("iat"):
        if payload["iat"] < int(user.password_changed_at.timestamp()) - 2:
            return None

    return user


# ==========================================
# Endpoints
# ==========================================

@router.get("/config")
def get_auth_config():
    """
    Returns public authentication configuration for the frontend (e.g. Google Client ID).
    Never exposes secrets!
    """
    return {
        "google_client_id": GOOGLE_CLIENT_ID
    }

@router.post("/register")
def register_user(payload: RegisterPayload, db: Session = Depends(get_db)):
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    job_type = payload.job_type.strip()
    email = payload.email.strip().lower()
    password = payload.password
    confirm_password = payload.confirm_password
    phone_number = payload.phone_number.strip() if payload.phone_number else None

    # 1. Validate First Name, Last Name, and Job Type
    if not first_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="First name cannot be empty.")
    if not last_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Last name cannot be empty.")
    if not job_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job title / profession is required.")

    # 2. Validate Email Format
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_regex, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address.")

    # 3. Validate Password Security (P1 — Strengthened policy)
    if len(password) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 10 characters long."
        )
    if len(password) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must not exceed 128 characters."
        )
    # Require at least one letter AND one digit — encourage passphrases, block pure numbers/letters
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter and one number."
        )
    # Block trivially common passwords
    _COMMON_PASSWORDS = {
        "password1", "password123", "12345678", "123456789", "1234567890",
        "qwerty123", "iloveyou1", "admin1234", "welcome1", "letmein1",
        "monkey123", "dragon123", "master123", "passw0rd", "p@ssword1",
    }
    if password.lower() in _COMMON_PASSWORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password is too common. Please choose a stronger, unique password."
        )
    if password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password and Confirm Password do not match."
        )

    # 4. Validate Optional Phone Number
    if phone_number:
        phone_clean = re.sub(r'[\s\-\(\)\.]', '', phone_number)
        if not re.match(r'^\+?[0-9]{7,15}$', phone_clean):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid phone number or leave it blank.")

    # 5. Check Duplicate Email
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        if existing_user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered. Please log in instead."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email is already awaiting verification. Please check your inbox or log in to verify your account."
            )

    # Create brand-new user (unverified)
    user = models.User(
        first_name=first_name,
        last_name=last_name,
        job_type=job_type,
        email=email,
        password_hash=hash_password(password),
        phone_number=phone_number,
        email_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 6. Invalidate previous unused codes for this user
    db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id,
        models.EmailVerification.is_used == False
    ).update({"is_used": True})

    # 7. Generate 6-digit verification code & store securely (hashed)
    code = generate_verification_code()
    code_hash = hash_verification_code(code)
    now = datetime.datetime.utcnow()
    expires_at = now + datetime.timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)
    resend_available_at = now + datetime.timedelta(seconds=RESEND_COOLDOWN_SECONDS)

    verification_record = models.EmailVerification(
        user_id=user.id,
        code_hash=code_hash,
        attempts=0,
        expires_at=expires_at,
        resend_available_at=resend_available_at,
        is_used=False
    )
    db.add(verification_record)
    db.commit()

    # 8. Send verification code via SMTP
    send_verification_email(email, code, first_name)

    return {
        "success": True,
        "email": email,
        "message": f"Verification code sent to {email}."
    }


@router.post("/verify-email")
def verify_email(payload: VerifyEmailPayload, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    candidate_code = payload.code.strip()

    if not candidate_code or len(candidate_code) != 6 or not candidate_code.isdigit():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code must be exactly 6 digits.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This verification code has already been used and this account is already verified. Please log in."
        )

    # Find the latest active verification record
    verification = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id,
        models.EmailVerification.is_used == False
    ).order_by(models.EmailVerification.id.desc()).first()

    if not verification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active verification code found. Please request a new code.")

    # Check expiration
    now = datetime.datetime.utcnow()
    if now > verification.expires_at:
        verification.is_used = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired. Please request a new code.")

    # Check brute-force attempts
    if verification.attempts >= MAX_VERIFICATION_ATTEMPTS:
        verification.is_used = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum verification attempts exceeded. Please request a new code.")

    # Increment attempt count
    verification.attempts += 1

    # Verify code using constant-time hash comparison
    if not verify_verification_code(candidate_code, verification.code_hash):
        remaining = MAX_VERIFICATION_ATTEMPTS - verification.attempts
        db.commit()
        if remaining > 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Incorrect code. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining.")
        else:
            verification.is_used = True
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect code. Maximum attempts exceeded. Please request a new code.")

    # Code is valid! Mark code used and activate account
    verification.is_used = True
    user.email_verified = True
    user.updated_at = now
    db.commit()
    db.refresh(user)

    clear_account_lockout(user.email)

    # Issue persistent session token
    token = create_access_token(
        {"sub": user.id, "email": user.email, "token_version": getattr(user, "token_version", 1) or 1},
        remember_me=True
    )

    # Set secure cookie (supports HTTPS cross-origin in cloud)
    set_auth_cookie(response, token, REMEMBER_ME_EXPIRE_DAYS * 86400)

    return {
        "success": True,
        "message": "Email verified successfully! Welcome to DubFlow.",
        "token": token,
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "job_type": user.job_type,
            "email": user.email,
            "phone_number": user.phone_number,
            "email_verified": True,
            "is_private": user.is_private,
            "avatar_url": user.avatar_url
        }
    }


@router.post("/resend-code")
def resend_verification_code(payload: ResendCodePayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    if user.email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already verified. Please log in.")

    # Rate limiting: Check cooldown of latest verification record
    latest = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id
    ).order_by(models.EmailVerification.id.desc()).first()

    now = datetime.datetime.utcnow()
    if latest and latest.resend_available_at and now < latest.resend_available_at:
        wait_seconds = int((latest.resend_available_at - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {max(1, wait_seconds)} seconds before requesting a new code."
        )

    # Invalidate old unused codes
    db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id,
        models.EmailVerification.is_used == False
    ).update({"is_used": True})

    # Generate fresh 6-digit code
    code = generate_verification_code()
    code_hash = hash_verification_code(code)
    expires_at = now + datetime.timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)
    resend_available_at = now + datetime.timedelta(seconds=RESEND_COOLDOWN_SECONDS)

    verification = models.EmailVerification(
        user_id=user.id,
        code_hash=code_hash,
        attempts=0,
        expires_at=expires_at,
        resend_available_at=resend_available_at,
        is_used=False
    )
    db.add(verification)
    db.commit()

    # Send email
    send_verification_email(email, code, user.first_name)

    return {
        "success": True,
        "message": f"A new verification code has been sent to {email}."
    }


@router.post("/login")
def login_user(payload: LoginPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password
    remember_me = payload.remember_me
    client_ip = get_client_ip(request)

    # ── P0: Rate Limiting — check BEFORE any DB query to prevent timing oracle ──
    try:
        check_login_rate_limit(ip=client_ip, email=email)
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=exc.message,
            headers={"Retry-After": str(exc.retry_after_seconds)}
        )

    # ── P1: Anti-Enumeration — unified error for missing user AND wrong password ──
    _INVALID_CREDENTIALS_MSG = "Incorrect email or password. Please try again."

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Record failed attempt even for non-existent accounts to prevent probing
        record_failed_login(ip=client_ip, email=email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_INVALID_CREDENTIALS_MSG
        )

    # Check password — unified error message (no differentiation from missing user)
    if not user.password_hash or not verify_password(password, user.password_hash):
        record_failed_login(ip=client_ip, email=email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_INVALID_CREDENTIALS_MSG
        )

    # Check email verification status — this IS intentionally distinct (non-security UX)
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Your email has not been verified yet. Please enter the verification code.",
                "email": user.email
            }
        )

    # ── Successful login: clear account-level rate limit counters ──
    record_successful_login(ip=client_ip, email=email)

    # Create session token
    token = create_access_token(
        {"sub": user.id, "email": user.email, "token_version": getattr(user, "token_version", 1) or 1},
        remember_me=remember_me
    )

    # Set cookie lifetime based on Remember Me
    max_age_seconds = (REMEMBER_ME_EXPIRE_DAYS * 86400) if remember_me else (DEFAULT_SESSION_EXPIRE_HOURS * 3600)
    set_auth_cookie(response, token, max_age_seconds)

    return {
        "success": True,
        "token": token,  # Kept for desktop Electron fallback (Bearer header auth flow)
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "job_type": user.job_type,
            "email": user.email,
            "phone_number": user.phone_number,
            "email_verified": True,
            "avatar_url": user.avatar_url,
            "requires_profile_completion": not bool(user.job_type)
        }
    }


def process_google_auth_credential(token_str: str, db: Session, remember_me: bool = True) -> tuple[models.User, str]:
    """
    Verifies a Google ID token credential, links or creates the user in the database,
    and returns (user, jwt_token).
    Raises ValueError on failure.
    """
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip() or GOOGLE_CLIENT_ID
    if not client_id:
        raise ValueError("Google authentication is not configured on the server.")

    google_data = verify_google_id_token(token_str)
    if not google_data:
        raise ValueError("Google authentication failed. Invalid or unauthorized token.")

    google_id = google_data["google_id"]
    email = google_data["email"]
    first_name = google_data["first_name"]
    last_name = google_data["last_name"]
    is_google_verified = google_data["email_verified"]

    now = datetime.datetime.utcnow()

    # 1. Check if user already exists with this google_id
    user = db.query(models.User).filter(models.User.google_id == google_id).first()

    if not user:
        # 2. Check if user exists with the same verified email (Account Linking)
        existing_email_user = db.query(models.User).filter(models.User.email == email).first()
        if existing_email_user:
            # Secure account linking: only if Google verified the email
            if is_google_verified:
                existing_email_user.google_id = google_id
                existing_email_user.email_verified = True  # Google verified ownership
                existing_email_user.updated_at = now
                db.commit()
                db.refresh(existing_email_user)
                user = existing_email_user
            else:
                raise ValueError("Google account email is not verified.")
        else:
            # 3. Create new Google user (job_type is null until onboarding is completed)
            user = models.User(
                first_name=first_name,
                last_name=last_name,
                job_type=None,
                email=email,
                google_id=google_id,
                email_verified=True,
                password_hash=None,  # Registered via Google
                phone_number=None,
                created_at=now,
                updated_at=now
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # Issue session token
    token = create_access_token(
        {"sub": user.id, "email": user.email, "token_version": getattr(user, "token_version", 1) or 1},
        remember_me=remember_me
    )
    return user, token


@router.post("/google")
def google_authentication(payload: GoogleAuthPayload, response: Response, db: Session = Depends(get_db)):
    token_str = payload.credential.strip()
    remember_me = payload.remember_me

    try:
        user, token = process_google_auth_credential(token_str, db, remember_me=remember_me)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    max_age_seconds = (REMEMBER_ME_EXPIRE_DAYS * 86400) if remember_me else (DEFAULT_SESSION_EXPIRE_HOURS * 3600)
    set_auth_cookie(response, token, max_age_seconds)

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "job_type": user.job_type,
            "email": user.email,
            "phone_number": user.phone_number,
            "email_verified": True,
            "avatar_url": user.avatar_url,
            "requires_profile_completion": not bool(user.job_type)
        }
    }


# ==========================================
# System Browser (Chrome) Google Auth Endpoints
# ==========================================

def launch_system_chrome_oauth(url: str):
    """
    Directly launches the user's desktop Google Chrome browser so that the user's
    existing logged-in Google accounts are immediately visible (account chooser),
    with zero need to manually re-type email and password.
    """
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    chrome_exe = None
    for path in chrome_paths:
        if os.path.exists(path):
            chrome_exe = path
            break

    if not chrome_exe:
        chrome_exe = shutil.which("chrome") or shutil.which("google-chrome")

    if chrome_exe:
        try:
            # Opens a new window in the user's desktop Google Chrome
            return subprocess.Popen([chrome_exe, "--new-window", url])
        except Exception as e:
            print(f"[AUTH] Failed to launch Chrome with --new-window: {e}")

    # Fallback to system default browser
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[AUTH] Failed to launch default browser: {e}")
    return None


def get_google_oauth_url(session_id: str) -> str:
    """
    Constructs the official Google OAuth 2.0 authorization URL
    with prompt=select_account so the native account chooser is shown.
    Uses response_mode=form_post and response_type=id_token.
    """
    import urllib.parse
    nonce = secrets.token_urlsafe(16)
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": "http://localhost:8000",
        "response_type": "id_token",
        "response_mode": "form_post",
        "scope": "openid email profile",
        "prompt": "select_account",
        "nonce": nonce,
        "state": session_id
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)


@router.post("/google/popup-start")
def start_popup_google_auth(payload: BrowserStartPayload = BrowserStartPayload()):
    """
    Called by the desktop app when user clicks the Google button.
    Generates a session ID and opens the user's desktop Google Chrome
    displaying Google's native account chooser for the user to select and confirm.
    """
    cleanup_expired_browser_sessions()
    session_id = secrets.token_urlsafe(24)
    pending_browser_sessions[session_id] = {
        "created_at": datetime.datetime.utcnow(),
        "status": "pending",
        "token": None,
        "user": None,
        "remember_me": payload.remember_me
    }

    oauth_url = get_google_oauth_url(session_id)

    # Launch desktop Google Chrome once
    proc = launch_system_chrome_oauth(oauth_url)

    # Store process reference in DesktopApi for auto-cleanup
    try:
        from backend.app import desktop_api
        desktop_api.auth_process = proc
    except Exception:
        pass

    return {
        "success": True,
        "session_id": session_id,
        "popup_url": oauth_url
    }


@router.post("/google/browser-start")
def start_browser_google_auth(payload: BrowserStartPayload = BrowserStartPayload()):
    """
    Called by the desktop app. Generates a unique session ID and launches
    the user's default system browser (Chrome) for Google authorization.
    """
    cleanup_expired_browser_sessions()
    session_id = secrets.token_urlsafe(24)
    pending_browser_sessions[session_id] = {
        "created_at": datetime.datetime.utcnow(),
        "status": "pending",
        "token": None,
        "user": None,
        "remember_me": payload.remember_me
    }

    browser_url = f"http://localhost:8000/auth/google-browser?session_id={session_id}"
    try:
        webbrowser.open(browser_url)
    except Exception as e:
        print(f"[AUTH] Failed to launch system browser: {e}")

    return {
        "success": True,
        "session_id": session_id,
        "url": browser_url
    }


@router.get("/google/browser-status")
def check_browser_google_auth(session_id: str):
    """
    Polled by the desktop app every second to check if the user completed Google Sign-In in Chrome.
    """
    cleanup_expired_browser_sessions()
    session = pending_browser_sessions.get(session_id)
    if not session:
        return {"status": "expired"}
    return {
        "status": session["status"]
    }


@router.post("/google/browser-submit")
def submit_browser_google_auth(payload: BrowserSubmitPayload, db: Session = Depends(get_db)):
    """
    Called by the small popup window once the user finishes choosing their Google account.
    Verifies the Google credential, stores the resulting session, and immediately closes
    the small Google popup window.
    """
    cleanup_expired_browser_sessions()
    session = pending_browser_sessions.get(payload.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session expired or not found.")

    try:
        user, token = process_google_auth_credential(
            payload.credential.strip(),
            db,
            remember_me=session.get("remember_me", True)
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    session["status"] = "completed"
    session["token"] = token
    session["user"] = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "email_verified": True,
        "is_private": user.is_private,
        "avatar_url": user.avatar_url
    }

    # Automatically close/destroy the small Google window
    try:
        from backend.app import desktop_api
        desktop_api.close_google_auth()
    except Exception as e:
        print(f"[AUTH] desktop_api close notice: {e}")

    return {"success": True}


@router.post("/google/desktop-claim")
def claim_desktop_google_auth(payload: DesktopClaimPayload, response: Response):
    """
    Called by the desktop app once browser-status is 'completed'.
    Sets the secure HttpOnly cookie on the desktop app and clears the pending session.
    """
    cleanup_expired_browser_sessions()
    session = pending_browser_sessions.pop(payload.session_id, None)
    if not session or session.get("status") != "completed" or not session.get("token"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Authentication has not been completed or has expired.")

    remember_me = session.get("remember_me", True)
    max_age_seconds = (REMEMBER_ME_EXPIRE_DAYS * 86400) if remember_me else (DEFAULT_SESSION_EXPIRE_HOURS * 3600)
    set_auth_cookie(response, session["token"], max_age_seconds)
    return {
        "success": True,
        "token": session["token"],
        "user": session["user"]
    }


@router.get("/me")
def get_current_user_profile(response: Response, user: Optional[models.User] = Depends(get_current_user_optional)):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    if not user:
        return None
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "job_type": user.job_type,
        "email": user.email,
        "phone_number": user.phone_number,
        "email_verified": user.email_verified,
        "is_private": user.is_private,
        "avatar_url": user.avatar_url,
        "requires_profile_completion": not bool(user.job_type),
        "created_at": user.created_at.isoformat() if user.created_at else None
    }


@router.post("/complete-profile")
def complete_user_profile(
    payload: CompleteProfilePayload,
    response: Response,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    job_type = payload.job_type.strip()

    if not first_name:
        raise HTTPException(status_code=400, detail="First name cannot be empty.")
    if not last_name:
        raise HTTPException(status_code=400, detail="Last name cannot be empty.")
    if not job_type:
        raise HTTPException(status_code=400, detail="Job type / profession cannot be empty.")

    current_user.first_name = first_name
    current_user.last_name = last_name
    current_user.job_type = job_type
    current_user.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    token = create_access_token(
        {"sub": current_user.id, "email": current_user.email, "token_version": getattr(current_user, "token_version", 1) or 1},
        remember_me=True
    )
    set_auth_cookie(response, token, REMEMBER_ME_EXPIRE_DAYS * 86400)

    return {
        "success": True,
        "message": "Profile completed successfully.",
        "token": token,
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "job_type": current_user.job_type,
            "email": current_user.email,
            "phone_number": current_user.phone_number,
            "email_verified": current_user.email_verified,
            "requires_profile_completion": False
        }
    }


@router.put("/profile")
def update_user_profile(
    payload: UpdateProfilePayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    job_type = payload.job_type.strip()
    phone_number = payload.phone_number.strip() if payload.phone_number else None

    if not first_name:
        raise HTTPException(status_code=400, detail="First name cannot be empty.")
    if not last_name:
        raise HTTPException(status_code=400, detail="Last name cannot be empty.")
    if not job_type:
        raise HTTPException(status_code=400, detail="Job type / profession cannot be empty.")

    current_user.first_name = first_name
    current_user.last_name = last_name
    current_user.job_type = job_type
    current_user.phone_number = phone_number
    if payload.is_private is not None:
        current_user.is_private = payload.is_private
    current_user.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "user": {
            "id": current_user.id,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "job_type": current_user.job_type,
            "email": current_user.email,
            "phone_number": current_user.phone_number,
            "email_verified": current_user.email_verified,
            "is_private": current_user.is_private,
            "avatar_url": current_user.avatar_url,
            "requires_profile_completion": False
        }
    }


@router.post("/change-password/request-code")
def request_password_change_code(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.datetime.utcnow()
    last_verification = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == current_user.id
    ).order_by(models.EmailVerification.id.desc()).first()

    if last_verification and last_verification.resend_available_at and now < last_verification.resend_available_at:
        wait_seconds = int((last_verification.resend_available_at - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait_seconds} seconds before requesting another code."
        )

    db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == current_user.id,
        models.EmailVerification.is_used == False
    ).update({"is_used": True})
    db.commit()

    code = generate_verification_code()
    code_hash = hash_verification_code(code)
    expires_at = now + datetime.timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)
    resend_at = now + datetime.timedelta(seconds=RESEND_COOLDOWN_SECONDS)

    verification = models.EmailVerification(
        user_id=current_user.id,
        code_hash=code_hash,
        expires_at=expires_at,
        resend_available_at=resend_at,
        is_used=False
    )
    db.add(verification)
    db.commit()

    user_name = f"{current_user.first_name} {current_user.last_name}".strip() or "User"
    send_verification_email(current_user.email, code, user_name)

    return {
        "success": True,
        "message": f"A 6-digit verification code has been sent to {current_user.email}.",
        "cooldown_seconds": RESEND_COOLDOWN_SECONDS
    }


@router.post("/change-password/verify-and-change")
def verify_and_change_password(
    payload: ChangePasswordPayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    candidate_code = payload.code.strip()
    new_password = payload.new_password
    confirm_password = payload.confirm_password

    if not candidate_code or len(candidate_code) != 6 or not candidate_code.isdigit():
        raise HTTPException(status_code=400, detail="Verification code must be 6 digits.")

    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match.")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    verification = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == current_user.id,
        models.EmailVerification.is_used == False
    ).order_by(models.EmailVerification.id.desc()).first()

    if not verification:
        raise HTTPException(status_code=400, detail="No active verification code found. Please request a new code.")

    now = datetime.datetime.utcnow()
    if now > verification.expires_at:
        verification.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new code.")

    if verification.attempts >= MAX_VERIFICATION_ATTEMPTS:
        verification.is_used = True
        db.commit()
        raise HTTPException(status_code=400, detail="Maximum attempts exceeded. Please request a new code.")

    verification.attempts += 1

    if not verify_verification_code(candidate_code, verification.code_hash):
        remaining = MAX_VERIFICATION_ATTEMPTS - verification.attempts
        db.commit()
        if remaining > 0:
            raise HTTPException(status_code=400, detail=f"Incorrect code. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining.")
        else:
            verification.is_used = True
            db.commit()
            raise HTTPException(status_code=400, detail="Maximum attempts exceeded. Please request a new code.")

    verification.is_used = True
    current_user.password_hash = hash_password(new_password)
    current_user.token_version = (getattr(current_user, "token_version", 1) or 1) + 1
    current_user.password_changed_at = now
    current_user.updated_at = now
    db.commit()

    clear_account_lockout(current_user.email)

    return {
        "success": True,
        "message": "Password updated successfully."
    }


@router.post("/forgot-password/request")
def request_forgot_password_code(payload: ForgotPasswordRequestPayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    
    # 1. Validate email format
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_regex, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Anti-enumeration: return generic success so attackers cannot probe for registered emails
        return {
            "success": True,
            "message": f"If an account with {email} exists, a 6-digit reset code has been sent.",
            "cooldown_seconds": RESEND_COOLDOWN_SECONDS
        }

    now = datetime.datetime.utcnow()
    last_verification = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id
    ).order_by(models.EmailVerification.id.desc()).first()

    # Rate limiting & Anti-Spam
    if last_verification and last_verification.resend_available_at and now < last_verification.resend_available_at:
        wait_seconds = int((last_verification.resend_available_at - now).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait_seconds} seconds before requesting another code."
        )

    # Invalidate previous unused codes
    db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id,
        models.EmailVerification.is_used == False
    ).update({"is_used": True})
    db.commit()

    # Generate cryptographically secure 6-digit verification code & store hashed
    code = generate_verification_code()
    code_hash = hash_verification_code(code)
    expires_at = now + datetime.timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)
    resend_at = now + datetime.timedelta(seconds=RESEND_COOLDOWN_SECONDS)

    verification = models.EmailVerification(
        user_id=user.id,
        code_hash=code_hash,
        expires_at=expires_at,
        resend_available_at=resend_at,
        is_used=False
    )
    db.add(verification)
    db.commit()

    user_name = f"{user.first_name} {user.last_name}".strip() or "User"
    send_verification_email(user.email, code, user_name, purpose="reset")

    return {
        "success": True,
        "message": f"A 6-digit reset code has been sent to {email}.",
        "cooldown_seconds": RESEND_COOLDOWN_SECONDS
    }


@router.post("/forgot-password/verify-code")
def verify_forgot_password_code(payload: ForgotPasswordVerifyCodePayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    candidate_code = payload.code.strip()

    if not candidate_code or len(candidate_code) != 6 or not candidate_code.isdigit():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code must be exactly 6 digits.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request or expired verification code.")

    verification = db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id,
        models.EmailVerification.is_used == False
    ).order_by(models.EmailVerification.id.desc()).first()

    if not verification:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active verification code found. Please request a new code.")

    now = datetime.datetime.utcnow()
    if now > verification.expires_at:
        verification.is_used = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired. Please request a new code.")

    if verification.attempts >= MAX_VERIFICATION_ATTEMPTS:
        verification.is_used = True
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum attempts exceeded. Please request a new code.")

    verification.attempts += 1

    if not verify_verification_code(candidate_code, verification.code_hash):
        remaining = MAX_VERIFICATION_ATTEMPTS - verification.attempts
        db.commit()
        if remaining > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect code. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining."
            )
        else:
            verification.is_used = True
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum attempts exceeded. Please request a new code.")

    # Code is valid! Mark code used so it cannot be reused
    verification.is_used = True
    db.commit()

    # Generate a cryptographically signed reset token valid for 15 minutes with scope: "password_reset"
    reset_jti = secrets.token_hex(16)
    reset_token = create_access_token(
        {
            "sub": user.id,
            "email": user.email,
            "scope": "password_reset",
            "jti": reset_jti,
            "token_version": getattr(user, "token_version", 1) or 1
        },
        expires_delta=datetime.timedelta(minutes=15)
    )

    return {
        "success": True,
        "message": "Verification code confirmed successfully.",
        "reset_token": reset_token
    }


@router.post("/forgot-password/reset")
def reset_forgot_password(payload: ForgotPasswordResetPayload, db: Session = Depends(get_db)):
    new_password = payload.new_password
    confirm_password = payload.confirm_password

    # Validate password format & matching
    if not new_password or not confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Both password fields are required.")

    if new_password != confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New passwords do not match.")

    if len(new_password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters long.")

    if not any(c.isalpha() for c in new_password) or not any(c.isdigit() for c in new_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least one letter and one number.")

    user: Optional[models.User] = None
    token_str: Optional[str] = None
    token_hash: Optional[str] = None
    token_data: Optional[dict] = None

    # Priority 1: Secure reset_token (from Step 2 verification)
    if payload.reset_token:
        token_str = payload.reset_token.strip()
        token_hash = hashlib.sha256(token_str.encode()).hexdigest()

        # Strictly enforce single-use / anti-replay: check if already revoked or used
        revoked = db.query(models.RevokedToken).filter(models.RevokedToken.token_hash == token_hash).first()
        if revoked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset token has already been used. Please request a new code."
            )

        token_data = decode_access_token(token_str)
        if not token_data or token_data.get("scope") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset session has expired or is invalid. Please request a new code."
            )
        try:
            user_id = int(token_data["sub"])
            user = db.query(models.User).filter(models.User.id == user_id).first()
        except (ValueError, TypeError):
            user = None

        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account not found.")

        # Invalidate if user's token_version has changed since this reset token was issued
        if token_data.get("token_version") is not None and token_data.get("token_version") != (getattr(user, "token_version", 1) or 1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset token is no longer valid. Please request a new code."
            )

    # Priority 2: Fallback direct email + code
    elif payload.email and payload.code:
        email = payload.email.strip().lower()
        candidate_code = payload.code.strip()

        if not candidate_code or len(candidate_code) != 6 or not candidate_code.isdigit():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code must be 6 digits.")

        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request or user not found.")

        verification = db.query(models.EmailVerification).filter(
            models.EmailVerification.user_id == user.id,
            models.EmailVerification.is_used == False
        ).order_by(models.EmailVerification.id.desc()).first()

        if not verification:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active verification code found. Please request a new code.")

        now = datetime.datetime.utcnow()
        if now > verification.expires_at:
            verification.is_used = True
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired. Please request a new code.")

        if verification.attempts >= MAX_VERIFICATION_ATTEMPTS:
            verification.is_used = True
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum attempts exceeded. Please request a new code.")

        verification.attempts += 1

        if not verify_verification_code(candidate_code, verification.code_hash):
            remaining = MAX_VERIFICATION_ATTEMPTS - verification.attempts
            db.commit()
            if remaining > 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Incorrect code. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining.")
            else:
                verification.is_used = True
                db.commit()
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Maximum attempts exceeded. Please request a new code.")

        verification.is_used = True
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing reset authorization token or verification code.")

    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account not found.")

    # Invalidate all remaining verification records for this user
    db.query(models.EmailVerification).filter(
        models.EmailVerification.user_id == user.id,
        models.EmailVerification.is_used == False
    ).update({"is_used": True})

    # Update password and timestamps, and increment token_version to invalidate active sessions
    now = datetime.datetime.utcnow()
    user.password_hash = hash_password(new_password)
    user.email_verified = True  # Password reset via verified email also marks email verified
    user.token_version = (getattr(user, "token_version", 1) or 1) + 1
    user.password_changed_at = now
    user.updated_at = now

    # Strictly enforce single-use / anti-replay: record reset_token in RevokedToken
    if token_hash and token_data:
        exp_ts = token_data.get("exp")
        expires_at = datetime.datetime.utcfromtimestamp(exp_ts) if exp_ts else (now + datetime.timedelta(minutes=15))
        revoked_entry = models.RevokedToken(
            token_hash=token_hash,
            revoked_at=now,
            expires_at=expires_at
        )
        db.add(revoked_entry)

    db.commit()

    # Clear account lockout on successful password reset (prevents Account DoS)
    clear_account_lockout(user.email)

    return {
        "success": True,
        "message": "Password reset successfully. You can now log in with your new password."
    }


@router.post("/logout")
def logout_user(request: Request, response: Response, db: Session = Depends(get_db)):
    # 1. Server-side token invalidation
    token = get_token_from_request(request)
    if token:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        payload = decode_access_token(token)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=30)
        if payload and payload.get("exp"):
            expires_at = datetime.datetime.utcfromtimestamp(payload["exp"])

        existing = db.query(models.RevokedToken).filter(models.RevokedToken.token_hash == token_hash).first()
        if not existing:
            revoked_entry = models.RevokedToken(
                token_hash=token_hash,
                revoked_at=datetime.datetime.utcnow(),
                expires_at=expires_at
            )
            db.add(revoked_entry)
            db.commit()

    # 2. Invalidate HttpOnly cookie on client
    is_prod = (
        os.getenv("ENVIRONMENT") == "production" or
        os.getenv("RENDER") is not None or
        os.getenv("SECURE_COOKIES", "").lower() == "true"
    )
    response.delete_cookie(
        key="dubflow_token",
        path="/",
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod
    )
    response.delete_cookie(
        key="erytmo_token",
        path="/",
        httponly=True,
        samesite="none" if is_prod else "lax",
        secure=is_prod
    )
    return {
        "success": True,
        "message": "Logged out successfully."
    }

import uuid

@router.post("/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user)
):
    """
    Handles profile picture uploads.
    P1 Security hardening:
      - Whitelist of allowed MIME types (Content-Type header check)
      - Magic-byte validation via imghdr (actual file content, not just extension)
      - 2 MB size limit
      - Server-generated filename (UUID) — no user-supplied name used
      - Extension derived from whitelist, not from the original filename
    """
    # ── 1. MIME type whitelist (Content-Type header) ──────────────────────────
    ALLOWED_MIME_TYPES: dict = {
        "image/jpeg": "jpg",
        "image/jpg":  "jpg",
        "image/png":  "png",
        "image/webp": "webp",
        "image/gif":  "gif",
    }
    content_type = (file.content_type or "").lower().strip()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, WebP, or GIF images are allowed."
        )

    # ── 2. Read content and enforce size limit ────────────────────────────────
    content = await file.read()
    MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File is too large. Maximum allowed size is 2 MB."
        )
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # ── 3. Magic-byte validation (actual file content) ────────────────────────
    # _detect_image_type() inspects the raw bytes, not the filename or Content-Type.
    detected_type = _detect_image_type(content)
    ALLOWED_DETECTED_TYPES = {"jpeg", "png", "webp", "gif"}
    if detected_type not in ALLOWED_DETECTED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File content does not match a supported image format. Upload may be corrupt or disguised."
        )

    # ── 3b. Pillow decode validation (catches polyglot/malformed files) ───────
    # Magic bytes can be spoofed; Pillow must be able to fully decode the image.
    try:
        from PIL import Image as PilImage
        import io as _io
        with PilImage.open(_io.BytesIO(content)) as img:
            img.verify()  # Raises if the image data is corrupt or truncated
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Image file could not be decoded. The file may be corrupted or contain invalid data."
        )

    # ── 4. Server-side filename generation (never trust the original name) ────
    ext = ALLOWED_MIME_TYPES.get(content_type, "jpg")
    unique_filename = f"{user.id}-{uuid.uuid4().hex}.{ext}"

    upload_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "profiles"
    )
    os.makedirs(upload_dir, exist_ok=True)

    # ── 5. Remove previous avatar file to avoid orphaned files ───────────────
    if user.avatar_url:
        old_filename = os.path.basename(user.avatar_url)
        old_path = os.path.join(upload_dir, old_filename)
        if os.path.exists(old_path) and os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass  # Non-fatal; log if needed

    file_path = os.path.join(upload_dir, unique_filename)
    with open(file_path, "wb") as f:
        f.write(content)

    avatar_url = f"/uploads/profiles/{unique_filename}"

    # ── 6. Update DB ──────────────────────────────────────────────────────────
    user.avatar_url = avatar_url
    user.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)

    return {"success": True, "message": "Avatar updated successfully", "avatar_url": avatar_url}
