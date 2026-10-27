"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, Check } from "lucide-react";

interface TimeRangePickerProps {
  startTime: string; // "08:30"
  endTime: string;   // "09:30"
  onChange: (newStartTime: string, newEndTime: string) => void;
  label?: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export default function TimeRangePicker({
  startTime,
  endTime,
  onChange,
  label = "Horaires (Début – Fin)",
  className = "",
}: TimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"start" | "end">("start");
  const [openUpwards, setOpenUpwards] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);
  const selectedHourRef = useRef<HTMLButtonElement>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement>(null);

  // Parse current active hours & minutes
  const activeTimeStr = activeTab === "start" ? startTime : endTime;
  const [currentHour, currentMinute] = useMemo(() => {
    const parts = (activeTimeStr || "08:00").split(":");
    return [parts[0] || "08", parts[1] || "00"];
  }, [activeTimeStr]);

  // Calculate duration string e.g. "1h 00m"
  const durationStr = useMemo(() => {
    try {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMinutes < 0) diffMinutes += 24 * 60;
      const h = Math.floor(diffMinutes / 60);
      const m = diffMinutes % 60;
      if (h === 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${String(m).padStart(2, "0")}m`;
    } catch {
      return "";
    }
  }, [startTime, endTime]);

  // Auto-detect if dropdown should open upwards
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = 350;
      if (spaceBelow < estimatedHeight && rect.top > estimatedHeight) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  // Click outside to close
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

  // Smooth scroll selected items into center of column when opened or tab changed
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (selectedHourRef.current) {
          selectedHourRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
        }
        if (selectedMinuteRef.current) {
          selectedMinuteRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }, 50);
    }
  }, [isOpen, activeTab]);

  const handleHourSelect = (newH: string) => {
    if (activeTab === "start") {
      onChange(`${newH}:${currentMinute}`, endTime);
    } else {
      onChange(startTime, `${newH}:${currentMinute}`);
    }
  };

  const handleMinuteSelect = (newM: string) => {
    if (activeTab === "start") {
      onChange(`${currentHour}:${newM}`, endTime);
    } else {
      onChange(startTime, `${currentHour}:${newM}`);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-stone-700 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button - Unified Pill with Start & End Time */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#F7F4EB] border rounded-full px-4 py-2.5 flex items-center justify-between shadow-xs transition-all cursor-pointer focus:outline-none ${
          isOpen ? "border-[#111111] ring-2 ring-[#111111]/10" : "border-[#DDD7C5] hover:border-[#111111]"
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#111111]">
          <span className="px-2.5 py-0.5 rounded-full bg-[#ECE8DD] border border-[#DDD7C5]">
            {startTime}
          </span>
          <span className="text-stone-400 font-extrabold">—</span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#ECE8DD] border border-[#DDD7C5]">
            {endTime}
          </span>
          {durationStr && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-400/20 px-2 py-0.5 rounded-full">
              {durationStr}
            </span>
          )}
        </div>

        <Clock
          size={16}
          className={`shrink-0 transition-colors ${isOpen ? "text-amber-500" : "text-[#888375]"}`}
        />
      </button>

      {/* 2-Column Time Selector Dropdown (Hours | Minutes) */}
      {isOpen && (
        <div
          className={`absolute ${
            openUpwards ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 z-[99999] w-64 bg-[#ECE8DD] border border-[#DDD7C5] rounded-[24px] shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150 text-[#111111]`}
        >
          {/* Top Switcher: Début vs Fin */}
          <div className="flex items-center gap-1.5 p-1 bg-[#DDD7C5]/50 rounded-full mb-3">
            <button
              type="button"
              onClick={() => setActiveTab("start")}
              className={`flex-1 py-1.5 px-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center ${
                activeTab === "start"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-stone-600 hover:text-black"
              }`}
            >
              Début: {startTime}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("end")}
              className={`flex-1 py-1.5 px-2 rounded-full text-xs font-bold transition-all cursor-pointer text-center ${
                activeTab === "end"
                  ? "bg-[#111111] text-white shadow-xs"
                  : "text-stone-600 hover:text-black"
              }`}
            >
              Fin: {endTime}
            </button>
          </div>

          {/* 2-Column Time Grid (Hours | Minutes) */}
          <div className="flex items-center justify-center gap-3 border-t border-b border-[#DDD7C5] py-2 bg-[#F7F4EB]/70 rounded-2xl">
            {/* Left Column: Hours */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider mb-1.5">
                Heure
              </span>
              <div
                ref={hourScrollRef}
                className="h-48 w-full overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center gap-1 py-1"
              >
                {HOURS.map((h) => {
                  const isSelected = h === currentHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      ref={isSelected ? selectedHourRef : undefined}
                      onClick={() => handleHourSelect(h)}
                      className={`w-10 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-[#111111] text-white shadow-sm scale-105"
                          : "text-[#111111] hover:bg-[#DDD7C5] hover:text-black font-semibold"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle Vertical Divider Line */}
            <div className="w-px h-48 bg-[#DDD7C5] shrink-0" />

            {/* Right Column: Minutes */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider mb-1.5">
                Minute
              </span>
              <div
                ref={minuteScrollRef}
                className="h-48 w-full overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center gap-1 py-1"
              >
                {MINUTES.map((m) => {
                  const isSelected = m === currentMinute;
                  return (
                    <button
                      key={m}
                      type="button"
                      ref={isSelected ? selectedMinuteRef : undefined}
                      onClick={() => handleMinuteSelect(m)}
                      className={`w-10 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-[#111111] text-white shadow-sm scale-105"
                          : "text-[#111111] hover:bg-[#DDD7C5] hover:text-black font-semibold"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Quick Action: Duration & Validate */}
          <div className="flex items-center justify-between pt-3 text-xs">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-600">
              <span>Durée:</span>
              <span className="text-amber-700 font-extrabold">{durationStr}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 bg-[#111111] hover:bg-black text-white font-bold text-xs rounded-full shadow-xs cursor-pointer transition-transform active:scale-95"
            >
              Valider
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
