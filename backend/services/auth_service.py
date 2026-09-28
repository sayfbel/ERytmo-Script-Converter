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
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))
load_dotenv()

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "erytmo_super_secret_jwt_key_change_in_production_2026")
JWT_ALGORITHM = "HS256"
DEFAULT_SESSION_EXPIRE_HOURS = 24       # 1 day for standard session
REMEMBER_ME_EXPIRE_DAYS = 30           # 30 days for Remember Me session

# Verification Code Configuration
VERIFICATION_CODE_EXPIRE_MINUTES = 10
MAX_VERIFICATION_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60

# SMTP Configuration
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "").strip()
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "").strip()
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "ERytmo Script Converter")
SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "").strip() or SMTP_USER

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

def create_access_token(data: Dict[str, Any], remember_me: bool = False) -> str:
    """
    Creates a signed JWT access token.
    If remember_me is True, token expires in 30 days. Otherwise, 24 hours.
    """
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
        
    if remember_me:
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

def send_verification_email(to_email: str, code: str, first_name: str) -> bool:
    """
    Sends the 6-digit verification code to the user's email via Gmail SMTP.
    If SMTP credentials are not configured, logs code to terminal console for development.
    """
    # Check if SMTP is configured
    if not SMTP_USER or not SMTP_PASSWORD:
        print("\n" + "=" * 70)
        print("  [DEV NOTIFICATION - EMAIL VERIFICATION]")
        print(f"  To: {to_email}")
        print(f"  User: {first_name}")
        print(f"  Verification Code: {code}")
        print("  NOTE: SMTP_USER and SMTP_PASSWORD are not yet set in .env.")
        print("  Use the 6-digit code above to test verification in your browser.")
        print("=" * 70 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{code} is your ERytmo verification code"
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Plain-text version
        text_body = f"""Hello {first_name},

Thank you for registering with ERytmo Script Converter.

Your 6-digit email verification code is: {code}

This code will expire in {VERIFICATION_CODE_EXPIRE_MINUTES} minutes.
If you did not request this registration, please disregard this email.

Best regards,
The ERytmo Team
"""

        # Sleek HTML email matching ERytmo branding
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .header {{ text-align: center; margin-bottom: 28px; }}
    .logo-text {{ font-size: 22px; font-weight: 800; color: #0d9488; letter-spacing: -0.5px; }}
    .title {{ font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 8px; }}
    .subtitle {{ font-size: 14px; color: #64748b; line-height: 1.5; }}
    .code-box {{ margin: 32px 0; text-align: center; background: #f0fdfa; border: 2px dashed #14b8a6; border-radius: 12px; padding: 20px; }}
    .code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: 'Courier New', Courier, monospace; }}
    .expiry {{ font-size: 13px; color: #64748b; margin-top: 8px; }}
    .footer {{ font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-text">ERytmo Script Converter</div>
      <div class="title">Verify Your Email Address</div>
      <div class="subtitle">Hello {first_name}, please use the code below to complete your registration.</div>
    </div>
    
    <div class="code-box">
      <div class="code">{code}</div>
      <div class="expiry">Valid for {VERIFICATION_CODE_EXPIRE_MINUTES} minutes</div>
    </div>
    
    <div class="subtitle" style="text-align: center; font-size: 13px;">
      If you did not create an account with ERytmo, you can safely ignore this email.
    </div>
    
    <div class="footer">
      &copy; {datetime.datetime.utcnow().year} ERytmo Script Converter. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        # Connect to SMTP server
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        print(f"[AUTH] Successfully sent verification email to {to_email}")
        return True

    except Exception as e:
        print(f"[AUTH ERROR] Failed to send email via SMTP ({e}). Falling back to terminal display.")
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
