"use client";

import React from "react";
import Link from "next/link";
import { User, Bell } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  backButton?: React.ReactNode;
  actionButton?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  icon,
  backButton,
  actionButton,
  children,
  className = "",
}: PageHeaderProps) {
  const { toggleNotificationTray, isNotificationTrayOpen } = useToast();

  // If icon is a Link or button (like back button in ApiKeyManager), treat it as backButton
  const isBackElement =
    Boolean(backButton) ||
    (React.isValidElement(icon) &&
      (icon.type === Link ||
        (typeof icon.type === "string" && (icon.type === "a" || icon.type === "button")) ||
        Boolean((icon.props as Record<string, unknown>)?.href)));

  const effectiveBackButton = backButton || (isBackElement ? icon : null);
  const inlineIcon = !isBackElement ? icon : null;

  return (
    <div className={`relative flex flex-col gap-4 mb-5 shrink-0 overflow-visible bg-transparent ${className}`}>
      {/* Top Header Row */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        {/* Left: Optional Back Button, Icon, Title & Explanatory Subtitle */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] flex items-center tracking-tight">
            {effectiveBackButton && (
              <span className="mr-3 rtl:mr-0 rtl:ml-3 shrink-0 inline-flex items-center">
                {effectiveBackButton}
              </span>
            )}
            {inlineIcon && (
              <span className="mr-3 rtl:mr-0 rtl:ml-3 text-amber-500 shrink-0 inline-flex items-center">
                {inlineIcon}
              </span>
            )}
            <span className="truncate">{title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#777265] mt-1 font-medium leading-relaxed max-w-3xl">
            {subtitle}
          </p>
        </div>

        {/* Right: Header Action Pills & Optional Page Action Button */}
        <div className="flex flex-col sm:items-end gap-3 shrink-0">
          {/* Top-Right Round Action Pills (Profile & Notifications) */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* User Profile */}
            <Link
              href="/profile"
              className="w-9 h-9 rounded-full bg-[#111111] hover:bg-black text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs"
              title="Profile"
            >
              <User size={16} />
            </Link>

            {/* Notification Bell */}
            <button
              type="button"
              data-notification-toggle="true"
              onClick={toggleNotificationTray}
              className={`w-9 h-9 rounded-full bg-[#111111] hover:bg-black text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs relative cursor-pointer ${
                isNotificationTrayOpen ? "ring-2 ring-amber-400" : ""
              }`}
              title="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 border-2 border-[#111111]" />
            </button>
          </div>

          {/* Action Button (e.g. + Add Project, + Add Company) */}
          {actionButton && (
            <div className="self-end sm:self-auto">
              {actionButton}
            </div>
          )}
        </div>
      </div>

      {/* Optional Children (e.g. Search & Filter Toolbars) */}
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
