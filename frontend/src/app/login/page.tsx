"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import heroCinematicImg from "@/assets/hero_cinematic.jpg";
import studioCardImg from "@/assets/studio_card.jpg";
import { useAuth } from "@/context/AuthContext";
import FloatingNav from "@/components/FloatingNav";
import { Eye, EyeOff, LogOut, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, googleClientId, loginWithGoogle, user, isAuthenticated, isLoading, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle Google OAuth callback from redirect hash
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const idToken = hashParams.get("id_token");
      if (idToken) {
        setLoading(true);
        loginWithGoogle(idToken).then((res) => {
          setLoading(false);
          if (res.success) {
            setToastInfo("Signed in successfully! Loading your studio space...");
            if (res.requiresProfileCompletion) {
              window.location.href = "/complete-profile";
            } else {
              window.location.href = "/projects";
            }
          } else if (res.error) {
            setError(res.error);
          }
        });
      }
    }
  }, [loginWithGoogle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setToastInfo(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login({
        email: email.trim().toLowerCase(),
        password,
        remember_me: rememberMe,
      });

      if (res.success) {
        setToastInfo("Signed in successfully! Loading your studio space...");
        if (res.requiresProfileCompletion) {
          window.location.href = "/complete-profile";
        } else {
          window.location.href = "/projects";
        }
      } else if (res.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(res.email || email.trim().toLowerCase())}`);
      } else {
        setError(res.error || "Incorrect email or password. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (typeof window !== "undefined") {
      const clientId = googleClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "977526709418-0gtjdpj33uvlgur9ggjetnicjq61g2uv.apps.googleusercontent.com";
      if (!clientId) {
        setToastInfo("Google Client ID is not configured.");
        return;
      }
      const redirectUri = window.location.origin + "/login";
      const nonce = Math.random().toString(36).substring(2);
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=openid%20email%20profile&nonce=${nonce}&prompt=select_account`;
      window.location.href = oauthUrl;
    }
  };

  const handleSignOutAndSwitch = async () => {
    await logout();
  };

  // ─── SESSION GATE: Show "Continue as [Name]" if already authenticated ───
  if (!isLoading && isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-[#070707] text-[#f4efe6] selection:bg-amber-400 selection:text-black font-sans-display p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-center">
        <FloatingNav />

        <div className="relative w-full min-h-[calc(100vh-2rem)] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between">

          {/* Background */}
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <Image
              src={heroCinematicImg}
              alt="DubFlow Studio - Sound Design & Dubbing Background Canvas"
              fill
              priority
              className="object-cover object-center filter brightness-[0.32] contrast-[1.15] blur-[2px] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/60" />
          </div>

          {/* Film grain */}
          <div
            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] pointer-events-none z-10 opacity-70"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`
            }}
          />

          <div className="h-16 sm:h-20 w-full shrink-0" />

          {/* Session Gate Card */}
          <main className="relative z-20 w-full max-w-[480px] my-auto rounded-[32px] sm:rounded-[40px] overflow-hidden bg-[#111113]/90 backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-8 sm:p-10 flex flex-col items-center text-center">

            {/* Avatar Circle */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-2xl font-black mb-5 shadow-[0_8px_25px_rgba(245,158,11,0.3)]">
              {user.first_name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            {/* Kicker */}
            <div className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#737373] mb-2 select-none">
              ACTIVE SESSION DETECTED
            </div>

            {/* Headline */}
            <h1 className="text-[26px] sm:text-[30px] font-black text-[#f4efe6] tracking-tight leading-[1.08] mb-2">
              Welcome back!
            </h1>

            {/* User Info */}
            <p className="text-sm text-[#a0a0a0] mb-6">
              You are signed in as{" "}
              <span className="text-[#f4efe6] font-bold">{user.first_name} {user.last_name}</span>
              <br />
              <span className="text-[#777] text-xs">{user.email}</span>
            </p>

            {/* Continue Button */}
            <button
              onClick={() => {
                if (user.requires_profile_completion || !user.job_type) {
                  window.location.href = "/complete-profile";
                } else {
                  window.location.href = "/projects";
                }
              }}
              className="w-full h-[50px] bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer mb-3"
            >
              <span>Continue to workspace</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>

            {/* Divider */}
            <div className="text-xs font-normal text-[#555555] my-3 select-none">or</div>

            {/* Sign Out & Switch */}
            <button
              onClick={handleSignOutAndSwitch}
              className="w-full h-[46px] bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/20 text-[#b0b0b0] hover:text-white font-semibold text-[13px] rounded-[18px] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <LogOut size={15} strokeWidth={2} />
              <span>Sign out &amp; use a different account</span>
            </button>

          </main>

          {/* Footer */}
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

  return (
    <div className="min-h-screen bg-[#070707] text-[#f4efe6] selection:bg-amber-400 selection:text-black font-sans-display p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-center">
      
      {/* Reusable Smart Floating Navbar with Curved Notch (Matches Welcome Page Exactly) */}
      <FloatingNav />

      {/* Screen Framed Container (Exact same borderless rounded frame as Welcome Page) */}
      <div className="relative w-full min-h-[calc(100vh-2rem)] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between">

        {/* 1. Full-Bleed ERytmo Cinematic Background Visual Canvas */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <Image
            src={heroCinematicImg}
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
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`
          }}
        />

        {/* Top spacer for floating navbar clearance */}
        <div className="h-16 sm:h-20 w-full shrink-0" />

        {/* 2. Main Stage: Studio Authentication Card */}
        <main className="relative z-20 w-full max-w-[980px] my-auto rounded-[32px] sm:rounded-[40px] overflow-hidden bg-[#111113]/90 backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-4">

          {/* Mobile Visual Background Wrap */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-[32px] lg:hidden">
            <Image
              src={studioCardImg}
              alt="ERytmo Studio Workstation"
              fill
              className="object-cover object-center filter brightness-[0.35] contrast-[1.12]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/[0.97] via-black/[0.7] to-black/[0.85]" />
          </div>

          {/* Left Column: Form Pane (Matches Reference Image Exactly) */}
          <div className="relative z-10 bg-transparent px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center justify-center text-center">
            
            <div className="w-full max-w-[340px] sm:max-w-[360px] mx-auto flex flex-col items-center text-center">
              
              {/* Kicker */}
              <div className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#737373] mb-2 select-none">
                VOYGER / DUBFLOW
              </div>

              {/* Headline */}
              <h1 className="text-[32px] sm:text-[36px] font-black text-[#f4efe6] tracking-tight leading-[1.08] mb-5">
                Start your<br />perfect trip
              </h1>

              {/* Google Button Pill */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="inline-flex items-center justify-center gap-3 bg-[#18181a] hover:bg-[#202023] border border-white/10 hover:border-white/20 px-6 py-2.5 rounded-full mb-4 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] group"
                title="Continue with Google"
              >
                <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="text-xs font-semibold text-[#f4efe6] group-hover:text-white transition-colors">
                  Continue with Google
                </span>
              </button>

              {/* Divider */}
              <div className="text-xs font-normal text-[#555555] mb-3 select-none">or</div>

              {/* Error & Info Message: Clean text, no bulky boxes */}
              {error && (
                <p className="w-full text-center text-xs sm:text-[13px] font-medium text-rose-400 mb-3 px-1 leading-snug animate-in fade-in duration-200">
                  {error}
                </p>
              )}
              {toastInfo && (
                <p className="w-full text-center text-xs sm:text-[13px] font-medium text-amber-300 mb-3 px-1 leading-snug animate-in fade-in duration-200">
                  {toastInfo}
                </p>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
                {/* Email input */}
                <div className="relative w-full">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                    placeholder="Email"
                    className="w-full h-[50px] bg-[#1a1a1c] border border-white/10 hover:border-white/15 focus:border-white/25 rounded-[18px] px-5 text-[14px] text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"
                  />
                </div>

                {/* Password input with toggle eye */}
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                    placeholder="Password"
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

                {/* Remember Me Checkbox & Forgot Password */}
                <div className="flex items-center justify-between w-full px-1 py-0.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all ${
                      rememberMe 
                        ? "bg-[#ECE8DF] border-[#ECE8DF] text-black" 
                        : "bg-[#1a1a1c] border-white/20 group-hover:border-white/40 text-transparent"
                    }`}>
                      <svg className="w-3 h-3 stroke-current stroke-[2.5] fill-none" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-[12.5px] font-medium text-[#88888e] group-hover:text-[#d4d4d8] transition-colors">
                      Remember me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (email.trim()) {
                        sessionStorage.setItem("forgot_password_email", email.trim());
                      }
                      router.push("/forgot-password");
                    }}
                    className="text-[12px] text-[#71717a] hover:text-[#a1a1aa] hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Big Cream Start Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[50px] mt-1 bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-75"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Starting...</span>
                    </div>
                  ) : (
                    <span>Start</span>
                  )}
                </button>
              </form>

              {/* Footer Switch Link */}
              <div className="text-[13px] text-[#7a7a7a] mt-4 font-normal">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-[#f4efe6] font-bold hover:underline cursor-pointer ml-0.5"
                >
                  Register
                </Link>
              </div>

            </div>

          </div>

          {/* Right Column: Visual Pane with Dubbing Studio Image */}
          <div className="hidden lg:flex relative min-h-[540px] rounded-[28px] overflow-hidden bg-[#0d0d0f] border border-white/10 items-center justify-center select-none shadow-inner">
            <Image
              src={studioCardImg}
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
            <Link href="/#vision" className="hover:text-zinc-300 transition-colors">Confidentialité</Link>
            <Link href="/#vision" className="hover:text-zinc-300 transition-colors">Protocole Sécurité</Link>
            <Link href="/#workflows" className="hover:text-zinc-300 transition-colors">Statut Réseau P2P</Link>
          </div>
        </footer>

      </div>
    </div>
  );
}
