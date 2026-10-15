"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: "default" | "studio";
  icon?: React.ReactNode;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  variant = "default",
  icon,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Auto-detect if dropdown should open upwards when space below is limited
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedDropdownHeight = 260;
      if (spaceBelow < estimatedDropdownHeight && rect.top > estimatedDropdownHeight) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${isOpen ? "z-[9999]" : "z-10"} ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border px-3.5 py-2.5 text-sm font-medium flex items-center justify-between transition-all focus:outline-none cursor-pointer ${
          variant === "studio"
            ? `rounded-[16px] h-[46px] bg-[#1a1a1c] text-[#f4efe6] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)] ${
                isOpen ? "border-white/25 ring-0" : "border-white/10"
              } hover:border-white/15`
            : `bg-white dark:bg-[#131316] rounded-xl shadow-xs dark:shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)] ${
                isOpen ? "border-amber-400 ring-2 ring-amber-400/20" : "border-slate-200 dark:border-white/10"
              } hover:border-slate-300 dark:hover:border-white/20`
        } ${className}`}
      >
        <div className={`flex items-center gap-2 truncate ${variant === "studio" ? "text-[#f4efe6]" : "text-slate-900 dark:text-[#f4efe6]"}`}>
          {selectedOption ? (
            <>
              {selectedOption.icon ? (
                <div className="shrink-0">{selectedOption.icon}</div>
              ) : icon ? (
                <div className="shrink-0">{icon}</div>
              ) : null}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <>
              {icon && <div className="shrink-0">{icon}</div>}
              <span className={variant === "studio" ? "text-[#555555]" : "text-slate-400 dark:text-[#71717a]"}>{placeholder}</span>
            </>
          )}
        </div>

        <div className={`shrink-0 ml-2 ${variant === "studio" ? "text-[#555555]" : "text-slate-400 dark:text-[#9f988b]"}`}>
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${isOpen ? (variant === "studio" ? "rotate-180 text-white" : "rotate-180 text-amber-500 dark:text-amber-400") : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } left-0 z-[99999] w-full border rounded-xl shadow-xl overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-2xl ${
            variant === "studio"
              ? "bg-[#1a1a1c] border-white/15"
              : "bg-white dark:bg-[#161619] border-slate-200 dark:border-white/15 dark:shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
          }`}
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 rounded-lg transition-colors text-xs sm:text-sm font-medium cursor-pointer ${
                    isSelected
                      ? variant === "studio"
                        ? "bg-white/10 text-white font-semibold"
                        : "bg-amber-400/15 text-amber-700 dark:text-amber-300 font-semibold"
                      : variant === "studio"
                        ? "text-[#c2bcaf] hover:text-[#f4efe6] hover:bg-white/[0.06]"
                        : "text-slate-700 dark:text-[#c2bcaf] hover:text-slate-900 dark:hover:text-[#f4efe6] hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="w-4 shrink-0 flex justify-center">
                    {isSelected && (
                      <Check size={14} className={variant === "studio" ? "text-white" : "text-amber-500 dark:text-amber-400"} />
                    )}
                  </div>
                  {option.icon && (
                    <div className={`shrink-0 ${isSelected ? (variant === "studio" ? "text-white" : "text-amber-500 dark:text-amber-400") : (variant === "studio" ? "text-[#555555]" : "text-slate-400 dark:text-[#71717a]")}`}>
                      {option.icon}
                    </div>
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
