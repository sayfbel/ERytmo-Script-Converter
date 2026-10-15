"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import heroCinematicImg from "@/assets/hero_cinematic.jpg";
import { useAuth } from "@/context/AuthContext";
import FloatingNav from "@/components/FloatingNav";
import { DubFlowIcon } from "@/components/DubFlowLogo";
import { RefreshCw, ArrowLeft } from "lucide-react";

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

    // Set focus to the last entered box or the 6th box
    const focusTarget = Math.min(pastedSlice.length - 1, 5);
    inputRefs.current[focusTarget]?.focus();
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");

    // If more than 1 char entered (e.g. autofill or mobile suggestions)
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
          if (res.requiresProfileCompletion) {
            router.push("/complete-profile");
          } else {
            router.push("/projects");
          }
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
      {/* Reusable Smart Floating Navbar */}
      <FloatingNav />

      {/* Screen Framed Container */}
      <div className="relative w-full min-h-[calc(100vh-2rem)] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between">
        
        {/* Full-Bleed DubFlow Cinematic Background Canvas */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <Image
            src={heroCinematicImg}
            alt="DubFlow Studio - Background Canvas"
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
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`
          }}
        />

        {/* Top spacer for navbar clearance */}
        <div className="h-16 sm:h-20 w-full shrink-0" />

        {/* Centered Main Stage Card (Matches Reference Layout with DubFlow Styling) */}
        <main className="relative z-20 w-full max-w-[460px] my-auto rounded-[32px] sm:rounded-[38px] overflow-hidden bg-[#111113]/90 backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-6 sm:p-9 flex flex-col items-center text-center">
          
          {/* Project Yellow Logo (Raw directly without container) */}
          <DubFlowIcon className="w-10 h-10 sm:w-11 sm:h-11 text-amber-400 mb-5" />

          {/* Headline */}
          <h1 className="text-[26px] sm:text-[30px] font-black text-[#f4efe6] tracking-tight mb-2">
            {isVerified ? "Code Verified!" : "Check your email"}
          </h1>

          {/* Subtitle with email */}
          <p className="text-[13px] sm:text-[14px] text-[#88888e] mb-6 leading-relaxed">
            {isVerified ? (
              "Your identity has been verified. Redirecting to your workspace..."
            ) : (
              <>
                Enter the code sent to<br />
                <span className="font-semibold text-[#f4efe6] break-all">{email || "your email address"}</span>
              </>
            )}
          </p>

          {/* Clean Text Error Notification */}
          {error && (
            <p className="w-full text-center text-xs sm:text-[13px] font-medium text-rose-400 mb-4 px-1 leading-snug animate-in fade-in duration-200">
              {error}
            </p>
          )}

          {/* 6-Digit OTP Form */}
          <form onSubmit={handleVerify} className="w-full flex flex-col items-center">
            
            {/* 6 Individual Square Input Boxes (Matching Reference) */}
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
                  disabled={isVerified}
                  onPaste={handlePaste}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  autoComplete="one-time-code"
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-[#1a1a1c] border border-white/10 hover:border-white/20 focus:border-amber-400 focus:bg-[#222226] focus:shadow-[0_0_0_1px_rgba(251,191,36,0.4)] rounded-[14px] sm:rounded-[16px] text-[#f4efe6] placeholder:text-zinc-600 outline-none transition-all duration-150 shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)] disabled:opacity-50"
                />
              ))}
            </div>

            {/* Verify & Proceed Cream Button */}
            <button
              type="submit"
              disabled={loading || isVerified || digits.join("").length !== 6}
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

            {/* Footer Hint: Spam Folder & Resend */}
            <div className="space-y-2 text-center text-xs sm:text-[13px] text-[#71717a]">
              <p>
                Can&apos;t find the email? Check your spam folder.
              </p>
              
              <div>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending || isVerified}
                  className="inline-flex items-center gap-1.5 font-semibold text-amber-400 hover:text-amber-300 disabled:text-[#555555] disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  <span>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                  </span>
                </button>
              </div>
            </div>

            {/* Back to Login Link */}
            <div className="mt-5 pt-4 border-t border-white/5 w-full flex items-center justify-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-[#88888e] hover:text-[#f4efe6] transition-colors"
              >
                <ArrowLeft size={13} />
                <span>Back to Login</span>
              </Link>
            </div>
          </form>
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
