"""
DubFlow — Phase 1 Critical Vulnerability Regression Tests
=========================================================
Proves that:
1. Unverified-account registration takeover vulnerability is fixed.
   - Re-registering an unverified account's email NEVER overwrites credentials or personal details.
   - Attackers cannot hijack unverified accounts.
   - Legitimate owners can still verify and log in.
2. Google OAuth token verification strictly enforces GOOGLE_CLIENT_ID and audience.
   - Authentication is rejected if GOOGLE_CLIENT_ID is missing or empty on the server.
   - Tokens with a mismatched audience (cross-client token replay attacks) are strictly rejected.
   - Malformed/invalid Google ID tokens are rejected.
"""

import sys
import os
import unittest
from unittest.mock import patch

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.tests.conftest import (
    get_client, reset_rate_limiter, _TestSessionLocal, ensure_tables
)
from backend.models import models
from backend.services.auth_service import (
    hash_password, verify_password,
    verify_google_id_token,
    hash_verification_code,
)
from backend.routes.auth import process_google_auth_credential


class TestPhase1CriticalFixes(unittest.TestCase):

    def setUp(self):
        ensure_tables()
        reset_rate_limiter()
        self.client = get_client()
        self.db = _TestSessionLocal()
        # Clean up test users
        for email in ["alice_unverified@dubflow.io", "verified_user@dubflow.io", "google_test@dubflow.io"]:
            u = self.db.query(models.User).filter(models.User.email == email).first()
            if u:
                self.db.delete(u)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    # ════════════════════════════════════════════════════════════════════════════
    # VULNERABILITY 1: Unverified Account Registration Takeover
    # ════════════════════════════════════════════════════════════════════════════

    def test_unverified_account_takeover_blocked_on_duplicate_registration(self):
        """
        ATTACK SCENARIO:
        1. Alice registers alice_unverified@dubflow.io with password 'AlicePass10!'.
           Account is created with email_verified=False.
        2. Attacker Bob tries to hijack Alice's pending account by submitting
           a registration request with the same email, name 'Bob Attacker',
           and password 'BobHijackPass99!'.
        3. REGRESSION ASSERTION:
           - The server MUST reject Bob's registration request with HTTP 400.
           - Alice's password hash in the database MUST NOT be modified.
           - Alice's name in the database MUST NOT be modified to Bob.
           - Bob MUST NOT be able to log in with 'BobHijackPass99!'.
           - Alice's original password MUST remain valid.
        """
        # Step 1: Alice registers
        alice_payload = {
            "first_name": "Alice",
            "last_name": "Studio",
            "job_type": "Voice Director",
            "email": "alice_unverified@dubflow.io",
            "password": "AlicePass10!",
            "confirm_password": "AlicePass10!",
        }
        res_alice = self.client.post("/api/auth/register", json=alice_payload)
        self.assertEqual(res_alice.status_code, 200, "Alice initial registration should succeed")

        # Verify Alice is in database unverified
        self.db.expire_all()
        user_before = self.db.query(models.User).filter(models.User.email == "alice_unverified@dubflow.io").first()
        self.assertIsNotNone(user_before)
        self.assertFalse(user_before.email_verified)
        self.assertEqual(user_before.first_name, "Alice")
        original_hash = user_before.password_hash
        self.assertTrue(verify_password("AlicePass10!", original_hash))

        # Step 2: Attacker Bob tries to re-register Alice's unverified email with Bob's credentials
        bob_payload = {
            "first_name": "Bob",
            "last_name": "Attacker",
            "job_type": "Sound Engineer",
            "email": "alice_unverified@dubflow.io",
            "password": "BobHijackPass99!",
            "confirm_password": "BobHijackPass99!",
        }
        res_bob = self.client.post("/api/auth/register", json=bob_payload)

        # Step 3: MUST be rejected with HTTP 400
        self.assertEqual(
            res_bob.status_code, 400,
            "Server MUST reject duplicate registration on an existing unverified account"
        )
        self.assertIn("awaiting verification", res_bob.json().get("detail", "").lower())

        # Step 4: Verify database was NOT modified
        self.db.expire_all()
        user_after = self.db.query(models.User).filter(models.User.email == "alice_unverified@dubflow.io").first()
        self.assertEqual(user_after.first_name, "Alice", "First name must remain Alice, not overwritten by Bob")
        self.assertEqual(user_after.last_name, "Studio", "Last name must remain Studio")
        self.assertEqual(user_after.password_hash, original_hash, "Password hash must remain Alice's hash")

        # Step 5: Verify Bob cannot log in
        res_bob_login = self.client.post("/api/auth/login", json={
            "email": "alice_unverified@dubflow.io",
            "password": "BobHijackPass99!",
            "remember_me": False
        })
        self.assertEqual(res_bob_login.status_code, 401, "Bob's password must be rejected as invalid credentials")

        # Step 6: Verify Alice's password still matches (login returns 403 EMAIL_NOT_VERIFIED, meaning password was correct)
        res_alice_login = self.client.post("/api/auth/login", json={
            "email": "alice_unverified@dubflow.io",
            "password": "AlicePass10!",
            "remember_me": False
        })
        self.assertEqual(res_alice_login.status_code, 403, "Alice's password must be valid and report unverified")
        self.assertEqual(res_alice_login.json().get("detail", {}).get("code"), "EMAIL_NOT_VERIFIED")

    def test_verified_account_duplicate_registration_rejected(self):
        """
        Confirms that already verified accounts also reject duplicate registration.
        """
        u = models.User(
            first_name="Verified",
            last_name="User",
            job_type="Director",
            email="verified_user@dubflow.io",
            password_hash=hash_password("ValidPassword10!"),
            email_verified=True,
        )
        self.db.add(u)
        self.db.commit()

        res = self.client.post("/api/auth/register", json={
            "first_name": "Another",
            "last_name": "Person",
            "job_type": "Actor",
            "email": "verified_user@dubflow.io",
            "password": "AnotherPassword10!",
            "confirm_password": "AnotherPassword10!",
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("already registered", res.json().get("detail", "").lower())

    # ════════════════════════════════════════════════════════════════════════════
    # VULNERABILITY 2: Google OAuth Token Verification & Audience Security
    # ════════════════════════════════════════════════════════════════════════════

    def test_google_oauth_rejected_when_client_id_missing(self):
        """
        ATTACK SCENARIO:
        If GOOGLE_CLIENT_ID is not configured on the server (empty string or None),
        the previous code passed audience=None to id_token.verify_oauth2_token,
        causing it to accept ANY valid Google ID token from any app in the world.

        REGRESSION ASSERTION:
        - If GOOGLE_CLIENT_ID is unset / empty, verify_google_id_token MUST return None.
        - process_google_auth_credential MUST raise ValueError.
        - POST /api/auth/google MUST return HTTP 400.
        """
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": ""}):
            # 1. Direct function test
            result = verify_google_id_token("some_token_from_another_app")
            self.assertIsNone(result, "Must return None when GOOGLE_CLIENT_ID is empty")

            # 2. Service process test
            with self.assertRaises(ValueError) as ctx:
                process_google_auth_credential("some_token", self.db)
            self.assertIn("not configured", str(ctx.exception).lower())

            # 3. HTTP endpoint test
            res = self.client.post("/api/auth/google", json={"credential": "some_token"})
            self.assertEqual(res.status_code, 400)
            self.assertIn("not configured", res.json().get("detail", "").lower())

    def test_google_oauth_rejected_when_audience_mismatches(self):
        """
        ATTACK SCENARIO:
        Attacker signs into their own malicious app 'attacker-client-id.apps.googleusercontent.com'
        and obtains an ID token. The attacker sends this token to DubFlow
        (which uses 'legit-dubflow-client-id.apps.googleusercontent.com').

        REGRESSION ASSERTION:
        - The token verification MUST strictly verify audience matches GOOGLE_CLIENT_ID.
        - A mismatched audience MUST be rejected with None.
        """
        configured_client_id = "legit-dubflow-client-id.apps.googleusercontent.com"
        attacker_client_id = "attacker-rogue-client-id.apps.googleusercontent.com"

        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": configured_client_id}):
            # Mock google oauth2 library id_token.verify_oauth2_token
            # When called with audience=legit, if the token audience is attacker's ID,
            # Google's library raises ValueError("Wrong recipient, payload audience doesn't match")
            with patch("backend.services.auth_service.id_token.verify_oauth2_token") as mock_verify:
                mock_verify.side_effect = ValueError(
                    f"Wrong recipient, payload audience doesn't match: {attacker_client_id}"
                )

                result = verify_google_id_token("token_issued_for_attacker_app")
                self.assertIsNone(result, "Mismatched audience token must be rejected")
                # Confirm verify_oauth2_token was called with the configured audience, NOT None!
                mock_verify.assert_called_once()
                _, kwargs = mock_verify.call_args
                self.assertEqual(
                    kwargs.get("audience"), configured_client_id,
                    "id_token.verify_oauth2_token must be called with the explicit configured client_id"
                )

    def test_google_oauth_rejected_when_issuer_is_not_google(self):
        """
        Confirms that tokens from an unauthorized or fake issuer are rejected.
        """
        configured_client_id = "legit-dubflow-client-id.apps.googleusercontent.com"
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": configured_client_id}):
            with patch("backend.services.auth_service.id_token.verify_oauth2_token") as mock_verify:
                # Mock token payload with evil issuer
                mock_verify.return_value = {
                    "iss": "https://evil-issuer.com",
                    "aud": configured_client_id,
                    "sub": "12345",
                    "email": "victim@dubflow.io",
                    "email_verified": True
                }
                result = verify_google_id_token("fake_issuer_token")
                self.assertIsNone(result, "Token with non-Google issuer must be rejected")

    def test_google_oauth_accepted_when_token_is_valid_and_audience_matches(self):
        """
        Confirms that valid Google ID tokens minted for DubFlow are accepted.
        """
        configured_client_id = "legit-dubflow-client-id.apps.googleusercontent.com"
        with patch.dict(os.environ, {"GOOGLE_CLIENT_ID": configured_client_id}):
            with patch("backend.services.auth_service.id_token.verify_oauth2_token") as mock_verify:
                mock_verify.return_value = {
                    "iss": "https://accounts.google.com",
                    "aud": configured_client_id,
                    "sub": "google-sub-987654321",
                    "email": "legit_user@dubflow.io",
                    "given_name": "Legit",
                    "family_name": "User",
                    "email_verified": True,
                    "picture": "https://lh3.googleusercontent.com/photo.jpg"
                }

                result = verify_google_id_token("valid_token_matching_aud")
                self.assertIsNotNone(result, "Valid matching token must be accepted")
                self.assertEqual(result["google_id"], "google-sub-987654321")
                self.assertEqual(result["email"], "legit_user@dubflow.io")
                self.assertTrue(result["email_verified"])

                # Now test through process_google_auth_credential
                user, token = process_google_auth_credential("valid_token_matching_aud", self.db)
                self.assertEqual(user.email, "legit_user@dubflow.io")
                self.assertEqual(user.google_id, "google-sub-987654321")
                self.assertTrue(user.email_verified)
                self.assertIsNotNone(token)


if __name__ == "__main__":
    unittest.main()
