"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import FloatingNav from "@/components/FloatingNav";
import { apiFetch } from "@/lib/api";
import { Eye, EyeOff, CheckCircle2, ArrowLeft, ShieldCheck, Clock, RefreshCw } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Steps: "email" | "verify" | "reset" | "success"
  const [step, setStep] = useState<"email" | "verify" | "reset" | "success">("email");

  // Form Fields
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Security & Anti-Spam state
  const [cooldown, setCooldown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // Pre-fill email from sessionStorage (passed from login page)
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("forgot_password_email");
    if (storedEmail) {
      setEmail(storedEmail);
      sessionStorage.removeItem("forgot_password_email");
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Success auto-redirect countdown timer
  useEffect(() => {
    if (step !== "success") return;
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, router]);

  // Focus first digit box when entering verify step
  useEffect(() => {
    if (step === "verify") {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // OTP digit box handlers (matching verify-email style)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardText = e.clipboardData.getData("text").trim();
    const cleanDigits = clipboardText.replace(/\D/g, "");
    if (!cleanDigits) return;

    const newDigits = ["", "", "", "", "", ""];
    const pastedSlice = cleanDigits.slice(0, 6).split("");
    pastedSlice.forEach((d, i) => {
      newDigits[i] = d;
    });

    setDigits(newDigits);
    setError(null);
    const focusTarget = Math.min(pastedSlice.length - 1, 5);
    inputRefs.current[focusTarget]?.focus();
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");

    if (cleanValue.length > 1) {
      const pastedDigits = cleanValue.slice(0, 6).split("");
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setDigits(newDigits);
      const nextFocus = Math.min(index + pastedDigits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);
    setError(null);

    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Step 1: Request Verification Code
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setToastInfo(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (cooldown > 0) {
      setError(`Anti-spam protection active. Please wait ${cooldown} seconds before requesting a new code.`);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setToastInfo(data.message || `A 6-digit verification code has been sent to ${cleanEmail}.`);
        setCooldown(data.cooldown_seconds || 60);
        setStep("verify");
      } else {
        if (res.status === 429) {
          setCooldown(60);
        }
        setError(data.detail || "Unable to send verification code. Please try again.");
      }
    } catch {
      setError("Unable to connect to the server. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-Digit Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setToastInfo(null);

    const cleanCode = digits.join("");
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError("Verification code must be exactly 6 numbers.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: cleanCode,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.reset_token) {
        setResetToken(data.reset_token);
        setToastInfo("Identity verified! Set your new password.");
        setStep("reset");
      } else {
        const errorDetail = data.detail || "Invalid verification code.";
        setError(errorDetail);
        if (errorDetail.includes("attempt")) {
          const match = errorDetail.match(/(\d+)\s+attempt/);
          if (match) setAttemptsLeft(parseInt(match[1], 10));
        }
      }
    } catch {
      setError("Unable to verify code. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setToastInfo(null);

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Password must contain at least one letter and one number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please check again.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset_token: resetToken,
          email: email.trim().toLowerCase(),
          code: digits.join(""),
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setToastInfo("Password updated successfully! Redirecting to login...");
        setStep("success");
      } else {
        setError(data.detail || "Failed to reset password. Session may have expired.");
      }
    } catch {
      setError("Unable to update password. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#f4efe6] selection:bg-amber-400 selection:text-black font-sans-display p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-center">
      
      {/* Reusable Smart Floating Navbar */}
      <FloatingNav />

      {/* Screen Framed Container (Exact matching login design frame) */}
      <div className="relative w-full min-h-[calc(100vh-2rem)] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between">
        
        {/* 1. Full-Bleed ERytmo Cinematic Background Visual Canvas */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <Image
            src="/hero_cinematic.jpg"
            alt="DubFlow Studio Background Canvas"
            fill
            priority
            className="object-cover object-center filter brightness-[0.32] contrast-[1.15] blur-[2px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/60" />
        </div>

        {/* Film grain texture overlay */}
        <div
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] pointer-events-none z-10 opacity-70"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Top clearance */}
        <div className="h-16 sm:h-20 w-full shrink-0" />

        {/* 2. Main Stage: Studio Card Container */}
        <main className="relative z-20 w-full max-w-[980px] my-auto rounded-[32px] sm:rounded-[40px] overflow-hidden bg-[#111113]/90 backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-4">
          
          {/* Mobile Background Wrap */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[32px] lg:hidden">
            <Image
              src="/studio_card.jpg"
              alt="ERytmo Studio Workstation"
              fill
              className="object-cover object-center filter brightness-[0.35] contrast-[1.12]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/[0.97] via-black/[0.7] to-black/[0.85]" />
          </div>

          {/* Left Column: Form Pane */}
          <div className="relative z-10 bg-transparent px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center justify-center text-center">
            
            <div className="w-full max-w-[340px] sm:max-w-[360px] mx-auto flex flex-col items-center text-center">
              
              {/* Kicker Badge */}
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[#737373] mb-2 select-none">
                <ShieldCheck size={13} className="text-amber-400" />
                SECURITY / DUBFLOW
              </div>

              {/* Step Title */}
              <h1 className="text-[30px] sm:text-[34px] font-black text-[#f4efe6] tracking-tight leading-[1.1] mb-2">
                {step === "email" && "Forgot Password"}
                {step === "verify" && "Verify Code"}
                {step === "reset" && "New Password"}
                {step === "success" && "Password Reset"}
              </h1>

              {/* Step Description */}
              <p className="text-[13px] text-[#88888e] mb-4 leading-relaxed">
                {step === "email" && "Enter your email to receive a secure 6-digit verification code."}
                {step === "verify" && `Enter the 6-digit code sent to ${email}.`}
                {step === "reset" && "Create your new password with at least 8 characters, letters & numbers."}
                {step === "success" && "Your password has been changed successfully."}
              </p>

              {/* Error & Info Messages */}
              {error && (
                <div className="w-full text-center text-xs sm:text-[13px] font-medium text-rose-400 mb-3 px-2 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 leading-snug animate-in fade-in duration-200">
                  {error}
                </div>
              )}
              {toastInfo && (
                <div className="w-full text-center text-xs sm:text-[13px] font-medium text-amber-300 mb-3 px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 leading-snug animate-in fade-in duration-200">
                  {toastInfo}
                </div>
              )}

              {/* STEP 1: Email Form */}
              {step === "email" && (
                <form onSubmit={handleRequestCode} className="w-full flex flex-col gap-3">
                  <div className="relative w-full">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      placeholder="Email address"
                      className="w-full h-[50px] bg-[#1a1a1c] border border-white/10 hover:border-white/15 focus:border-white/25 rounded-[18px] px-5 text-[14px] text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cooldown > 0}
                    className="w-full h-[50px] mt-1 bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Sending Code...</span>
                      </div>
                    ) : cooldown > 0 ? (
                      <div className="flex items-center gap-2 text-zinc-700">
                        <Clock size={15} />
                        <span>Wait {cooldown}s</span>
                      </div>
                    ) : (
                      <span>Get Verification Code</span>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: 6-Digit Code Verification (Matching verify-email style) */}
              {step === "verify" && (
                <form onSubmit={handleVerifyCode} className="w-full flex flex-col items-center">

                  {/* 6 Individual Square Input Boxes (Matching verify-email) */}
                  <div 
                    onPaste={handlePaste}
                    className="flex items-center justify-center gap-2 sm:gap-2.5 w-full mb-6"
                  >
                    {digits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onPaste={handlePaste}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        autoComplete="one-time-code"
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-[#1a1a1c] border border-white/10 hover:border-white/20 focus:border-amber-400 focus:bg-[#222226] focus:shadow-[0_0_0_1px_rgba(251,191,36,0.4)] rounded-[14px] sm:rounded-[16px] text-[#f4efe6] placeholder:text-zinc-600 outline-none transition-all duration-150 shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"
                      />
                    ))}
                  </div>

                  {attemptsLeft !== null && (
                    <p className="text-[11px] text-amber-400/90 font-medium mb-3">
                      ⚠️ {attemptsLeft} verification {attemptsLeft === 1 ? "attempt" : "attempts"} remaining.
                    </p>
                  )}

                  {/* Verify & Proceed Cream Button */}
                  <button
                    type="submit"
                    disabled={loading || digits.join("").length !== 6}
                    className="w-full h-[48px] sm:h-[50px] bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[18px] sm:rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed mb-4"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      <span>Verify & Proceed</span>
                    )}
                  </button>

                  {/* Footer: Spam hint & Resend (matching verify-email style) */}
                  <div className="space-y-2 text-center text-xs sm:text-[13px] text-[#71717a]">
                    <p>
                      Can&apos;t find the email? Check your spam folder.
                    </p>
                    
                    <div>
                      <button
                        type="button"
                        onClick={() => handleRequestCode()}
                        disabled={cooldown > 0 || loading}
                        className="inline-flex items-center gap-1.5 font-semibold text-amber-400 hover:text-amber-300 disabled:text-[#555555] disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span>
                          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Back to change email */}
                  <div className="mt-5 pt-4 border-t border-white/5 w-full flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setDigits(["", "", "", "", "", ""]);
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-[#88888e] hover:text-[#f4efe6] transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      <span>Change Email</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Change Password Form (2 Inputs: Password & Confirm) */}
              {step === "reset" && (
                <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-3">
                  {/* Password Input 1 */}
                  <div className="relative w-full">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      placeholder="New Password (min 8 chars)"
                      className="w-full h-[50px] bg-[#1a1a1c] border border-white/10 hover:border-white/15 focus:border-white/25 rounded-[18px] px-5 pr-12 text-[14px] text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#888888] transition-colors cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                    </button>
                  </div>

                  {/* Password Input 2: Confirm Password */}
                  <div className="relative w-full">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      placeholder="Confirm New Password"
                      className="w-full h-[50px] bg-[#1a1a1c] border border-white/10 hover:border-white/15 focus:border-white/25 rounded-[18px] px-5 pr-12 text-[14px] text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555555] hover:text-[#888888] transition-colors cursor-pointer"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                    </button>
                  </div>

                  {/* Match Indicator */}
                  {newPassword && confirmPassword && (
                    <div className="text-[11px] text-left px-1 font-medium">
                      {newPassword === confirmPassword ? (
                        <span className="text-emerald-400">✓ Passwords match</span>
                      ) : (
                        <span className="text-rose-400">✗ Passwords do not match</span>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !newPassword || !confirmPassword}
                    className="w-full h-[50px] mt-1 bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </div>
                    ) : (
                      <span>Confirm & Update Password</span>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 4: Success & Auto Redirect */}
              {step === "success" && (
                <div className="w-full flex flex-col items-center gap-4 py-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 size={36} />
                  </div>

                  <p className="text-[12px] text-zinc-400 font-mono">
                    Redirecting to login page in <span className="text-amber-400 font-bold">{redirectCountdown}s</span>...
                  </p>

                  <Link
                    href="/login"
                    className="w-full h-[50px] bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    Return to Login Now
                  </Link>
                </div>
              )}

              {/* Footer Switch Link */}
              <div className="text-[13px] text-[#7a7a7a] mt-5 font-normal">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-[#f4efe6] font-bold hover:underline cursor-pointer ml-0.5"
                >
                  Log in
                </Link>
              </div>

            </div>
          </div>

          {/* Right Column: Visual Pane */}
          <div className="hidden lg:flex relative min-h-[540px] rounded-[28px] overflow-hidden bg-[#0d0d0f] border border-white/10 items-center justify-center select-none shadow-inner">
            <Image
              src="/studio_card.jpg"
              alt="DubFlow Studio Workstation"
              fill
              priority
              className="object-cover object-center filter brightness-[0.8] contrast-[1.08] saturate-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

            <div className="absolute bottom-5 inset-x-6 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-white/70 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <span>TPN Level 3 Security</span>
              <span className="text-amber-400 font-bold">• Encrypted Credentials</span>
            </div>
          </div>

        </main>

        {/* 3. Site Footer */}
        <footer className="w-full max-w-[980px] z-20 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] text-zinc-500">
          <div>© 2026 DubFlow Studio Inc. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/#vision" className="hover:text-zinc-300 transition-colors">Confidentialité</Link>
            <Link href="/#vision" className="hover:text-zinc-300 transition-colors">Protocole Sécurité</Link>
            <Link href="/#workflows" className="hover:text-zinc-300 transition-colors">Statut Réseau P2P</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
