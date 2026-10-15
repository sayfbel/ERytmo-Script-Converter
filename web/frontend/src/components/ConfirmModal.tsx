import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSettings } from "@/context/SettingsContext";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
}

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  type = 'danger',
  confirmText,
  cancelText,
  icon
}: ConfirmModalProps) {
  const { t } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#141417] rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.95)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200/80 dark:border-white/10">
        <div className="p-6">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto border ${
            type === 'danger' 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400' 
              : 'bg-amber-400/10 border-amber-400/20 text-amber-500 dark:text-amber-400'
          }`}>
            {icon || <AlertTriangle size={24} className={type === 'danger' ? 'text-rose-500 dark:text-rose-400' : 'text-amber-500 dark:text-amber-400'} />}
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#f4efe6] text-center mb-2">{title}</h2>
          <p className="text-slate-600 dark:text-[#9f988b] text-center text-xs leading-relaxed mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#f4efe6] font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              {cancelText || t("cancel")}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 font-bold rounded-xl text-xs transition-all cursor-pointer ${
                type === 'danger' 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_4px_15px_rgba(225,29,72,0.3)]' 
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold shadow-[0_4px_15px_rgba(245,158,11,0.25)]'
              }`}
            >
              {confirmText || (type === 'danger' ? t("delete") : t("update"))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
