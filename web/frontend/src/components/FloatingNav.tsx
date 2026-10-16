"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DubFlowIcon } from "./DubFlowLogo";
import { X, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";

export interface NavItem {
  id: string;
  label: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "DubFlow" },
  { id: "about", label: "About us" },
  { id: "web", label: "Web App" },
  { id: "desktop", label: "Desktop App" },
  { id: "comparatif", label: "Comparatif" },
  { id: "faq", label: "FAQ" }
];

interface FloatingNavProps {
  activeSection?: string;
  onSectionClick?: (sectionId: string) => void;
}

export default function FloatingNav({
  activeSection: controlledActiveSection,
  onSectionClick,
}: FloatingNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/" || pathname === "/welcome";

  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [localActiveSection, setLocalActiveSection] = useState<string>("home");

  const activeSection = controlledActiveSection || localActiveSection;

  useEffect(() => {
    const handleScroll = () => {
      const scrollParent = document.querySelector(".overflow-y-auto") as HTMLElement | null;
      const currentScroll = scrollParent ? scrollParent.scrollTop : (window.scrollY || document.documentElement.scrollTop);

      setIsScrolled(currentScroll > 45);

      if (!isHomePage) return;

      const sectionIds = ["home", "about", "web", "desktop", "comparatif", "faq"];

      if (scrollParent) {
        const atBottom = scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight < 70;
        if (atBottom) {
          setLocalActiveSection("faq");
          return;
        }
      } else {
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 70;
        if (atBottom) {
          setLocalActiveSection("faq");
          return;
        }
      }

      const anchorY = Math.max(120, window.innerHeight * 0.35);
      let matched = false;
      for (const id of sectionIds) {
        if (id === "home") continue;
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= anchorY && rect.bottom > anchorY) {
            setLocalActiveSection(id);
            matched = true;
            break;
          }
        }
      }

      if (!matched && currentScroll < 100) {
        setLocalActiveSection("home");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    const scrollContainers = document.querySelectorAll(".overflow-y-auto");
    scrollContainers.forEach((sc) => sc.addEventListener("scroll", handleScroll, { passive: true }));

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      scrollContainers.forEach((sc) => sc.removeEventListener("scroll", handleScroll));
    };
  }, [isHomePage]);

  const handleItemClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();

    if (onSectionClick) {
      onSectionClick(sectionId);
      return;
    }

    if (sectionId === "home") {
      if (isHomePage) {
        if (typeof window !== "undefined" && window.location.hash) {
          history.replaceState(null, "", window.location.pathname);
        }
        const scrollParent = document.querySelector(".overflow-y-auto") as HTMLElement | null;
        if (scrollParent) {
          scrollParent.scrollTo({ top: 0, behavior: "smooth" });
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        setLocalActiveSection("home");
      } else {
        if (typeof window !== "undefined") {
          window.scrollTo(0, 0);
        }
        router.push("/");
      }
      return;
    }

    if (isHomePage) {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setLocalActiveSection(sectionId);
      }
    } else {
      router.push(`/#${sectionId}`);
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const currentActiveItem = DEFAULT_NAV_ITEMS.find((item) => item.id === activeSection) || DEFAULT_NAV_ITEMS[0];

  return (
    <>
      <header className={`fixed inset-x-0 flex justify-center z-50 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isScrolled ? "top-3 sm:top-5" : "top-2 sm:top-4 md:top-5"
        }`}>
        
        {/* ======================================================== */}
        {/* 1. MOBILE COMPACT FLOATING PILL WITH CORNER WAVES (< md) */}
        {/* ======================================================== */}
        <div className="flex md:hidden relative items-center justify-center pointer-events-auto">

          {/* Left Inverted Wave Curve */}
          <div className={`absolute right-full top-0 w-5 h-5 pointer-events-none select-none transition-all duration-300 ease-out origin-top-right ${!isScrolled
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-75 -translate-y-1.5"
            }`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-full h-full block">
              <path d="M 0 0 Q 20 0 20 20 L 21 20 L 21 0 Z" fill="#030303" />
            </svg>
          </div>

          {/* Right Inverted Wave Curve */}
          <div className={`absolute left-full top-0 w-5 h-5 pointer-events-none select-none transition-all duration-300 ease-out origin-top-left ${!isScrolled
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-75 -translate-y-1.5"
            }`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-full h-full block">
              <path d="M 0 20 Q 0 0 20 0 L 0 0 L -1 0 L -1 20 Z" fill="#030303" />
            </svg>
          </div>

          {/* Mobile Button / Pill */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Ouvrir la navigation"
            className={`relative flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#030303]/95 backdrop-blur-2xl shadow-[0_16px_45px_rgba(0,0,0,0.95)] cursor-pointer select-none active:scale-95 ${
              isScrolled
                ? "h-9 sm:h-10 px-4 rounded-full border border-white/15 animate-nav-morph hover:border-white/25"
                : "h-10 px-4 sm:px-5 rounded-b-[20px] rounded-t-none border-0 ring-0"
            }`}
          >
            <div className="flex items-center gap-2.5 py-1">
              {(!isScrolled || activeSection === "home") ? (
                <div key="mobile-home-brand" className="flex items-center gap-1.5 animate-nav-label-swap">
                  <DubFlowIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-extrabold tracking-tight text-xs text-[#f4efe6]">DubFlow</span>
                  <span className="font-editorial italic text-amber-300 text-xs ml-0.5">*</span>
                </div>
              ) : (
                <span
                  key={currentActiveItem.id}
                  className="text-xs font-semibold text-[#f4efe6] tracking-wide animate-nav-label-swap whitespace-nowrap"
                >
                  {currentActiveItem.label}
                </span>
              )}
              <span className="w-[1px] h-3.5 bg-white/20" />
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-amber-breathe shrink-0" />
            </div>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2. DESKTOP FLUID MORPHING NAVBAR (>= md)                 */}
        {/* ======================================================== */}
        <div className="hidden md:flex relative items-center justify-center pointer-events-auto">

          {/* Left Inverted Curve */}
          <div className={`absolute right-full top-0 w-5 h-5 pointer-events-none select-none transition-all duration-300 ease-out origin-top-right ${!isScrolled
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-75 -translate-y-1.5"
            }`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-full h-full block">
              <path d="M 0 0 Q 20 0 20 20 L 21 20 L 21 0 Z" fill="#030303" />
            </svg>
          </div>

          {/* Right Inverted Curve */}
          <div className={`absolute left-full top-0 w-5 h-5 pointer-events-none select-none transition-all duration-300 ease-out origin-top-left ${!isScrolled
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-75 -translate-y-1.5"
            }`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-full h-full block">
              <path d="M 0 20 Q 0 0 20 0 L 0 0 L -1 0 L -1 20 Z" fill="#030303" />
            </svg>
          </div>

          {/* The Fluid Morphing Navbar */}
          <nav
            onMouseEnter={() => setIsNavHovered(true)}
            onMouseLeave={() => setIsNavHovered(false)}
            className={`relative flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#030303]/95 backdrop-blur-2xl shadow-[0_16px_45px_rgba(0,0,0,0.95)] cursor-pointer overflow-hidden border-0 ring-0 ${isScrolled && !isNavHovered
              ? "h-9 sm:h-10 max-w-[200px] px-4 rounded-full animate-nav-morph"
              : isScrolled && isNavHovered
                ? "h-11 sm:h-12 max-w-[640px] px-4 sm:px-7 rounded-full"
                : "h-11 sm:h-12 max-w-[700px] px-6 sm:px-12 rounded-b-[22px] rounded-t-none"
              }`}
          >
            {/* VIEW 1: Compact Section Indicator Pill */}
            <div
              className={`flex items-center gap-2.5 sm:gap-3 py-1 select-none transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${isScrolled && !isNavHovered
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-90 translate-y-2 pointer-events-none absolute inset-0 flex items-center justify-center"
                }`}
            >
              <span
                key={currentActiveItem.id}
                className="text-xs sm:text-[13px] font-semibold text-[#f4efe6] tracking-wide animate-nav-label-swap whitespace-nowrap flex items-center"
              >
                {currentActiveItem.id === "home" ? (
                  <span className="flex items-center gap-1.5">
                    <DubFlowIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>DubFlow</span>
                  </span>
                ) : (
                  currentActiveItem.label
                )}
              </span>
              <span className="w-[1px] h-3.5 bg-white/20" />
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-amber-breathe shrink-0" />
            </div>

            {/* VIEW 2: Expanded Full Navigation Links */}
            <div
              className={`flex items-center text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap ${isScrolled && !isNavHovered
                ? "opacity-0 scale-95 -translate-y-2 pointer-events-none absolute inset-0 flex items-center justify-center"
                : "opacity-100 scale-100 translate-y-0 relative"
                } ${isScrolled ? "gap-1.5 sm:gap-2.5" : "gap-5 sm:gap-9"
                }`}
            >
              {DEFAULT_NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => handleItemClick(e, item.id)}
                  className={`relative py-1 transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${activeSection === item.id
                    ? "text-[#f4efe6] font-medium"
                    : "text-[#9e988c] hover:text-[#f4efe6]"
                    }`}
                >
                  {item.id === "home" ? (
                    <span className="flex items-center gap-1.5">
                      <DubFlowIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-extrabold tracking-tight">DubFlow</span>
                      <span className="font-editorial italic text-amber-300 text-sm ml-0.5">*</span>
                    </span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                  {activeSection === item.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. MOBILE FULL-SCREEN LUXURY GLASS DRAWER                */}
      {/* ======================================================== */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[#070709]/95 backdrop-blur-3xl flex flex-col justify-between p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
          {/* Top Bar inside Drawer */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <DubFlowIcon className="w-6 h-6 text-amber-400 shrink-0" />
              <span className="font-black text-xl text-[#f4efe6] tracking-tight">DubFlow</span>
              <span className="font-editorial text-amber-300 italic text-2xl">*</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Fermer le menu"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links List */}
          <nav className="flex-1 py-8 flex flex-col justify-center space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-400 font-bold mb-1">
              NAVIGATION DU STUDIO
            </span>
            {DEFAULT_NAV_ITEMS.map((item, index) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    handleItemClick(e, item.id);
                  }}
                  className={`w-full flex items-center justify-between py-2.5 text-left transition-all ${
                    isActive ? "text-amber-300 font-bold" : "text-[#d8d2c5] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-white/30">0{index + 1}</span>
                    <span className={`text-xl font-bold tracking-tight ${isActive ? "text-amber-300 font-editorial italic text-2xl" : "text-[#f4efe6]"}`}>
                      {item.label}
                    </span>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom CTAs & Security Badges */}
          <div className="pt-5 border-t border-white/10 space-y-3 shrink-0">
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(245,158,11,0.25)]"
            >
              <span>Accéder au Studio</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              href="/converter"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-3 px-5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/15"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Convertisseur Libre</span>
            </Link>

            <div className="flex items-center justify-center gap-2 pt-1 text-[10px] text-white/40">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Architecture P2P &bull; 0-Cloud &bull; TPN Compliant</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
