from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
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
    email: str
    password: str
    confirm_password: str
    phone_number: Optional[str] = None

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


# ==========================================
# Helper: Extract Token from Request
# ==========================================

def get_token_from_request(request: Request) -> Optional[str]:
    # 1. Prefer HttpOnly cookie (primary secure session source)
    cookie_token = request.cookies.get("erytmo_token")
    if cookie_token:
        return cookie_token.strip()

    # 2. Check Authorization Bearer header as secondary fallback for external tooling
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1].strip()
        
    return None

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
        
    try:
        user_id = int(payload["sub"])
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
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
    email = payload.email.strip().lower()
    password = payload.password
    confirm_password = payload.confirm_password
    phone_number = payload.phone_number.strip() if payload.phone_number else None

    # 1. Validate First and Last Name
    if not first_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="First name cannot be empty.")
    if not last_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Last name cannot be empty.")

    # 2. Validate Email Format
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_regex, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email address.")

    # 3. Validate Password Security
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters long.")
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least one letter and one number.")
    if password != confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password and Confirm Password do not match.")

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
            # User previously registered but never verified. Update their credentials and issue fresh code.
            user = existing_user
            user.first_name = first_name
            user.last_name = last_name
            user.password_hash = hash_password(password)
            user.phone_number = phone_number
            user.updated_at = datetime.datetime.utcnow()
    else:
        # Create brand-new user (unverified)
        user = models.User(
            first_name=first_name,
            last_name=last_name,
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

    # Issue persistent session token
    token = create_access_token({"sub": user.id, "email": user.email}, remember_me=True)

    # Set secure HttpOnly cookie
    response.set_cookie(
        key="erytmo_token",
        value=token,
        httponly=True,
        max_age=REMEMBER_ME_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=False # Set to True in production HTTPS
    )

    return {
        "success": True,
        "message": "Email verified successfully! Welcome to ERytmo.",
        "token": token,
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "email_verified": True
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
def login_user(payload: LoginPayload, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password
    remember_me = payload.remember_me

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    # Check password
    if not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    # Check email verification status
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Your email has not been verified yet. Please enter the verification code.",
                "email": user.email
            }
        )

    # Create session token
    token = create_access_token({"sub": user.id, "email": user.email}, remember_me=remember_me)

    # Set cookie lifetime based on Remember Me
    max_age_seconds = (REMEMBER_ME_EXPIRE_DAYS * 86400) if remember_me else (DEFAULT_SESSION_EXPIRE_HOURS * 3600)
    response.set_cookie(
        key="erytmo_token",
        value=token,
        httponly=True,
        max_age=max_age_seconds,
        samesite="lax",
        secure=False
    )

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "email_verified": True
        }
    }


def process_google_auth_credential(token_str: str, db: Session, remember_me: bool = True) -> tuple[models.User, str]:
    """
    Verifies a Google ID token credential, links or creates the user in the database,
    and returns (user, jwt_token).
    Raises ValueError on failure.
    """
    google_data = verify_google_id_token(token_str)
    if not google_data:
        raise ValueError("Google authentication failed. Invalid token.")

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
            # 3. Create new Google user
            user = models.User(
                first_name=first_name,
                last_name=last_name,
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
    token = create_access_token({"sub": user.id, "email": user.email}, remember_me=remember_me)
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
    response.set_cookie(
        key="erytmo_token",
        value=token,
        httponly=True,
        max_age=max_age_seconds,
        samesite="lax",
        secure=False
    )

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "email_verified": True
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
        "email_verified": True
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
    response.set_cookie(
        key="erytmo_token",
        value=session["token"],
        httponly=True,
        max_age=max_age_seconds,
        samesite="lax",
        secure=False
    )
    return {
        "success": True,
        "user": session["user"]
    }


@router.get("/me")
def get_current_user_profile(user: models.User = Depends(get_current_user)):
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "email_verified": user.email_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None
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
    response.delete_cookie(
        key="erytmo_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {
        "success": True,
        "message": "Logged out successfully."
    }
