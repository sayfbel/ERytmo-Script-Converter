"use client";

import React, { useState, useEffect } from "react";
import { User as UserIcon, ShieldCheck, Lock, KeyRound, Loader2, Send, EyeOff, Eye } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import CustomSelect from "@/components/CustomSelect";
import ConfirmModal from "@/components/ConfirmModal";

const JOB_OPTIONS = [
  { value: "Poseur de texte", label: "Poseur de texte" },
  { value: "Détecteur / Détectrice", label: "Détecteur / Détectrice" },
  { value: "Calligraphe", label: "Calligraphe" },
  { value: "Doubleur / Doubleuse", label: "Doubleur / Doubleuse" },
  { value: "Ingénieur du son", label: "Ingénieur du son" },
  { value: "Directeur artistique", label: "Directeur artistique" },
  { value: "Adaptateur / Adaptatrice", label: "Adaptateur / Adaptatrice" },
  { value: "Monteur vidéo", label: "Monteur vidéo" },
  { value: "Autre", label: "Autre" }
];

export default function ProfilePage() {
  const { user, refreshSession } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"general" | "security">("general");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // General Profile State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Security State
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setJobTitle(user.job_type || "");
      setPhoneNumber(user.phone_number || "");
      setIsPrivate(user.is_private || false);
      
      if (user.avatar_url) {
        // Construct the full URL if necessary
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:8000";
        setAvatarPreview(user.avatar_url.startsWith("http") ? user.avatar_url : `${baseUrl}${user.avatar_url}`);
      }
    }
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const confirmSaveProfile = () => {
    setShowConfirmModal(true);
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !jobTitle.trim()) {
      showToast("Validation Error", "Please fill in all required fields.", "error");
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
          job_type: jobTitle.trim(),
          phone_number: phoneNumber.trim() || null,
          is_private: isPrivate
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Changes Saved", "Your profile details have been successfully updated.", "success");
        await refreshSession();
      } else {
        showToast("Update Failed", data.detail || "Failed to update profile.", "error");
      }
    } catch {
      showToast("Connection Error", "Network issue while updating profile.", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleRequestPasswordCode = async () => {
    if (cooldown > 0) return;
    setIsSendingCode(true);

    try {
      const res = await apiFetch("/api/auth/change-password/request-code", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast("Code Sent", `Verification code sent to ${user?.email || "your email"}.`, "success");
        setCooldown(data.cooldown_seconds || 60);
      } else {
        showToast("Error", data.detail || "Failed to send code.", "error");
      }
    } catch {
      showToast("Connection Error", "Network issue while requesting code.", "error");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d+$/.test(cleanCode)) {
      showToast("Invalid Code", "Please enter the 6-digit verification code.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showToast("Weak Password", "New password must be at least 8 characters long.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Mismatch", "New passwords do not match.", "error");
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
        showToast("Password Updated", "Your security password has been changed.", "success");
        setVerificationCode("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast("Error", data.detail || "Failed to update password.", "error");
      }
    } catch {
      showToast("Connection Error", "Network issue while changing password.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveAll = () => {
    if (activeTab === "general") {
      handleUpdateProfile();
    } else if (activeTab === "security") {
      handleChangePassword();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic client-side validation
      if (file.size > 2 * 1024 * 1024) {
        showToast("File too large", "Maximum allowed size is 2MB.", "error");
        return;
      }
      if (!file.type.startsWith("image/")) {
        showToast("Invalid file type", "Please upload an image file.", "error");
        return;
      }

      // Optimistic preview
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await apiFetch("/api/auth/profile-picture", {
          method: "POST",
          body: formData,
        });
        
        const data = await res.json();
        if (res.ok) {
          showToast("Avatar updated", "Your profile picture has been successfully updated.", "success");
          await refreshSession();
        } else {
          showToast("Update Failed", data.detail || "Failed to update profile picture.", "error");
        }
      } catch {
        showToast("Connection Error", "Network issue while updating profile picture.", "error");
      }
    }
  };

  const handleDiscard = () => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setJobTitle(user.job_type || "");
      setPhoneNumber(user.phone_number || "");
    }
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    showToast("Form Reset", "Reverted unsaved changes to defaults.", "info");
  };

  return (
    <div className="flex-1 min-w-0 bg-[#f8fafc] overflow-y-auto px-5 py-6 md:px-10 md:py-8 font-sans selection:bg-brand-100 selection:text-brand-700">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <UserIcon className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Information</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">Manage your personal profile, credentials and security parameters.</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center border-b border-slate-200 gap-8 text-sm font-medium">
          <button 
            onClick={() => setActiveTab("general")} 
            className={`pb-3 border-b-2 transition-colors ${activeTab === "general" ? "border-amber-500 text-amber-600 font-semibold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            General Profile
          </button>
          <button 
            onClick={() => setActiveTab("security")} 
            className={`pb-3 border-b-2 transition-colors ${activeTab === "security" ? "border-amber-500 text-amber-600 font-semibold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            Password & Security
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "general" && (
          <section className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">Public Profile</h2>
              <p className="text-xs text-slate-500 mb-6">This information is shared across team projects and audio conversion logs.</p>

              {/* Dynamic Avatar */}
              <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100">
                <div className="relative group">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-50 shadow-inner" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-3xl flex items-center justify-center shrink-0 shadow-inner uppercase">
                      {firstName ? firstName[0] : "U"}{lastName ? lastName[0] : ""}
                    </div>
                  )}
                  {user?.email_verified && (
                    <span className="absolute bottom-[-4px] right-[-4px] w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start mb-2">
                    <label className="cursor-pointer px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors">
                      Upload new picture
                      <input type="file" accept="image/png, image/jpeg, image/webp, image/gif" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{firstName} {lastName}</h3>
                  <p className="text-xs text-slate-500">{email}</p>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-medium text-slate-800 transition-all outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-medium text-slate-800 transition-all outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <input type="email" value={email} readOnly className="w-full pl-3.5 pr-24 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 outline-none cursor-not-allowed opacity-80" />
                    {user?.email_verified && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Phone Number</label>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-sm font-medium text-slate-800 transition-all outline-none" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Role / Title</label>
                  <CustomSelect
                    options={JOB_OPTIONS}
                    value={jobTitle}
                    onChange={(val) => setJobTitle(val)}
                    placeholder="Select your profession..."
                    className="w-full"
                  />
                </div>
              </div>

              {/* Privacy Setting */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Private Account</h3>
                  <p className="text-xs text-slate-500 mt-0.5">When enabled, your profile is hidden and you cannot be added to new projects.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                    isPrivate ? "bg-amber-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isPrivate ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  type="button" 
                  onClick={confirmSaveProfile} 
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-70 rounded-xl shadow-sm shadow-amber-500/20 transition-all"
                >
                  {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>

            </div>
          </section>
        )}

        {activeTab === "security" && (
          <section className="space-y-6 animate-in fade-in duration-300">
            {/* Change Password Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Change Password</h2>
                  <p className="text-xs text-slate-500">Ensure your account is utilizing a long and random password to stay secure.</p>
                </div>
              </div>

              <div className="space-y-4 max-w-lg mt-4">
                {/* 6-Digit Verification Code */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-xs text-slate-800">Email Verification Required</p>
                      <p className="text-[11px] text-slate-500">We will send a 6-digit code to {user?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestPasswordCode}
                      disabled={isSendingCode || cooldown > 0}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 border border-amber-200 disabled:opacity-50 text-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                    >
                      {isSendingCode ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      <span>{cooldown > 0 ? `Wait ${cooldown}s` : "Get Code"}</span>
                    </button>
                  </div>
                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">6-Digit Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        maxLength={6} 
                        value={verificationCode} 
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456" 
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 focus:border-amber-500 rounded-lg text-sm tracking-widest font-mono outline-none transition-all" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl text-sm outline-none transition-all pr-10" />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl text-sm outline-none transition-all pr-10" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button type="button" onClick={handleChangePassword} disabled={isChangingPassword} className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 active:scale-95 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                  {isChangingPassword && <Loader2 size={14} className="animate-spin" />}
                  Update Password
                </button>
              </div>
            </div>
          </section>
        )}



      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Save Profile Changes?"
        message="Are you sure you want to save these changes? This will update your public profile settings for all team members."
        type="info"
        confirmText="Yes, Save"
        onConfirm={() => {
          setShowConfirmModal(false);
          handleUpdateProfile();
        }}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
