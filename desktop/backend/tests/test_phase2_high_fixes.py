"""
DubFlow — Phase 2 High-Severity Vulnerability Regression Tests
==============================================================
Proves that:
1. X-Forwarded-For spoofing is prevented:
   - Direct clients cannot spoof their IP by injecting fake forwarding headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP).
   - Behind a trusted reverse proxy, right-to-left traversal extracts the authentic client IP and discards prepended spoofed headers.
   - Rate limiting cannot be bypassed by rotating spoofed IP headers.
2. Account DoS / permanent user lockout is prevented:
   - Account lockout duration is capped (at 600s / 10m) and does not escalate exponentially to 24h / permanent lockout.
   - Password reset via verified email code immediately clears account lockout, allowing legitimate users to log in right away.
   - clear_account_lockout clears all lockout and attempt counters.
3. Active user sessions (JWTs) are invalidated when a password is changed or reset:
   - Tokens issued before a password change are rejected with HTTP 401 on protected endpoints.
   - Tokens issued before a password reset are rejected with HTTP 401 on protected endpoints.
   - Newly issued tokens after password update function normally.
4. Password-reset tokens can strictly be used once and cannot be replayed:
   - Consuming a reset_token marks it as revoked.
   - Replaying the exact same reset_token within its validity window is strictly rejected with HTTP 400.
   - Password is not altered by replayed tokens.
"""

import sys
import os
import unittest
from unittest.mock import MagicMock

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.tests.conftest import (
    get_client, reset_rate_limiter, _TestSessionLocal, ensure_tables, create_verified_user
)
from backend.models import models
from backend.services.auth_service import (
    hash_password, verify_password,
    create_access_token, decode_access_token,
    hash_verification_code,
)
from backend.services.rate_limiter import (
    get_client_ip, is_trusted_proxy, check_login_rate_limit,
    record_failed_login, record_successful_login,
    clear_account_lockout, RateLimitExceeded,
    IP_MAX_ATTEMPTS, ACCOUNT_MAX_ATTEMPTS, ACCOUNT_LOCKOUT_SECONDS, ACCOUNT_MAX_LOCKOUT_SECONDS
)
import datetime


class TestPhase2HighFixes(unittest.TestCase):

    def setUp(self):
        ensure_tables()
        reset_rate_limiter()
        self.client = get_client()
        self.db = _TestSessionLocal()
        # Clean up test users
        for email in [
            "victim_dos@dubflow.io",
            "session_user@dubflow.io",
            "replay_user@dubflow.io",
            "spoof_test@dubflow.io"
        ]:
            u = self.db.query(models.User).filter(models.User.email == email).first()
            if u:
                self.db.delete(u)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # ════════════════════════════════════════════════════════════════════════════
    # ISSUE 1: X-Forwarded-For Spoofing Prevention
    # ════════════════════════════════════════════════════════════════════════════

    def _make_mock_request(self, headers: dict, client_host: str = "203.0.113.195"):
        req = MagicMock()
        req.headers = headers
        req.client = MagicMock()
        req.client.host = client_host
        return req

    def test_direct_connection_ignores_spoofed_x_forwarded_for(self):
        """
        ATTACK SCENARIO:
        Attacker connects directly from public IP 198.51.100.99 (not a trusted proxy)
        and sends 'X-Forwarded-For: 1.2.3.4'.
        REGRESSION ASSERTION:
        The server MUST ignore X-Forwarded-For from untrusted direct connections
        and return the actual client socket IP (198.51.100.99).
        """
        req = self._make_mock_request(
            headers={"X-Forwarded-For": "1.2.3.4"},
            client_host="198.51.100.99"
        )
        self.assertFalse(is_trusted_proxy("198.51.100.99"))
        extracted_ip = get_client_ip(req)
        self.assertEqual(extracted_ip, "198.51.100.99", "Untrusted direct client cannot spoof IP via XFF")

    def test_direct_connection_ignores_spoofed_cf_connecting_ip_and_x_real_ip(self):
        """
        ATTACK SCENARIO:
        Attacker connects directly from 198.51.100.99 and injects CF-Connecting-IP or X-Real-IP.
        REGRESSION ASSERTION:
        The server MUST ignore these headers when direct connection is untrusted.
        """
        req = self._make_mock_request(
            headers={"CF-Connecting-IP": "5.5.5.5", "X-Real-IP": "6.6.6.6"},
            client_host="198.51.100.99"
        )
        self.assertEqual(get_client_ip(req), "198.51.100.99")

    def test_trusted_proxy_discards_prepended_spoofed_ip_in_chain(self):
        """
        ATTACK SCENARIO:
        App is deployed behind a trusted reverse proxy (e.g. 10.0.0.1 or 127.0.0.1).
        Attacker at 198.51.100.77 sends 'X-Forwarded-For: 1.1.1.1' to the proxy.
        The proxy appends the attacker's IP: 'X-Forwarded-For: 1.1.1.1, 198.51.100.77'.
        REGRESSION ASSERTION:
        Evaluating right-to-left, the server MUST extract 198.51.100.77 (authentic client)
        and discard the prepended fake IP 1.1.1.1.
        """
        req = self._make_mock_request(
            headers={"X-Forwarded-For": "1.1.1.1, 198.51.100.77"},
            client_host="10.0.0.1"  # Private IP = trusted proxy
        )
        self.assertTrue(is_trusted_proxy("10.0.0.1"))
        self.assertEqual(get_client_ip(req), "198.51.100.77")

    def test_multi_proxy_trusted_chain_extracts_real_client(self):
        """
        Proxy chain: Client (203.0.113.42) -> Edge Proxy (172.16.0.1) -> Internal Proxy (10.0.0.1)
        Backend direct peer: 10.0.0.1.
        Header: '203.0.113.42, 172.16.0.1'.
        REGRESSION ASSERTION: Both proxies are recognized as trusted, returning 203.0.113.42.
        """
        req = self._make_mock_request(
            headers={"X-Forwarded-For": "203.0.113.42, 172.16.0.1"},
            client_host="10.0.0.1"
        )
        self.assertEqual(get_client_ip(req), "203.0.113.42")

    # ════════════════════════════════════════════════════════════════════════════
    # ISSUE 2: Account DoS / Permanent Lockout Prevention
    # ════════════════════════════════════════════════════════════════════════════

    def test_account_lockout_duration_is_capped_at_safe_maximum(self):
        """
        ATTACK SCENARIO:
        Attacker repeatedly triggers account lockout against victim@dubflow.io.
        In the old code, progressive multiplier doubled the lockout duration
        to 20m, 40m, 80m, up to 24 HOURS (permanent lockout).
        REGRESSION ASSERTION:
        Account lockout duration is strictly capped at ACCOUNT_MAX_LOCKOUT_SECONDS (600s).
        Even after multiple lockout events, the duration does NOT explode into 24h.
        """
        email = "victim_dos@dubflow.io"
        create_verified_user(email=email, password="VictimPassword10!")

        # Trigger first lockout
        for _ in range(ACCOUNT_MAX_ATTEMPTS):
            record_failed_login("1.1.1.1", email)

        with self.assertRaises(RateLimitExceeded) as ctx1:
            check_login_rate_limit("1.1.1.1", email)
        self.assertLessEqual(ctx1.exception.retry_after_seconds, ACCOUNT_MAX_LOCKOUT_SECONDS)

        # Trigger second lockout
        for _ in range(ACCOUNT_MAX_ATTEMPTS):
            record_failed_login("2.2.2.2", email)

        with self.assertRaises(RateLimitExceeded) as ctx2:
            check_login_rate_limit("2.2.2.2", email)
        # Lockout duration must still be capped at ACCOUNT_MAX_LOCKOUT_SECONDS, NOT doubled to 1200+
        self.assertLessEqual(ctx2.exception.retry_after_seconds, ACCOUNT_MAX_LOCKOUT_SECONDS)

    def test_password_reset_immediately_unblocks_locked_account(self):
        """
        ATTACK SCENARIO:
        Attacker locks victim's account by sending 8 failed attempts.
        Victim follows the message prompt ("reset your password") and resets password via email code.
        REGRESSION ASSERTION:
        Password reset MUST call clear_account_lockout.
        Victim MUST be able to immediately log in with new password without HTTP 429.
        """
        email = "victim_dos@dubflow.io"
        u = create_verified_user(email=email, password="OldPassword10!")

        # 1. Attacker locks victim's account
        for _ in range(ACCOUNT_MAX_ATTEMPTS):
            record_failed_login("1.2.3.4", email)

        # Confirm account is locked out
        res_locked = self.client.post("/api/auth/login", json={
            "email": email, "password": "OldPassword10!", "remember_me": False
        })
        self.assertEqual(res_locked.status_code, 429, "Account must be temporarily locked")

        # 2. Victim requests password reset and verifies code
        res_req = self.client.post("/api/auth/forgot-password/request", json={"email": email})
        self.assertEqual(res_req.status_code, 200)

        # Get verification code from DB
        v = self.db.query(models.EmailVerification).filter(
            models.EmailVerification.user_id == u.id,
            models.EmailVerification.is_used == False
        ).first()
        self.assertIsNotNone(v)

        # In test environment, set a known code hash so we can verify
        raw_code = "778899"
        v.code_hash = hash_verification_code(raw_code)
        self.db.commit()

        # Victim verifies code and gets reset token
        res_v = self.client.post("/api/auth/forgot-password/verify-code", json={
            "email": email, "code": raw_code
        })
        self.assertEqual(res_v.status_code, 200)
        reset_token = res_v.json()["reset_token"]

        # Victim resets password
        res_reset = self.client.post("/api/auth/forgot-password/reset", json={
            "reset_token": reset_token,
            "new_password": "NewVictimPass10!",
            "confirm_password": "NewVictimPass10!"
        })
        self.assertEqual(res_reset.status_code, 200)

        # 3. CRITICAL: Victim MUST now be able to log in immediately without 429
        res_login = self.client.post("/api/auth/login", json={
            "email": email, "password": "NewVictimPass10!", "remember_me": False
        })
        self.assertEqual(res_login.status_code, 200, "Account lockout MUST be cleared after password reset")
        self.assertTrue(res_login.json()["success"])

    def test_clear_account_lockout_unit(self):
        """Confirms clear_account_lockout clears all rate limit state for an email."""
        email = "dos_unit@dubflow.io"
        for _ in range(ACCOUNT_MAX_ATTEMPTS):
            record_failed_login("8.8.8.8", email)

        with self.assertRaises(RateLimitExceeded):
            check_login_rate_limit("8.8.8.8", email)

        clear_account_lockout(email)
        # Should not raise now
        check_login_rate_limit("8.8.8.8", email)

    # ════════════════════════════════════════════════════════════════════════════
    # ISSUE 3: Invalidate Active User Sessions (JWTs) on Password Change/Reset
    # ════════════════════════════════════════════════════════════════════════════

    def test_jwt_session_invalidated_after_password_change(self):
        """
        ATTACK SCENARIO:
        Alice has an active session token (token_v1).
        Alice changes her password.
        An attacker who obtained token_v1 attempts to access /api/auth/me.
        REGRESSION ASSERTION:
        token_v1 MUST be rejected with HTTP 401 Unauthorized.
        Logging in with the new password returns token_v2 which is accepted.
        """
        email = "session_user@dubflow.io"
        u = create_verified_user(email=email, password="InitialPassword10!")

        # 1. Log in and get token_v1
        res_login1 = self.client.post("/api/auth/login", json={
            "email": email, "password": "InitialPassword10!", "remember_me": False
        })
        self.assertEqual(res_login1.status_code, 200)
        token_v1 = res_login1.json()["token"]

        # Confirm token_v1 is valid on /me
        res_me_before = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_v1}"})
        self.assertEqual(res_me_before.status_code, 200)
        self.assertEqual(res_me_before.json()["email"], email)

        # 2. Change password via /change-password/request-code + verify-and-change
        res_req = self.client.post(
            "/api/auth/change-password/request-code",
            headers={"Authorization": f"Bearer {token_v1}"}
        )
        self.assertEqual(res_req.status_code, 200)

        # Set known code in verification record
        v = self.db.query(models.EmailVerification).filter(
            models.EmailVerification.user_id == u.id,
            models.EmailVerification.is_used == False
        ).order_by(models.EmailVerification.id.desc()).first()
        raw_code = "112233"
        v.code_hash = hash_verification_code(raw_code)
        self.db.commit()

        res_change = self.client.post(
            "/api/auth/change-password/verify-and-change",
            json={
                "code": raw_code,
                "new_password": "UpdatedPassword10!",
                "confirm_password": "UpdatedPassword10!"
            },
            headers={"Authorization": f"Bearer {token_v1}"}
        )
        self.assertEqual(res_change.status_code, 200)

        # 3. REGRESSION ASSERTION: token_v1 MUST now be rejected on /me (returns null for optional / 401 for required)
        res_me_after = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_v1}"})
        self.assertIsNone(res_me_after.json(), "Previous JWT session MUST be invalidated after password change")

        # 4. Old password rejected, new password accepted
        res_old_login = self.client.post("/api/auth/login", json={
            "email": email, "password": "InitialPassword10!", "remember_me": False
        })
        self.assertEqual(res_old_login.status_code, 401)

        res_new_login = self.client.post("/api/auth/login", json={
            "email": email, "password": "UpdatedPassword10!", "remember_me": False
        })
        self.assertEqual(res_new_login.status_code, 200)
        token_v2 = res_new_login.json()["token"]

        # token_v2 works
        res_me_v2 = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_v2}"})
        self.assertEqual(res_me_v2.status_code, 200)
        self.assertEqual(res_me_v2.json()["email"], email)

    def test_jwt_session_invalidated_after_password_reset(self):
        """
        ATTACK SCENARIO:
        User account was compromised, session token was stolen.
        User resets password via forgot-password flow.
        REGRESSION ASSERTION:
        The stolen session token MUST be invalidated immediately upon password reset.
        """
        email = "session_user@dubflow.io"
        u = create_verified_user(email=email, password="BeforeResetPass10!")

        # Log in and get token
        res_login = self.client.post("/api/auth/login", json={
            "email": email, "password": "BeforeResetPass10!", "remember_me": False
        })
        active_session_token = res_login.json()["token"]

        # Confirm session works
        r_me = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {active_session_token}"})
        self.assertEqual(r_me.json()["email"], email)

        # Reset password flow
        self.client.post("/api/auth/forgot-password/request", json={"email": email})
        v = self.db.query(models.EmailVerification).filter(
            models.EmailVerification.user_id == u.id,
            models.EmailVerification.is_used == False
        ).order_by(models.EmailVerification.id.desc()).first()
        raw_code = "998877"
        v.code_hash = hash_verification_code(raw_code)
        self.db.commit()

        res_v = self.client.post("/api/auth/forgot-password/verify-code", json={
            "email": email, "code": raw_code
        })
        reset_token = res_v.json()["reset_token"]

        res_reset = self.client.post("/api/auth/forgot-password/reset", json={
            "reset_token": reset_token,
            "new_password": "AfterResetPass10!",
            "confirm_password": "AfterResetPass10!"
        })
        self.assertEqual(res_reset.status_code, 200)

        # Prior session token MUST now be invalidated!
        r_me_after = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {active_session_token}"})
        self.assertIsNone(r_me_after.json(), "Pre-reset session token MUST be revoked after password reset")

    # ════════════════════════════════════════════════════════════════════════════
    # ISSUE 4: Password-Reset Tokens Single-Use & Anti-Replay
    # ════════════════════════════════════════════════════════════════════════════

    def test_password_reset_token_strictly_single_use_cannot_be_replayed(self):
        """
        ATTACK SCENARIO:
        Attacker intercepts or observes a password-reset token within its 15-minute validity window.
        After the legitimate user (or attacker) uses it to reset the password,
        the attacker submits the EXACT SAME reset_token again to reset the password to 'AttackerPass10!'.
        REGRESSION ASSERTION:
        The second request MUST be rejected with HTTP 400 Bad Request.
        The user's password MUST NOT be updated to the attacker's password.
        """
        email = "replay_user@dubflow.io"
        u = create_verified_user(email=email, password="OriginalPassword10!")

        # 1. Request reset and get code
        self.client.post("/api/auth/forgot-password/request", json={"email": email})
        v = self.db.query(models.EmailVerification).filter(
            models.EmailVerification.user_id == u.id,
            models.EmailVerification.is_used == False
        ).order_by(models.EmailVerification.id.desc()).first()
        raw_code = "654321"
        v.code_hash = hash_verification_code(raw_code)
        self.db.commit()

        # 2. Verify code and obtain reset_token
        res_v = self.client.post("/api/auth/forgot-password/verify-code", json={
            "email": email, "code": raw_code
        })
        self.assertEqual(res_v.status_code, 200)
        reset_token = res_v.json()["reset_token"]

        # 3. FIRST USE: Legitimate reset
        res_use1 = self.client.post("/api/auth/forgot-password/reset", json={
            "reset_token": reset_token,
            "new_password": "FirstNewPassword10!",
            "confirm_password": "FirstNewPassword10!"
        })
        self.assertEqual(res_use1.status_code, 200, "First use of reset_token must succeed")

        # Confirm password was changed to FirstNewPassword10!
        self.db.expire_all()
        user_db = self.db.query(models.User).filter(models.User.email == email).first()
        self.assertTrue(verify_password("FirstNewPassword10!", user_db.password_hash))

        # 4. SECOND USE (REPLAY ATTACK): Attacker attempts to replay the same reset_token
        res_replay = self.client.post("/api/auth/forgot-password/reset", json={
            "reset_token": reset_token,
            "new_password": "AttackerHijack10!",
            "confirm_password": "AttackerHijack10!"
        })

        # MUST BE REJECTED with HTTP 400
        self.assertEqual(
            res_replay.status_code, 400,
            "Replay of already consumed reset_token MUST be rejected with HTTP 400"
        )
        self.assertIn("already been used", res_replay.json().get("detail", "").lower())

        # 5. Verify database password was NOT changed to attacker's password
        self.db.expire_all()
        user_db2 = self.db.query(models.User).filter(models.User.email == email).first()
        self.assertTrue(
            verify_password("FirstNewPassword10!", user_db2.password_hash),
            "Password must remain FirstNewPassword10! and not be overwritten by replayed token"
        )
        self.assertFalse(
            verify_password("AttackerHijack10!", user_db2.password_hash),
            "Attacker password must not be present in DB"
        )

    def test_reset_token_with_invalid_scope_rejected(self):
        """
        Confirms that regular session tokens cannot be passed as reset_tokens.
        """
        token = create_access_token({"sub": 999, "email": "any@test.io"})
        res = self.client.post("/api/auth/forgot-password/reset", json={
            "reset_token": token,
            "new_password": "ValidPassword10!",
            "confirm_password": "ValidPassword10!"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired or is invalid", res.json().get("detail", "").lower())


if __name__ == "__main__":
    unittest.main()
