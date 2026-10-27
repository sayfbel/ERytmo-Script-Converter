"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DateSelectProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
  id?: string;
  customTrigger?: (props: {
    isOpen: boolean;
    displayDate: string;
    value: string;
    handleToggle: () => void;
    handleClear: (e: React.MouseEvent) => void;
  }) => React.ReactNode;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DateSelect({
  value,
  onChange,
  label,
  placeholder = "Select Date",
  required = false,
  disabled = false,
  minDate,
  maxDate,
  className = "",
  id,
  customTrigger,
}: DateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Synchronous coordinates state - null initially so it NEVER renders at 0,0
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    isUp: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse initial selected date to determine active view month/year
  const parsedSelected = useMemo(() => {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return { year: y, month: m, day: d };
  }, [value]);

  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate()
    };
  }, []);

  const [viewYear, setViewYear] = useState<number>(() => parsedSelected?.year ?? today.year);
  const [viewMonth, setViewMonth] = useState<number>(() => parsedSelected?.month ?? today.month);

  // Sync view when value changes from outside
  useEffect(() => {
    if (parsedSelected) {
      setViewYear(parsedSelected.year);
      setViewMonth(parsedSelected.month);
    }
  }, [parsedSelected]);

  // Synchronous calculation of popover position directly from containerRef
  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const calendarWidth = Math.min(310, window.innerWidth - 32);
    const calendarHeight = 350;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = 0;
    let isUp = false;
    if (spaceBelow < calendarHeight + 10 && spaceAbove > spaceBelow) {
      // Open upwards above the input
      top = Math.max(10, rect.top - calendarHeight - 8);
      isUp = true;
    } else {
      // Open downwards below the input
      top = Math.min(window.innerHeight - calendarHeight - 10, rect.bottom + 8);
      isUp = false;
    }

    let left = rect.left;
    if (left + calendarWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - calendarWidth - 16);
    }
    if (left < 16) {
      left = 16;
    }

    return { top, left, width: calendarWidth, isUp };
  }, []);

  // Open handler that calculates coordinates synchronously BEFORE rendering
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      const pos = calculatePosition();
      if (pos) {
        setCoords(pos);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Keep position accurate during scroll or resize
  useLayoutEffect(() => {
    if (!isOpen) return;

    const pos = calculatePosition();
    if (pos) setCoords(pos);

    const handleScrollOrResize = () => {
      const updated = calculatePosition();
      if (updated) setCoords(updated);
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen, calculatePosition]);

  // Click outside and escape handling
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Month navigation
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Format date helper (YYYY-MM-DD)
  const formatYMD = (y: number, m: number, d: number) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };

  // Formatted display date for input field (e.g. "Nov 20, 2024")
  const displayDate = useMemo(() => {
    if (!parsedSelected) return "";
    const dt = new Date(parsedSelected.year, parsedSelected.month, parsedSelected.day);
    return dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }, [parsedSelected]);

  // Build calendar days grid
  const calendarDays = useMemo(() => {
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      dateString: string;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = formatYMD(y, m, d);
      const isSelected = parsedSelected?.year === y && parsedSelected?.month === m && parsedSelected?.day === d;
      const isToday = today.year === y && today.month === m && today.day === d;
      const isDisabled = Boolean(
        (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
      );

      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateString: dateStr,
        isSelected: Boolean(isSelected),
        isToday,
        isDisabled
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = formatYMD(viewYear, viewMonth, d);
      const isSelected = parsedSelected?.year === viewYear && parsedSelected?.month === viewMonth && parsedSelected?.day === d;
      const isToday = today.year === viewYear && today.month === viewMonth && today.day === d;
      const isDisabled = Boolean(
        (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
      );

      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        dateString: dateStr,
        isSelected: Boolean(isSelected),
        isToday,
        isDisabled
      });
    }

    // Trailing days from next month to make 35 or 42 cells total (uniform 6-row grid)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = formatYMD(y, m, d);
      const isSelected = parsedSelected?.year === y && parsedSelected?.month === m && parsedSelected?.day === d;
      const isToday = today.year === y && today.month === m && today.day === d;
      const isDisabled = Boolean(
        (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
      );

      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        dateString: dateStr,
        isSelected: Boolean(isSelected),
        isToday,
        isDisabled
      });
    }

    return days;
  }, [viewYear, viewMonth, parsedSelected, today, minDate, maxDate]);

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleQuickToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const todayStr = formatYMD(today.year, today.month, today.day);
    setViewYear(today.year);
    setViewMonth(today.month);
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Input Trigger Button matching project tokens */}
      {customTrigger ? (
        customTrigger({ isOpen, displayDate, value, handleToggle, handleClear })
      ) : (
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={handleToggle}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border transition-all text-left cursor-pointer focus:outline-none ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          } ${
            isOpen
              ? "border-amber-400 ring-2 ring-amber-400/20 bg-white/95"
              : "border-[#DDD7C5] hover:border-amber-400/60 bg-white/90"
          }`}
        >
          <span
            className={`truncate ${
              displayDate
                ? "text-[#111111] font-semibold"
                : "text-[#888375]"
            }`}
          >
            {displayDate || placeholder}
          </span>

          <div className="flex items-center gap-1.5 shrink-0 text-[#888375]">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-0.5 rounded-full hover:text-[#111111] hover:bg-[#ECE8DD] transition-colors cursor-pointer"
                aria-label="Clear date"
              >
                <X size={14} />
              </span>
            )}
            <CalendarIcon
              size={16}
              className={`transition-colors ${
                isOpen
                  ? "text-amber-500"
                  : "text-[#888375]"
              }`}
            />
          </div>
        </button>
      )}

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          required
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Popover Calendar Dropdown - Portaled directly at exact position with in-place scale/fade animation */}
      {isOpen && mounted && coords && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999,
          }}
          className={`p-4 bg-[#ECE8DD] border border-[#DDD7C5] rounded-[24px] shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 text-[#111111] ${
            coords.isUp ? "origin-bottom" : "origin-top"
          }`}
        >
          {/* Calendar Header: Month + Year and Nav Controls */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#DDD7C5]">
            <div className="flex items-baseline gap-1.5 select-none">
              <span className="text-sm sm:text-base font-bold text-[#111111] tracking-tight">
                {MONTH_NAMES[viewMonth]}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[#777265]">
                {viewYear}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-1.5 rounded-full text-[#666155] hover:text-[#111111] hover:bg-[#DDD7C5] transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-1.5 rounded-full text-[#666155] hover:text-[#111111] hover:bg-[#DDD7C5] transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 mb-1.5 text-center">
            {WEEKDAY_NAMES.map((name) => (
              <div
                key={name}
                className="text-[11px] font-semibold text-[#888375] py-1 select-none"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((cell, idx) => {
              const isCellSelected = cell.isSelected;
              const isCellToday = cell.isToday;

              return (
                <button
                  key={`${cell.dateString}-${idx}`}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => handleSelectDate(cell.dateString)}
                  className={`h-8 w-8 sm:h-9 sm:w-9 mx-auto rounded-full flex items-center justify-center text-xs font-medium transition-all cursor-pointer ${
                    cell.isDisabled
                      ? "opacity-25 cursor-not-allowed text-[#999]"
                      : isCellSelected
                      ? "bg-amber-400 text-black font-extrabold shadow-sm scale-105"
                      : isCellToday
                      ? "border border-amber-500/60 text-amber-700 font-bold hover:bg-amber-400/20"
                      : cell.isCurrentMonth
                      ? "text-[#111111] hover:bg-[#DDD7C5] hover:text-black"
                      : "text-[#999487] opacity-60 hover:bg-[#DDD7C5]/50"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer: Today & Clear */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#DDD7C5] text-xs">
            <button
              type="button"
              onClick={handleQuickToday}
              className="font-bold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
            >
              Today
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="font-medium text-[#777265] hover:text-[#111111] transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
