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
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "DubFlow Studio")
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

    # Check if SMTP is configured
    if not SMTP_USER or not SMTP_PASSWORD:
        print("\n" + "=" * 70)
        mode_label = "PASSWORD RESET" if is_reset else "REGISTRATION"
        print(f"  [DEV NOTIFICATION - DUBFLOW VERIFICATION ({mode_label})]")
        print(f"  To: {to_email}")
        print(f"  User: {first_name}")
        print(f"  Verification Code: {code}")
        print("  NOTE: SMTP_USER and SMTP_PASSWORD are not yet set in .env.")
        print("  Use the 6-digit code above to test verification in your browser.")
        print("=" * 70 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Plain-text version
        text_body = f"""Hello {first_name},

{title_text} - DubFlow Studio

Your 6-digit security code is: {code}

Use this code to {action_text}.
This code will expire in {VERIFICATION_CODE_EXPIRE_MINUTES} minutes.
{disregard_text}

Best regards,
DubFlow Studio Security Team
"""

        # Sleek HTML email matching DubFlow Studio luxury branding
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_text}</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4efe6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; margin: 0 auto; background-color: #121215; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);">
    <!-- Header with Brand Accent -->
    <tr>
      <td style="padding: 40px 36px 20px 36px; text-align: center; background: radial-gradient(circle at top, rgba(245, 158, 11, 0.14) 0%, rgba(18, 18, 21, 0) 70%);">
        <!-- Logo Emblem -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
          <tr>
            <td style="width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 14px; text-align: center; vertical-align: middle; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.4);">
              <span style="font-size: 22px; font-weight: 900; color: #000000; line-height: 48px; display: inline-block;">✦</span>
            </td>
          </tr>
        </table>
        
        <!-- Brand Name -->
        <div style="font-size: 13px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #f59e0b; margin-bottom: 12px;">
          DUBFLOW STUDIO
        </div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.25;">
          {title_text}
        </h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #9ca3af; line-height: 1.55;">
          Hello <strong style="color: #f4efe6;">{first_name}</strong>, please use the 6-digit security code below to {action_text}.
        </p>
      </td>
    </tr>

    <!-- Code Display Box -->
    <tr>
      <td style="padding: 10px 36px 24px 36px; text-align: center;">
        <div style="background-color: #1a1a1f; border: 1.5px solid rgba(245, 158, 11, 0.35); border-radius: 18px; padding: 24px 16px; margin: 12px 0 20px 0; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #71717a; margin-bottom: 8px;">
            One-Time Security Code
          </div>
          <div style="font-family: 'SF Mono', Monaco, Menlo, Consolas, 'Courier New', monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #fbbf24; text-shadow: 0 0 20px rgba(251, 191, 36, 0.3); padding-left: 12px;">
            {code}
          </div>
          <div style="font-size: 12px; color: #a1a1aa; margin-top: 10px; font-weight: 500;">
            ⏳ Code expires in <span style="color: #f59e0b; font-weight: 700;">{VERIFICATION_CODE_EXPIRE_MINUTES} minutes</span>
          </div>
        </div>

        <p style="margin: 0; font-size: 12.5px; color: #71717a; line-height: 1.55;">
          {disregard_text}
        </p>
      </td>
    </tr>

    <!-- Divider -->
    <tr>
      <td style="padding: 0 36px;">
        <div style="height: 1px; background-color: rgba(255, 255, 255, 0.08);"></div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 36px 36px 36px; text-align: center;">
        <div style="font-size: 11px; color: #52525b; line-height: 1.6;">
          This is an automated security notification from DubFlow Studio.<br>
          &copy; {datetime.datetime.utcnow().year} DubFlow Studio Inc. Zero-Cloud Local Workstation Security.
        </div>
      </td>
    </tr>
  </table>
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
