"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import AuthShowcasePanel from "@/components/AuthShowcasePanel";
import { 
  Eye, EyeOff, AlertCircle, Check 
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        window.location.href = "/projects";
      } else if (res.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(res.email || email.trim().toLowerCase())}`);
      } else {
        setError(res.error || "Invalid email or password.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 md:p-8 bg-[#eef2f6] text-slate-800 select-none">
      {/* Outer Card Container */}
      <div className="w-full max-w-[960px] min-h-[600px] bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        
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

            {/* Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Enter your credentials to access your ERytmo script converter workspace.
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="name@example.com"
                    required
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember this device checkbox (styled exactly like reference) */}
              <div className="pt-1">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <div
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-4 h-4 rounded-[5px] flex items-center justify-center transition-colors cursor-pointer ${
                      rememberMe ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"
                    }`}
                  >
                    {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-medium text-slate-700 select-none">
                    Remember this device for 30 days.
                  </span>
                </label>
              </div>

              {/* Primary Action Button (Reference exact vibrant blue style) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#3b5bfd] hover:bg-[#324fdb] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Login"
                )}
              </button>

              {/* Clean inline text link (a href style) */}
              <p className="text-center text-xs text-slate-500 pt-1">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Create account
                </Link>
              </p>
            </form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-white px-3 text-slate-400">OR</span>
              </div>
            </div>

            {/* Google Login */}
            <div className="w-full flex justify-center">
              <GoogleAuthButton
                mode="login"
                onError={(err) => setError(err)}
                onSuccess={() => {
                  window.location.href = "/projects";
                }}
              />
            </div>
          </div>

          {/* Minimalist Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>© ERytmo Studio</span>
            <span className="text-slate-400 hover:text-slate-600 cursor-pointer">support@erytmo.com</span>
          </div>
        </div>

        {/* Right Side: Animated Dubbing Showcase Panel */}
        <AuthShowcasePanel />
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Forgot Password?
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              To reset your password or recover access to your account, please contact your workspace administrator or support team.
            </p>
            <button
              onClick={() => setShowForgotPassword(false)}
              className="w-full py-2.5 bg-[#3b5bfd] hover:bg-[#324fdb] text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
