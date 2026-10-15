"""
DubFlow — Auth Flows Non-Regression Tests
==========================================
Covers:
  - Registration (valid, duplicates, weak passwords, common passwords)
  - Email verification (flow, expiry, brute-force protection)
  - Login (success, unverified, wrong credentials)
  - Forgot-password flow (anti-enumeration, token scoping, reset)
  - Logout and token revocation
  - Session token validation (/me endpoint)
  - Password policy (10-char min, 128-char max, blacklist)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.tests.conftest import (
    get_client, reset_rate_limiter, create_verified_user,
)
from backend.tests.conftest import _TestSessionLocal
from backend.models import models
from backend.services.auth_service import (
    hash_password, create_access_token, generate_verification_code,
    hash_verification_code, VERIFICATION_CODE_EXPIRE_MINUTES,
    MAX_VERIFICATION_ATTEMPTS, RESEND_COOLDOWN_SECONDS,
    REMEMBER_ME_EXPIRE_DAYS, DEFAULT_SESSION_EXPIRE_HOURS,
)
import datetime


def get_db_session():
    db = _TestSessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


# ════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Registration
# ════════════════════════════════════════════════════════════════════════════

class TestRegistration:

    def setup_method(self):
        from backend.tests.conftest import ensure_tables
        ensure_tables()
        reset_rate_limiter()
        self._client = get_client()

    def _register(self, **kwargs):
        payload = {
            "first_name": "Test",
            "last_name": "User",
            "job_type": "Sound Engineer",
            "email": "newuser@dubflow.io",
            "password": "StudioPass10",
            "confirm_password": "StudioPass10",
        }
        payload.update(kwargs)
        return self._client.post("/api/auth/register", json=payload)

    # ── Valid registration ───────────────────────────────────────────────────
    def test_valid_registration_returns_200(self):
        r = self._register(email="valid_reg@test.io")
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert "email" in body

    # ── Password too short (below 10) ────────────────────────────────────────
    def test_password_too_short_rejected(self):
        r = self._register(password="Short1", confirm_password="Short1", email="short_pw@test.io")
        assert r.status_code == 400
        assert "10" in r.json()["detail"] or "characters" in r.json()["detail"].lower()

    # ── Password exactly 10 chars — OK ──────────────────────────────────────
    def test_password_exactly_10_chars_accepted(self):
        r = self._register(password="Studio1234", confirm_password="Studio1234", email="pw10@test.io")
        assert r.status_code == 200

    # ── Password max 128 chars — anything longer rejected ───────────────────
    def test_password_over_128_chars_rejected(self):
        long_pw = "A1" * 65  # 130 chars
        r = self._register(password=long_pw, confirm_password=long_pw, email="longpw@test.io")
        assert r.status_code == 400
        assert "128" in r.json()["detail"]

    # ── Exactly 128 chars — OK ───────────────────────────────────────────────
    def test_password_exactly_128_chars_accepted(self):
        pw128 = ("Aa1" * 43)[:128]  # 128 chars, contains letters + digits
        r = self._register(password=pw128, confirm_password=pw128, email="pw128@test.io")
        assert r.status_code == 200

    # ── Common password rejected ─────────────────────────────────────────────
    def test_common_password_rejected(self):
        r = self._register(password="password123", confirm_password="password123", email="common@test.io")
        assert r.status_code == 400
        assert "common" in r.json()["detail"].lower()

    # ── Password mismatch ────────────────────────────────────────────────────
    def test_password_mismatch_rejected(self):
        r = self._register(password="StudioPass10", confirm_password="DifferentP10", email="mismatch@test.io")
        assert r.status_code == 400
        assert "match" in r.json()["detail"].lower()

    # ── No letters in password ───────────────────────────────────────────────
    def test_password_no_letters_rejected(self):
        r = self._register(password="1234567890", confirm_password="1234567890", email="noletter@test.io")
        assert r.status_code == 400

    # ── No digits in password ────────────────────────────────────────────────
    def test_password_no_digits_rejected(self):
        r = self._register(password="NoDigitsHere!", confirm_password="NoDigitsHere!", email="nodigit@test.io")
        assert r.status_code == 400

    # ── Unicode / special characters — should be accepted ───────────────────
    def test_unicode_password_accepted(self):
        pw = "Passé12345"  # Contains accented char + digits (>= 10 chars)
        r = self._register(password=pw, confirm_password=pw, email="unicode@test.io")
        assert r.status_code == 200

    # ── Duplicate verified email ─────────────────────────────────────────────
    def test_duplicate_verified_email_rejected(self):
        email = "dup@dubflow.io"
        create_verified_user(email=email)
        r = self._register(email=email)
        assert r.status_code == 400
        assert "already registered" in r.json()["detail"].lower() or "log in" in r.json()["detail"].lower()

    # ── Missing first name ───────────────────────────────────────────────────
    def test_missing_first_name_rejected(self):
        r = self._register(first_name="", email="nofname@test.io")
        assert r.status_code == 400

    # ── Invalid email format ─────────────────────────────────────────────────
    def test_invalid_email_rejected(self):
        r = self._register(email="not-an-email")
        assert r.status_code == 400


# ════════════════════════════════════════════════════════════════════════════
# SECTION 2 — Login & Session
# ════════════════════════════════════════════════════════════════════════════

class TestLogin:

    def setup_method(self):
        from backend.tests.conftest import ensure_tables
        ensure_tables()
        reset_rate_limiter()
        self._client = get_client()
        self._user = create_verified_user(
            email="login_test@dubflow.io",
            password="ValidPass99",
        )

    def _login(self, email="login_test@dubflow.io", password="ValidPass99"):
        return self._client.post(
            "/api/auth/login",
            json={"email": email, "password": password, "remember_me": False},
        )

    # ── Successful login ─────────────────────────────────────────────────────
    def test_successful_login(self):
        r = self._login()
        assert r.status_code == 200
        body = r.json()
        assert body["success"] is True
        assert "token" in body
        assert body["user"]["email"] == "login_test@dubflow.io"

    # ── Cookie is set ────────────────────────────────────────────────────────
    def test_cookie_set_on_login(self):
        r = self._login()
        assert "erytmo_token" in r.cookies

    # ── Wrong password → 401 with unified message ────────────────────────────
    def test_wrong_password_unified_error(self):
        r = self._login(password="WrongPass99")
        assert r.status_code == 401
        detail = r.json()["detail"]
        assert "Incorrect email or password" in detail

    # ── Unknown email → 401 with same message (anti-enumeration) ─────────────
    def test_unknown_email_same_error_as_wrong_password(self):
        r1 = self._login(password="WrongPass99")
        r2 = self._login(email="nobody@test.io", password="WrongPass99")
        assert r1.status_code == r2.status_code == 401
        assert r1.json()["detail"] == r2.json()["detail"]

    # ── Unverified user → 403 EMAIL_NOT_VERIFIED ─────────────────────────────
    def test_unverified_user_gets_403(self):
        db = _TestSessionLocal()
        try:
            u = models.User(
                first_name="Unv", last_name="User",
                email="unverified@test.io",
                password_hash=hash_password("ValidPass99"),
                email_verified=False, job_type="Sound Engineer",
            )
            db.add(u); db.commit()
        finally:
            db.close()

        r = self._login(email="unverified@test.io", password="ValidPass99")
        assert r.status_code == 403
        detail = r.json()["detail"]
        assert detail.get("code") == "EMAIL_NOT_VERIFIED"
        assert "email" in detail  # Email should be returned to redirect user

    # ── /me returns user when authenticated ──────────────────────────────────
    def test_me_endpoint_authenticated(self):
        r = self._login()
        token = r.json()["token"]
        r2 = self._client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r2.status_code == 200
        assert r2.json()["email"] == "login_test@dubflow.io"

    # ── /me returns null without token ──────────────────────────────────────
    def test_me_endpoint_unauthenticated(self):
        r = self._client.get("/api/auth/me")
        assert r.status_code == 200
        assert r.json() is None

    # ── Logout revokes token ─────────────────────────────────────────────────
    def test_logout_revokes_token(self):
        r = self._login()
        token = r.json()["token"]

        # Logout
        self._client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )

        # /me should return null now
        r3 = self._client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r3.status_code == 200
        assert r3.json() is None

    # ── Expired token rejected ───────────────────────────────────────────────
    def test_expired_token_rejected(self):
        # Create a token that expires immediately
        token = create_access_token(
            {"sub": self._user.id, "email": self._user.email},
            expires_delta=datetime.timedelta(seconds=-1),
        )
        r = self._client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json() is None

    # ── password_reset scoped token rejected on /me ──────────────────────────
    def test_reset_scoped_token_rejected_on_me(self):
        token = create_access_token(
            {"sub": self._user.id, "email": self._user.email, "scope": "password_reset"},
            expires_delta=datetime.timedelta(minutes=15),
        )
        r = self._client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert r.json() is None  # Scoped token must be rejected silently

    # ── Remember-me vs session cookie lifetime (documented) ──────────────────
    def test_remember_me_sets_longer_session(self):
        r_short = self._client.post(
            "/api/auth/login",
            json={"email": "login_test@dubflow.io", "password": "ValidPass99", "remember_me": False},
        )
        r_long = self._client.post(
            "/api/auth/login",
            json={"email": "login_test@dubflow.io", "password": "ValidPass99", "remember_me": True},
        )
        assert r_short.status_code == 200
        assert r_long.status_code == 200
        # Both must succeed — cookie lifetime difference is in the Set-Cookie max-age
        # (verified by checking the token expiry claims)
        import jwt
        short_token = r_short.json()["token"]
        long_token  = r_long.json()["token"]
        short_exp = jwt.decode(short_token,  options={"verify_signature": False})["exp"]
        long_exp  = jwt.decode(long_token,   options={"verify_signature": False})["exp"]
        assert long_exp > short_exp, "Remember-me token must expire later than session token"


# ════════════════════════════════════════════════════════════════════════════
# SECTION 3 — Email Verification
# ════════════════════════════════════════════════════════════════════════════

class TestEmailVerification:

    def setup_method(self):
        from backend.tests.conftest import ensure_tables
        ensure_tables()
        reset_rate_limiter()
        self._client = get_client()

    def _create_unverified_user_with_code(self, email="verify@test.io", password="ValidPass10"):
        db = _TestSessionLocal()
        try:
            # Clean up
            existing = db.query(models.User).filter(models.User.email == email).first()
            if existing:
                db.delete(existing)
                db.commit()

            user = models.User(
                first_name="Ver", last_name="Test",
                email=email, job_type="Director",
                password_hash=hash_password(password),
                email_verified=False,
            )
            db.add(user); db.commit(); db.refresh(user)

            code = generate_verification_code()
            code_hash = hash_verification_code(code)
            now = datetime.datetime.utcnow()
            v = models.EmailVerification(
                user_id=user.id,
                code_hash=code_hash,
                attempts=0,
                expires_at=now + datetime.timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES),
                resend_available_at=now + datetime.timedelta(seconds=RESEND_COOLDOWN_SECONDS),
                is_used=False,
            )
            db.add(v); db.commit()
            return user, code
        finally:
            db.close()

    # ── Valid code verifies account and sets cookie ───────────────────────────
    def test_valid_code_verifies_account(self):
        user, code = self._create_unverified_user_with_code(email="vok@test.io")
        r = self._client.post("/api/auth/verify-email", json={"email": "vok@test.io", "code": code})
        assert r.status_code == 200
        assert r.json()["success"] is True
        assert "erytmo_token" in r.cookies  # Session cookie must be set

    # ── Wrong code returns 400 with remaining attempts ────────────────────────
    def test_wrong_code_shows_remaining_attempts(self):
        user, code = self._create_unverified_user_with_code(email="wrong_code@test.io")
        r = self._client.post("/api/auth/verify-email", json={"email": "wrong_code@test.io", "code": "000000"})
        assert r.status_code == 400
        assert "attempt" in r.json()["detail"].lower()

    # ── Exceeding max attempts blocks the code ────────────────────────────────
    def test_max_attempts_blocks_code(self):
        user, code = self._create_unverified_user_with_code(email="maxattempt@test.io")
        for _ in range(MAX_VERIFICATION_ATTEMPTS):
            self._client.post("/api/auth/verify-email", json={"email": "maxattempt@test.io", "code": "000000"})
        r = self._client.post("/api/auth/verify-email", json={"email": "maxattempt@test.io", "code": code})
        assert r.status_code == 400
        assert "request a new code" in r.json()["detail"].lower() or "expired" in r.json()["detail"].lower() or "exceeded" in r.json()["detail"].lower()

    # ── Expired code rejected ────────────────────────────────────────────────
    def test_expired_code_rejected(self):
        db = _TestSessionLocal()
        try:
            email = "expired_code@test.io"
            existing = db.query(models.User).filter(models.User.email == email).first()
            if existing:
                db.delete(existing); db.commit()

            user = models.User(
                first_name="Exp", last_name="Test", email=email, job_type="Director",
                password_hash=hash_password("ValidPass10"), email_verified=False,
            )
            db.add(user); db.commit(); db.refresh(user)

            code = generate_verification_code()
            code_hash = hash_verification_code(code)
            now = datetime.datetime.utcnow()
            v = models.EmailVerification(
                user_id=user.id, code_hash=code_hash, attempts=0,
                expires_at=now - datetime.timedelta(minutes=5),  # Already expired
                resend_available_at=now - datetime.timedelta(seconds=30),
                is_used=False,
            )
            db.add(v); db.commit()
        finally:
            db.close()

        r = self._client.post("/api/auth/verify-email", json={"email": email, "code": code})
        assert r.status_code == 400
        assert "expired" in r.json()["detail"].lower()

    # ── Non-numeric code rejected ────────────────────────────────────────────
    def test_non_numeric_code_rejected(self):
        r = self._client.post("/api/auth/verify-email", json={"email": "any@test.io", "code": "abcdef"})
        assert r.status_code == 400

    # ── Code wrong length rejected ───────────────────────────────────────────
    def test_wrong_length_code_rejected(self):
        r = self._client.post("/api/auth/verify-email", json={"email": "any@test.io", "code": "1234"})
        assert r.status_code == 400


# ════════════════════════════════════════════════════════════════════════════
# SECTION 4 — Forgot Password Flow
# ════════════════════════════════════════════════════════════════════════════

class TestForgotPassword:

    def setup_method(self):
        from backend.tests.conftest import ensure_tables
        ensure_tables()
        reset_rate_limiter()
        self._client = get_client()
        self._user = create_verified_user(
            email="fp_test@dubflow.io",
            password="OldPassword10",
        )

    def _get_reset_token(self, email="fp_test@dubflow.io"):
        """Drive the full forgot-password flow and return a reset_token."""
        db = _TestSessionLocal()
        try:
            user = db.query(models.User).filter(models.User.email == email).first()
            code = generate_verification_code()
            code_hash = hash_verification_code(code)
            now = datetime.datetime.utcnow()
            v = models.EmailVerification(
                user_id=user.id, code_hash=code_hash, attempts=0,
                expires_at=now + datetime.timedelta(minutes=10),
                resend_available_at=now + datetime.timedelta(seconds=60),
                is_used=False,
            )
            db.add(v); db.commit()
            return code
        finally:
            db.close()

    # ── Anti-enumeration: unknown email returns same 200 as known email ───────
    def test_forgot_password_request_anti_enumeration(self):
        r_known   = self._client.post("/api/auth/forgot-password/request", json={"email": "fp_test@dubflow.io"})
        r_unknown = self._client.post("/api/auth/forgot-password/request", json={"email": "ghost@nowhere.io"})
        assert r_known.status_code   == 200
        assert r_unknown.status_code == 200
        # Both return success (generic message)
        assert r_unknown.json()["success"] is True

    # ── Reset token allows password reset ────────────────────────────────────
    def test_forgot_password_full_flow(self):
        code = self._get_reset_token()
        r_verify = self._client.post(
            "/api/auth/forgot-password/verify-code",
            json={"email": "fp_test@dubflow.io", "code": code},
        )
        assert r_verify.status_code == 200
        reset_token = r_verify.json()["reset_token"]

        r_reset = self._client.post(
            "/api/auth/forgot-password/reset",
            json={
                "reset_token": reset_token,
                "new_password": "NewSecureP10",
                "confirm_password": "NewSecureP10",
            },
        )
        assert r_reset.status_code == 200
        assert r_reset.json()["success"] is True

        # Can now log in with new password
        r_login = self._client.post(
            "/api/auth/login",
            json={"email": "fp_test@dubflow.io", "password": "NewSecureP10", "remember_me": False},
        )
        assert r_login.status_code == 200

    # ── Reset token with wrong scope is rejected ─────────────────────────────
    def test_wrong_scope_reset_token_rejected(self):
        # A regular session token (no scope) should not be usable for reset
        bad_token = create_access_token(
            {"sub": self._user.id, "email": self._user.email},
        )
        r = self._client.post(
            "/api/auth/forgot-password/reset",
            json={
                "reset_token": bad_token,
                "new_password": "NewSecureP10",
                "confirm_password": "NewSecureP10",
            },
        )
        assert r.status_code == 400

    # ── New password too short rejected ─────────────────────────────────────
    def test_reset_short_password_rejected(self):
        code = self._get_reset_token()
        r_verify = self._client.post(
            "/api/auth/forgot-password/verify-code",
            json={"email": "fp_test@dubflow.io", "code": code},
        )
        reset_token = r_verify.json()["reset_token"]

        r = self._client.post(
            "/api/auth/forgot-password/reset",
            json={
                "reset_token": reset_token,
                "new_password": "short1",
                "confirm_password": "short1",
            },
        )
        assert r.status_code == 400


# Run as standalone script
if __name__ == "__main__":
    suites = [
        (TestRegistration,      "Registration"),
        (TestLogin,             "Login & Session"),
        (TestEmailVerification, "Email Verification"),
        (TestForgotPassword,    "Forgot Password"),
    ]

    passed = failed = 0
    for cls, label in suites:
        obj = cls()
        cases = [m for m in dir(obj) if m.startswith("test_")]
        print(f"\n{'─'*60}")
        print(f"  {label}")
        print(f"{'─'*60}")
        for name in cases:
            try:
                obj.setup_method()
                getattr(obj, name)()
                print(f"  ✅  {name}")
                passed += 1
            except Exception as exc:
                print(f"  ❌  {name}")
                print(f"       {type(exc).__name__}: {exc}")
                failed += 1

    print(f"\n{'═'*60}")
    print(f"  Auth Flow Tests: {passed} passed, {failed} failed")
    print(f"{'═'*60}")
    sys.exit(0 if failed == 0 else 1)
