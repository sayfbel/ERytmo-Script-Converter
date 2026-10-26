"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2, AlertCircle, AlertTriangle, Info, X,
  Bell, Star
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useToast, ToastItem } from "@/context/ToastContext";
import { useSignaling } from "@/context/SignalingContext";
import { useAuth } from "@/context/AuthContext";

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/complete-profile",
  "/forgot-password",
  "/reset-password",
];

export default function NotificationCenter() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const { toasts, dismissToast, showToast } = useToast();
  const signaling = useSignaling();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLandingPage = pathname === "/" || pathname === "/welcome";
  const isAuthPage = PUBLIC_AUTH_PATHS.some((path) => pathname?.startsWith(path));
  const isOutsideDashboard = !isAuthenticated || isLandingPage || isAuthPage;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsTrayOpen(false);
      }
    }
    if (isTrayOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isTrayOpen]);

  // Bridge SignalingContext transferBanner into the modern floating notification system
  useEffect(() => {
    if (signaling?.transferBanner) {
      const type = signaling.transferBanner.type;
      const title =
        type === "success"
          ? "Succès"
          : type === "declined"
            ? "Transfert refusé"
            : "Erreur";

      const toastType =
        type === "declined"
          ? "warning"
          : type === "success"
            ? "success"
            : "error";

      showToast(title, signaling.transferBanner.message, toastType);
      signaling.setTransferBanner(null);
    }
  }, [signaling?.transferBanner, showToast, signaling]);

  if (isOutsideDashboard) {
    return null;
  }

  const hasToasts = toasts.length > 0;

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-[9999] pointer-events-none flex flex-col items-end gap-3 max-w-sm sm:max-w-md w-full px-3 sm:px-0 select-none">
      {/* 1. Floating Confirmation Toasts (Simple, minimal, auto-hides in 3s) */}
      {hasToasts && (
        <div className="w-auto max-w-sm flex flex-col gap-2 pointer-events-auto">
          {toasts.map((toast) => (
            <NotificationCard
              key={toast.id}
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
              isHovered={hoveredId === toast.id}
              onMouseEnter={() => setHoveredId(toast.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
          ))}
        </div>
      )}

      {/* 2. Messages Box (Opened by bell button, kept clean and separate for user's idea) */}
      {isTrayOpen && (
        <div className="w-80 sm:w-88 rounded-2xl bg-white/95 dark:bg-[#161619]/95 border border-slate-200/80 dark:border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-[#f4efe6]">
                Centre de Messages
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTrayOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body: Clean Empty State */}
          <div className="py-7 flex flex-col items-center justify-center text-center">
            <div className="w-11 h-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2.5 border border-amber-500/20">
              <Bell size={18} />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-[#f4efe6]">
              Aucun nouveau message
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[210px] leading-relaxed">
              Votre boîte est vide pour le moment.
            </p>
          </div>
        </div>
      )}

      {/* 3. Floating Bell Button */}
      <div className="pointer-events-auto flex items-center">
        <button
          type="button"
          onClick={() => setIsTrayOpen(prev => !prev)}
          className={`relative p-2.5 rounded-full border shadow-lg backdrop-blur-md transition-all cursor-pointer ${
            isTrayOpen
              ? "bg-white dark:bg-[#161619] border-amber-400/50 text-amber-500 shadow-amber-500/10 scale-105"
              : "bg-white/90 dark:bg-[#141417]/90 border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-105"
          }`}
          title="Messages & Notifications"
        >
          <Bell size={16} />
        </button>
      </div>
    </div>
  );
}

interface NotificationCardProps {
  toast: ToastItem;
  onDismiss: () => void;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function NotificationCard({
  toast,
  onDismiss,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: NotificationCardProps) {
  const duration = toast.duration || 3000;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      if (!isHovered) {
        onDismiss();
      }
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, isHovered, onDismiss]);

  const getIcon = () => {
    const isFilm =
      toast.title.toLowerCase().includes("film") ||
      toast.message.toLowerCase().includes("film");

    if (isFilm) {
      return <Star size={15} className="text-amber-400 fill-amber-400 shrink-0" />;
    }

    switch (toast.type) {
      case "success":
        return <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />;
      case "error":
        return <AlertCircle size={15} className="text-rose-400 shrink-0" />;
      case "warning":
        return <AlertTriangle size={15} className="text-amber-400 shrink-0" />;
      default:
        return <Info size={15} className="text-blue-400 shrink-0" />;
    }
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#141417]/95 text-slate-100 border border-white/10 shadow-xl backdrop-blur-md text-xs transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in hover:border-white/20 select-none"
    >
      {getIcon()}
      <div className="flex-1 min-w-0 leading-snug">
        {toast.title &&
        toast.title !== "Succès" &&
        toast.title !== "Erreur" &&
        toast.title !== "Info" && (
          <span className="font-semibold text-white mr-1.5">{toast.title}:</span>
        )}
        <span className="text-slate-300 text-[12px] break-words">{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-500 hover:text-slate-200 p-0.5 rounded transition-colors ml-1 cursor-pointer shrink-0"
        title="Fermer"
      >
        <X size={13} />
      </button>
    </div>
  );
}
