"""
DubFlow — Login Rate Limiter (auth_rate_limiter.py)
====================================================
Provides in-process, thread-safe rate limiting for the /auth/login endpoint.

Strategy:
  - Per-IP: max 10 attempts in a 15-minute sliding window before a 15-min lockout
  - Per-account (email): max 8 attempts in a 15-minute window before a 10-min lockout
  - Progressive lockout: after 3 lockout events, lockout doubles each time
  - Suspicious attempt logging: any block triggers a structured log entry

No external dependencies (Redis, etc.) are required — works on SQLite and MySQL alike.
For multi-process/multi-worker deployments, swap the in-memory stores for Redis.
"""

import time
import threading
import logging
import os
from typing import Dict, Tuple

logger = logging.getLogger("dubflow.rate_limiter")

# ─── Configuration ─────────────────────────────────────────────────────────────

# IP-based limits
IP_MAX_ATTEMPTS: int = 10           # attempts before IP lockout
IP_WINDOW_SECONDS: int = 900        # 15-minute sliding window
IP_LOCKOUT_SECONDS: int = 900       # 15-minute base lockout

# Account-based limits (protected against Account DoS / permanent lockout)
ACCOUNT_MAX_ATTEMPTS: int = 8       # attempts before account lockout
ACCOUNT_WINDOW_SECONDS: int = 900   # 15-minute sliding window
ACCOUNT_LOCKOUT_SECONDS: int = 600  # 10-minute base lockout
ACCOUNT_MAX_LOCKOUT_SECONDS: int = 600  # Cap account lockout duration to prevent permanent lockout

# Registration limits (IP-based, anti-bot account flooding)
REGISTRATION_MAX_ATTEMPTS: int = 5         # Max 5 registrations per hour per IP
REGISTRATION_WINDOW_SECONDS: int = 3600    # 1-hour sliding window

# Password reset request limits (IP-based, anti-spam & anti-enumeration)
FORGOT_PASSWORD_MAX_ATTEMPTS: int = 5      # Max 5 reset requests per hour per IP
FORGOT_PASSWORD_WINDOW_SECONDS: int = 3600 # 1-hour sliding window

# Progressive lockout multiplier (applied to attacking IP addresses after successive lockouts)
PROGRESSIVE_LOCKOUT_MULTIPLIER: float = 2.0
MAX_LOCKOUT_SECONDS: int = 86400    # cap at 24 hours for attacking IPs

# ─── Internal State ─────────────────────────────────────────────────────────────

_lock = threading.Lock()

# {ip: {"timestamps": [float, ...], "lockout_until": float, "lockout_count": int}}
_ip_store: Dict[str, dict] = {}

# {email: {"timestamps": [float, ...], "lockout_until": float, "lockout_count": int}}
_account_store: Dict[str, dict] = {}

# {ip: [float, ...]}
_registration_ip_store: Dict[str, list] = {}

# {ip: [float, ...]}
_forgot_password_ip_store: Dict[str, list] = {}


# ─── Helpers ────────────────────────────────────────────────────────────────────

def _clean_timestamps(timestamps: list, window: int, now: float) -> list:
    """Remove timestamps outside the sliding window."""
    cutoff = now - window
    return [t for t in timestamps if t >= cutoff]


def _compute_lockout(base_seconds: int, lockout_count: int) -> float:
    """Progressive lockout for attacking IPs: base * multiplier^lockout_count, capped at MAX."""
    duration = base_seconds * (PROGRESSIVE_LOCKOUT_MULTIPLIER ** lockout_count)
    return min(duration, MAX_LOCKOUT_SECONDS)


# ─── Public API ─────────────────────────────────────────────────────────────────

class RateLimitExceeded(Exception):
    """Raised when a rate limit is exceeded. Contains a human-readable message."""
    def __init__(self, message: str, retry_after_seconds: int):
        super().__init__(message)
        self.message = message
        self.retry_after_seconds = retry_after_seconds


def check_login_rate_limit(ip: str, email: str) -> None:
    """
    Called BEFORE processing a login attempt.
    Raises RateLimitExceeded if the IP or account is currently blocked.

    Args:
        ip:    The client IP address (string).
        email: The normalised (lowercase, stripped) email being attempted.

    Raises:
        RateLimitExceeded: with a user-friendly message and retry_after_seconds.
    """
    now = time.monotonic()
    norm_email = email.strip().lower()

    with _lock:
        # ── 1. Check IP lockout ──────────────────────────────────────────────
        ip_data = _ip_store.setdefault(ip, {"timestamps": [], "lockout_until": 0.0, "lockout_count": 0})

        if ip_data["lockout_until"] > now:
            remaining = int(ip_data["lockout_until"] - now)
            logger.warning(
                "[RATE_LIMIT] IP blocked | ip=%s email=%s retry_after=%ds",
                ip, norm_email, remaining
            )
            raise RateLimitExceeded(
                f"Too many login attempts from your network. Please wait {remaining} seconds before trying again.",
                retry_after_seconds=remaining
            )

        ip_data["timestamps"] = _clean_timestamps(ip_data["timestamps"], IP_WINDOW_SECONDS, now)
        if len(ip_data["timestamps"]) >= IP_MAX_ATTEMPTS:
            lockout_duration = int(_compute_lockout(IP_LOCKOUT_SECONDS, ip_data["lockout_count"]))
            ip_data["lockout_until"] = now + lockout_duration
            ip_data["lockout_count"] += 1
            ip_data["timestamps"] = []
            logger.warning(
                "[RATE_LIMIT] IP lockout triggered | ip=%s email=%s lockout_seconds=%d lockout_count=%d",
                ip, norm_email, lockout_duration, ip_data["lockout_count"]
            )
            raise RateLimitExceeded(
                f"Too many login attempts from your network. Please wait {lockout_duration} seconds before trying again.",
                retry_after_seconds=lockout_duration
            )

        # ── 2. Check account lockout (with anti-DoS duration cap) ────────────
        acc_data = _account_store.setdefault(norm_email, {"timestamps": [], "lockout_until": 0.0, "lockout_count": 0})

        if acc_data["lockout_until"] > now:
            remaining = int(acc_data["lockout_until"] - now)
            logger.warning(
                "[RATE_LIMIT] Account blocked | ip=%s email=%s retry_after=%ds",
                ip, norm_email, remaining
            )
            raise RateLimitExceeded(
                f"This account has been temporarily locked due to too many failed attempts. "
                f"Please wait {remaining} seconds or reset your password.",
                retry_after_seconds=remaining
            )

        acc_data["timestamps"] = _clean_timestamps(acc_data["timestamps"], ACCOUNT_WINDOW_SECONDS, now)
        if len(acc_data["timestamps"]) >= ACCOUNT_MAX_ATTEMPTS:
            # Fixed / capped duration prevents exponential multiplier from causing permanent lockout
            lockout_duration = min(ACCOUNT_LOCKOUT_SECONDS, ACCOUNT_MAX_LOCKOUT_SECONDS)
            acc_data["lockout_until"] = now + lockout_duration
            acc_data["lockout_count"] = 1
            acc_data["timestamps"] = []
            logger.warning(
                "[RATE_LIMIT] Account lockout triggered | ip=%s email=%s lockout_seconds=%d lockout_count=%d",
                ip, norm_email, lockout_duration, acc_data["lockout_count"]
            )
            raise RateLimitExceeded(
                f"This account has been temporarily locked due to too many failed attempts. "
                f"Please wait {lockout_duration} seconds or reset your password.",
                retry_after_seconds=lockout_duration
            )


def record_failed_login(ip: str, email: str) -> None:
    """
    Called AFTER a failed login attempt (wrong password, user not found).
    Records the timestamp for the IP and account sliding windows.

    Args:
        ip:    The client IP address.
        email: The normalised email that was attempted.
    """
    now = time.monotonic()
    norm_email = email.strip().lower()

    with _lock:
        ip_data = _ip_store.setdefault(ip, {"timestamps": [], "lockout_until": 0.0, "lockout_count": 0})
        ip_data["timestamps"].append(now)

        acc_data = _account_store.setdefault(norm_email, {"timestamps": [], "lockout_until": 0.0, "lockout_count": 0})
        acc_data["timestamps"].append(now)

    logger.info(
        "[RATE_LIMIT] Failed login recorded | ip=%s email=%s ip_attempts=%d account_attempts=%d",
        ip, norm_email,
        len(_ip_store.get(ip, {}).get("timestamps", [])),
        len(_account_store.get(norm_email, {}).get("timestamps", []))
    )


def record_successful_login(ip: str, email: str) -> None:
    """
    Called AFTER a successful login.
    Clears the account-level attempt counters (but preserves IP counters to prevent
    credential stuffing where one valid credential resets the IP window).

    Args:
        ip:    The client IP address.
        email: The normalised email that successfully logged in.
    """
    norm_email = email.strip().lower()

    with _lock:
        if norm_email in _account_store:
            _account_store[norm_email] = {"timestamps": [], "lockout_until": 0.0, "lockout_count": 0}

    logger.info("[RATE_LIMIT] Successful login, account counter cleared | ip=%s email=%s", ip, norm_email)


def clear_account_lockout(email: str) -> None:
    """
    Clears any active account-level rate limiting counters and lockout for the specified email.
    Called when an account is verified, password reset, or password changed to prevent Account DoS.

    Args:
        email: The normalised email address.
    """
    if not email:
        return
    norm_email = email.strip().lower()
    with _lock:
        if norm_email in _account_store:
            _account_store[norm_email] = {"timestamps": [], "lockout_until": 0.0, "lockout_count": 0}
    logger.info("[RATE_LIMIT] Account lockout cleared | email=%s", norm_email)


# ─── Registration Rate Limiting (IP-Based) ──────────────────────────────────────

def check_registration_rate_limit(ip: str) -> None:
    """
    Enforces rate limiting on account registration (/auth/register).
    Max 5 accounts created per hour per IP address to prevent bot account flooding.
    """
    now = time.monotonic()
    with _lock:
        timestamps = _registration_ip_store.setdefault(ip, [])
        cleaned = _clean_timestamps(timestamps, REGISTRATION_WINDOW_SECONDS, now)
        _registration_ip_store[ip] = cleaned
        if len(cleaned) >= REGISTRATION_MAX_ATTEMPTS:
            oldest = cleaned[0]
            retry_after = int(REGISTRATION_WINDOW_SECONDS - (now - oldest)) + 1
            logger.warning("[RATE_LIMIT] Registration limit hit | ip=%s retry_after=%ds", ip, retry_after)
            raise RateLimitExceeded(
                f"Too many accounts created from your network. Please wait {retry_after} seconds before registering again.",
                retry_after_seconds=max(1, retry_after)
            )


def record_registration_attempt(ip: str) -> None:
    """
    Records an account registration from the given IP address.
    """
    now = time.monotonic()
    with _lock:
        timestamps = _registration_ip_store.setdefault(ip, [])
        timestamps.append(now)
    logger.info("[RATE_LIMIT] Registration attempt recorded | ip=%s", ip)


# ─── Forgot Password Rate Limiting (IP-Based) ───────────────────────────────────

def check_forgot_password_rate_limit(ip: str) -> None:
    """
    Enforces rate limiting on password reset requests (/auth/forgot-password/request).
    Max 5 requests per hour per IP address to prevent SMTP quota exhaustion and email spam.
    """
    now = time.monotonic()
    with _lock:
        timestamps = _forgot_password_ip_store.setdefault(ip, [])
        cleaned = _clean_timestamps(timestamps, FORGOT_PASSWORD_WINDOW_SECONDS, now)
        _forgot_password_ip_store[ip] = cleaned
        if len(cleaned) >= FORGOT_PASSWORD_MAX_ATTEMPTS:
            oldest = cleaned[0]
            retry_after = int(FORGOT_PASSWORD_WINDOW_SECONDS - (now - oldest)) + 1
            logger.warning("[RATE_LIMIT] Forgot-password limit hit | ip=%s retry_after=%ds", ip, retry_after)
            raise RateLimitExceeded(
                f"Too many password reset requests from your network. Please wait {retry_after} seconds before trying again.",
                retry_after_seconds=max(1, retry_after)
            )


def record_forgot_password_attempt(ip: str) -> None:
    """
    Records a password reset request from the given IP address.
    """
    now = time.monotonic()
    with _lock:
        timestamps = _forgot_password_ip_store.setdefault(ip, [])
        timestamps.append(now)
    logger.info("[RATE_LIMIT] Forgot-password attempt recorded | ip=%s", ip)


def reset_all_rate_limiters() -> None:
    """
    Resets all in-memory rate limiting stores (IP, account, registration, forgot-password).
    Used primarily for test isolation.
    """
    with _lock:
        _ip_store.clear()
        _account_store.clear()
        _registration_ip_store.clear()
        _forgot_password_ip_store.clear()


def is_trusted_proxy(ip: str) -> bool:
    """
    Returns True if the given IP address belongs to a trusted reverse proxy
    (loopback, private RFC-1918 networks, or explicitly configured in TRUSTED_PROXIES).
    """
    if not ip or not isinstance(ip, str):
        return False
    clean_ip = ip.strip()

    # Loopback addresses
    if clean_ip in ("127.0.0.1", "::1", "localhost", "testclient"):
        return True

    # Custom environment configuration: comma-separated list of IPs or CIDRs
    env_trusted = os.environ.get("TRUSTED_PROXIES", "")
    if env_trusted:
        trusted_set = {p.strip() for p in env_trusted.split(",") if p.strip()}
        if clean_ip in trusted_set or "*" in trusted_set:
            return True

    # Private RFC-1918 / loopback ranges (standard in containerized / reverse-proxy setups)
    return _is_private_ip(clean_ip)


def get_client_ip(request) -> str:
    """
    Extracts the authentic client IP from the request, preventing header spoofing.

    Security Strategy:
    1. If the direct connection (request.client.host) is NOT from a trusted reverse proxy,
       all forwarding headers (X-Forwarded-For, CF-Connecting-IP, X-Real-IP) MUST BE IGNORED
       to prevent attackers from spoofing their IP to bypass rate limits.
    2. When deployed behind a trusted reverse proxy:
       Reverse proxies append the connecting IP to the RIGHT of X-Forwarded-For:
         [client_spoofed_ips..., genuine_client_ip, intermediate_proxy, ...]
       We traverse the chain from RIGHT to LEFT, discarding trusted proxy hops.
       The first non-trusted IP encountered is the authentic client IP.
       Any spoofed prefix injected by the client on the left is safely discarded.
    """
    direct_ip = request.client.host if (request.client and request.client.host) else "unknown"

    # Direct connection from untrusted source: strictly ignore all forwarding headers
    if not is_trusted_proxy(direct_ip):
        return direct_ip

    # Direct connection is from a trusted proxy: parse forwarding headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        candidates = [p.strip() for p in forwarded_for.split(",") if p.strip()]
        # Walk from right to left (most recent proxy backwards)
        for candidate in reversed(candidates):
            if not is_trusted_proxy(candidate):
                return candidate
        # If all IPs in chain are trusted proxies (e.g. internal network hops), return the first
        if candidates:
            return candidates[0]

    # Single-IP proxy headers (Cloudflare, Nginx)
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip and cf_ip.strip():
        return cf_ip.strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    return direct_ip


def _is_private_ip(ip: str) -> bool:
    """Returns True if ip is an RFC-1918 / loopback address."""
    private_prefixes = (
        "10.", "192.168.", "127.", "::1", "fc00:", "fd",
        "172.16.", "172.17.", "172.18.", "172.19.",
        "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
        "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
        "172.30.", "172.31."
    )
    return any(ip.startswith(p) for p in private_prefixes)

