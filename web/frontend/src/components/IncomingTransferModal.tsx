"use client";

import React, { useState } from "react";
import { useSignaling } from "@/context/SignalingContext";
import { Download, Check, X, ShieldCheck, FileText } from "lucide-react";

export default function IncomingTransferModal() {
  const { incomingRequest, respondTransfer } = useSignaling();
  const [alwaysAllow, setAlwaysAllow] = useState(false);

  if (!incomingRequest) return null;

  const handleDecline = () => {
    respondTransfer(incomingRequest.request_id, "declined", false);
    setAlwaysAllow(false);
  };

  const handleAccept = () => {
    respondTransfer(incomingRequest.request_id, "accepted", alwaysAllow);
    setAlwaysAllow(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141417] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.95)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800 dark:text-[#f4efe6]">
        
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Download size={20} className="animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-[#f4efe6] tracking-tight">
                Incoming File Request
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9f988b]">
                P2P direct transfer authorization
              </p>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="text-slate-400 dark:text-[#71717a] hover:text-slate-700 dark:hover:text-[#f4efe6] p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
            title="Decline request"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] p-4 rounded-xl space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717a]">
                Requester
              </span>
              <p className="font-semibold text-sm text-slate-900 dark:text-[#f4efe6] mt-0.5">
                {incomingRequest.requester_name}
              </p>
              {incomingRequest.requester_email && (
                <p className="text-xs text-slate-500 dark:text-[#9f988b]">
                  {incomingRequest.requester_email}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#f4efe6] truncate" title={incomingRequest.file_name}>
                  {incomingRequest.file_name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#9f988b]">
                  {incomingRequest.file_size}
                </p>
              </div>
            </div>
          </div>

          {/* Always Allow Checkbox */}
          <label className="flex items-start space-x-3 rtl:space-x-reverse cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors select-none">
            <input
              type="checkbox"
              checked={alwaysAllow}
              onChange={(e) => setAlwaysAllow(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-500 accent-amber-500 focus:ring-amber-400 border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-[#161619] cursor-pointer"
            />
            <div className="text-xs text-slate-500 dark:text-[#9f988b] leading-relaxed">
              <span className="font-semibold text-slate-900 dark:text-[#f4efe6] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-500 dark:text-amber-400" />
                Always allow file downloads from this collaborator
              </span>
              <p className="text-[11px] text-slate-400 dark:text-[#71717a] mt-0.5">
                Future transfer requests from this peer will be automatically approved without prompting.
              </p>
            </div>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="p-4 px-6 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-end space-x-3 rtl:space-x-reverse">
          <button
            onClick={handleDecline}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#9f988b] text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-500/20 transition-all cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black shadow-[0_4px_15px_rgba(245,158,11,0.25)] flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer active:scale-95"
          >
            <Check size={14} className="stroke-[3]" />
            <span>Accept Transfer</span>
          </button>
        </div>

      </div>
    </div>
  );
}
