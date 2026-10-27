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
  const { toasts, dismissToast, showToast, isNotificationTrayOpen, setIsNotificationTrayOpen } = useToast();
  const signaling = useSignaling();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  const isLandingPage = pathname === "/" || pathname === "/welcome";
  const isAuthPage = PUBLIC_AUTH_PATHS.some((path) => pathname?.startsWith(path));
  const isOutsideDashboard = !isAuthenticated || isLandingPage || isAuthPage;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        // Also ensure not clicking on the top header notification bell button
        const target = event.target as HTMLElement;
        if (target.closest('[data-notification-toggle="true"]')) {
          return;
        }
        setIsNotificationTrayOpen(false);
      }
    }
    if (isNotificationTrayOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isNotificationTrayOpen, setIsNotificationTrayOpen]);

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
    <>
      {/* 1. Floating Confirmation Toasts (Minimal, auto-hiding toast notifications) */}
      <div className="fixed bottom-5 right-5 z-[9999] pointer-events-none flex flex-col items-end gap-3 max-w-sm sm:max-w-md w-full px-3 sm:px-0 select-none">
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
      </div>

      {/* 2. Top-Right Notifications Dropdown (Opened by Header Notification Bell) */}
      {isNotificationTrayOpen && (
        <div
          ref={trayRef}
          className="fixed top-16 right-4 sm:right-8 z-[9999] w-80 sm:w-88 rounded-[24px] bg-[#F7F4EB] border border-[#DDD7C5] shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 pointer-events-auto p-4 flex flex-col gap-3 text-[#111111]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#DDD7C5]">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-amber-500" />
              <span className="text-xs font-bold text-[#111111]">
                Centre de Messages & Notifications
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsNotificationTrayOpen(false)}
              className="p-1 rounded-full text-stone-400 hover:text-[#111111] hover:bg-black/5 transition-colors cursor-pointer"
              title="Fermer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body: Clean Empty State */}
          <div className="py-7 flex flex-col items-center justify-center text-center">
            <div className="w-11 h-11 rounded-full bg-amber-400/20 text-amber-600 flex items-center justify-center mb-2.5 border border-amber-400/40">
              <Bell size={18} />
            </div>
            <p className="text-xs font-bold text-[#111111]">
              Aucun nouveau message
            </p>
            <p className="text-[11px] text-stone-500 mt-1 max-w-[210px] leading-relaxed">
              Votre boîte de notifications est à jour.
            </p>
          </div>
        </div>
      )}
    </>
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
      return <Star size={15} className="text-amber-500 fill-amber-500 shrink-0" />;
    }

    switch (toast.type) {
      case "success":
        return <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />;
      case "error":
        return <AlertCircle size={15} className="text-rose-600 shrink-0" />;
      case "warning":
        return <AlertTriangle size={15} className="text-amber-600 shrink-0" />;
      default:
        return <Info size={15} className="text-blue-600 shrink-0" />;
    }
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#ECE8DD] text-[#111111] border border-[#DDD7C5] shadow-xl backdrop-blur-md text-xs transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in hover:border-amber-400 select-none"
    >
      {getIcon()}
      <div className="flex-1 min-w-0 leading-snug">
        {toast.title &&
        toast.title !== "Succès" &&
        toast.title !== "Erreur" &&
        toast.title !== "Info" && (
          <span className="font-bold text-[#111111] mr-1.5">{toast.title}:</span>
        )}
        <span className="text-stone-700 text-[12px] break-words">{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-stone-400 hover:text-[#111111] p-0.5 rounded-full hover:bg-black/5 transition-colors ml-1 cursor-pointer shrink-0"
        title="Fermer"
      >
        <X size={13} />
      </button>
    </div>
  );
}
