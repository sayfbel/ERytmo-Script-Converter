"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import heroCinematicImg from "@/assets/hero_cinematic.jpg";
import studioCardImg from "@/assets/studio_card.jpg";
import { useAuth } from "@/context/AuthContext";
import FloatingNav from "@/components/FloatingNav";
import { DubFlowIcon } from "@/components/DubFlowLogo";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import { Briefcase, User as UserIcon, ArrowRight, ArrowLeft, X } from "lucide-react";

const ROLE_OPTIONS: SelectOption[] = [
  { value: "Comédien de doublage (Voice Actor)", label: "Comédien de doublage (Voice Actor)", icon: <Briefcase size={14} className="text-amber-400/90" /> },
  { value: "Directeur artistique (Voice Director)", label: "Directeur artistique (Voice Director)", icon: <Briefcase size={14} className="text-amber-400/90" /> },
  { value: "Adaptateur / Traducteur (Script Adaptor)", label: "Adaptateur / Traducteur (Script Adaptor)", icon: <Briefcase size={14} className="text-amber-400/90" /> },
  { value: "Ingénieur du son (Sound Engineer)", label: "Ingénieur du son (Sound Engineer)", icon: <Briefcase size={14} className="text-amber-400/90" /> },
  { value: "Superviseur Post-prod (Post Supervisor)", label: "Superviseur Post-prod (Post Supervisor)", icon: <Briefcase size={14} className="text-amber-400/90" /> },
  { value: "Producteur / Studio Manager", label: "Producteur / Studio Manager", icon: <Briefcase size={14} className="text-amber-400/90" /> },
  { value: "Autre", label: "Autre (Saisir manuellement...)", icon: <Briefcase size={14} className="text-amber-400/90" /> },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, completeProfile, logout } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobType, setJobType] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [customRole, setCustomRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBackToLogin = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    router.replace("/login");
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (user) {
      if (user.first_name && !firstName) setFirstName(user.first_name);
      if (user.last_name && !lastName) setLastName(user.last_name);
      if (user.job_type && !jobType) {
        setJobType(user.job_type);
        if (!ROLE_OPTIONS.some((o) => o.value === user.job_type) && user.job_type !== "Autre") {
          setIsCustom(true);
          setCustomRole(user.job_type);
        }
      }

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
    <div className="min-h-screen bg-[#070707] text-[#f4efe6] selection:bg-amber-400 selection:text-black font-sans-display p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-center">
      {/* Reusable Smart Floating Navbar */}
      <FloatingNav />

      {/* Screen Framed Container (Matches Login/Register/Welcome exactly) */}
      <div className="relative w-full min-h-[calc(100vh-2rem)] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between">
        
        {/* Full-Bleed DubFlow Cinematic Background */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <Image
            src={heroCinematicImg}
            alt="DubFlow Studio Background"
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

        {/* Main Stage: Profile Setup Card */}
        <main className="relative z-20 w-full max-w-[980px] my-auto rounded-[32px] sm:rounded-[40px] overflow-visible bg-[#111113]/90 backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.9)] p-4 sm:p-7 md:p-8 grid grid-cols-1 lg:grid-cols-[6fr_5fr] gap-6">

          {/* Left Column: Form Pane */}
          <div className="relative z-10 flex flex-col justify-center">
            
            {/* Top Badge Header */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <DubFlowIcon className="w-7 h-7 text-amber-400 shrink-0" />
                <div>
                  <span className="font-extrabold text-[#f4efe6] tracking-tight text-base block leading-tight">DubFlow</span>
                  <span className="text-[11px] text-amber-400 font-semibold block leading-tight pt-0.5">
                    Account Setup (Step 2 of 2)
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold tracking-wide text-amber-400">
                Mandatory
              </span>
            </div>

            {/* Headline */}
            <div className="mb-5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#f4efe6] tracking-tight">
                Complete your profile
              </h1>
              <p className="text-xs sm:text-sm text-[#88888e] mt-1 leading-relaxed">
                Please confirm the identity of{" "}
                <span className="font-mono text-[#f4efe6] font-semibold">
                  {user?.email ? (
                    (() => {
                      const parts = user.email.split("@");
                      return parts.length === 2 ? `${parts[0].slice(0, 3)}******@${parts[1]}` : user.email;
                    })()
                  ) : (
                    "your account"
                  )}
                </span>{" "}
                and specify your studio role to activate your workspace access.
              </p>
            </div>

            {/* Error Notification: Clean text */}
            {error && (
              <p className="w-full text-center text-xs sm:text-[13px] font-medium text-rose-400 mb-4 px-1 leading-snug animate-in fade-in duration-200">
                {error}
              </p>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
                    First Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="e.g. Saif"
                      required
                      className="w-full h-[46px] bg-[#1a1a1c] border border-white/10 hover:border-white/15 focus:border-white/25 rounded-[16px] pl-10 pr-3.5 text-sm text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)] font-medium"
                    />
                    <UserIcon className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
                    Last Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="e.g. Belfaquir"
                      required
                      className="w-full h-[46px] bg-[#1a1a1c] border border-white/10 hover:border-white/15 focus:border-white/25 rounded-[16px] pl-10 pr-3.5 text-sm text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)] font-medium"
                    />
                    <UserIcon className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Profession / Studio Role */}
              <div>
                <label className="block text-xs font-semibold text-[#a1a1aa] mb-1.5">
                  Profession / Studio Role <span className="text-rose-400">*</span>
                </label>

                {isCustom ? (
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={customRole}
                      onChange={(e) => {
                        setCustomRole(e.target.value);
                        setJobType(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Saisissez votre profession / rôle studio..."
                      required
                      className="w-full h-[46px] bg-[#1a1a1c] border border-amber-400/40 hover:border-amber-400/60 focus:border-amber-400 rounded-[16px] pl-10 pr-11 text-sm text-[#f4efe6] placeholder:text-[#555555] outline-none transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)] font-medium"
                    />
                    <Briefcase className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustom(false);
                        setCustomRole("");
                        setJobType("");
                      }}
                      title="Revenir à la liste déroulante"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 flex items-center justify-center transition-colors text-xs"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <CustomSelect
                    variant="studio"
                    options={ROLE_OPTIONS}
                    value={jobType}
                    icon={<Briefcase size={14} className="text-[#71717a]" />}
                    placeholder="Sélectionnez votre rôle / métier..."
                    onChange={(val) => {
                      if (val === "Autre") {
                        setIsCustom(true);
                        setCustomRole("");
                        setJobType("");
                      } else {
                        setJobType(val);
                        setIsCustom(false);
                      }
                      if (error) setError(null);
                    }}
                  />
                )}
              </div>


              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] mt-2 bg-[#ECE8DF] hover:bg-white text-black font-extrabold text-[15px] rounded-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Saving Profile...</span>
                  </div>
                ) : (
                  <>
                    <span>Save Profile & Enter Workspace</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[11px] text-[#71717a] mt-3">
              This setup is required once to organize collaboration and permission scopes.
            </p>

            {/* Back to Login & Return to Home Navigation */}
            <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer group font-medium"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform text-amber-400/80" />
                <span>Back to Login</span>
              </button>

              <Link
                href="/"
                className="text-zinc-500 hover:text-[#f4efe6] transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Pane with Dubbing Studio Image */}
          <div className="hidden lg:flex relative min-h-[520px] rounded-[28px] overflow-hidden bg-[#0d0d0f] border border-white/10 items-center justify-center select-none shadow-inner">
            <Image
              src={studioCardImg}
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
