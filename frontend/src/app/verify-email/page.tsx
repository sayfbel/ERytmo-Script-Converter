"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Check, RefreshCw } from "lucide-react";

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
          router.push("/projects");
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
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 md:p-8 bg-[#eef2f6] text-slate-800 select-none">
      {/* Outer Card Container */}
      <div className="w-full max-w-[960px] min-h-[580px] bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Form Panel */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-between order-2 md:order-1">
          <div>
            {/* Top Logo */}
            <div className="flex items-center space-x-2.5 mb-8">
              <div className="w-8 h-8 relative rounded-xl bg-slate-900 flex items-center justify-center p-1 shadow-sm">
                <Image
                  src="/app_logo.png"
                  alt="ERytmo"
                  width={24}
                  height={24}
                  priority
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base">ERytmo</span>
            </div>

            {/* Title & Subtitle (Matches Reference Image) */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {isVerified ? "Thanks!" : "Enter your code"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                {isVerified ? (
                  "You will be redirected..."
                ) : (
                  <>
                    Enter the 6-digit code we sent to: <span className="font-semibold text-slate-800">{email || "your email"}</span>. It may take a minute to arrive.
                  </>
                )}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  2FA Code:
                </label>

                {/* Code Input Box (Matches Reference Image pill design) */}
                <div
                  className={`w-full py-3 px-4 rounded-xl border flex items-center justify-center transition-all ${
                    isVerified
                      ? "bg-[#e8fbf0] border-emerald-300 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-900 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20"
                  }`}
                >
                  {isVerified && <Check className="w-4 h-4 text-emerald-600 mr-3 stroke-[3]" />}
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
                        placeholder="0"
                        className="w-7 h-9 sm:w-8 sm:h-10 text-center text-lg sm:text-xl font-bold bg-transparent text-slate-900 placeholder:text-slate-300 focus:outline-none"
                      />
                    ))}
                    <span className="text-slate-300 font-bold px-1">—</span>
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
                        placeholder="0"
                        className="w-7 h-9 sm:w-8 sm:h-10 text-center text-lg sm:text-xl font-bold bg-transparent text-slate-900 placeholder:text-slate-300 focus:outline-none"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Primary Submit Button (Exact reference style) */}
              <button
                type="submit"
                disabled={loading || isVerified || digits.join("").length !== 6}
                className="w-full mt-2 py-3 px-4 bg-[#3b5bfd] hover:bg-[#324fdb] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Verifying..." : "Submit"}
              </button>

              {/* Secondary Back Button */}
              <Link
                href="/login"
                className="w-full flex items-center justify-center py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-all"
              >
                Back
              </Link>

              {/* Remember this device checkbox */}
              <div className="pt-2">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <div
                    onClick={() => setRememberDevice(!rememberDevice)}
                    className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-colors cursor-pointer ${
                      rememberDevice ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"
                    }`}
                  >
                    {rememberDevice && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-medium text-slate-700 select-none">
                    Remember this device for 30 days.
                  </span>
                </label>
              </div>

              {/* Resend Code Section */}
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending || isVerified}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  <span>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Minimalist Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>© ERytmo Studio</span>
            <span className="text-slate-400 hover:text-slate-600 cursor-pointer">support@erytmo.com</span>
          </div>
        </div>

        {/* Right Side: Pastel Mint/Sage Gradient (Matches Reference Image Green Version) */}
        <div className={`w-full md:w-1/2 min-h-[220px] md:min-h-full flex flex-col items-center justify-center p-8 relative overflow-hidden order-1 md:order-2 transition-all duration-700 ${
          isVerified 
            ? "bg-gradient-to-br from-[#c6f6d5] via-[#d4f8e8] to-[#e6fffa]" 
            : "bg-gradient-to-br from-[#d4c3f8] via-[#e8d5f3] to-[#fad2c0]"
        }`}>
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] pointer-events-none" />

          {/* Large Frosted Glass Stadium Pill (exact element from reference image) */}
          <div className="relative z-10 w-48 sm:w-64 h-32 sm:h-40 rounded-[50px] bg-white/40 backdrop-blur-md shadow-sm border border-white/50 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/60 backdrop-blur-sm p-3 shadow-xs flex items-center justify-center">
              <Image
                src="/app_logo.png"
                alt="ERytmo Logo"
                width={40}
                height={40}
                priority
                className="object-contain"
              />
            </div>
          </div>

          {/* Carousel Indicator Dots */}
          <div className="relative z-10 flex items-center space-x-2 mt-8">
            <div className="w-2 h-2 rounded-full bg-slate-700/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700/25" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700/25" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700/25" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eef2f6]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
