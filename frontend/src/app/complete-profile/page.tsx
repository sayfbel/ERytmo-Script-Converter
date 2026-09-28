"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Briefcase, User as UserIcon, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

const SUGGESTED_ROLES = [
  "Dubbing Director",
  "Voice Actor",
  "Rhythmist / Adaptateur",
  "Sound Engineer",
  "Translator",
  "Project Manager",
  "Studio Technician",
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, completeProfile } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobType, setJobType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (user) {
      if (user.first_name && !firstName) setFirstName(user.first_name);
      if (user.last_name && !lastName) setLastName(user.last_name);
      if (user.job_type && !jobType) setJobType(user.job_type);

      // If user already has a complete profile, send them to workspace
      if (user.job_type && user.first_name && user.last_name) {
        router.replace("/projects");
      }
    }
  }, [user, isAuthenticated, isLoading, router, firstName, lastName, jobType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanJob = jobType.trim();

    if (!cleanFirst) {
      setError("Please enter your first name.");
      return;
    }
    if (!cleanLast) {
      setError("Please enter your last name.");
      return;
    }
    if (!cleanJob) {
      setError("Please specify your profession or job title.");
      return;
    }

    setLoading(true);
    try {
      const res = await completeProfile({
        first_name: cleanFirst,
        last_name: cleanLast,
        job_type: cleanJob,
      });

      if (res.success) {
        window.location.href = "/projects";
      } else {
        setError(res.error || "Failed to update profile. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#eef2f6] via-[#f7fafc] to-[#e6ecf3] text-slate-800 selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-[560px] bg-white rounded-3xl shadow-2xl shadow-slate-200/80 border border-slate-100 p-7 sm:p-10 relative overflow-hidden">
        {/* Top Decorative Header */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center p-1.5 shadow-sm">
              <Image
                src="/app_logo.png"
                alt="ERytmo"
                width={28}
                height={28}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-base block">ERytmo Studio</span>
              <span className="text-[11px] text-teal-600 font-semibold flex items-center gap-1">
                <ShieldCheck size={13} /> Account Setup (Step 2 of 2)
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
            Mandatory
          </span>
        </div>

        {/* Headline */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Complete your profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Please confirm your identity and specify your studio role to activate your workspace access.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Onboarding Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. John"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 transition-all placeholder:text-slate-400 font-medium"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Doe"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 transition-all placeholder:text-slate-400 font-medium"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Job Type / Profession (Custom text or quick selection) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Profession / Studio Role <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={jobType}
                onChange={(e) => {
                  setJobType(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Dubbing Director, Sound Engineer..."
                required
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 transition-all placeholder:text-slate-400 font-medium"
              />
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Quick role suggestions */}
            <div className="mt-2.5">
              <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Or choose a suggested title:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setJobType(role);
                      if (error) setError(null);
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                      jobType === role
                        ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Email notice (Read-only) */}
          {user?.email && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500 flex items-center justify-between">
              <span>Connected Account:</span>
              <span className="font-semibold text-slate-800">{user.email}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3.5 px-4 bg-[#3b5bfd] hover:bg-[#324fdb] active:scale-[0.99] text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Profile...</span>
              </div>
            ) : (
              <>
                <span>Save Profile & Enter Workspace</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          This setup is required once to organize collaboration and permission scopes.
        </p>
      </div>
    </div>
  );
}
