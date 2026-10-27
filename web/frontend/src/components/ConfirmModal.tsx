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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/50 dark:bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#F7F4EB] rounded-[28px] shadow-2xl border border-[#DDD7C5] w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto my-auto animate-in zoom-in-95 duration-200 text-[#111111]">
        <div className="p-6 sm:p-7">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto border ${
            type === 'danger' 
              ? 'bg-rose-500/10 border-rose-500/25 text-rose-600' 
              : 'bg-amber-400/20 border-amber-400/40 text-amber-600'
          }`}>
            {icon || <AlertTriangle size={22} className={type === 'danger' ? 'text-rose-600' : 'text-amber-600'} />}
          </div>
          
          <h2 className="text-lg sm:text-xl font-bold text-[#111111] text-center mb-2">{title}</h2>
          <p className="text-[#666155] text-center text-xs leading-relaxed mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 bg-[#ECE8DD] hover:bg-[#E2DDD0] border border-[#DDD7C5] text-[#111111] font-semibold rounded-full text-xs transition-colors cursor-pointer"
            >
              {cancelText || t("cancel")}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 font-bold rounded-full text-xs transition-all cursor-pointer ${
                type === 'danger' 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm' 
                  : 'bg-amber-400 hover:bg-amber-300 text-black font-extrabold shadow-sm'
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
