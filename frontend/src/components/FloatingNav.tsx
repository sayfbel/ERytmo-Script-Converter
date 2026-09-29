"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export interface NavItem {
  id: string;
  label: string;
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "DubFlow" },
  { id: "workflows", label: "Workflows" },
  { id: "vision", label: "Sécurité" },
  { id: "impact", label: "Impact & ROI" },
  { id: "formules", label: "Questions" }
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

      const sectionIds = ["home", "workflows", "vision", "impact", "formules"];

      if (scrollParent) {
        const atBottom = scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight < 70;
        if (atBottom) {
          setLocalActiveSection("formules");
          return;
        }
      } else {
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 70;
        if (atBottom) {
          setLocalActiveSection("formules");
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

    if (sectionId === "home" || sectionId === "about") {
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

  const currentActiveItem = DEFAULT_NAV_ITEMS.find((item) => item.id === activeSection) || DEFAULT_NAV_ITEMS[0];

  return (
    <header className={`fixed inset-x-0 flex justify-center z-50 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
      isScrolled ? "top-3.5 sm:top-5" : "top-2.5 sm:top-4 md:top-5"
    }`}>
      <div className="relative flex items-center justify-center pointer-events-auto">
        
        {/* Left Inverted Curve */}
        <div className={`absolute right-full top-0 w-5 h-5 pointer-events-none select-none transition-all duration-300 ease-out origin-top-right ${
          !isScrolled 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-75 -translate-y-1.5"
        }`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="w-full h-full block">
            <path d="M 0 0 Q 20 0 20 20 L 21 20 L 21 0 Z" fill="#030303" />
          </svg>
        </div>

        {/* Right Inverted Curve */}
        <div className={`absolute left-full top-0 w-5 h-5 pointer-events-none select-none transition-all duration-300 ease-out origin-top-left ${
          !isScrolled 
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
          className={`relative flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#030303]/95 backdrop-blur-2xl shadow-[0_16px_45px_rgba(0,0,0,0.95)] cursor-pointer overflow-hidden border-0 ring-0 ${
            isScrolled && !isNavHovered
              ? "h-9 sm:h-10 max-w-[200px] px-4 rounded-full animate-nav-morph"
              : isScrolled && isNavHovered
              ? "h-11 sm:h-12 max-w-[640px] px-4 sm:px-7 rounded-full"
              : "h-11 sm:h-12 max-w-[700px] px-6 sm:px-12 rounded-b-[22px] rounded-t-none"
          }`}
        >
          {/* VIEW 1: Compact Section Indicator Pill */}
          <div
            className={`flex items-center gap-2.5 sm:gap-3 py-1 select-none transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isScrolled && !isNavHovered
                ? "opacity-100 scale-100 translate-y-0"
                : "opacity-0 scale-90 translate-y-2 pointer-events-none absolute inset-0 flex items-center justify-center"
            }`}
          >
            <span 
              key={currentActiveItem.id} 
              className="text-xs sm:text-[13px] font-semibold text-[#f4efe6] tracking-wide animate-nav-label-swap whitespace-nowrap flex items-center"
            >
              {currentActiveItem.id === "home" || currentActiveItem.id === "about" ? (
                <span className="flex items-center gap-1.5">
                  <Image
                    src="/dubflow_icon.png"
                    alt="DubFlow"
                    width={15}
                    height={15}
                    className="object-contain shrink-0"
                  />
                  <span>DubFlow</span>
                  <span className="font-editorial italic text-amber-300 text-sm ml-0.5">*</span>
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
            className={`flex items-center text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] whitespace-nowrap ${
              isScrolled && !isNavHovered
                ? "opacity-0 scale-95 -translate-y-2 pointer-events-none absolute inset-0 flex items-center justify-center"
                : "opacity-100 scale-100 translate-y-0 relative"
            } ${
              isScrolled ? "gap-1.5 sm:gap-2.5" : "gap-5 sm:gap-9"
            }`}
          >
            {DEFAULT_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={(e) => handleItemClick(e, item.id)}
                className={`relative py-1 transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none ${
                  activeSection === item.id
                    ? "text-[#f4efe6] font-medium"
                    : "text-[#9e988c] hover:text-[#f4efe6]"
                }`}
              >
                {item.id === "home" || item.id === "about" ? (
                  <span className="flex items-center gap-1.5">
                    <Image
                      src="/dubflow_icon.png"
                      alt="DubFlow"
                      width={15}
                      height={15}
                      className="object-contain shrink-0"
                    />
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
  );
}
