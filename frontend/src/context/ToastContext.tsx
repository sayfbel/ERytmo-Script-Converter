"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastState {
  isOpen: boolean;
  title: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (title: string, message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<ToastState>({
    isOpen: false,
    title: "",
    message: "",
    type: "success",
  });

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showToast = useCallback((title: string, message: string, type: ToastType = "success") => {
    setToast({
      isOpen: true,
      title,
      message,
      type,
    });

    // Auto hide after 3.5 seconds
    setTimeout(() => {
      hideToast();
    }, 3500);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {/* Global Toast Notification Component */}
      <div 
        className={`fixed top-5 right-5 z-[9999] transform transition-all duration-300 pointer-events-none flex items-center gap-3 bg-white border text-slate-800 px-4 py-3 rounded-xl shadow-lg ${
          toast.isOpen ? 'translate-y-0 opacity-100' : 'translate-y-[-120%] opacity-0'
        } ${
          toast.type === "success" ? "border-emerald-200" :
          toast.type === "error" ? "border-rose-200" :
          "border-blue-200"
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${
          toast.type === "success" ? "bg-emerald-100 text-emerald-600" :
          toast.type === "error" ? "bg-rose-100 text-rose-600" :
          "bg-blue-100 text-blue-600"
        }`}>
          {toast.type === "success" && <CheckCircle2 size={16} strokeWidth={2.5} />}
          {toast.type === "error" && <AlertCircle size={16} strokeWidth={2.5} />}
          {toast.type === "info" && <Info size={16} strokeWidth={2.5} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          <p className="text-xs text-slate-500">{toast.message}</p>
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
