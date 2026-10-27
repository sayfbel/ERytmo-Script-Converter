"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  timestamp: number;
  duration?: number;
}

interface ToastContextProps {
  showToast: (title: string, message: string, type?: ToastType, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  hideToast: () => void;
  toasts: ToastItem[];
  isNotificationTrayOpen: boolean;
  setIsNotificationTrayOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleNotificationTray: () => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isNotificationTrayOpen, setIsNotificationTrayOpen] = useState(false);

  const toggleNotificationTray = useCallback(() => {
    setIsNotificationTrayOpen((prev) => !prev);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const hideToast = useCallback(() => {
    setToasts((prev) => prev.slice(1));
  }, []);

  const showToast = useCallback(
    (title: string, message: string, type: ToastType = "success", duration: number = 3000): string => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = {
        id,
        title,
        message,
        type,
        timestamp: Date.now(),
        duration,
      };

      // Keep up to 5 concurrent toasts stacked cleanly
      setToasts((prev) => [newToast, ...prev.filter(t => t.message !== message)].slice(0, 5));
      return id;
    },
    []
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        dismissToast,
        clearAllToasts,
        hideToast,
        toasts,
        isNotificationTrayOpen,
        setIsNotificationTrayOpen,
        toggleNotificationTray,
      }}
    >
      {children}
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
