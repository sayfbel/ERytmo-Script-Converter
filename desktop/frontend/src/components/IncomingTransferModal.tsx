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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#F7F4EB] border border-[#DDD7C5] rounded-[28px] shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200 text-[#111111]">
        
        {/* Top Header - Pinned */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-[#DDD7C5] bg-[#ECE8DD] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 text-amber-600 flex items-center justify-center shrink-0 border border-amber-400/40 shadow-xs">
              <Download size={20} className="animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#111111] tracking-tight">
                Incoming File Request
              </h3>
              <p className="text-[11px] sm:text-xs text-[#777265]">
                P2P direct transfer authorization
              </p>
            </div>
          </div>
          <button
            onClick={handleDecline}
            className="text-[#777265] hover:text-[#111111] p-1.5 sm:p-2 rounded-full hover:bg-[#E2DDD0] transition-colors cursor-pointer"
            title="Decline request"
            aria-label="Decline request"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="bg-[#ECE8DD] border border-[#DDD7C5] p-4 rounded-2xl space-y-3">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#777265]">
                Requester
              </span>
              <p className="font-semibold text-xs sm:text-sm text-[#111111] mt-0.5">
                {incomingRequest.requester_name}
              </p>
              {incomingRequest.requester_email && (
                <p className="text-[11px] sm:text-xs text-[#777265]">
                  {incomingRequest.requester_email}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[#DDD7C5] flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-600 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#111111] truncate" title={incomingRequest.file_name}>
                  {incomingRequest.file_name}
                </p>
                <p className="text-[11px] text-[#777265]">
                  {incomingRequest.file_size}
                </p>
              </div>
            </div>
          </div>

          {/* Always Allow Checkbox */}
          <label className="flex items-start space-x-3 rtl:space-x-reverse cursor-pointer p-2 rounded-xl hover:bg-[#ECE8DD]/60 transition-colors select-none">
            <input
              type="checkbox"
              checked={alwaysAllow}
              onChange={(e) => setAlwaysAllow(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-amber-500 accent-amber-500 focus:ring-amber-400 border-[#DDD7C5] bg-white cursor-pointer"
            />
            <div className="text-xs text-[#777265] leading-relaxed">
              <span className="font-semibold text-[#111111] flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-600" />
                Always allow file downloads from this collaborator
              </span>
              <p className="text-[11px] text-[#888375] mt-0.5">
                Future transfer requests from this peer will be automatically approved without prompting.
              </p>
            </div>
          </label>
        </div>

        {/* Modal Actions - Pinned */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 bg-[#ECE8DD] border-t border-[#DDD7C5] flex items-center justify-end space-x-3 rtl:space-x-reverse shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 rounded-full border border-[#DDD7C5] text-[#111111] text-xs font-semibold hover:bg-rose-500/10 hover:text-rose-600 transition-all cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold shadow-xs flex items-center space-x-1.5 rtl:space-x-reverse transition-all cursor-pointer active:scale-95"
          >
            <Check size={14} className="stroke-[3]" />
            <span>Accept Transfer</span>
          </button>
        </div>

      </div>
    </div>
  );
}
