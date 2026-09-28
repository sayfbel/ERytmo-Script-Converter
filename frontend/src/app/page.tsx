"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Download, Monitor, ArrowRight, CheckCircle2, 
  HardDrive, Wifi, Lock, FileText, ChevronRight,
  ExternalLink, Laptop
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/api";

export default function WelcomePage() {
  const { isAuthenticated } = useAuth();
  const [downloading, setDownloading] = useState(false);

  const desktopDownloadUrl = getApiUrl("/api/download/desktop");

  const handleDownloadClick = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 4000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4f9] via-[#f7fafc] to-[#eaf2f8] dark:from-[#0b1120] dark:via-[#0f172a] dark:to-[#080d1a] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white">
      
      {/* 1. Clay Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-white/50 dark:border-slate-800/60 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 p-1.5 shadow-[4px_4px_12px_rgba(20,184,166,0.35),-2px_-2px_8px_rgba(255,255,255,0.8)] flex items-center justify-center transform group-hover:scale-105 transition-all">
              <Image 
                src="/app_logo.png" 
                alt="ERytmo" 
                width={32} 
                height={32} 
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-slate-900 via-teal-800 to-teal-600 dark:from-white dark:via-teal-200 dark:to-teal-400 bg-clip-text text-transparent">
                ERytmo
              </span>
              <span className="hidden sm:inline-block ml-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                v2.0
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <a href="#desktop" className="px-3.5 py-2 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors">
              Desktop App
            </a>
            <a href="#p2p" className="px-3.5 py-2 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors">
              P2P Sync
            </a>
            <a href="#features" className="px-3.5 py-2 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors">
              Features
            </a>
            <a href="#compare" className="px-3.5 py-2 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors">
              Desktop vs Web
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse">
            <a 
              href={desktopDownloadUrl}
              onClick={handleDownloadClick}
              className="clay-button-primary px-3.5 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} className={downloading ? "animate-bounce" : ""} />
              <span className="hidden sm:inline">Download</span> Desktop
            </a>

            {isAuthenticated ? (
              <Link 
                href="/projects"
                className="clay-button-secondary px-3.5 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400"
              >
                <span>Workspace</span>
                <ChevronRight size={14} />
              </Link>
            ) : (
              <Link 
                href="/login"
                className="clay-button-secondary px-3.5 sm:px-4 py-2 text-xs font-bold flex items-center gap-1.5 hover:text-teal-600 dark:hover:text-teal-400"
              >
                <span>Sign In</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section in Claymorphism Style */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-8 overflow-hidden">
        {/* Soft Background Clay Glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-teal-300/30 via-sky-300/20 to-purple-300/30 dark:from-teal-900/20 dark:via-blue-900/10 dark:to-purple-900/20 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          
          {/* Pill Badge */}
          <div className="clay-badge inline-flex items-center gap-2 px-4 py-1.5 bg-white/90 dark:bg-slate-800/90 text-teal-700 dark:text-teal-300 text-xs font-extrabold mb-6 animate-float-slow">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>ERytmo Studio v2.0 • Dubbing Detection & Direct P2P Sync</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] max-w-4xl text-slate-900 dark:text-white">
            Professional Dubbing Detection <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 dark:from-teal-400 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent">
              With Direct PC-to-PC P2P Transfer
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Convert rhythmic scripts to <strong>Format A</strong> & <strong>Mosaic</strong>, manage studio projects, 
            and transfer heavy multi-gigabyte video files directly between remote workstations with <strong>zero cloud upload wait</strong>.
          </p>

          {/* Hero Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            {/* Primary Desktop Download CTA */}
            <a 
              href={desktopDownloadUrl}
              onClick={handleDownloadClick}
              className="clay-button-primary w-full sm:w-auto px-7 py-3.5 text-sm font-extrabold flex items-center justify-center gap-3 cursor-pointer group shadow-lg"
            >
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                <Laptop size={18} className="text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-wider font-bold opacity-90">Download For Windows</div>
                <div className="text-base font-black">ERytmo Desktop (64-bit)</div>
              </div>
              <Download size={18} className="ml-1 group-hover:translate-y-0.5 transition-transform" />
            </a>

            {/* Secondary Web Workspace CTA */}
            <Link 
              href={isAuthenticated ? "/projects" : "/login"}
              className="clay-button-secondary w-full sm:w-auto px-7 py-3.5 text-sm font-bold flex items-center justify-center gap-2.5 hover:text-teal-600 dark:hover:text-teal-400"
            >
              <Monitor size={18} />
              <span>{isAuthenticated ? "Go to Web Workspace" : "Open Web App"}</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* System Info Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-teal-500" /> Windows 10 / 11 Supported
            </span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-teal-500" /> Standalone Single Executable (~60MB)
            </span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={14} className="text-teal-500" /> Direct WebRTC Encrypted P2P
            </span>
          </div>

          {/* 3D Mockup Container in Clay Card */}
          <div className="mt-12 w-full max-w-4xl clay-card dark:clay-card-dark p-3 sm:p-5">
            <div className="rounded-2xl bg-slate-900 text-slate-100 overflow-hidden border border-slate-800 shadow-2xl">
              
              {/* Window Title Bar */}
              <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="ml-2 font-mono text-[11px] text-slate-400">ERytmo Desktop v2.0 — Local Workstation Engine</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  P2P Node Connected
                </div>
              </div>

              {/* Mockup Body: 3 Interactive Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 sm:p-6 text-left">
                
                {/* Column 1: Local Hard Drive Reading */}
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="clay-icon-bubble w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                        <HardDrive size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-900/50 text-teal-300">0ms Latency</span>
                    </div>
                    <h3 className="font-bold text-sm text-white mb-1">Local Drive Direct Access</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Reads videos and scripts straight from your hard drive (<code className="text-teal-300">E:\Projects\...</code>). Zero cloud upload limits.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/50 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Episode_101_Dub.mp4</span>
                    <span className="text-teal-400 font-semibold">1.84 GB</span>
                  </div>
                </div>

                {/* Column 2: Direct Peer-to-Peer Transfer */}
                <div className="bg-gradient-to-b from-teal-950/60 to-slate-800/80 rounded-xl p-4 border border-teal-500/40 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="clay-icon-bubble w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md">
                        <Wifi size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 flex items-center gap-1">
                        <Lock size={10} /> WebRTC P2P
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-teal-200 mb-1">PC-1 ↔ PC-2 Transfer</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Direct encrypted pipe between studio director and detector. Files stream from disk to disk at line speed.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-teal-800/50">
                    <div className="flex justify-between text-[11px] text-teal-300 font-semibold mb-1">
                      <span>Syncing with Detector...</span>
                      <span>87%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-teal-400 h-1.5 rounded-full w-[87%]" />
                    </div>
                  </div>
                </div>

                {/* Column 3: Format A / Mosaic Converter */}
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="clay-icon-bubble w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <FileText size={18} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900/50 text-purple-300">Format A</span>
                    </div>
                    <h3 className="font-bold text-sm text-white mb-1">Dubbing Script Parser</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Parses Word, PDF & SRT scripts. Calculates timing rhythms, actor detection, and exports to Mosaic & ERytmo.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700/50 text-[11px] font-mono text-purple-300 flex items-center justify-between">
                    <span>Export format:</span>
                    <span className="font-bold">ERytmo Factory .txt</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. Why Desktop App? Comparison Section */}
      <section id="compare" className="py-16 px-4 sm:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <span className="clay-badge px-3.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 uppercase tracking-wider">
            Architecture Breakdown
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3">
            Why Desktop App is Essential for Dubbing Studios
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
            Web browsers have security sandboxes that block direct access to your local Windows folders. 
            The Desktop App unlocks unlimited local speed and true PC-to-PC sync.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          
          {/* Desktop App Card (Highlighted) */}
          <div className="clay-card dark:clay-card-dark p-6 sm:p-8 flex flex-col justify-between border-2 border-teal-500/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-teal-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
              Recommended for Production
            </div>
            
            <div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-md">
                  <Laptop size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">ERytmo Desktop App</h3>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">Native Windows Powerhouse (v2.0)</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                Installed directly on your PC. Operates locally with full hardware access, instant 4K playback, and peer-to-peer data channels.
              </p>

              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-teal-500 shrink-0 mt-0.5" />
                  <span><strong>Direct Local Folder Access:</strong> Select any folder on your hard drive. Zero file uploads needed.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-teal-500 shrink-0 mt-0.5" />
                  <span><strong>Direct P2P File Transfer:</strong> Send gigabyte video files directly between 2 computers across the internet with consent confirmation.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-teal-500 shrink-0 mt-0.5" />
                  <span><strong>100% Studio Privacy:</strong> Confidential films and voice tracks never get uploaded to cloud servers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-teal-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Bandwidth Cloud Costs:</strong> Save thousands on server storage and hosting fees.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <a 
                href={desktopDownloadUrl}
                onClick={handleDownloadClick}
                className="clay-button-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Download size={16} />
                <span>Download Desktop Executable (.exe)</span>
              </a>
            </div>
          </div>

          {/* Web Workspace Card */}
          <div className="clay-card dark:clay-card-dark p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs">
                  <Monitor size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">ERytmo Web Workspace</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Cloud Dashboard & Coordination</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                Accessible from any browser worldwide. Perfect for tracking deadlines, managing clients, and coordinating studio staff.
              </p>

              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>Universal Access:</strong> Login from any browser, tablet, or laptop to view projects and deadlines.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>Collaborator Permissions:</strong> Manage Spectator vs Full Access roles for directors and voice actors.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>Studio Billing & Hours:</strong> Automatically compute earnings per dubbing minute and company rates.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-slate-400 shrink-0 mt-0.5" />
                  <span><strong>P2P Web Signaler:</strong> Acts as the lightweight matchmaker that pairs two desktop peers together.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Link 
                href={isAuthenticated ? "/projects" : "/login"}
                className="clay-button-secondary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 hover:text-teal-600 dark:hover:text-teal-400"
              >
                <span>{isAuthenticated ? "Open Workspace" : "Sign In to Web App"}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 4. P2P Technology Presentation */}
      <section id="p2p" className="py-16 px-4 sm:px-8 bg-white/60 dark:bg-slate-900/60 border-y border-slate-200/60 dark:border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="clay-badge px-3.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              Under The Hood
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3">
              How Peer-to-Peer Transfer Works Between 2 Remote PCs
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
              No cloud middleman. No slow upload-then-download bottlenecks. Just direct, encrypted peer transfer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="clay-card dark:clay-card-dark p-6 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl font-black mb-4 shadow-xs">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">PC 1 (Owner / Director)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The studio director opens ERytmo Desktop and links their local project folder containing raw dubbing video and script files.
              </p>
            </div>

            {/* Step 2 */}
            <div className="clay-card dark:clay-card-dark p-6 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl font-black mb-4 shadow-xs">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Secure Handshake (WebSockets)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The cloud server acts solely as a signaling matchmaker. Both PCs exchange WebRTC keys, and PC 1 receives a download consent prompt.
              </p>
            </div>

            {/* Step 3 */}
            <div className="clay-card dark:clay-card-dark p-6 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-black mb-4 shadow-xs">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">Direct P2P Data Channel</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Upon approval, files stream in encrypted chunks directly from PC 1&apos;s disk to PC 2&apos;s disk at the maximum speed of their home or studio connections.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Download Center Section */}
      <section id="desktop" className="py-20 px-4 sm:px-8 max-w-5xl mx-auto w-full">
        <div className="clay-card dark:clay-card-dark p-8 sm:p-12 text-center relative overflow-hidden bg-gradient-to-br from-white via-teal-50/30 to-white dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900">
          
          <div className="max-w-2xl mx-auto">
            <div className="clay-icon-bubble w-16 h-16 rounded-3xl bg-teal-500 text-white flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Download size={32} />
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
              Get ERytmo Desktop v2.0
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              Standalone executable for Windows. No complex dependencies, no database setup required on your machine. 
              Double-click and start converting scripts and syncing projects immediately.
            </p>

            {/* Big Download Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href={desktopDownloadUrl}
                onClick={handleDownloadClick}
                className="clay-button-primary w-full sm:w-auto px-8 py-4 text-base font-extrabold flex items-center justify-center gap-3 cursor-pointer shadow-xl transform hover:scale-105"
              >
                <Download size={22} className={downloading ? "animate-bounce" : ""} />
                <span>Download ERytmo_V2.exe</span>
                <span className="px-2 py-0.5 text-xs bg-white/20 rounded-md font-mono">60 MB</span>
              </a>

              <a 
                href="https://github.com/sayfbel/ERytmo-Script-Converter"
                target="_blank"
                rel="noreferrer"
                className="clay-button-secondary w-full sm:w-auto px-6 py-4 text-sm font-bold flex items-center justify-center gap-2 hover:text-teal-600 dark:hover:text-teal-400"
              >
                <ExternalLink size={16} />
                <span>GitHub Repository</span>
              </a>
            </div>

            {/* Download Details */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left pt-6 border-t border-slate-200 dark:border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Platform</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Windows 10 / 11</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Architecture</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">x64 (64-bit)</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Package</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Portable .exe</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Signaling</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">Render Cloud Live</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-8 px-4 sm:px-8 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">ERytmo Studio Platform</span>
            <span>•</span>
            <span>All rights reserved &copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center space-x-4 rtl:space-x-reverse font-medium">
            <Link href="/login" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Web Workspace
            </Link>
            <Link href="/register" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
              Create Account
            </Link>
            <a href={desktopDownloadUrl} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-bold text-teal-600 dark:text-teal-400">
              Download Desktop .exe
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
