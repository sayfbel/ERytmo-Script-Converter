"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DateRangeSelectProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  id?: string;
}

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const WEEKDAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function parseDateStr(str: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d };
}

function formatDateStr(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

const SHORT_MONTH_NAMES = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
];

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const parsed = parseDateStr(dateStr);
  if (!parsed) return dateStr;
  const shortMonth = SHORT_MONTH_NAMES[parsed.month] || "";
  return `${parsed.day} ${shortMonth}`;
}

export default function DateRangeSelect({
  startDate,
  endDate,
  onChange,
  label,
  placeholder = "Période (Début → Fin)",
  className = "",
  id,
}: DateRangeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [selectingStep, setSelectingStep] = useState<"start" | "end">("start");

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    isUp: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate()
    };
  }, []);

  const parsedStart = useMemo(() => parseDateStr(startDate), [startDate]);

  const [viewYear, setViewYear] = useState<number>(() => parsedStart?.year ?? today.year);
  const [viewMonth, setViewMonth] = useState<number>(() => parsedStart?.month ?? today.month);

  useEffect(() => {
    if (parsedStart) {
      setViewYear(parsedStart.year);
      setViewMonth(parsedStart.month);
    }
  }, [parsedStart]);

  // Position calculation
  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const calendarWidth = Math.min(320, window.innerWidth - 32);
    const calendarHeight = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = 0;
    let isUp = false;
    if (spaceBelow < calendarHeight + 10 && spaceAbove > spaceBelow) {
      top = rect.top - calendarHeight - 8;
      isUp = true;
    } else {
      top = rect.bottom + 8;
      isUp = false;
    }

    let left = rect.left;
    if (left + calendarWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - calendarWidth - 16);
    }

    return { top, left, width: calendarWidth, isUp };
  }, []);

  const handleOpen = () => {
    const newCoords = calculatePosition();
    if (newCoords) setCoords(newCoords);
    setIsOpen(true);
    // Reset selecting step
    if (startDate && !endDate) {
      setSelectingStep("end");
    } else {
      setSelectingStep("start");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setHoverDate(null);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      handleClose();
    };

    const handleScrollOrResize = () => {
      const updated = calculatePosition();
      if (updated) setCoords(updated);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, calculatePosition]);

  // Calendar math
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    // 0 = Sun, 1 = Mon ... We want Monday as 0
    const day = new Date(viewYear, viewMonth, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [viewYear, viewMonth]);

  const daysInPrevMonth = useMemo(() => {
    return new Date(viewYear, viewMonth, 0).getDate();
  }, [viewYear, viewMonth]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Date click handling
  const handleDayClick = (day: number) => {
    const clickedStr = formatDateStr(viewYear, viewMonth, day);

    if (selectingStep === "start" || !startDate || (startDate && endDate)) {
      // User is picking the start date
      onChange(clickedStr, "");
      setSelectingStep("end");
    } else {
      // User is picking the end date
      if (clickedStr < startDate) {
        // Clicked before start date -> make it the new start date
        onChange(clickedStr, "");
        setSelectingStep("end");
      } else {
        // Complete the range
        onChange(startDate, clickedStr);
        setSelectingStep("start");
        setTimeout(() => handleClose(), 200);
      }
    }
  };

  // Clear range
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
    setSelectingStep("start");
  };

  // Determine state of a date for range rendering
  const getDateStatus = (day: number) => {
    const currentStr = formatDateStr(viewYear, viewMonth, day);
    const isStart = currentStr === startDate;
    const isEnd = currentStr === endDate;

    const effectiveEnd = endDate || (selectingStep === "end" && hoverDate && hoverDate >= startDate ? hoverDate : null);

    const isInRange = Boolean(
      startDate &&
      effectiveEnd &&
      currentStr > startDate &&
      currentStr < effectiveEnd
    );

    const isToday =
      today.year === viewYear &&
      today.month === viewMonth &&
      today.day === day;

    return { isStart, isEnd, isInRange, isToday, currentStr };
  };

  // Display text in trigger
  const displayValue = useMemo(() => {
    if (startDate && endDate) {
      return `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`;
    }
    if (startDate) {
      return `${formatDisplayDate(startDate)} → Fin...`;
    }
    return "";
  }, [startDate, endDate]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-medium text-slate-500 dark:text-[#a1a1aa] mb-1"
        >
          {label}
        </label>
      )}

      {/* Trigger Field */}
      <button
        type="button"
        id={id}
        onClick={handleOpen}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all text-left cursor-pointer ${
          isOpen
            ? "border-amber-400 ring-2 ring-amber-400/20 bg-white/95"
            : "border-[#DDD7C5] bg-white/90 hover:border-amber-400/60"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon size={14} className="text-amber-500 shrink-0" />
          <span className={displayValue ? "text-[#111111] font-medium truncate" : "text-[#888375] truncate"}>
            {displayValue || placeholder}
          </span>
        </div>

        {startDate && (
          <div
            onClick={handleClear}
            className="p-1 rounded-full text-[#888375] hover:text-[#111111] hover:bg-[#ECE8DD] transition-colors cursor-pointer"
            title="Effacer"
          >
            <X size={12} />
          </div>
        )}
      </button>

      {/* Portal Calendar Popover */}
      {mounted && isOpen && coords && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999,
          }}
          className="rounded-[24px] p-4 bg-[#ECE8DD] border border-[#DDD7C5] shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none text-[#111111]"
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#DDD7C5]">
            <span className="text-xs font-bold text-[#111111]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-full text-[#666155] hover:text-[#111111] hover:bg-[#DDD7C5] transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-full text-[#666155] hover:text-[#111111] hover:bg-[#DDD7C5] transition-colors cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 mb-1 text-center">
            {WEEKDAY_NAMES.map((name, i) => (
              <span key={i} className="text-[10px] font-semibold text-[#888375] py-1">
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Prev month fill */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`prev-${i}`}
                className="h-8 flex items-center justify-center text-[11px] text-[#BBB5A5]"
              >
                {daysInPrevMonth - firstDayOfWeek + i + 1}
              </div>
            ))}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const { isStart, isEnd, isInRange, isToday, currentStr } = getDateStatus(day);
              const dayOfWeek = (firstDayOfWeek + i) % 7;
              const isRowStart = dayOfWeek === 0;
              const isRowEnd = dayOfWeek === 6;

              const effectiveEnd = endDate || (selectingStep === "end" && hoverDate && hoverDate >= startDate ? hoverDate : null);
              const hasActiveRange = Boolean(startDate && effectiveEnd && effectiveEnd > startDate);

              return (
                <div
                  key={`day-${day}`}
                  className="relative h-8 flex items-center justify-center text-xs font-medium cursor-pointer"
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => setHoverDate(currentStr)}
                >
                  {/* Range Ribbon Background Layer */}
                  {hasActiveRange && (
                    <>
                      {/* If start date: ribbon extends from center to right edge */}
                      {isStart && !isRowEnd && (
                        <div className="absolute top-0 bottom-0 left-1/2 right-0 bg-amber-400/30 pointer-events-none" />
                      )}

                      {/* If end date: ribbon extends from left edge to center */}
                      {isEnd && !isRowStart && (
                        <div className="absolute top-0 bottom-0 left-0 right-1/2 bg-amber-400/30 pointer-events-none" />
                      )}

                      {/* If inside range: ribbon covers entire width */}
                      {isInRange && (
                        <div
                          className={`absolute top-0 bottom-0 left-0 right-0 bg-amber-400/30 pointer-events-none ${
                            isRowStart ? "rounded-l-full" : ""
                          } ${isRowEnd ? "rounded-r-full" : ""}`}
                        />
                      )}
                    </>
                  )}

                  {/* Day Number Circle */}
                  <span
                    className={`relative z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                      isStart || isEnd
                        ? "bg-amber-400 text-black font-extrabold shadow-sm scale-105"
                        : isInRange
                        ? "text-black font-semibold"
                        : isToday
                        ? "border border-amber-500/60 text-amber-700 font-bold hover:bg-amber-400/20"
                        : "text-[#111111] hover:bg-[#DDD7C5]"
                    }`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer Helper Text */}
          <div className="mt-2.5 pt-2 border-t border-[#DDD7C5] flex items-center justify-between text-[10px] text-[#777265]">
            <span>
              {selectingStep === "start" ? "Cliquez pour la date de début" : "Cliquez pour la date de fin"}
            </span>
            {startDate && endDate && (
              <span className="text-amber-600 font-semibold">
                Période définie
              </span>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
