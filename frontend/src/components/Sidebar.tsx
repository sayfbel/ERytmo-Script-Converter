"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DubFlowIcon } from "./DubFlowLogo";
import { usePathname } from "next/navigation";
import { 
  Calendar, Users, Building,
  Settings, Briefcase, Film, ChevronLeft, ChevronRight, LogOut,
  Monitor, User
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, language } = useSettings();
  const { logout } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check initial viewport size
    let lastWidth = window.innerWidth;
    if (window.innerWidth < 1024) {
      setIsCollapsed(true);
    }

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth < 1024 && lastWidth >= 1024) {
        setIsCollapsed(true);
      } else if (currentWidth >= 1024 && lastWidth < 1024) {
        setIsCollapsed(false);
      }
      lastWidth = currentWidth;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getLinkClass = (path: string) => {
    const isActive = pathname === path || (path === '/settings' && pathname.startsWith('/settings'));
    return `group relative flex items-center ${isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-3 py-2.5"} rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive 
        ? "bg-amber-400/15 text-amber-600 dark:text-amber-300 font-semibold border border-amber-400/30 dark:border-amber-400/25 shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.12)]" 
        : "text-slate-600 dark:text-[#9f988b] hover:text-slate-900 dark:hover:text-[#f4efe6] hover:bg-slate-100 dark:hover:bg-white/[0.05] border border-transparent"
    }`;
  };

  const getIconClass = (path: string, activeColor: string = "text-amber-500 dark:text-amber-400") => {
    const isActive = pathname === path || (path === '/settings' && pathname.startsWith('/settings'));
    return `${isCollapsed ? "" : "mr-3 rtl:mr-0 rtl:ml-3"} transition-colors duration-200 ${isActive ? activeColor : "text-slate-400 dark:text-[#71717a] group-hover:text-slate-900 dark:group-hover:text-[#f4efe6]"}`;
  };

  return (
    <aside className={`${isCollapsed ? "w-16 sm:w-20" : "w-56 sm:w-64"} bg-white dark:bg-[#09090b] border-r border-slate-200/80 dark:border-white/[0.08] flex flex-col h-full overflow-y-auto select-none transition-all duration-300`}>
      
      {/* Header */}
      <div className={`p-4 flex ${isCollapsed ? "flex-col items-center justify-center" : "items-center justify-between"} border-b border-slate-200/80 dark:border-white/[0.08] min-h-[64px]`}>
        {isCollapsed ? (
          <button 
            onClick={() => setIsCollapsed(false)}
            className="flex items-center justify-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all hover:scale-105"
            title="Expand Sidebar"
          >
            <DubFlowIcon className="w-6 h-6 text-amber-500 dark:text-amber-400 shrink-0" />
          </button>
        ) : (
          <>
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse font-bold text-slate-900 dark:text-[#f4efe6] min-w-0">
              <DubFlowIcon className="w-6 h-6 text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="text-base tracking-tight font-extrabold truncate text-slate-900 dark:text-[#f4efe6] flex items-baseline">
                DubFlow
              </span>
            </div>
            
            <button 
              onClick={() => setIsCollapsed(true)}
              className="text-slate-400 dark:text-[#9f988b] hover:text-amber-500 dark:hover:text-amber-400 transition-colors bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] p-1.5 rounded-lg border border-slate-200 dark:border-white/10"
              title="Collapse Sidebar"
            >
              {language === 'ar' ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-x-hidden">
        {/* Workspace */}
        <div>
          {!isCollapsed && <div className="text-[11px] uppercase text-slate-400 dark:text-[#71717a] font-bold mb-2 px-3 tracking-wider">Workspace</div>}
          <div className="space-y-1">
            <Link href="/time" className={getLinkClass("/time")} title={t("sidebar.time_management")}>
              <Calendar size={isCollapsed ? 20 : 18} className={getIconClass("/time")} /> {!isCollapsed && <span className="truncate">{t("sidebar.time_management")}</span>}
            </Link>
            <Link href="/projects" className={getLinkClass("/projects")} title={t("sidebar.projects")}>
              <Briefcase size={isCollapsed ? 20 : 18} className={getIconClass("/projects")} /> {!isCollapsed && <span className="truncate">{t("sidebar.projects")}</span>}
            </Link>
            <Link href="/converter" className={getLinkClass("/converter")} title={t("sidebar.converter")}>
              <Film size={isCollapsed ? 20 : 18} className={getIconClass("/converter")} /> {!isCollapsed && <span className="truncate">{t("sidebar.converter")}</span>}
            </Link>
          </div>
        </div>

        {/* Desktop & Downloads */}
        <div>
          {!isCollapsed && <div className="text-[11px] uppercase text-slate-400 dark:text-[#71717a] font-bold mb-2 px-3 tracking-wider">Apps</div>}
          <div className="space-y-1">
            <Link href="/" className={getLinkClass("/")} title="Desktop App & Presentation">
              <Monitor size={isCollapsed ? 20 : 18} className={getIconClass("/")} /> {!isCollapsed && <span className="truncate">Desktop App</span>}
            </Link>
          </div>
        </div>

        {/* Company */}
        <div>
          {!isCollapsed && <div className="text-[11px] uppercase text-slate-400 dark:text-[#71717a] font-bold mb-2 px-3 tracking-wider">Company</div>}
          <div className="space-y-1">
            <Link href="/company" className={getLinkClass("/company")} title={t("sidebar.company")}>
              <Building size={isCollapsed ? 20 : 18} className={getIconClass("/company")} /> {!isCollapsed && <span className="truncate">{t("sidebar.company")}</span>}
            </Link>
            <Link href="/staff" className={getLinkClass("/staff")} title={t("sidebar.staff")}>
              <Users size={isCollapsed ? 20 : 18} className={getIconClass("/staff")} /> {!isCollapsed && <span className="truncate">{t("sidebar.staff")}</span>}
            </Link>
            <Link href="/profile" className={getLinkClass("/profile")} title="Profile & Security">
              <User size={isCollapsed ? 20 : 18} className={getIconClass("/profile")} /> {!isCollapsed && <span className="truncate">Profile &amp; Security</span>}
            </Link>
            <Link href="/settings" className={getLinkClass("/settings")} title={t("sidebar.settings")}>
              <Settings size={isCollapsed ? 20 : 18} className={getIconClass("/settings")} /> {!isCollapsed && <span className="truncate">{t("sidebar.settings")}</span>}
            </Link>
          </div>
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.08] mt-auto">
        <button
          onClick={() => logout()}
          title="Log Out"
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
          } rounded-xl text-xs font-semibold text-slate-600 dark:text-[#9f988b] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition-all cursor-pointer`}
        >
          <LogOut size={isCollapsed ? 18 : 16} className="shrink-0" />
          {!isCollapsed && <span className="truncate">Log Out</span>}
        </button>

        {/* Footer Info */}
        {!isCollapsed && (
          <div className="mt-2.5 px-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-[#71717a]">
            <span className="font-semibold text-slate-500 dark:text-[#9f988b]">v2.0 Standalone</span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" title="System Ready" />
          </div>
        )}
      </div>
    </aside>
  );
}
