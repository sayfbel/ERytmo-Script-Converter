"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

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
  const isStudio = variant === "studio";

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
        className={
          isStudio
            ? `w-full h-[46px] bg-[#1a1a1c] border ${
                isOpen ? "border-white/30 ring-1 ring-white/10" : "border-white/10"
              } hover:border-white/20 rounded-[16px] px-4 text-[13px] text-[#f4efe6] flex items-center justify-between transition-all shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)] focus:outline-none cursor-pointer`
            : `w-full bg-slate-50 dark:bg-slate-900 border ${
                isOpen ? "border-teal-500 ring-2 ring-teal-500/20" : "border-slate-200 dark:border-slate-700"
              } hover:border-slate-300 dark:hover:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-medium flex items-center justify-between transition-all shadow-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10`
        }
      >
        <div className={`flex items-center gap-2 truncate ${isStudio ? "text-[#f4efe6]" : "text-slate-700 dark:text-slate-200"}`}>
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
              <span className={isStudio ? "text-[#555555]" : "text-slate-400 dark:text-slate-500"}>{placeholder}</span>
            </>
          )}
        </div>

        {isStudio ? (
          <div className="shrink-0 ml-2 text-zinc-400">
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-[#ECE8DF]" : ""}`}
            />
          </div>
        ) : (
          <div className="shrink-0 ml-2 bg-teal-500 text-white rounded p-0.5 flex flex-col justify-center items-center h-5 w-5">
            <ChevronUp size={10} className="-mb-0.5" />
            <ChevronDown size={10} className="-mt-0.5" />
          </div>
        )}
      </button>

      {isOpen && (
        <div
          className={
            isStudio
              ? `absolute ${
                  openUpwards ? "bottom-full mb-2" : "top-full mt-2"
                } left-0 z-[99999] w-full bg-[#161618] border border-white/15 rounded-[18px] shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-2xl`
              : `absolute ${
                  openUpwards ? "bottom-full mb-1" : "top-full mt-1"
                } left-0 z-[99999] w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1`
          }
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
                  className={
                    isStudio
                      ? `w-full text-left px-3 py-2.5 flex items-center gap-2.5 rounded-[12px] transition-all text-[13px] font-medium cursor-pointer ${
                          isSelected
                            ? "bg-white/10 text-[#f4efe6] font-semibold"
                            : "text-zinc-400 hover:text-[#f4efe6] hover:bg-white/[0.04]"
                        }`
                      : `w-full text-left px-2 py-2 flex items-center gap-2 rounded-lg transition-colors text-sm font-medium ${
                          isSelected
                            ? "bg-teal-500 text-white"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`
                  }
                >
                  <div className="w-4 shrink-0 flex justify-center">
                    {isSelected && (
                      <Check size={14} className={isStudio ? "text-[#ECE8DF]" : "text-white"} />
                    )}
                  </div>
                  {option.icon && (
                    <div className={`shrink-0 ${isSelected ? (isStudio ? "text-[#ECE8DF]" : "text-white") : "text-zinc-500"}`}>
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
