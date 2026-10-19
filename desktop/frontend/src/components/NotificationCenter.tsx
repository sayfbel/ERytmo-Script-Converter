"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  CheckCircle2, AlertCircle, AlertTriangle, Info, X, 
  Bell, Star, Wifi, Trash2 
} from "lucide-react";
import { useToast, ToastItem } from "@/context/ToastContext";
import { useSignaling } from "@/context/SignalingContext";

export default function NotificationCenter() {
  const { toasts, dismissToast, clearAllToasts, showToast } = useToast();
  const signaling = useSignaling();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isTrayOpen, setIsTrayOpen] = useState(true);

  // Sync current time for the OS-style tray bar
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Format relative timestamp
  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 5) return "À l'instant";
    if (diff < 60) return `Il y a ${diff}s`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `Il y a ${mins}m`;
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const hasToasts = toasts.length > 0;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] pointer-events-none flex flex-col items-end gap-3 max-w-sm sm:max-w-md w-full px-3 sm:px-0 select-none">
      {/* Floating Notifications Stack */}
      {isTrayOpen && hasToasts && (
        <div className="w-full flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto pr-1 scrollbar-none pointer-events-auto">
          {/* Multi-notification header with "Clear All" */}
          {toasts.length > 1 && (
            <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 dark:text-[#9f988b] animate-in fade-in duration-150">
              <span className="font-semibold">
                Notifications ({toasts.length})
              </span>
              <button
                type="button"
                onClick={clearAllToasts}
                className="flex items-center gap-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 font-medium transition-colors cursor-pointer"
              >
                <Trash2 size={11} />
                <span>Tout effacer</span>
              </button>
            </div>
          )}

          {toasts.map((toast) => {
            const isFilmNotification = 
              toast.title.toLowerCase().includes("film") || 
              toast.message.toLowerCase().includes("film");

            return (
              <NotificationCard
                key={toast.id}
                toast={toast}
                isFilmNotification={isFilmNotification}
                formatTime={formatTime}
                onDismiss={() => dismissToast(toast.id)}
                isHovered={hoveredId === toast.id}
                onMouseEnter={() => setHoveredId(toast.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
            );
          })}
        </div>
      )}

      {/* OS-Style Floating Tray Dock (Matching the Reference Image in DubFlow Colors) */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Bell Button (Toggle Notifications or show count) */}
        <button
          type="button"
          onClick={() => setIsTrayOpen(prev => !prev)}
          className={`relative p-2.5 rounded-full border shadow-lg backdrop-blur-md transition-all cursor-pointer ${
            hasToasts
              ? "bg-white dark:bg-[#161619] border-amber-400/50 text-amber-500 shadow-amber-500/10 hover:scale-105"
              : "bg-white/90 dark:bg-[#141417]/90 border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
          title={hasToasts ? `${toasts.length} notification(s)` : "Notifications"}
        >
          <Bell size={16} className={hasToasts ? "animate-bounce" : ""} />
          {hasToasts && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center shadow-xs border border-white dark:border-[#141417]">
              {toasts.length}
            </span>
          )}
        </button>

        {/* Minimal System Info Pill (P2P + Time) */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-[#161619]/90 border border-slate-200/80 dark:border-white/10 shadow-lg backdrop-blur-md text-xs text-slate-700 dark:text-[#f4efe6]">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-mono text-[11px]" title="P2P Status">
            <Wifi size={13} className={signaling?.otherDevicesCount && signaling.otherDevicesCount > 0 ? "text-emerald-500" : "text-amber-500"} />
            {signaling?.otherDevicesCount && signaling.otherDevicesCount > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">P2P Online</span>
            ) : (
              <span className="text-[10px]">Cloud</span>
            )}
          </div>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
          <span className="font-semibold font-mono text-[11px] text-slate-800 dark:text-[#f4efe6]">
            {currentTime || "DubFlow"}
          </span>
        </div>
      </div>
    </div>
  );
}

interface NotificationCardProps {
  toast: ToastItem;
  isFilmNotification: boolean;
  formatTime: (timestamp: number) => string;
  onDismiss: () => void;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function NotificationCard({
  toast,
  isFilmNotification,
  formatTime,
  onDismiss,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: NotificationCardProps) {
  const duration = toast.duration || 5000;
  const [progress, setProgress] = useState(100);
  const remainingRef = useRef<number>(duration);

  useEffect(() => {
    if (duration <= 0) return;

    let animFrame: number;
    const start = Date.now();

    const tick = () => {
      if (!isHovered) {
        const elapsed = Date.now() - start;
        const left = Math.max(0, remainingRef.current - elapsed);
        const pct = (left / duration) * 100;
        setProgress(pct);

        if (left <= 0) {
          onDismiss();
          return;
        }
      }
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [duration, isHovered, onDismiss]);

  // Determine icon & color palette based on type & content (in DubFlow palette)
  const getTheme = () => {
    if (isFilmNotification) {
      return {
        badgeBg: "bg-amber-500/15 dark:bg-amber-400/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-amber-500/10",
        icon: <Star size={18} className="fill-amber-400 text-amber-500" />,
        progressColor: "bg-gradient-to-r from-amber-400 to-amber-500",
        cardBorder: "border-amber-400/30 dark:border-amber-400/20",
      };
    }

    switch (toast.type) {
      case "success":
        return {
          badgeBg: "bg-emerald-500/15 dark:bg-emerald-400/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10",
          icon: <CheckCircle2 size={18} strokeWidth={2.4} />,
          progressColor: "bg-gradient-to-r from-emerald-400 to-emerald-500",
          cardBorder: "border-slate-200/80 dark:border-white/10 hover:border-emerald-500/30",
        };
      case "error":
        return {
          badgeBg: "bg-rose-500/15 dark:bg-rose-400/15 border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-rose-500/10",
          icon: <AlertCircle size={18} strokeWidth={2.4} />,
          progressColor: "bg-gradient-to-r from-rose-400 to-rose-500",
          cardBorder: "border-rose-300/60 dark:border-rose-500/20",
        };
      case "warning":
        return {
          badgeBg: "bg-amber-500/15 dark:bg-amber-400/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-amber-500/10",
          icon: <AlertTriangle size={18} strokeWidth={2.4} />,
          progressColor: "bg-gradient-to-r from-amber-400 to-amber-500",
          cardBorder: "border-amber-300/60 dark:border-amber-500/20",
        };
      case "info":
      default:
        return {
          badgeBg: "bg-blue-500/15 dark:bg-blue-400/15 border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-blue-500/10",
          icon: <Info size={18} strokeWidth={2.4} />,
          progressColor: "bg-gradient-to-r from-blue-400 to-blue-500",
          cardBorder: "border-slate-200/80 dark:border-white/10",
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative w-full rounded-2xl p-3 sm:p-3.5 border shadow-xl backdrop-blur-xl transition-all duration-200 overflow-hidden bg-white/95 dark:bg-[#161619]/95 text-slate-800 dark:text-[#f4efe6] animate-in slide-in-from-right-4 fade-in ${theme.cardBorder}`}
    >
      <div className="flex items-start gap-3">
        {/* Left circular emblem (Matching Google Chrome style in reference image, tailored to DubFlow) */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${theme.badgeBg}`}
        >
          {theme.icon}
        </div>

        {/* Content body */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#f4efe6] truncate">
              {toast.title}
            </h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
              {formatTime(toast.timestamp)}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-[#c2bcaf] mt-0.5 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>

        {/* Close Button (X) */}
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0 -mt-0.5 -mr-0.5"
          title="Fermer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-100 dark:bg-white/5 overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-linear ${theme.progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
