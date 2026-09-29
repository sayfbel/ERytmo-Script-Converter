"use client";

import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, Mail, Phone, Briefcase, Lock, KeyRound, 
  CheckCircle2, AlertCircle, Loader2, ShieldCheck, Eye, EyeOff, Send
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

const PRESET_ROLES = [
  "Poseur de texte",
  "Détecteur / Détectrice",
  "Calligraphe",
  "Doubleur / Doubleuse",
  "Ingénieur du son",
  "Directeur artistique",
  "Adaptateur / Adaptatrice",
  "Monteur vidéo",
  "Autre"
];

export default function ProfilePage() {
  const { user, refreshSession } = useAuth();

  // Profile Data State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobType, setJobType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Password Change State
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Sync form with user state
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setJobType(user.job_type || "");
      setPhoneNumber(user.phone_number || "");
    }
  }, [user]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    if (!firstName.trim()) {
      setProfileErrorMsg("First name is required.");
      return;
    }
    if (!lastName.trim()) {
      setProfileErrorMsg("Last name is required.");
      return;
    }
    if (!jobType.trim()) {
      setProfileErrorMsg("Job type / profession is required.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          job_type: jobType.trim(),
          phone_number: phoneNumber.trim() || null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setProfileSuccessMsg("Profile information updated successfully.");
        await refreshSession();
      } else {
        setProfileErrorMsg(data.detail || "Failed to update profile.");
      }
    } catch {
      setProfileErrorMsg("Connection error while updating profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Request Code for Password Change
  const handleRequestPasswordCode = async () => {
    if (cooldown > 0) return;
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);
    setIsSendingCode(true);

    try {
      const res = await apiFetch("/api/auth/change-password/request-code", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccessMsg(`Verification code sent to ${user?.email || "your email"}. Check your inbox.`);
        setCooldown(data.cooldown_seconds || 60);
      } else {
        setPasswordErrorMsg(data.detail || "Failed to send verification code.");
      }
    } catch {
      setPasswordErrorMsg("Connection error while requesting verification code.");
    } finally {
      setIsSendingCode(false);
    }
  };

  // Handle Change Password Submit
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      setPasswordErrorMsg("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordErrorMsg("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiFetch("/api/auth/change-password/verify-and-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          new_password: newPassword,
          confirm_password: confirmPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordSuccessMsg("Password changed successfully! Your account is now secured with the new password.");
        setVerificationCode("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordErrorMsg(data.detail || "Failed to update password.");
      }
    } catch {
      setPasswordErrorMsg("Connection error while changing password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
              <UserIcon className="mr-3 rtl:mr-0 rtl:ml-3 text-teal-600 dark:text-teal-400" size={28} />
              My Profile &amp; Security
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your personal credentials, studio profession, and account security.
            </p>
          </div>
        </div>

        {/* User Identity Overview Card */}
        {user && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20 uppercase">
              {user.first_name ? user.first_name[0] : "U"}{user.last_name ? user.last_name[0] : ""}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left rtl:sm:text-right">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {user.first_name} {user.last_name}
                </h2>
                {user.email_verified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 w-fit mx-auto sm:mx-0">
                    <ShieldCheck size={13} /> Verified Account
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" />
                  {user.email}
                </span>
                {user.job_type && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={14} className="text-teal-600 dark:text-teal-400" />
                    {user.job_type}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SECTION 1: Personal Information */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse pb-3 mb-4 border-b border-slate-100 dark:border-slate-700/60">
                <UserIcon size={18} className="text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Personal Details</h3>
              </div>

              {profileSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <form id="profile-form" onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Studio Profession / Role
                  </label>
                  <input
                    type="text"
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    placeholder="e.g. Poseur de texte, Détecteur..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    required
                  />
                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PRESET_ROLES.slice(0, 5).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setJobType(role)}
                        className={`text-[10px] px-2 py-1 rounded-lg transition-colors font-medium cursor-pointer ${
                          jobType === role
                            ? "bg-teal-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+212 600 000 000"
                      className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
              <button
                type="submit"
                form="profile-form"
                disabled={isUpdatingProfile}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center cursor-pointer"
              >
                {isUpdatingProfile && <Loader2 size={14} className="animate-spin mr-1.5 rtl:mr-0 rtl:ml-1.5" />}
                Save Changes
              </button>
            </div>
          </div>

          {/* SECTION 2: Security & Password Change */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse pb-3 mb-4 border-b border-slate-100 dark:border-slate-700/60">
                <Lock size={18} className="text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Security &amp; Password</h3>
              </div>

              {passwordSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              <form id="password-form" onSubmit={handleChangePassword} className="space-y-4">
                
                {/* Step 1: Verification Code Button */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Email Verification Required</p>
                      <p className="text-[11px] text-slate-400">Click to receive a 6-digit code on your email</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestPasswordCode}
                      disabled={isSendingCode || cooldown > 0}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      {isSendingCode ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      <span>{cooldown > 0 ? `Wait ${cooldown}s` : "Get Code"}</span>
                    </button>
                  </div>
                </div>

                {/* Step 2: Enter 6-digit code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3.5 py-2.5 pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2.5 pr-10 rtl:pr-3.5 rtl:pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
              <button
                type="submit"
                form="password-form"
                disabled={isChangingPassword || !verificationCode || !newPassword}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center cursor-pointer"
              >
                {isChangingPassword && <Loader2 size={14} className="animate-spin mr-1.5 rtl:mr-0 rtl:ml-1.5" />}
                Update Password
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
