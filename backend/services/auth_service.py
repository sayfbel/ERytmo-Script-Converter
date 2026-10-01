import os
import smtplib
import secrets
import hashlib
import hmac
import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import timedelta
from typing import Optional, Dict, Any
import jwt
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))
load_dotenv()

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "erytmo_super_secret_jwt_key_change_in_production_2026")
if os.environ.get("ENVIRONMENT") == "production" and JWT_SECRET == "erytmo_super_secret_jwt_key_change_in_production_2026":
    import warnings
    warnings.warn(
        "CRITICAL SECURITY WARNING: Running in production with default JWT_SECRET! "
        "Please configure a strong, random JWT_SECRET in your production environment variables immediately.",
        RuntimeWarning
    )
JWT_ALGORITHM = "HS256"
DEFAULT_SESSION_EXPIRE_HOURS = 24       # 1 day for standard session
REMEMBER_ME_EXPIRE_DAYS = 30           # 30 days for Remember Me session

# Verification Code Configuration
VERIFICATION_CODE_EXPIRE_MINUTES = 10
MAX_VERIFICATION_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60

# SMTP Configuration (Blocked by Render Free Tier, but kept for local/paid use)
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").strip()
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "DubFlow Studio")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "").strip() or SMTP_USER

# Brevo / Sendinblue API Configuration (HTTP API over Port 443 - Allowed on Render Free Tier)
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "").strip()

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()


# ==========================================
# Password Security (PBKDF2-HMAC-SHA256)
# ==========================================

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a unique random 16-byte salt and 100,000 iterations.
    Never stores plain-text passwords.
    """
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2_sha256$100000${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the stored PBKDF2 hash using constant-time comparison.
    """
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_key = bytes.fromhex(parts[3])
        actual_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual_key, expected_key)
    except Exception:
        return False


# ==========================================
# 6-Digit Verification Code Security
# ==========================================

def generate_verification_code() -> str:
    """
    Generates a cryptographically secure 6-digit random verification code.
    """
    return "".join(secrets.choice("0123456789") for _ in range(6))


def hash_verification_code(code: str) -> str:
    """
    Hashes the 6-digit code with SHA-256 so codes are never stored in plain text.
    """
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


def verify_verification_code(plain_code: str, stored_hash: str) -> bool:
    """
    Constant-time comparison of candidate code hash with stored hash.
    """
    candidate_hash = hash_verification_code(plain_code)
    return hmac.compare_digest(candidate_hash, stored_hash)


# ==========================================
# Session & JWT Tokens
# ==========================================

def create_access_token(data: Dict[str, Any], remember_me: bool = False, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a signed JWT access token.
    If expires_delta is provided, uses that timedelta.
    Otherwise, if remember_me is True, token expires in 30 days. Otherwise, 24 hours.
    """
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
        
    if expires_delta is not None:
        expire = datetime.datetime.utcnow() + expires_delta
    elif remember_me:
        expire = datetime.datetime.utcnow() + timedelta(days=REMEMBER_ME_EXPIRE_DAYS)
    else:
        expire = datetime.datetime.utcnow() + timedelta(hours=DEFAULT_SESSION_EXPIRE_HOURS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.datetime.utcnow(),
        "remember_me": remember_me
    })
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a JWT token. Returns None if invalid or expired.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ==========================================
# Email Delivery via Gmail SMTP
# ==========================================

def send_verification_email(to_email: str, code: str, first_name: str, purpose: str = "registration") -> bool:
    """
    Sends the 6-digit verification code to the user's email via Gmail SMTP with modern DubFlow Studio branding.
    Supports purpose: "registration", "reset", "password_change".
    If SMTP credentials are not configured, logs code to terminal console for development.
    """
    is_reset = purpose in ["reset", "password_change"]
    subject = f"{code} is your DubFlow password reset code" if is_reset else f"{code} is your DubFlow verification code"
    title_text = "Reset Your Password" if is_reset else "Verify Your Email Address"
    action_text = "securely reset your account password" if is_reset else "complete your studio registration"
    disregard_text = "If you did not request a password reset, you can safely ignore this email. Your account remains secure." if is_reset else "If you did not create a DubFlow Studio account, you can safely ignore this email."

    # Check if we have credentials to send email
    if not BREVO_API_KEY and (not SMTP_USER or not SMTP_PASSWORD):
        print("\n" + "=" * 70)
        mode_label = "PASSWORD RESET" if is_reset else "REGISTRATION"
        print(f"  [DEV NOTIFICATION - DUBFLOW VERIFICATION ({mode_label})]")
        print(f"  To: {to_email}")
        print(f"  User: {first_name}")
        print(f"  Verification Code: {code}")
        print("  NOTE: BREVO_API_KEY and SMTP credentials are not yet set in .env.")
        print("  Use the 6-digit code above to test verification in your browser.")
        print("=" * 70 + "\n")
        return True

    try:
        # OPTION 1: Send via Brevo API (Port 443 HTTP - Works on Render Free Tier)
        if BREVO_API_KEY:
            headers = {
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            data = {
                "sender": {"name": SMTP_FROM_NAME, "email": SMTP_FROM_EMAIL},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_body
            }
            response = requests.post("https://api.brevo.com/v3/smtp/email", json=data, headers=headers, timeout=10)
            if response.status_code in [200, 201, 202]:
                print(f"[AUTH] Successfully sent verification email via Brevo API to {to_email}")
                return True
            else:
                raise Exception(f"Brevo API error {response.status_code}: {response.text}")

        # OPTION 2: Send via SMTP (Port 587 - Blocked on Render Free Tier)
        else:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
            msg["To"] = to_email
            
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)

            print(f"[AUTH] Successfully sent verification email via SMTP to {to_email}")
            return True

    except Exception as e:
        print(f"[AUTH ERROR] Failed to send email ({e}). Falling back to terminal display.")
        print(f"[DEV FALLBACK CODE FOR {to_email}]: {code}")
        return False


# ==========================================
# Google OAuth 2.0 Token Verification
# ==========================================

def verify_google_id_token(token_str: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google ID token from Google Identity Services.
    Returns token payload containing: sub, email, given_name, family_name, email_verified, picture.
    """
    try:
        # If GOOGLE_CLIENT_ID is configured, verify against it; otherwise verify structure
        aud = GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None
        id_info = id_token.verify_oauth2_token(token_str, google_requests.Request(), audience=aud)
        
        # Verify issuer is Google
        if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            return None
            
        return {
            "google_id": id_info.get("sub"),
            "email": id_info.get("email", "").lower(),
            "first_name": id_info.get("given_name") or id_info.get("name", "Google User").split()[0],
            "last_name": id_info.get("family_name") or (" ".join(id_info.get("name", "").split()[1:]) if " " in id_info.get("name", "") else ""),
            "email_verified": id_info.get("email_verified", False),
            "picture": id_info.get("picture")
        }
    except Exception as e:
        print(f"[AUTH ERROR] Google token verification failed: {e}")
        return None
