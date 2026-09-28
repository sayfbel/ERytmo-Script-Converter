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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 via-teal-50/20 to-slate-50 dark:from-slate-900 dark:via-teal-950/20 dark:to-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20 shadow-xs">
              <Download size={20} className="animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                Incoming File Request
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                P2P direct transfer authorization
              </p>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Decline request"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Requester
              </span>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 mt-0.5">
                {incomingRequest.requester_name}
              </p>
              {incomingRequest.requester_email && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {incomingRequest.requester_email}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/50 flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={incomingRequest.file_name}>
                  {incomingRequest.file_name}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {incomingRequest.file_size}
                </p>
              </div>
            </div>
          </div>

          {/* Always Allow Checkbox */}
          <label className="flex items-start space-x-3 rtl:space-x-reverse cursor-pointer p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors select-none">
            <input
              type="checkbox"
              checked={alwaysAllow}
              onChange={(e) => setAlwaysAllow(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
            />
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-teal-600 dark:text-teal-400" />
                Always allow file downloads from this collaborator
              </span>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Future transfer requests from this peer will be automatically approved without prompting.
              </p>
            </div>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="p-4 px-6 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end space-x-3 rtl:space-x-reverse">
          <button
            onClick={handleDecline}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-800/50 transition-all"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 rtl:space-x-reverse transition-all"
          >
            <Check size={14} className="stroke-[3]" />
            <span>Accept Transfer</span>
          </button>
        </div>

      </div>
    </div>
  );
}
