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
}

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  type = 'danger'
}: ConfirmModalProps) {
  const { t } = useSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700">
        <div className="p-6">
          <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 mx-auto ${type === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
            <AlertTriangle size={24} className={type === 'danger' ? 'text-red-600' : 'text-teal-600'} />
          </div>
          
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 font-medium rounded-lg transition-colors text-white ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}
            >
              {type === 'danger' ? t("delete") : t("update")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
