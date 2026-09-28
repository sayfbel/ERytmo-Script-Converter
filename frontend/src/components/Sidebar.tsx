"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  Calendar, Users, Building,
  Settings, Briefcase, Film, ChevronLeft, ChevronRight, LogOut 
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, language } = useSettings();
  const { user, logout } = useAuth();

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
        ? "bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold shadow-xs" 
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
    }`;
  };

  const getIconClass = (path: string, activeColor: string = "text-teal-600 dark:text-teal-400") => {
    const isActive = pathname === path || (path === '/settings' && pathname.startsWith('/settings'));
    return `${isCollapsed ? "" : "mr-3 rtl:mr-0 rtl:ml-3"} transition-colors duration-200 ${isActive ? activeColor : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200"}`;
  };

  return (
    <aside className={`${isCollapsed ? "w-16 sm:w-20" : "w-56 sm:w-64"} bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-full overflow-y-auto select-none transition-all duration-300`}>
      
      {/* Header */}
      <div className={`p-4 flex ${isCollapsed ? "flex-col items-center justify-center" : "items-center justify-between"} border-b border-slate-100 dark:border-slate-800/60 min-h-[64px]`}>
        {isCollapsed ? (
          <button 
            onClick={() => setIsCollapsed(false)}
            className="flex items-center justify-center p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105"
            title="Expand Sidebar"
          >
            <div className="w-8 h-8 relative rounded-xl bg-slate-900 flex items-center justify-center p-1 shadow-sm shrink-0 overflow-hidden">
              <Image
                src="/app_logo.png"
                alt="ERytmo Logo"
                width={24}
                height={24}
                priority
                className="w-6 h-6 object-contain"
              />
            </div>
          </button>
        ) : (
          <>
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse font-bold text-slate-800 dark:text-slate-100 min-w-0">
              <div className="w-8 h-8 relative rounded-xl bg-slate-900 flex items-center justify-center p-1 shadow-sm shrink-0 overflow-hidden">
                <Image
                  src="/app_logo.png"
                  alt="ERytmo Logo"
                  width={24}
                  height={24}
                  priority
                  className="w-6 h-6 object-contain"
                />
              </div>
              <span className="text-base tracking-tight font-extrabold truncate">{t("app.name").split(" ")[0]}</span>
            </div>
            
            <button 
              onClick={() => setIsCollapsed(true)}
              className="text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-900/30 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700"
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
          {!isCollapsed && <div className="text-[11px] uppercase text-slate-400 dark:text-slate-500 font-bold mb-2 px-3 tracking-wider">Workspace</div>}
          <div className="space-y-1">
            <Link href="/" className={getLinkClass("/")} title={t("sidebar.time_management")}>
              <Calendar size={isCollapsed ? 20 : 18} className={getIconClass("/")} /> {!isCollapsed && <span className="truncate">{t("sidebar.time_management")}</span>}
            </Link>
            <Link href="/projects" className={getLinkClass("/projects")} title={t("sidebar.projects")}>
              <Briefcase size={isCollapsed ? 20 : 18} className={getIconClass("/projects", "text-blue-500 dark:text-blue-400")} /> {!isCollapsed && <span className="truncate">{t("sidebar.projects")}</span>}
            </Link>
            <Link href="/converter" className={getLinkClass("/converter")} title={t("sidebar.converter")}>
              <Film size={isCollapsed ? 20 : 18} className={getIconClass("/converter", "text-purple-600 dark:text-purple-400")} /> {!isCollapsed && <span className="truncate">{t("sidebar.converter")}</span>}
            </Link>
          </div>
        </div>

        {/* Company */}
        <div>
          {!isCollapsed && <div className="text-[11px] uppercase text-slate-400 dark:text-slate-500 font-bold mb-2 px-3 tracking-wider">Company</div>}
          <div className="space-y-1">
            <Link href="/company" className={getLinkClass("/company")} title={t("sidebar.company")}>
              <Building size={isCollapsed ? 20 : 18} className={getIconClass("/company", "text-orange-500 dark:text-orange-400")} /> {!isCollapsed && <span className="truncate">{t("sidebar.company")}</span>}
            </Link>
            <Link href="/staff" className={getLinkClass("/staff")} title={t("sidebar.staff")}>
              <Users size={isCollapsed ? 20 : 18} className={getIconClass("/staff", "text-indigo-500 dark:text-indigo-400")} /> {!isCollapsed && <span className="truncate">{t("sidebar.staff")}</span>}
            </Link>
            <Link href="/settings" className={getLinkClass("/settings")} title={t("sidebar.settings")}>
              <Settings size={isCollapsed ? 20 : 18} className={getIconClass("/settings", "text-slate-700 dark:text-slate-300")} /> {!isCollapsed && <span className="truncate">{t("sidebar.settings")}</span>}
            </Link>
          </div>
        </div>
      </nav>

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
        {user && (
          <div className={`flex ${isCollapsed ? "flex-col items-center gap-2" : "items-center justify-between"} p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800`}>
            <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
              <div className="w-8 h-8 rounded-lg bg-teal-600 dark:bg-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs uppercase">
                {user.first_name ? user.first_name[0] : "U"}{user.last_name ? user.last_name[0] : ""}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate" title={user.email}>
                    {user.email}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Footer Info */}
        {!isCollapsed && (
          <div className="mt-2.5 px-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span className="font-semibold text-slate-500 dark:text-slate-400">v2.0 Standalone</span>
            <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" title="System Ready" />
          </div>
        )}
      </div>
    </aside>
  );
}
