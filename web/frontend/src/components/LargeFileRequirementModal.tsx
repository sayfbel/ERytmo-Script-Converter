"use client";

import React from "react";
import { Monitor, Download, X, AlertTriangle, ShieldCheck, ArrowRight, HardDrive } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface LargeFileRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  fileSize?: number;
}

const formatSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "1.00+ GB";
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export default function LargeFileRequirementModal({
  isOpen,
  onClose,
  fileName,
  fileSize
}: LargeFileRequirementModalProps) {
  if (!isOpen) return null;

  const handleDownloadDesktop = () => {
    const downloadUrl = getApiUrl("/api/download/desktop");
    window.open(downloadUrl, "_blank");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto my-auto bg-zinc-950/95 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl shadow-amber-500/10 text-center text-zinc-100 flex flex-col items-center">
        {/* Subtle Ambient Radial Glow */}
        <div 
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 pointer-events-none rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0) 70%)"
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Glowing Badge & Icon */}
        <div className="relative mb-4 sm:mb-5 flex items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Monitor className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[2.5]" />
          </div>
        </div>

        {/* Pill Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] sm:text-xs font-semibold tracking-wide uppercase mb-2.5 sm:mb-3">
          <HardDrive className="w-3.5 h-3.5" />
          <span>Files over 1 GB Safeguard</span>
        </div>

        {/* Heading */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
          Desktop App Required
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-4 sm:mb-6 leading-relaxed">
          Browser memory limits prevent downloading large media files over <strong className="text-zinc-200">1 GB</strong> directly in the web browser. Please install DubFlow Desktop to download and stream unlimited files.
        </p>

        {/* File Preview Card */}
        {fileName && (
          <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 flex items-center justify-between gap-3 text-left">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs text-zinc-400 font-medium uppercase tracking-wider mb-0.5">
                Target File
              </p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-200 truncate" title={fileName}>
                {fileName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-mono text-xs font-bold border border-amber-500/20">
                {formatSize(fileSize)}
              </span>
            </div>
          </div>
        )}

        {/* Why DubFlow Desktop List */}
        <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 mb-5 sm:mb-6 text-left space-y-2 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero RAM limit: Native multi-gigabyte transfers (1h – 4h+ videos)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Zero browser crashes: Direct hard-drive local streaming</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Full offline & high-speed P2P workstation support</span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={handleDownloadDesktop}
            className="w-full sm:flex-1 h-11 sm:h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install DubFlow Desktop</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 h-11 sm:h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
