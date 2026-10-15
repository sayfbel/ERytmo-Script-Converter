"""
DubFlow — Security Auth Priority Patches Validation Tests
==========================================================
Tests the 5 prioritized authentication security patches:
1. Timing side-channel mitigation on /auth/login (dummy PBKDF2 hash on unknown email)
2. Harmonized password policy across /register, /change-password, /forgot-password
3. IP rate limiting on /register and /forgot-password/request
4. Concurrency IntegrityError handling on registration (clean 400 rollback)
5. Pure HttpOnly cookie session authentication (no Authorization header required)
"""

import sys
import os
import time
import unittest
from unittest.mock import patch, MagicMock
from sqlalchemy.exc import IntegrityError

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.tests.conftest import (
    get_client, reset_rate_limiter, _TestSessionLocal, ensure_tables, create_verified_user
)
from backend.models import models
from backend.services.auth_service import (
    validate_password_strength,
    _DUMMY_PBKDF2_HASH,
    _COMMON_PASSWORDS,
    verify_password,
    create_access_token,
    hash_verification_code,
)
from backend.services.rate_limiter import (
    check_registration_rate_limit,
    record_registration_attempt,
    check_forgot_password_rate_limit,
    record_forgot_password_attempt,
    RateLimitExceeded,
    REGISTRATION_MAX_ATTEMPTS,
    FORGOT_PASSWORD_MAX_ATTEMPTS,
)


class TestAuthSecurityPatches(unittest.TestCase):

    def setUp(self):
        ensure_tables()
        reset_rate_limiter()
        self.client = get_client()
        self.db = _TestSessionLocal()
        # Clean up any test users
        for email in [
            "patch_test@dubflow.io",
            "dummy_time@dubflow.io",
            "change_pw@dubflow.io",
            "reset_pw@dubflow.io",
            "race_test@dubflow.io"
        ]:
            u = self.db.query(models.User).filter(models.User.email == email).first()
            if u:
                self.db.delete(u)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # ════════════════════════════════════════════════════════════════════════════
    # PATCH 1: Timing Side-Channel Elimination on /auth/login
    # ════════════════════════════════════════════════════════════════════════════

    def test_dummy_pbkdf2_hash_runs_on_unknown_email(self):
        """
        Verifies that when an email is NOT found in the database,
        verify_password is executed with _DUMMY_PBKDF2_HASH to normalize
        response latency to ~80ms and eliminate email enumeration oracles.
        """
        with patch("backend.routes.auth.verify_password", wraps=verify_password) as mock_verify:
            res = self.client.post("/api/auth/login", json={
                "email": "nonexistent_email_12345@dubflow.io",
                "password": "Password1234!",
                "remember_me": False
            })
            self.assertEqual(res.status_code, 401)
            self.assertEqual(res.json()["detail"], "Incorrect email or password. Please try again.")

            # mock_verify MUST have been called with the dummy hash
            mock_verify.assert_called_once_with("Password1234!", _DUMMY_PBKDF2_HASH)

    def test_unknown_email_vs_wrong_password_timing_comparable(self):
        """
        Verifies that verifying an unknown email takes substantial computation time (>30ms)
        comparable to verifying an existing user with a wrong password, proving PBKDF2 runs.
        """
        # Create an existing user
        create_verified_user(email="dummy_time@dubflow.io", password="CorrectPassword123!")

        # 1. Measure wrong password on existing user
        t0 = time.monotonic()
        res_existing = self.client.post("/api/auth/login", json={
            "email": "dummy_time@dubflow.io",
            "password": "WrongPassword123!",
            "remember_me": False
        })
        time_existing = time.monotonic() - t0
        self.assertEqual(res_existing.status_code, 401)

        # 2. Measure non-existing user
        t0 = time.monotonic()
        res_missing = self.client.post("/api/auth/login", json={
            "email": "ghost_user_999@dubflow.io",
            "password": "WrongPassword123!",
            "remember_me": False
        })
        time_missing = time.monotonic() - t0
        self.assertEqual(res_missing.status_code, 401)

        # Both should take at least 25ms due to 100,000 PBKDF2 rounds
        self.assertGreater(time_missing, 0.025, f"Missing user login returned too quickly ({time_missing*1000:.1f}ms), dummy hash not computing!")
        self.assertGreater(time_existing, 0.025, f"Existing user login returned too quickly ({time_existing*1000:.1f}ms)!")

    # ════════════════════════════════════════════════════════════════════════════
    # PATCH 2: Harmonized Password Policy
    # ════════════════════════════════════════════════════════════════════════════

    def test_validate_password_strength_unit(self):
        """Unit tests for validate_password_strength."""
        # Too short (< 10)
        with self.assertRaises(ValueError) as ctx:
            validate_password_strength("Short1")
        self.assertIn("10 characters", str(ctx.exception))

        # Too short: 8 chars (used to pass on reset/change)
        with self.assertRaises(ValueError) as ctx:
            validate_password_strength("Pass1234")
        self.assertIn("10 characters", str(ctx.exception))

        # Too long (> 128)
        with self.assertRaises(ValueError) as ctx:
            validate_password_strength("A1" * 65)
        self.assertIn("128", str(ctx.exception))

        # Missing digits
        with self.assertRaises(ValueError) as ctx:
            validate_password_strength("NoDigitsHerePass")
        self.assertIn("number", str(ctx.exception))

        # Missing letters
        with self.assertRaises(ValueError) as ctx:
            validate_password_strength("1234567890123")
        self.assertIn("letter", str(ctx.exception))

        # Common password blacklist
        for common in ["password123", "qwerty123", "letmein1"]:
            if len(common) >= 10:
                with self.assertRaises(ValueError) as ctx:
                    validate_password_strength(common)
                self.assertIn("too common", str(ctx.exception).lower())

        # Valid passwords (>= 10 chars, letters + numbers)
        self.assertIsNone(validate_password_strength("ValidPass10"))
        self.assertIsNone(validate_password_strength("StrongStudio2026!"))

    def test_change_password_enforces_harmonized_policy(self):
        """
        Verifies that /change-password/verify-and-change rejects 8-character passwords
        that previously passed, enforcing the 10-char policy consistently with registration.
        """
        user = create_verified_user(email="change_pw@dubflow.io", password="InitialPass10!")
        token = create_access_token({"sub": user.id, "email": user.email})

        # Request change code
        self.client.post(
            "/api/auth/change-password/request-code",
            headers={"Authorization": f"Bearer {token}"}
        )

        v = self.db.query(models.EmailVerification).filter(
            models.EmailVerification.user_id == user.id,
            models.EmailVerification.is_used == False
        ).order_by(models.EmailVerification.id.desc()).first()
        raw_code = "654321"
        v.code_hash = hash_verification_code(raw_code)
        self.db.commit()

        # Try to change to 8-character password (e.g. Pass1234) -> MUST BE REJECTED
        res_reject = self.client.post(
            "/api/auth/change-password/verify-and-change",
            json={
                "code": raw_code,
                "new_password": "Pass1234",
                "confirm_password": "Pass1234"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res_reject.status_code, 400)
        self.assertIn("10 characters", res_reject.json()["detail"])

        # Try to change to 10+ character valid password -> MUST SUCCEED
        res_accept = self.client.post(
            "/api/auth/change-password/verify-and-change",
            json={
                "code": raw_code,
                "new_password": "NewStrongPass10!",
                "confirm_password": "NewStrongPass10!"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res_accept.status_code, 200)

    def test_forgot_password_reset_enforces_harmonized_policy(self):
        """
        Verifies that /forgot-password/reset rejects 8-character passwords
        and enforces the 10-char minimum and blacklist.
        """
        user = create_verified_user(email="reset_pw@dubflow.io", password="OldPassword10!")
        
        # Issue valid reset token
        reset_token = create_access_token(
            {"sub": user.id, "email": user.email, "scope": "password_reset"}
        )

        # 8-character password rejected
        res_short = self.client.post("/api/auth/forgot-password/reset", json={
            "reset_token": reset_token,
            "new_password": "Pass1234",
            "confirm_password": "Pass1234"
        })
        self.assertEqual(res_short.status_code, 400)
        self.assertIn("10 characters", res_short.json()["detail"])

        # Blacklisted password rejected
        res_blacklisted = self.client.post("/api/auth/forgot-password/reset", json={
            "reset_token": reset_token,
            "new_password": "password123",
            "confirm_password": "password123"
        })
        self.assertEqual(res_blacklisted.status_code, 400)
        self.assertIn("too common", res_blacklisted.json()["detail"].lower())

        # Valid 10+ char password accepted
        res_valid = self.client.post("/api/auth/forgot-password/reset", json={
            "reset_token": reset_token,
            "new_password": "BrandNewPass10!",
            "confirm_password": "BrandNewPass10!"
        })
        self.assertEqual(res_valid.status_code, 200)

    # ════════════════════════════════════════════════════════════════════════════
    # PATCH 3: Rate Limiting on /register and /forgot-password/request
    # ════════════════════════════════════════════════════════════════════════════

    def test_registration_rate_limiting_blocks_after_5_attempts(self):
        """
        Verifies that after 5 account registrations from the same IP,
        the 6th registration is rejected with HTTP 429 Too Many Requests.
        """
        test_ip = "198.51.100.42"

        # Record 5 registrations from this IP
        for _ in range(REGISTRATION_MAX_ATTEMPTS):
            record_registration_attempt(test_ip)

        # 6th registration check MUST raise RateLimitExceeded
        with self.assertRaises(RateLimitExceeded) as ctx:
            check_registration_rate_limit(test_ip)
        self.assertGreater(ctx.exception.retry_after_seconds, 0)

        # Integration test via client with X-Forwarded-For not accepted if untrusted,
        # but let's test directly via client using mock IP
        with patch("backend.routes.auth.get_client_ip", return_value=test_ip):
            res = self.client.post("/api/auth/register", json={
                "first_name": "Bot",
                "last_name": "Spammer",
                "job_type": "Bot",
                "email": "bot_user@dubflow.io",
                "password": "BotPassword10!",
                "confirm_password": "BotPassword10!"
            })
            self.assertEqual(res.status_code, 429)
            self.assertIn("Retry-After", res.headers)
            self.assertIn("Too many accounts", res.json()["detail"])

    def test_forgot_password_rate_limiting_blocks_after_5_attempts(self):
        """
        Verifies that after 5 password reset requests from the same IP,
        the 6th request is blocked with HTTP 429 Too Many Requests.
        """
        test_ip = "198.51.100.88"

        # Record 5 reset requests
        for _ in range(FORGOT_PASSWORD_MAX_ATTEMPTS):
            record_forgot_password_attempt(test_ip)

        # 6th reset check MUST raise RateLimitExceeded
        with self.assertRaises(RateLimitExceeded) as ctx:
            check_forgot_password_rate_limit(test_ip)
        self.assertGreater(ctx.exception.retry_after_seconds, 0)

        # Integration test via endpoint
        with patch("backend.routes.auth.get_client_ip", return_value=test_ip):
            res = self.client.post("/api/auth/forgot-password/request", json={
                "email": "any_user@dubflow.io"
            })
            self.assertEqual(res.status_code, 429)
            self.assertIn("Retry-After", res.headers)
            self.assertIn("Too many password reset requests", res.json()["detail"])

    # ════════════════════════════════════════════════════════════════════════════
    # PATCH 4: Concurrency IntegrityError Handling on Registration
    # ════════════════════════════════════════════════════════════════════════════

    def test_concurrent_registration_integrity_error_handled(self):
        """
        Simulates two concurrent registration requests with the same email.
        When db.commit() raises IntegrityError due to unique constraint,
        the backend must catch it, rollback the session, and return a clean 400.
        """
        mock_db = _TestSessionLocal()
        mock_commit = MagicMock(side_effect=IntegrityError("UNIQUE constraint failed: users.email", None, None))
        mock_db.commit = mock_commit

        def override_db():
            try:
                yield mock_db
            finally:
                pass

        from backend.main import app
        from backend.database.database import get_db

        orig_override = app.dependency_overrides.get(get_db)
        app.dependency_overrides[get_db] = override_db
        try:
            res = self.client.post("/api/auth/register", json={
                "first_name": "Race",
                "last_name": "Condition",
                "job_type": "Engineer",
                "email": "race_test@dubflow.io",
                "password": "StrongPassword10!",
                "confirm_password": "StrongPassword10!"
            })
            # MUST return HTTP 400, NOT an unhandled 500 error!
            self.assertEqual(res.status_code, 400)
            self.assertIn("already registered", res.json()["detail"].lower())
        finally:
            if orig_override:
                app.dependency_overrides[get_db] = orig_override

    # ════════════════════════════════════════════════════════════════════════════
    # PATCH 5: Cookie-Only Authentication (No LocalStorage Token Required)
    # ════════════════════════════════════════════════════════════════════════════

    def test_httponly_cookie_authentication_without_bearer_header(self):
        """
        Verifies that /auth/me authenticates 100% via HttpOnly cookie set on login,
        with zero reliance on Authorization Bearer headers or localStorage.
        """
        email = "cookie_user@dubflow.io"
        create_verified_user(email=email, password="CookiePassword10!")

        # 1. Login sets the cookie
        login_res = self.client.post("/api/auth/login", json={
            "email": email,
            "password": "CookiePassword10!",
            "remember_me": False
        })
        self.assertEqual(login_res.status_code, 200)
        self.assertIn("erytmo_token", self.client.cookies)

        # 2. Call /api/auth/me WITHOUT any Authorization header
        me_res = self.client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 200)
        data = me_res.json()
        self.assertIsNotNone(data)
        self.assertEqual(data["email"], email)


if __name__ == "__main__":
    unittest.main()
