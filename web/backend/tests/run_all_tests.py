#!/usr/bin/env python3
"""
DubFlow — Master Test Runner
=============================
Executes all security validation test suites and prints a consolidated report.
Usage: python -m backend.tests.run_all_tests
       OR: python backend/tests/run_all_tests.py
"""

import sys
import os
import time
import traceback

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def _run_suite(cls_obj, label: str):
    cases = sorted([m for m in dir(cls_obj) if m.startswith("test_")])
    results = []
    for name in cases:
        t0 = time.monotonic()  # Always init t0 before any call
        try:
            if hasattr(cls_obj, "setup_method"):
                cls_obj.setup_method()
            elif hasattr(cls_obj, "setUp"):
                cls_obj.setUp()
            t0 = time.monotonic()  # Reset after setup so only test time is measured
            getattr(cls_obj, name)()
            if hasattr(cls_obj, "tearDown"):
                cls_obj.tearDown()
            elapsed = (time.monotonic() - t0) * 1000
            results.append(("PASS", name, elapsed, None))
        except Exception as exc:
            if hasattr(cls_obj, "tearDown"):
                try:
                    cls_obj.tearDown()
                except Exception:
                    pass
            elapsed = (time.monotonic() - t0) * 1000
            tb = traceback.format_exc()
            results.append(("FAIL", name, elapsed, f"{type(exc).__name__}: {exc}\n{tb}"))
    return results


def run_all():
    print("\n" + "═" * 70)
    print("  DubFlow Security — Full Validation Suite")
    print("═" * 70)

    # Ensure the test DB tables exist before any suite imports run
    from backend.tests.conftest import _test_engine
    from backend.database.database import Base
    Base.metadata.create_all(bind=_test_engine)

    # Import all test classes
    from backend.tests.test_rate_limiter import (
        TestRateLimiterUnit, TestIPExtraction, TestLoginRateLimitIntegration,
    )
    from backend.tests.test_auth_flows import (
        TestRegistration, TestLogin, TestEmailVerification, TestForgotPassword,
    )
    from backend.tests.test_upload_security import (
        TestMagicByteDetector, TestProfilePictureUpload,
    )
    from backend.tests.test_auth_security_patches import TestAuthSecurityPatches

    suites = [
        # ── Rate Limiter ──────────────────────────────────────────────────────
        (TestRateLimiterUnit(),          "Rate Limiter — Unit Logic"),
        (TestIPExtraction(),             "Rate Limiter — IP Extraction"),
        (TestLoginRateLimitIntegration(),"Rate Limiter — /login Integration"),
        # ── Auth Flows ────────────────────────────────────────────────────────
        (TestRegistration(),             "Auth — Registration & Password Policy"),
        (TestLogin(),                    "Auth — Login, Session & Token Revocation"),
        (TestEmailVerification(),        "Auth — Email Verification"),
        (TestForgotPassword(),           "Auth — Forgot Password Flow"),
        # ── Upload Security ───────────────────────────────────────────────────
        (TestMagicByteDetector(),        "Upload — Magic Byte Detector (Unit)"),
        (TestProfilePictureUpload(),     "Upload — Profile Picture Security"),
        # ── 5 Priority Security Patches ───────────────────────────────────────
        (TestAuthSecurityPatches(),      "Auth — 5 Priority Hardening Patches"),
    ]

    all_passed = 0
    all_failed = 0
    suite_summaries = []

    for obj, label in suites:
        results = _run_suite(obj, label)
        s_passed = sum(1 for r in results if r[0] == "PASS")
        s_failed = sum(1 for r in results if r[0] == "FAIL")
        all_passed += s_passed
        all_failed += s_failed
        suite_summaries.append((label, results, s_passed, s_failed))

        icon = "✅" if s_failed == 0 else "❌"
        print(f"\n{icon}  {label}  ({s_passed}/{len(results)} passed)")
        print("   " + "─" * 58)
        for status, name, ms, detail in results:
            mark = "  ✅" if status == "PASS" else "  ❌"
            print(f"{mark}  {name}  ({ms:.0f}ms)")
            if detail:
                for line in detail.strip().split("\n"):
                    print(f"        {line}")

    # ── Summary table ─────────────────────────────────────────────────────────
    print("\n" + "═" * 70)
    print("  RESULTS SUMMARY")
    print("═" * 70)
    print(f"  {'Suite':<45} {'Pass':>5}  {'Fail':>5}  {'Status'}")
    print(f"  {'─'*45} {'─'*5}  {'─'*5}  {'─'*8}")
    for label, results, sp, sf in suite_summaries:
        status = "✅ OK" if sf == 0 else f"❌ {sf} FAIL"
        total = sp + sf
        short = label[:43] + ".." if len(label) > 45 else label
        print(f"  {short:<45} {sp:>5}  {sf:>5}  {status}")
    print(f"  {'─'*45} {'─'*5}  {'─'*5}")
    print(f"  {'TOTAL':<45} {all_passed:>5}  {all_failed:>5}")
    print("═" * 70)

    if all_failed == 0:
        print("\n  🎉 All tests passed. Security module validated.\n")
    else:
        print(f"\n  ⚠️  {all_failed} test(s) failed. Review failures above.\n")

    return all_failed


if __name__ == "__main__":
    failed_count = run_all()
    sys.exit(0 if failed_count == 0 else 1)
