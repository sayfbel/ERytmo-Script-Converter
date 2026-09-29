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
  showDontAskAgain?: boolean;
  dontAskAgain?: boolean;
  onToggleDontAskAgain?: (checked: boolean) => void;
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
  showDontAskAgain = false,
  dontAskAgain = false,
  onToggleDontAskAgain,
  icon
}: ConfirmModalProps) {
  const { t } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200/80 dark:border-slate-700">
        <div className="p-6">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto ${
            type === 'danger' 
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
              : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
          }`}>
            {icon || <AlertTriangle size={24} className={type === 'danger' ? 'text-red-600' : 'text-teal-600'} />}
          </div>
          
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-center text-xs leading-relaxed mb-6">{message}</p>
          
          {showDontAskAgain && (
            <label className="flex items-center justify-center space-x-2 rtl:space-x-reverse mb-6 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={(e) => onToggleDontAskAgain && onToggleDontAskAgain(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Don&apos;t ask again
              </span>
            </label>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              {cancelText || t("cancel")}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 font-bold rounded-xl text-xs transition-colors text-white cursor-pointer ${
                type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-teal-600 hover:bg-teal-700'
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
