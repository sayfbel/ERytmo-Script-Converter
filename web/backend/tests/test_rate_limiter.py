"""
DubFlow — Rate Limiter Unit + Integration Tests
================================================
Covers:
  - Unit: check/record/reset logic, IP extraction, progressive lockout
  - Integration: HTTP 429 from /login, Retry-After header, counter reset on success
  - Concurrency: multiple rapid failed attempts
  - In-memory vs. restart behaviour (documented)
"""

import time
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.tests.conftest import (
    get_client, reset_rate_limiter, create_verified_user,
)
from backend.tests import conftest as _conftest_mod
from backend.services import rate_limiter as rl
from backend.services.rate_limiter import (
    check_login_rate_limit, record_failed_login, record_successful_login,
    get_client_ip, RateLimitExceeded,
    IP_MAX_ATTEMPTS, ACCOUNT_MAX_ATTEMPTS,
    IP_LOCKOUT_SECONDS, ACCOUNT_LOCKOUT_SECONDS,
)


# ════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Unit Tests: Core rate limiter logic
# ════════════════════════════════════════════════════════════════════════════

class TestRateLimiterUnit:

    def setup_method(self):
        from backend.tests.conftest import ensure_tables
        ensure_tables()
        reset_rate_limiter()

    # ── 1.1 No block on first attempt ───────────────────────────────────────
    def test_first_attempt_is_allowed(self):
        check_login_rate_limit("1.2.3.4", "user@test.io")  # Must not raise

    # ── 1.2 IP lockout triggers at threshold ────────────────────────────────
    def test_ip_blocks_after_max_attempts(self):
        ip = "5.5.5.5"
        email = "probe@test.io"
        for _ in range(IP_MAX_ATTEMPTS):
            record_failed_login(ip, email)

        raised = False
        try:
            check_login_rate_limit(ip, email)
        except RateLimitExceeded as e:
            raised = True
            assert e.retry_after_seconds > 0
            assert "network" in e.message.lower() or "too many" in e.message.lower()
        assert raised, "Should have raised RateLimitExceeded for IP"

    # ── 1.3 Account lockout triggers at threshold ───────────────────────────
    def test_account_blocks_after_max_attempts(self):
        ip = "9.9.9.9"
        email = "victim@test.io"
        for _ in range(ACCOUNT_MAX_ATTEMPTS):
            record_failed_login(ip, email)

        raised = False
        try:
            check_login_rate_limit("9.9.9.10", email)   # Different IP, same email
        except RateLimitExceeded as e:
            raised = True
            assert e.retry_after_seconds > 0
        assert raised, "Should have raised RateLimitExceeded for account"

    # ── 1.4 Successful login clears account counter, NOT IP counter ─────────
    def test_success_clears_account_not_ip(self):
        ip = "7.7.7.7"
        email = "legit@test.io"

        # Record 4 failures (below threshold)
        for _ in range(4):
            record_failed_login(ip, email)

        # Successful login clears account counter
        record_successful_login(ip, email)

        # Account counter is reset → check_login_rate_limit should not raise for account
        check_login_rate_limit(ip, email)  # No raise = account cleared

        # IP counter persists (4 attempts still in window)
        with rl._lock:
            ip_count = len(rl._ip_store.get(ip, {}).get("timestamps", []))
        assert ip_count == 4, f"IP counter should still have 4, got {ip_count}"

    # ── 1.5 Progressive lockout doubles with each successive lockout ─────────
    def test_progressive_lockout_doubles(self):
        from backend.services.rate_limiter import _compute_lockout
        first  = _compute_lockout(IP_LOCKOUT_SECONDS, lockout_count=0)
        second = _compute_lockout(IP_LOCKOUT_SECONDS, lockout_count=1)
        third  = _compute_lockout(IP_LOCKOUT_SECONDS, lockout_count=2)
        assert second == first * 2,  f"2nd lockout should be 2× first: {second} vs {first}"
        assert third  == first * 4,  f"3rd lockout should be 4× first: {third} vs {first}"

    # ── 1.6 Progressive lockout is capped at MAX_LOCKOUT_SECONDS ────────────
    def test_progressive_lockout_capped(self):
        from backend.services.rate_limiter import _compute_lockout, MAX_LOCKOUT_SECONDS
        # After many lockouts, duration should never exceed MAX
        huge = _compute_lockout(IP_LOCKOUT_SECONDS, lockout_count=50)
        assert huge <= MAX_LOCKOUT_SECONDS

    # ── 1.7 Timestamps outside window are pruned ────────────────────────────
    def test_old_timestamps_pruned(self):
        ip = "2.2.2.2"
        email = "old@test.io"
        now = time.monotonic()
        # Manually inject old timestamps far outside the window
        with rl._lock:
            rl._ip_store[ip] = {
                "timestamps": [now - 9999, now - 8888],  # Very old
                "lockout_until": 0.0,
                "lockout_count": 0,
            }
        # These should be pruned; adding one fresh attempt should not trigger lockout
        record_failed_login(ip, email)
        check_login_rate_limit(ip, email)  # Should not raise (only 1 fresh attempt)


class TestIPExtraction:
    """Verify get_client_ip extracts the correct IP from various header configurations."""

    def _make_request(self, headers: dict, client_host: str = "10.0.0.1"):
        from unittest.mock import MagicMock
        req = MagicMock()
        req.headers = headers
        req.client = MagicMock()
        req.client.host = client_host
        return req

    def test_direct_connection(self):
        req = self._make_request({}, client_host="203.0.113.1")
        assert get_client_ip(req) == "203.0.113.1"

    def test_x_forwarded_for_single(self):
        req = self._make_request({"X-Forwarded-For": "198.51.100.5"})
        assert get_client_ip(req) == "198.51.100.5"

    def test_x_forwarded_for_chain_picks_first_public(self):
        # Proxy chain: real client → internal proxy → edge
        req = self._make_request({"X-Forwarded-For": "203.0.113.42, 10.0.0.1, 172.16.0.1"})
        assert get_client_ip(req) == "203.0.113.42"

    def test_cloudflare_cf_connecting_ip(self):
        req = self._make_request({"CF-Connecting-IP": "104.21.55.200"})
        assert get_client_ip(req) == "104.21.55.200"

    def test_x_real_ip_fallback(self):
        req = self._make_request({"X-Real-IP": "185.220.101.5"})
        assert get_client_ip(req) == "185.220.101.5"

    def test_all_private_xff_returns_first(self):
        req = self._make_request({"X-Forwarded-For": "10.0.0.1, 192.168.1.5"})
        # All private → return first one
        assert get_client_ip(req) == "10.0.0.1"


# ════════════════════════════════════════════════════════════════════════════
# SECTION 2 — Integration Tests: /login endpoint via TestClient
# ════════════════════════════════════════════════════════════════════════════

class TestLoginRateLimitIntegration:

    def setup_method(self):
        from backend.tests.conftest import ensure_tables
        ensure_tables()
        reset_rate_limiter()
        self._user = create_verified_user(
            email="rl_test@dubflow.io",
            password="ValidPass99",
        )
        self._client = get_client()

    def _login(self, email="rl_test@dubflow.io", password="ValidPass99", ip="1.1.1.1"):
        return self._client.post(
            "/api/auth/login",
            json={"email": email, "password": password, "remember_me": False},
            headers={"X-Forwarded-For": ip},
        )

    # ── 2.1 Successful login returns 200 with token ──────────────────────────
    def test_successful_login_returns_200(self):
        r = self._login()
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["success"] is True
        assert "token" in body
        assert "user" in body
        assert body["user"]["email"] == "rl_test@dubflow.io"

    # ── 2.2 Successful login sets HttpOnly cookie ────────────────────────────
    def test_successful_login_sets_httponly_cookie(self):
        r = self._login()
        assert r.status_code == 200
        cookie = r.cookies.get("erytmo_token")
        assert cookie is not None, "HttpOnly cookie 'erytmo_token' must be set"

    # ── 2.3 Wrong password unified error message ─────────────────────────────
    def test_wrong_password_returns_unified_error(self):
        r = self._login(password="WrongPassword1")
        assert r.status_code == 401
        detail = r.json()["detail"]
        # Must NOT reveal which field was wrong
        assert "email" in detail.lower() or "password" in detail.lower()
        assert "No account found" not in detail
        assert "Incorrect password" not in detail or "email or password" in detail

    # ── 2.4 Unknown email returns same 401 as wrong password ─────────────────
    def test_unknown_email_returns_same_401(self):
        r_bad_pwd  = self._login(password="WrongOne1")
        r_no_email = self._login(email="ghost@nowhere.io", password="WrongOne1")
        assert r_bad_pwd.status_code  == 401
        assert r_no_email.status_code == 401
        assert r_bad_pwd.json()["detail"] == r_no_email.json()["detail"], \
            "Error messages must be identical (anti-enumeration)"

    # ── 2.5 Repeated wrong passwords trigger HTTP 429 ────────────────────────
    def test_http_429_after_repeated_failures(self):
        ip = "8.8.8.8"
        # Exhaust the IP window (IP_MAX_ATTEMPTS = 10)
        for _ in range(rl.IP_MAX_ATTEMPTS):
            self._login(password="Wrong1234", ip=ip)

        r = self._login(ip=ip)
        assert r.status_code == 429, f"Expected 429 after {rl.IP_MAX_ATTEMPTS} failures, got {r.status_code}"

    # ── 2.6 Retry-After header is present on 429 ────────────────────────────
    def test_retry_after_header_on_429(self):
        ip = "8.8.4.4"
        for _ in range(rl.IP_MAX_ATTEMPTS):
            self._login(password="Wrong1234", ip=ip)

        r = self._login(ip=ip)
        assert r.status_code == 429
        assert "retry-after" in r.headers or "Retry-After" in r.headers, \
            "Retry-After header must be present on 429"
        retry_after = int(r.headers.get("retry-after") or r.headers.get("Retry-After"))
        assert retry_after > 0

    # ── 2.7 Account lockout across different IPs ─────────────────────────────
    def test_account_lockout_across_ips(self):
        email = "rl_test@dubflow.io"
        # Use different IPs to hit account limit (not IP limit)
        for i in range(rl.ACCOUNT_MAX_ATTEMPTS):
            self._login(email=email, password="Wrong9999", ip=f"10.0.{i}.1")

        # Attempt from a brand-new IP — should be blocked due to account lockout
        r = self._login(email=email, password="Wrong9999", ip="99.99.99.99")
        assert r.status_code == 429, \
            f"Account lockout should block new IPs too, got {r.status_code}"

    # ── 2.8 Successful login clears account counter ───────────────────────────
    def test_successful_login_clears_account_counter(self):
        ip = "3.3.3.3"
        email = "rl_test@dubflow.io"
        # Record some failures but not enough to lock out
        for _ in range(rl.ACCOUNT_MAX_ATTEMPTS - 2):
            self._login(email=email, password="Wrong111", ip=ip)

        # Successful login
        r = self._login(email=email, password="ValidPass99", ip=ip)
        assert r.status_code == 200

        # Subsequent failures should start from 0 again (account counter reset)
        for _ in range(rl.ACCOUNT_MAX_ATTEMPTS - 1):
            self._login(email=email, password="Wrong111", ip="4.4.4.4")
        # Should NOT be locked (would require ACCOUNT_MAX_ATTEMPTS to lock)
        r2 = self._login(email=email, password="ValidPass99", ip="4.4.4.5")
        assert r2.status_code == 200, "Account should not be locked after counter reset"

    # ── 2.9 Behaviour after backend restart (documented limitation) ──────────
    def test_rate_limiter_resets_on_module_reimport(self):
        """
        DOCUMENTED LIMITATION: The in-memory rate limiter does NOT persist
        across process restarts. This test confirms that a store-clear (simulating
        a restart) resets all counters — which is the expected but limited behaviour.

        MITIGATION REQUIRED for multi-worker/production: use Redis as the backing store.
        """
        ip = "11.22.33.44"
        email = "rl_test@dubflow.io"
        for _ in range(rl.IP_MAX_ATTEMPTS):
            record_failed_login(ip, email)

        # Simulate restart by clearing stores (as init would do)
        with rl._lock:
            rl._ip_store.clear()
            rl._account_store.clear()

        # After restart, no block should be in effect
        check_login_rate_limit(ip, email)  # Must not raise


# Run as standalone script
if __name__ == "__main__":
    runner = TestRateLimiterUnit()
    unit_cases = [m for m in dir(runner) if m.startswith("test_")]

    ip_runner = TestIPExtraction()
    ip_cases = [m for m in dir(ip_runner) if m.startswith("test_")]

    intg_runner = TestLoginRateLimitIntegration()
    intg_cases = [m for m in dir(intg_runner) if m.startswith("test_")]

    passed = failed = 0
    all_tests = [
        (runner, unit_cases, "Unit — Rate Limiter Logic"),
        (ip_runner, ip_cases, "Unit — IP Extraction"),
        (intg_runner, intg_cases, "Integration — /login endpoint"),
    ]

    for obj, cases, label in all_tests:
        print(f"\n{'─'*60}")
        print(f"  {label}")
        print(f"{'─'*60}")
        for name in cases:
            try:
                if hasattr(obj, "setup_method"):
                    obj.setup_method()
                getattr(obj, name)()
                print(f"  ✅  {name}")
                passed += 1
            except Exception as exc:
                print(f"  ❌  {name}")
                print(f"       {type(exc).__name__}: {exc}")
                failed += 1

    print(f"\n{'═'*60}")
    print(f"  Rate Limiter Tests: {passed} passed, {failed} failed")
    print(f"{'═'*60}")
    sys.exit(0 if failed == 0 else 1)
