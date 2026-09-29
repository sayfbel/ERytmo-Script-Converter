"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import FloatingNav from "@/components/FloatingNav";
import { DubFlowIcon } from "@/components/DubFlowLogo";
import { AlertCircle, Check, RefreshCw, ArrowLeft, ShieldCheck } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerificationCode } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [cooldown, setCooldown] = useState<number>(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const qEmail = searchParams.get("email");
    if (qEmail) {
      setEmail(qEmail);
    }
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const code = digits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    if (!email) {
      setError("Email address is missing.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmail(email, code);
      if (res.success) {
        setIsVerified(true);
        setTimeout(() => {
          router.push("/complete-profile");
        }, 1200);
      } else {
        setError(res.error || "Verification failed. Invalid code.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!email) {
      setError("Email address is missing.");
      return;
    }

    setResending(true);
    setError(null);

    try {
      const res = await resendVerificationCode(email);
      if (res.success) {
        setCooldown(60);
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError(res.error || "Failed to resend code.");
      }
    } catch {
      setError("Unable to resend code right now.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#f4efe6] selection:bg-amber-400 selection:text-black font-sans-display p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-center">
      {/* Floating Header */}
      <FloatingNav />

      {/* Screen Framed Container */}
      <div className="relative w-full min-h-[calc(100vh-2rem)] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between">
        
        {/* Full-Bleed DubFlow Background */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <Image
            src="/hero_cinematic.jpg"
            alt="DubFlow Studio Background"
            fill
            priority
            className="object-cover object-center filter brightness-[0.32] contrast-[1.15] blur-[2px] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/60" />
        </div>

        {/* Film grain texture */}
        <div 
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] pointer-events-none z-10 opacity-70"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`
          }}
        />

        {/* Top spacer */}
        <div className="h-16 sm:h-20 w-full shrink-0" />

        {/* Main Stage Card */}
        <main className="relative z-20 w-full max-w-[980px] my-auto rounded-[32px] sm:rounded-[40px] overflow-hidden bg-[#111113]/90 backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-4 sm:p-7 md:p-8 grid grid-cols-1 lg:grid-cols-[6fr_5fr] gap-6">

          {/* Left Column: Form Pane */}
          <div className="relative z-10 flex flex-col justify-center">
            
            {/* Top Brand & Step */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl border border-white/20 bg-black/60 shadow-sm shrink-0 flex items-center justify-center p-2">
                  <DubFlowIcon className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <span className="font-extrabold text-[#f4efe6] tracking-tight text-base block">DubFlow Studio*</span>
                  <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                    <ShieldCheck size={13} /> Two-Factor Verification
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30">
                Security Check
              </span>
            </div>

            {/* Headline */}
            <div className="mb-5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#f4efe6] tracking-tight">
                {isVerified ? "Code Verified!" : "Enter your security code"}
              </h1>
              <p className="text-xs sm:text-sm text-[#88888e] mt-1.5 leading-relaxed">
                {isVerified ? (
                  "Your identity has been confirmed. Redirecting to your workspace..."
                ) : (
                  <>
                    Enter the 6-digit verification code sent to <span className="text-[#f4efe6] font-semibold">{email || "your email address"}</span>.
                  </>
                )}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl font-mono text-[11px] text-left bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-2">
                  6-Digit Verification PIN
                </label>

                {/* PIN digits box */}
                <div className={`w-full py-3.5 px-4 rounded-[18px] border flex items-center justify-center transition-all ${
                  isVerified
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                    : "bg-[#1a1a1c] border-white/10 focus-within:border-white/25"
                }`}>
                  {isVerified && <Check className="w-4 h-4 text-emerald-400 mr-3 stroke-[3]" />}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {digits.slice(0, 3).map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={isVerified}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        placeholder="•"
                        className="w-8 h-10 sm:w-9 sm:h-11 text-center text-lg sm:text-xl font-bold bg-[#141416] border border-white/10 rounded-xl text-[#f4efe6] placeholder:text-[#444444] focus:border-amber-400 focus:outline-none transition-all"
                      />
                    ))}
                    <span className="text-[#555555] font-bold px-1">—</span>
                    {digits.slice(3, 6).map((digit, index) => (
                      <input
                        key={index + 3}
                        ref={(el) => {
                          inputRefs.current[index + 3] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={isVerified}
                        onChange={(e) => handleDigitChange(index + 3, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index + 3, e)}
                        placeholder="•"
                        className="w-8 h-10 sm:w-9 sm:h-11 text-center text-lg sm:text-xl font-bold bg-[#141416] border border-white/10 rounded-xl text-[#f4efe6] placeholder:text-[#444444] focus:border-amber-400 focus:outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isVerified || digits.join("").length !== 6}
                className="w-full h-[50px] bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Code...</span>
                  </div>
                ) : (
                  <span>Verify & Proceed</span>
                )}
              </button>

              {/* Remember device checkbox & Back button */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
                    rememberDevice 
                      ? "bg-[#ECE8DF] border-[#ECE8DF] text-black" 
                      : "bg-[#1a1a1c] border-white/20 group-hover:border-white/40 text-transparent"
                  }`}>
                    <svg className="w-3 h-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-[12px] text-[#88888e] group-hover:text-[#d4d4d8] transition-colors">
                    Remember device for 30 days
                  </span>
                </label>

                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-[12px] text-[#88888e] hover:text-[#f4efe6] transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Login</span>
                </Link>
              </div>

              {/* Resend Code Section */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending || isVerified}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 disabled:text-[#555555] disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  <span>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive code? Resend"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Visual Pane with Dubbing Studio Image */}
          <div className="hidden lg:flex relative min-h-[500px] rounded-[28px] overflow-hidden bg-[#0d0d0f] border border-white/10 items-center justify-center select-none shadow-inner">
            <Image
              src="/studio_card.jpg"
              alt="DubFlow Studio Dubbing Workstation"
              fill
              priority
              className="object-cover object-center filter brightness-[0.82] contrast-[1.08] saturate-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />
            
            <div className="absolute bottom-5 inset-x-6 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-white/70 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <span>TPN Level 3 Compliant</span>
              <span className="text-amber-400 font-bold">• 0 Cloud Media</span>
            </div>
          </div>

        </main>

        {/* Site Footer */}
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070707]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
