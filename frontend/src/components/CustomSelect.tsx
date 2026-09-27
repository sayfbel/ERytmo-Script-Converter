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
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 dark:bg-slate-900 border ${
          isOpen ? "border-teal-500 ring-2 ring-teal-500/20" : "border-slate-200 dark:border-slate-700"
        } hover:border-slate-300 dark:hover:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-medium flex items-center justify-between transition-all shadow-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10`}
      >
        <div className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-200">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <div className="shrink-0">{selectedOption.icon}</div>
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          )}
        </div>
        <div className="shrink-0 ml-2 bg-teal-500 text-white rounded p-0.5 flex flex-col justify-center items-center h-5 w-5">
          <ChevronUp size={10} className="-mb-0.5" />
          <ChevronDown size={10} className="-mt-0.5" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1">
          <div className="max-h-60 overflow-y-auto">
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
                  className={`w-full text-left px-2 py-2 flex items-center gap-2 rounded-lg transition-colors text-sm font-medium ${
                    isSelected
                      ? "bg-teal-500 text-white"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="w-4 shrink-0 flex justify-center">
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                  {option.icon && (
                    <div className={`shrink-0 ${isSelected ? "text-white" : "text-slate-500"}`}>
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
