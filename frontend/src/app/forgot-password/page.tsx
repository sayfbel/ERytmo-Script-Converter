"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FloatingNav from "@/components/FloatingNav";
import { apiFetch } from "@/lib/api";
import { Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {

  const [step, setStep] = useState<"request" | "reset" | "success">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Request Reset Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setToastInfo(null);

    if (!email.trim()) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setToastInfo(data.message || `Un code de réinitialisation a été envoyé à ${email}.`);
        setStep("reset");
      } else {
        setError(data.detail || "Impossible d'envoyer le code. Veuillez réessayer.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  // Reset Password with Code
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setToastInfo(null);

    if (!code.trim() || code.trim().length !== 6) {
      setError("Le code de vérification doit comporter 6 chiffres.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep("success");
      } else {
        setError(data.detail || "Code incorrect ou expiré.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#f4efe6] selection:bg-amber-400 selection:text-black font-sans-display p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-center">
      {/* Reusable Smart Floating Navbar */}
      <FloatingNav />

      {/* Screen Framed Container (Exact same borderless rounded frame as Login & Register) */}
      <div className="relative w-full min-h-[calc(100vh-2rem)] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between">
        {/* 1. Full-Bleed ERytmo Cinematic Background Canvas */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <Image
            src="/hero_cinematic.jpg"
            alt="DubFlow Studio - Sound Design & Dubbing Background Canvas"
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

        {/* Top spacer for floating navbar clearance */}
        <div className="h-16 sm:h-20 w-full shrink-0" />

        {/* 2. Main Stage: Forgot Password Card */}
        <main className="relative z-20 w-full max-w-[980px] my-auto rounded-[32px] sm:rounded-[40px] overflow-hidden bg-[#111113]/90 backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-4">
          {/* Mobile Visual Background Wrap */}
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
              {/* Kicker */}
              <div className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#737373] mb-2 select-none">
                SECURITY / DUBFLOW
              </div>

              {/* Headline */}
              <h1 className="text-[32px] sm:text-[36px] font-black text-[#f4efe6] tracking-tight leading-[1.08] mb-3">
                {step === "success"
                  ? "Password reset"
                  : step === "reset"
                  ? "Enter reset code"
                  : "Reset your password"}
              </h1>

              <p className="text-[13px] text-[#88888e] mb-5 leading-relaxed">
                {step === "success"
                  ? "Your credentials have been securely updated. You can now log into your studio space."
                  : step === "reset"
                  ? `Enter the 6-digit code sent to ${email} and choose a new password.`
                  : "Enter your registered studio email to receive a 6-digit verification code."}
              </p>

              {/* Toast / Error Notification Box */}
              {error && (
                <div className="w-full p-2.5 rounded-xl mb-3 font-mono text-[11px] text-left bg-rose-950/40 border border-rose-500/30 text-rose-300">
                  <strong>[ERROR]</strong> {error}
                </div>
              )}
              {toastInfo && (
                <div className="w-full p-2.5 rounded-xl mb-3 font-mono text-[11px] text-left bg-amber-950/40 border border-amber-500/30 text-amber-300">
                  <strong>[INFO]</strong> {toastInfo}
                </div>
              )}

              {/* Step 1: Request Code Form */}
              {step === "request" && (
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
                      placeholder="Studio email"
                      className="w-full h-[50px] bg-[#1a1a1c] border border-white/10 hover:border-white/15 focus:border-white/25 rounded-[18px] px-5 text-[14px] text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[50px] mt-1 bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-75"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Sending Code...</span>
                      </div>
                    ) : (
                      <span>Send Reset Code</span>
                    )}
                  </button>
                </form>
              )}

              {/* Step 2: Reset Form (Code + New Passwords) */}
              {step === "reset" && (
                <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-3">
                  {/* 6-digit Code input */}
                  <div className="relative w-full">
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.replace(/\D/g, ""));
                        if (error) setError(null);
                      }}
                      required
                      placeholder="6-digit code"
                      className="w-full h-[50px] bg-[#1a1a1c] border border-white/10 hover:border-white/15 focus:border-white/25 rounded-[18px] px-5 text-[16px] tracking-widest text-center text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all font-mono shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"
                    />
                  </div>

                  {/* New Password */}
                  <div className="relative w-full">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      placeholder="New password (min. 8 chars)"
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

                  {/* Confirm Password */}
                  <div className="relative w-full">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      placeholder="Confirm new password"
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[50px] mt-1 bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-75"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </div>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("request")}
                    className="inline-flex items-center justify-center gap-1.5 text-xs text-[#71717a] hover:text-[#a1a1aa] mt-1 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Change email address</span>
                  </button>
                </form>
              )}

              {/* Step 3: Success Screen */}
              {step === "success" && (
                <div className="w-full flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 size={30} />
                  </div>
                  <Link
                    href="/login"
                    className="w-full h-[50px] bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    Return to Login
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

          {/* Right Column: Visual Pane with Dubbing Studio Image */}
          <div className="hidden lg:flex relative min-h-[540px] rounded-[28px] overflow-hidden bg-[#0d0d0f] border border-white/10 items-center justify-center select-none shadow-inner">
            <Image
              src="/studio_card.jpg"
              alt="DubFlow Studio Dubbing Workstation"
              fill
              priority
              className="object-cover object-center filter brightness-[0.8] contrast-[1.08] saturate-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 pointer-events-none" />

            <div className="absolute bottom-5 inset-x-6 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-white/70 pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <span>TPN Level 3 Compliant</span>
              <span className="text-amber-400 font-bold">• 0 Cloud Media</span>
            </div>
          </div>
        </main>

        {/* 3. Site Footer */}
        <footer className="w-full max-w-[980px] z-20 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] text-zinc-500">
          <div>© 2026 DubFlow Studio Inc. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <Link href="/#vision" className="hover:text-zinc-300 transition-colors">
              Confidentialité
            </Link>
            <Link href="/#vision" className="hover:text-zinc-300 transition-colors">
              Protocole Sécurité
            </Link>
            <Link href="/#workflows" className="hover:text-zinc-300 transition-colors">
              Statut Réseau P2P
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
