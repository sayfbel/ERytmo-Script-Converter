"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DubFlowIcon } from "./DubFlowLogo";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Calendar, Briefcase, BarChart3, Film,
  Users, Building2, FolderArchive, Settings, LogOut,
  ChevronRight, ChevronLeft, Sparkles
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, language } = useSettings();
  const { logout, user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;

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

  const isLinkActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    if (path === "/time") {
      return pathname === "/time";
    }
    if (path === "/projects") {
      return pathname.startsWith("/projects");
    }
    if (path === "/settings") {
      return pathname.startsWith("/settings");
    }
    return pathname === path;
  };

  const getLinkClass = (path: string) => {
    const active = isLinkActive(path);
    return `group relative flex items-center ${
      isCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "px-3.5 py-2.5"
    } rounded-2xl text-[13px] font-medium transition-all duration-200 ${
      active
        ? "text-white font-semibold bg-white/[0.08]"
        : "text-[#8e8e93] hover:text-white hover:bg-white/[0.05]"
    }`;
  };

  return (
    <aside className="relative h-full flex flex-col select-none py-1.5 pl-1.5">
      {/* Deep Black Rounded Container */}
      <div 
        className={`${
          isCollapsed ? "w-16 sm:w-20" : "w-56 sm:w-60"
        } bg-[#111111] text-white rounded-[28px] flex flex-col h-full border border-black/40 shadow-[0_15px_40px_rgba(0,0,0,0.25)] relative transition-all duration-300`}
      >
        {/* Yellow Floating Toggle Button on the Edge */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-2.5 top-7 z-30 w-5 h-5 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-2 ring-[#111111]"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={13} className="stroke-[3]" />
          ) : (
            <ChevronLeft size={13} className="stroke-[3]" />
          )}
        </button>

        {/* Brand Header */}
        <div className={`p-4 pt-5 flex ${isCollapsed ? "flex-col items-center justify-center" : "items-center gap-3"} min-h-[64px]`}>
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
            <DubFlowIcon className="w-5 h-5 text-amber-400" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[17px] font-extrabold tracking-tight text-white leading-tight">
                DubFlow
              </span>
              <span className="text-[10px] text-[#737373] tracking-wide font-medium">
                Studio Edition v2.0
              </span>
            </div>
          )}
        </div>

        {/* Navigation Menus */}
        <nav className="flex-1 px-2.5 py-2 space-y-5 overflow-y-auto overflow-x-hidden no-scrollbar">
          {/* General Section */}
          <div>
            {!isCollapsed && (
              <div className="text-[11px] font-semibold text-[#666666] tracking-wide mb-2 px-3">
                General
              </div>
            )}
            <div className="space-y-1">
              {/* Dashboard */}
              <Link href="/dashboard" className={getLinkClass("/dashboard")} title="Dashboard">
                {isLinkActive("/dashboard") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
                )}
                <LayoutDashboard size={isCollapsed ? 20 : 17} className={`${isLinkActive("/dashboard") ? "text-amber-400" : "text-[#8e8e93] group-hover:text-white"} shrink-0 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && <span className="truncate">Dashboard</span>}
              </Link>

              {/* Schedule */}
              <Link href="/time" className={getLinkClass("/time")} title="Schedule">
                {isLinkActive("/time") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
                )}
                <Calendar size={isCollapsed ? 20 : 17} className={`${isLinkActive("/time") ? "text-amber-400" : "text-[#8e8e93] group-hover:text-white"} shrink-0 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && <span className="truncate">Schedule</span>}
              </Link>

              {/* Projects */}
              <Link href="/projects" className={getLinkClass("/projects")} title="Projects">
                {isLinkActive("/projects") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
                )}
                <Briefcase size={isCollapsed ? 20 : 17} className={`${isLinkActive("/projects") ? "text-amber-400" : "text-[#8e8e93] group-hover:text-white"} shrink-0 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && <span className="truncate">Projects</span>}
              </Link>

              {/* Statistics & Reports */}
              <Link href="/time#analytics" className={getLinkClass("/time#analytics")} title="Statistics & reports">
                <BarChart3 size={isCollapsed ? 20 : 17} className="text-[#8e8e93] group-hover:text-white shrink-0 mr-0 lg:mr-3" />
                {!isCollapsed && <span className="truncate">Statistics & reports</span>}
              </Link>

              {/* Script Converter */}
              <Link href="/converter" className={getLinkClass("/converter")} title="Script Converter">
                {isLinkActive("/converter") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
                )}
                <Film size={isCollapsed ? 20 : 17} className={`${isLinkActive("/converter") ? "text-amber-400" : "text-[#8e8e93] group-hover:text-white"} shrink-0 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && <span className="truncate">Education &amp; Scripts</span>}
              </Link>
            </div>
          </div>

          {/* Tools Section */}
          <div>
            {!isCollapsed && (
              <div className="text-[11px] font-semibold text-[#666666] tracking-wide mb-2 px-3">
                Tools
              </div>
            )}
            <div className="space-y-1">
              {/* Staff & Collaborators */}
              <Link href="/staff" className={getLinkClass("/staff")} title="Staff & Collaborators">
                {isLinkActive("/staff") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
                )}
                <Users size={isCollapsed ? 20 : 17} className={`${isLinkActive("/staff") ? "text-amber-400" : "text-[#8e8e93] group-hover:text-white"} shrink-0 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && <span className="truncate">Staff &amp; Collaborators</span>}
              </Link>

              {/* Companies */}
              <Link href="/company" className={getLinkClass("/company")} title="Companies">
                {isLinkActive("/company") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
                )}
                <Building2 size={isCollapsed ? 20 : 17} className={`${isLinkActive("/company") ? "text-amber-400" : "text-[#8e8e93] group-hover:text-white"} shrink-0 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && <span className="truncate">Companies</span>}
              </Link>

              {/* Documents Base */}
              <Link href="/projects" className={getLinkClass("/documents")} title="Documents base">
                <FolderArchive size={isCollapsed ? 20 : 17} className="text-[#8e8e93] group-hover:text-white shrink-0 mr-0 lg:mr-3" />
                {!isCollapsed && <span className="truncate">Documents base</span>}
              </Link>

              {/* Settings */}
              <Link href="/settings" className={getLinkClass("/settings")} title="Settings">
                {isLinkActive("/settings") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-400 rounded-r-full" />
                )}
                <Settings size={isCollapsed ? 20 : 17} className={`${isLinkActive("/settings") ? "text-amber-400" : "text-[#8e8e93] group-hover:text-white"} shrink-0 ${isCollapsed ? "" : "mr-3"}`} />
                {!isCollapsed && <span className="truncate">Settings</span>}
              </Link>
            </div>
          </div>
        </nav>

        {/* Footer / Log out */}
        <div className="p-3 border-t border-white/[0.08] mt-auto">
          <button
            onClick={() => logout()}
            title="Log Out"
            className={`w-full flex items-center ${
              isCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
            } rounded-2xl text-[13px] font-medium text-[#8e8e93] hover:text-rose-400 hover:bg-white/[0.06] transition-all cursor-pointer`}
          >
            <LogOut size={isCollapsed ? 18 : 16} className="shrink-0" />
            {!isCollapsed && <span className="truncate">Log out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

