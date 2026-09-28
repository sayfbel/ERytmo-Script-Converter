"use client";

import React, { useState, useEffect } from "react";
import { 
  Film, 
  Users, 
  FileSpreadsheet, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Zap
} from "lucide-react";

interface SlideData {
  badge: string;
  badgeIcon: React.ElementType;
  headline: string;
  highlight: string;
  description: string;
  featurePill: string;
  metricLabel: string;
  metricValue: string;
}

const SLIDES: SlideData[] = [
  {
    badge: "Dubbing Detection Suite",
    badgeIcon: Film,
    headline: "Organize your dubbing projects",
    highlight: "with precision & speed.",
    description: "Built specifically for adaptateurs and détecteurs de doublage. Parse dialogues, clean timecodes, and track deadlines seamlessly.",
    featurePill: "Automated Format A Conversion",
    metricLabel: "Time saved per episode",
    metricValue: "-75%",
  },
  {
    badge: "Instant Collaboration",
    badgeIcon: Users,
    headline: "Your team collaboration is",
    highlight: "fast and real-time.",
    description: "Exchange working scripts peer-to-peer with your fellow detectors. Instant online status, live transfers, and zero cloud leaks.",
    featurePill: "Direct P2P File Sharing",
    metricLabel: "Sync latency",
    metricValue: "< 1s",
  },
  {
    badge: "Studio Format Ready",
    badgeIcon: FileSpreadsheet,
    headline: "One-click export to Mosaic",
    highlight: "& ERytmo Word strips.",
    description: "Eliminate manual re-typing. Export directly to Mosaic Excel grids or ERytmo Word strips with strict OUT timecode filtering.",
    featurePill: "100% Studio Compliant",
    metricLabel: "Accuracy rate",
    metricValue: "99.9%",
  },
  {
    badge: "Smart Financials",
    badgeIcon: Clock,
    headline: "Track detector earnings",
    highlight: "& client company rates.",
    description: "Custom rate matrices for détection, conformation, and pose de texte. Automatically calculate your fees as you log working minutes.",
    featurePill: "Automated Rate Cards",
    metricLabel: "Accounting accuracy",
    metricValue: "100%",
  },
];

export default function AuthShowcasePanel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
        setFade(true);
      }, 250);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[currentSlide];
  const BadgeIcon = slide.badgeIcon;

  return (
    <div className="w-full md:w-1/2 min-h-[380px] md:min-h-full bg-gradient-to-br from-[#1e1b4b] via-[#1e293b] to-[#0f172a] text-white flex flex-col justify-between p-8 sm:p-10 md:p-12 relative overflow-hidden order-1 md:order-2">
      {/* Dynamic Background Glow Orbs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-blue-200 text-xs font-medium shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          <span>Dubbing Workspace 2.0</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          ERytmo Studio Cloud
        </span>
      </div>

      {/* Center Dynamic Content */}
      <div className="relative z-10 my-auto py-8">
        <div
          className={`transition-all duration-300 transform ${
            fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {/* Slide Category Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-blue-600/30 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-4">
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{slide.badge}</span>
          </div>

          {/* Headline */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            {slide.headline}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-300">
              {slide.highlight}
            </span>
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-300/90 mt-3 leading-relaxed max-w-md">
            {slide.description}
          </p>

          {/* Floating Metric & Pill Card */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center space-x-2.5 shadow-sm">
              <Zap className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-xs font-medium text-slate-100">{slide.featurePill}</span>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-blue-500/20 backdrop-blur-md border border-blue-400/30 flex items-center space-x-2">
              <span className="text-xs text-blue-200">{slide.metricLabel}:</span>
              <span className="text-xs font-extrabold text-blue-100">{slide.metricValue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls & Slider Indicators */}
      <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10">
        {/* Navigation Dots */}
        <div className="flex items-center space-x-2">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setFade(false);
                setTimeout(() => {
                  setCurrentSlide(idx);
                  setFade(true);
                }, 200);
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentSlide
                  ? "w-8 bg-blue-400"
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Feature summary counter */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Multi-tenant Isolation</span>
        </div>
      </div>
    </div>
  );
}
