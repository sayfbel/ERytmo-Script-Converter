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
        className={`w-full border px-4 py-2.5 text-sm font-medium flex items-center justify-between transition-all focus:outline-none cursor-pointer rounded-full bg-[#F7F4EB] text-[#111111] border-[#DDD7C5] shadow-xs ${
          isOpen ? "border-[#111111]" : "hover:border-[#111111]"
        } ${className}`}
      >
        <div className="flex items-center gap-2 truncate text-[#111111]">
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
              <span className="text-stone-400">{placeholder}</span>
            </>
          )}
        </div>

        <div className="shrink-0 ml-2 text-stone-500">
          <ChevronDown
            size={15}
            className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-[#111111]" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            openUpwards ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } left-0 z-[99999] w-full border border-[#DDD7C5] rounded-[20px] shadow-2xl overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-100 bg-[#ECE8DD] text-[#111111]`}
        >
          <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
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
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 rounded-xl transition-colors text-xs sm:text-sm font-medium cursor-pointer ${
                    isSelected
                      ? "bg-amber-400 text-black font-bold"
                      : "text-[#111111] hover:bg-black/5"
                  }`}
                >
                  <div className="w-4 shrink-0 flex justify-center">
                    {isSelected && (
                      <Check size={14} className="text-black" />
                    )}
                  </div>
                  {option.icon && (
                    <div className={`shrink-0 ${isSelected ? "text-black" : "text-stone-500"}`}>
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
