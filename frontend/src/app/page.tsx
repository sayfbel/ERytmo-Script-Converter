"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, X, Monitor, Globe, Download, 
  ShieldCheck, Zap, FolderSync, Share2, Layers, Lock, 
  CheckCircle2, ChevronRight, Sparkles, Clock, Check,
  Building, Video, FileText, Briefcase, HardDrive, WifiOff, Cpu
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FloatingNav from "@/components/FloatingNav";
import { DubFlowIcon } from "@/components/DubFlowLogo";

export default function WelcomePage() {
  const { isAuthenticated } = useAuth();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"convert" | "p2p" | "rates">("convert");

  // Ensure scroll is strictly at y=0 on page mount or navigation from login/register
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.location.hash || window.location.hash === "#home") {
        if (window.location.hash) {
          history.replaceState(null, "", window.location.pathname);
        }
        window.scrollTo(0, 0);
        const scrollParent = document.querySelector(".overflow-y-auto") as HTMLElement | null;
        if (scrollParent) scrollParent.scrollTop = 0;
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#070707] text-[#f4efe6] selection:bg-amber-400 selection:text-black font-sans-display p-2.5 sm:p-4 md:p-5">
      
      {/* REUSABLE SMART FLOATING NAVBAR COMPONENT */}
      <FloatingNav />

      {/* 1. CINEMATIC FRAMED HERO WITH FULL IMAGE BACKGROUND */}
      <section id="hero" className="relative w-full h-[calc(100vh-2rem)] min-h-[660px] rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col justify-between transition-all duration-500">
        
        {/* Full-Frame Background Image */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Image
            src="/hero_cinematic.jpg"
            alt="ERytmo Studio - Cinematic Post-Production & Sound Design Canvas"
            fill
            priority
            className="object-cover object-center"
          />
          {/* Cinematic dark vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
        </div>

        {/* Bottom Hero Overlay: Sitting directly on the bottom border like the reference screenshot */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-6 sm:px-10 md:px-14 pb-4 sm:pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-10">
          
          {/* Big Brand Display Typography (Helious style -> DubFlow* resting on the bottom) */}
          <div className="flex items-baseline -mb-2 sm:-mb-3">
            <h1 className="text-7xl sm:text-9xl md:text-[135px] lg:text-[160px] font-black tracking-[-0.05em] leading-[0.76] text-[#f4efe6] select-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              DubFlow
            </h1>
            <span className="text-amber-400 font-editorial text-7xl sm:text-9xl md:text-[135px] lg:text-[160px] font-normal leading-[0.76] ml-1 select-none drop-shadow-[0_10px_20px_rgba(245,158,11,0.4)]">
              *
            </span>
          </div>

          {/* Bottom Right: Description Paragraph stacked directly over single Get started button */}
          <div className="max-w-xs sm:max-w-md lg:max-w-lg flex flex-col items-start space-y-4 pb-1">
            <div className="space-y-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              <p className="text-xs sm:text-[13px] text-[#f4efe6] font-semibold leading-snug">
                L&apos;écosystème nouvelle génération pour la post-synchronisation et l&apos;adaptation de scripts.
              </p>
              <p className="text-[11px] sm:text-xs text-[#c2bcaf] leading-relaxed font-normal">
                Convertissez instantanément vos bandes rythmo multi-formats, gérez vos productions et collaborez en toute sécurité grâce à une architecture locale à zéro stockage cloud.
              </p>
            </div>

            <div>
              <Link
                href={isAuthenticated ? "/projects" : "/login"}
                className="group inline-flex items-center gap-3 px-6 py-2.5 sm:py-3 rounded-full bg-[#f4efe6] hover:bg-white text-black text-xs font-black tracking-wide transition-all shadow-[0_10px_35px_rgba(244,239,230,0.25)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Get started</span>
                <span className="w-5 h-5 rounded-full bg-black/15 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight size={12} className="text-black" />
                </span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 2. ABOUT US & STUDIO ECOSYSTEM */}
      <section id="about" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-6">
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-amber-400 select-none">
            DubFlow Studio • Notre Vision &amp; Écosystème
          </p>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#f4efe6] leading-[1.08]">
            L&apos;artisanat du doublage sublimé par la technologie.
          </h2>

          <p className="font-editorial text-2xl sm:text-4xl md:text-5xl text-amber-200/90 italic font-normal tracking-wide leading-tight pt-1">
            Conçu au cœur des régies par et pour les adaptateurs.
          </p>
          
          <p className="text-xs sm:text-sm text-[#9f988b] max-w-xl mx-auto leading-relaxed pt-2">
            Né d&apos;une passion commune pour le cinéma et la synchronisation de haute précision, DubFlow rassemble adaptateurs, directeurs artistiques et ingénieurs du son pour libérer les studios des contraintes archaïques avec une fluidité totale.
          </p>
        </div>

        {/* 3D Fanned-Out Cards Showcase with Horizontal Light Streaks */}
        <div className="relative py-10 sm:py-16 overflow-hidden">
          
          {/* Horizontal Speed Light Streaks */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-24 bg-gradient-to-r from-transparent via-amber-500/15 to-transparent blur-3xl" />
            <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent blur-[2px]" />
            <div className="absolute top-[44%] left-[6%] w-72 h-[3px] bg-amber-400/50 rounded-full blur-[1px]" />
            <div className="absolute top-[56%] right-[8%] w-80 h-[3px] bg-amber-300/45 rounded-full blur-[1px]" />
            <div className="absolute w-[500px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full" />
          </div>

          {/* Fanned-Out Cards Array (No borders, 5 unique images, fixed/static with no hover movement) */}
          <div className="relative z-10 flex items-center justify-center -space-x-8 sm:-space-x-12 md:-space-x-10 lg:-space-x-8 xl:-space-x-6 px-4 overflow-x-auto lg:overflow-visible py-8 no-scrollbar">

            {/* Card 1: Far Left - Unique Image 4 (Film Reels & Audio Ribbon) */}
            <div className="hidden lg:block relative shrink-0 w-[210px] xl:w-[230px] rounded-[26px] overflow-hidden transform -rotate-12 scale-90 opacity-40 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none">
              <Image
                src="/card_4.webp"
                alt="DubFlow Studio Pass - Alexandre Dubois"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </div>

            {/* Card 2: Center-Left - Unique Image 1 (Sound Designer on Cliff) */}
            <div className="relative shrink-0 w-[230px] sm:w-[250px] md:w-[265px] lg:w-[280px] rounded-[26px] sm:rounded-[28px] overflow-hidden transform -rotate-6 translate-y-3 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none">
              <Image
                src="/card_1.webp"
                alt="DubFlow Studio Pass - Margaret O. Guidry"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </div>

            {/* Card 3: Center Featured - Unique Image 2 (Sound Engineer Mixing) */}
            <div className="relative shrink-0 w-[245px] sm:w-[270px] md:w-[285px] lg:w-[305px] rounded-[28px] sm:rounded-[30px] overflow-hidden transform scale-105 sm:scale-110 z-20 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_10px_40px_rgba(245,158,11,0.2)] select-none">
              <Image
                src="/card_2.webp"
                alt="DubFlow Studio Pass - Robert M. McCray"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </div>

            {/* Card 4: Center-Right - Unique Image 5 (Console & Studio Mic) */}
            <div className="relative shrink-0 w-[230px] sm:w-[250px] md:w-[265px] lg:w-[280px] rounded-[26px] sm:rounded-[28px] overflow-hidden transform rotate-6 translate-y-3 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none">
              <Image
                src="/card_5.webp"
                alt="DubFlow Studio Pass - Clara Vanderbilt"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </div>

            {/* Card 5: Far Right - Unique Image 3 (Editor in Cabin Studio) */}
            <div className="hidden lg:block relative shrink-0 w-[210px] xl:w-[230px] rounded-[26px] overflow-hidden transform rotate-12 scale-90 opacity-40 shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none">
              <Image
                src="/card_3.webp"
                alt="DubFlow Studio Pass - Janice W. Seymour"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </div>

          </div>
        </div>
      </section>

      {/* 3. DUBFLOW WEB APP PRESENTATION */}
      <section id="web" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-16">
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-amber-400 select-none">
            DubFlow Web • Hub Studio Accessible Partout
          </p>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#f4efe6] leading-[1.1]">
            L&apos;agilité du Cloud sans stockage de vidéos.
          </h2>

          <p className="font-editorial text-3xl sm:text-4xl md:text-5xl text-amber-200/90 italic font-normal tracking-wide leading-tight pt-1">
            Streaming P2P direct, gestion d&apos;équipes et pilotage en temps réel.
          </p>
          
          <p className="text-xs sm:text-sm text-[#9f988b] max-w-2xl mx-auto leading-relaxed pt-2">
            Accédez à l&apos;ensemble de vos outils depuis n&apos;importe quel navigateur web. Gérez vos sociétés clientes, vos grilles de tarifs et vos équipes avec une fluidité exceptionnelle.
          </p>
        </div>

        {/* Web App Showcase Feature Banner */}
        <div className="bg-gradient-to-b from-[#141417] to-[#0c0c0e] rounded-[32px] sm:rounded-[40px] border border-white/10 p-6 sm:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.85)] relative overflow-hidden mb-10">
          
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />
          
          {/* Simulated Browser Address Bar */}
          <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/10">
            <div className="flex items-center gap-3 w-full max-w-md">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-3 h-3 rounded-full bg-white/20" />
                <span className="w-3 h-3 rounded-full bg-white/20" />
                <span className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3.5 py-1 rounded-full text-xs font-mono text-white/70 w-full truncate">
                <DubFlowIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <Lock size={12} className="text-emerald-400 shrink-0" />
                <span className="truncate">https://app.dubflow.studio/projects</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>WebRTC P2P Direct Mesh Active</span>
            </div>
          </div>

          {/* Interactive Web Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Interactive User Dashboard Simulation & Explanatory Arrows */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Simulated User Dashboard */}
              <div className="bg-[#0c0c0f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden font-sans">
                
                {/* Dashboard Top Header Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#141418] border-b border-white/5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <DubFlowIcon className="w-4 h-4 text-amber-400" />
                      <span className="font-extrabold text-white text-xs tracking-tight">DubFlow Hub</span>
                    </div>
                    <span className="text-white/20">|</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-[#c9c3b7]">
                      <Building size={11} className="text-amber-400" />
                      <span>Cinétélé Studios • Régie A</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>P2P Mesh Actif (3 Pairs)</span>
                    </span>
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-black font-black flex items-center justify-center text-[9px]">
                      S
                    </div>
                  </div>
                </div>

                {/* Dashboard Inner Body */}
                <div className="grid grid-cols-12 min-h-[250px] text-xs">
                  
                  {/* Mini Left Sidebar */}
                  <div className="col-span-4 border-r border-white/5 bg-[#09090b] p-2 space-y-1 hidden sm:block">
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-400/10 text-amber-300 font-semibold flex items-center gap-2 text-[10px]">
                      <Briefcase size={12} className="text-amber-400 shrink-0" />
                      <span className="truncate">Projets Studio (4)</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg text-white/50 hover:text-white flex items-center gap-2 text-[10px] transition-colors">
                      <Zap size={12} className="shrink-0" />
                      <span className="truncate">Convertisseur</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg text-white/50 hover:text-white flex items-center gap-2 text-[10px] transition-colors">
                      <Share2 size={12} className="shrink-0" />
                      <span className="truncate">Streaming P2P</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg text-white/50 hover:text-white flex items-center gap-2 text-[10px] transition-colors">
                      <Clock size={12} className="shrink-0" />
                      <span className="truncate">Temps &amp; Gains</span>
                    </div>
                  </div>

                  {/* Main Project Dashboard Area */}
                  <div className="col-span-12 sm:col-span-8 p-3.5 space-y-2.5 bg-[#0c0c0f]">
                    
                    {/* Active Project Title */}
                    <div className="flex items-start justify-between border-b border-white/5 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-white text-xs sm:text-sm tracking-tight">House of the Dragon • S02E04 (VF)</h4>
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold">
                            En cours
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8e887d] mt-0.5">
                          Client : <span className="text-white font-medium">Cinétélé</span> • Cible : <span className="text-amber-300 font-mono">Mosaic (.xlsx)</span>
                        </p>
                      </div>
                    </div>

                    {/* Dashboard Tool 1: Video Stream with Pointer Tag */}
                    <div className="p-2 rounded-xl bg-black/40 border border-amber-500/20 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                          <Video size={11} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">HotD_S02E04_Master_4K.mov</p>
                          <p className="text-[9px] text-white/40 font-mono">18.4 Go • Rushes plateau</p>
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-mono text-[9px] font-bold">
                        ↗ 1. P2P Mesh (38ms)
                      </span>
                    </div>

                    {/* Dashboard Tool 2: Rythmo Script with Pointer Tag */}
                    <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-white/70 shrink-0">
                          <FileText size={11} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">HotD_S02E04_Dialogues_VF.docx</p>
                          <p className="text-[9px] text-white/40 font-mono">1 420 répliques détectées</p>
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-bold">
                        ↗ 2. Converti 0.4s
                      </span>
                    </div>

                    {/* Dashboard Tool 3: Gains & Chrono */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5 font-mono text-[10px]">
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                        <p className="text-[8px] uppercase text-[#8e887d]">Chrono Session</p>
                        <p className="text-white font-bold text-xs">03h 45m 12s</p>
                        <p className="text-[8px] text-emerald-400">Taux : 55 €/h</p>
                      </div>
                      <div className="p-2 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-0.5">
                        <div className="flex justify-between items-center">
                          <p className="text-[8px] uppercase text-amber-300">Gains Projet</p>
                          <span className="text-[8px] text-amber-400 font-bold">↗ 3. Grille</span>
                        </div>
                        <p className="text-amber-400 font-bold text-xs">1 248,00 €</p>
                        <p className="text-[8px] text-amber-200/70">Calcul automatique</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Explanatory Arrows & Tools Cards (Answering user request directly) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                
                {/* Arrow 1: P2P Streaming */}
                <div className="p-3 rounded-2xl bg-[#0e0e11] border border-amber-500/30 space-y-1 shadow-sm">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                    <span className="text-xs">↗</span>
                    <span>1. Streaming P2P Direct</span>
                  </div>
                  <p className="text-[10px] text-[#a09a8e] leading-snug">
                    <strong className="text-white">Flèche vidéo 4K :</strong> 0 Ko sur AWS. La vidéo de 18 Go est projetée en direct de PC à PC avec une latence &lt; 40ms.
                  </p>
                </div>

                {/* Arrow 2: Rythmo Script Conversion */}
                <div className="p-3 rounded-2xl bg-[#0e0e11] border border-white/10 space-y-1 shadow-sm">
                  <div className="flex items-center gap-1.5 text-white font-bold text-[11px]">
                    <span className="text-xs text-amber-400">↗</span>
                    <span>2. Moteur Rythmo IA</span>
                  </div>
                  <p className="text-[10px] text-[#a09a8e] leading-snug">
                    <strong className="text-white">Flèche script .docx :</strong> conversion instantanée vers Mosaic Excel (.xlsx) et Word avec détection auto des répliques.
                  </p>
                </div>

                {/* Arrow 3: Gains & Rates Calculator */}
                <div className="p-3 rounded-2xl bg-[#0e0e11] border border-emerald-500/30 space-y-1 shadow-sm">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                    <span className="text-xs">↗</span>
                    <span>3. Calculateur de Gains</span>
                  </div>
                  <p className="text-[10px] text-[#a09a8e] leading-snug">
                    <strong className="text-white">Flèche rémunération :</strong> chronométrage en temps réel avec application automatique des barèmes clients.
                  </p>
                </div>

              </div>

            </div>

            {/* Right Column: Web App CTAs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  La liberté du Web pour toute votre équipe.
                </h3>
                <p className="text-xs sm:text-sm text-[#b0a99c] leading-relaxed">
                  Pas besoin d&apos;installer de logiciel sur chaque poste secondaire. Ouvrez la Web App sur n&apos;importe quel ordinateur, glissez-déposez un script pour le convertir instantanément ou suivez l&apos;avancement de vos projets en direct.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href="/converter"
                  className="group flex items-center justify-between w-full p-4 rounded-2xl bg-[#f4efe6] hover:bg-white text-black transition-all shadow-[0_10px_35px_rgba(244,239,230,0.2)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center shrink-0">
                      <Zap size={20} className="text-black" />
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-sm tracking-tight leading-tight">Lancer la Web App en Ligne</p>
                      <p className="text-[11px] font-semibold text-black/70">Accès direct au convertisseur &amp; dashboard</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-black/60 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="flex items-center justify-between text-[11px] text-[#8e887d] px-2">
                  <span>Zéro installation • Connexion sécurisée</span>
                  <Link href="/register" className="text-amber-400 hover:underline font-semibold">
                    Créer un compte studio →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 3 Pillars Grid for Web */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-amber-400/30 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Share2 size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Streaming Vidéo P2P WebRTC</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Partagez la vidéo de régie en streaming direct chiffré vers l&apos;écran de votre adaptateur sans jamais uploader les 20 Go sur un serveur tiers. Latence ultra-faible garantie.
            </p>
          </div>

          <div className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-amber-400/30 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Clock size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Grilles Tarifaires &amp; Calcul des Gains</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Chaque client dispose de sa propre grille : détection, conformation, pose de texte et chantant. Le chronomètre calcule automatiquement le montant exact à facturer.
            </p>
          </div>

          <div className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-amber-400/30 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Sparkles size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Clés IA Personnelles &amp; Sécurisées</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Branchez vos propres clés Gemini, OpenAI ou Groq dans votre coffre-fort sécurisé pour bénéficier de l&apos;alignement automatique des timecodes sans frais d&apos;abonnement cachés.
            </p>
          </div>

        </div>
      </section>

      {/* 4. DUBFLOW DESKTOP WORKSTATION PRESENTATION */}
      <section id="desktop" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-16">
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-amber-400 select-none">
            DubFlow Desktop • Station de Travail Native
          </p>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#f4efe6] leading-[1.1]">
            La puissance brute du Natif sur votre machine de régie.
          </h2>

          <p className="font-editorial text-3xl sm:text-4xl md:text-5xl text-amber-200/90 italic font-normal tracking-wide leading-tight pt-1">
            Zéro upload cloud. Vos masters 4K restent sur vos disques SSD.
          </p>
          
          <p className="text-xs sm:text-sm text-[#9f988b] max-w-2xl mx-auto leading-relaxed pt-2">
            Spécialement conçue pour les plateaux d&apos;enregistrement, régies son et adaptateurs exigeant une réactivité instantanée à zéro latence, sans jamais compromettre la sécurité des masters vidéo.
          </p>
        </div>

        {/* Workstation Showcase Feature Banner */}
        <div className="bg-gradient-to-b from-[#141417] to-[#0c0c0e] rounded-[32px] sm:rounded-[40px] border border-white/10 p-6 sm:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.85)] relative overflow-hidden mb-10">
          
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />
          
          {/* Simulated App Window Header */}
          <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400/40" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/40" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
              </div>
              <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-md ml-1 shadow-sm">
                <DubFlowIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-300">DubFlow Workstation v2.0</span>
              </div>
              <span className="text-xs font-mono text-white/40 hidden md:inline">— Native PyWebView Engine</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Direct SSD Access • 0ms Upload</span>
            </div>
          </div>

          {/* Interactive Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Visual Mockup & Directory Status */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#09090b] rounded-2xl p-5 border border-white/10 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#8e887d] border-b border-white/5 pb-2.5">
                  <span className="flex items-center gap-2 text-white">
                    <HardDrive size={14} className="text-amber-400" />
                    <span>RÉPERTOIRE LOCAL SÉLECTIONNÉ</span>
                  </span>
                  <span className="text-emerald-400">INDEXÉ EN 0.04s</span>
                </div>
                
                <div className="bg-black/50 p-3 rounded-xl border border-white/5 text-[11px] text-amber-200/90 break-all select-all">
                  📁 D:\Projets_Doublage\Saison_02\Episode_04_VF\
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-[#a09a8e]">Vidéo Master (ProRes 4K) :</span>
                    <span className="text-white font-bold">Ep04_Master.mov (18.4 Go)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <span className="text-[#a09a8e]">Script Rythmo Détecté :</span>
                    <span className="text-white font-bold">Ep04_Dialogues.docx</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-300 text-[11px]">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                  <span>Lecture locale directe instantanée : aucune donnée n&apos;est transmise sur le réseau.</span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#c7c1b5] flex items-center gap-1.5">
                  <WifiOff size={13} className="text-amber-400" /> 100% Fonctionnel Hors-ligne
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#c7c1b5] flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-400" /> Conformité TPN &amp; NDA Majors
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#c7c1b5] flex items-center gap-1.5">
                  <Cpu size={13} className="text-amber-400" /> Accélération Matérielle GPU
                </span>
              </div>
            </div>

            {/* Right Column: Capabilities & Direct Installer CTA */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  L&apos;application pour votre PC de studio.
                </h3>
                <p className="text-xs sm:text-sm text-[#b0a99c] leading-relaxed">
                  Installez DubFlow sur vos postes de régie et chez vos adaptateurs. L&apos;application native inspecte vos dossiers d&apos;épisodes, synchronise la vidéo locale et génère vos fichiers de bande rythmo sans délai d&apos;upload.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href="/Setup_ERytmo_Script_Converter.exe"
                  download
                  className="group flex items-center justify-between w-full p-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black transition-all shadow-[0_10px_35px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center shrink-0">
                      <Download size={20} className="text-black" />
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-sm tracking-tight leading-tight">Télécharger DubFlow Desktop</p>
                      <p className="text-[11px] font-semibold text-black/70">Setup Windows (.exe) • Version 2.0 (64-bit)</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-black/60 group-hover:translate-x-1 transition-transform" />
                </a>

                <div className="flex items-center justify-between text-[11px] text-[#8e887d] px-2">
                  <span>Taille : ~118 Mo • Auto-mise à jour</span>
                  <span className="text-amber-400/90 font-medium">Compatible Windows 10 &amp; 11</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 3 Pillars Grid for Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-white/15 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <FolderSync size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Indexation Automatique de Dossiers</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Sélectionnez le dossier racine de la production. DubFlow analyse récursivement les sous-dossiers pour associer automatiquement chaque épisode à son script et sa vidéo de référence.
            </p>
          </div>

          <div className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-white/15 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Layers size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Export Multi-Formats pour Plateau</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Passez d&apos;un fichier dialogue brut à une bande rythmo prête à projeter : export instantané vers Mosaic Excel (.xlsx), ERytmo Word (.docx), Cappella ou fichiers sous-titres .srt.
            </p>
          </div>

          <div className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-white/15 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Lock size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Sanctuarisation Totale des Masters</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Aucun risque de fuite ni d&apos;interception réseau. Vos vidéos ne transitent par aucun serveur intermédiaire : conformité totale aux audits de sécurité les plus exigeants de l&apos;industrie.
            </p>
          </div>

        </div>
      </section>

      {/* 5. DUAL ECOSYSTEM COMPARISON & SYNERGY MATRIX */}
      <section id="synergy" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
        
        {/* Section Headline */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-16">
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-amber-400 select-none">
            Architecture &amp; Synergie
          </p>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#f4efe6] leading-[1.1]">
            Desktop vs. Web : L&apos;alliance parfaite.
          </h2>

          <p className="font-editorial text-3xl sm:text-4xl md:text-5xl text-amber-200/90 italic font-normal tracking-wide leading-tight pt-1">
            Deux plateformes connectées pour orchestrer chaque étape de votre studio.
          </p>
        </div>

        {/* High-End Comparison Table */}
        <div className="bg-[#101012] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-5 sm:p-6 text-white/50 font-bold uppercase tracking-wider text-[11px] w-2/5">
                    Fonctionnalité &amp; Architecture
                  </th>
                  <th className="p-5 sm:p-6 text-amber-300 font-black text-sm sm:text-base w-[30%]">
                    <div className="flex items-center gap-2">
                      <Monitor size={18} className="text-amber-400" />
                      <span>DubFlow Desktop</span>
                    </div>
                    <span className="text-[10px] font-normal text-white/50 block font-mono mt-0.5">Postes de Régie &amp; Plateaux</span>
                  </th>
                  <th className="p-5 sm:p-6 text-[#f4efe6] font-black text-sm sm:text-base w-[30%]">
                    <div className="flex items-center gap-2">
                      <Globe size={18} className="text-amber-400" />
                      <span>DubFlow Web</span>
                    </div>
                    <span className="text-[10px] font-normal text-white/50 block font-mono mt-0.5">Hub Collaboratif &amp; Nomade</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#c9c3b7]">
                
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 sm:p-6">
                    <p className="font-bold text-white">Traitement des Vidéos 4K Rushes</p>
                    <p className="text-[11px] text-[#8e887d] mt-0.5">Vitesse d&apos;accès et lecture des vidéos lourdes</p>
                  </td>
                  <td className="p-5 sm:p-6 font-semibold text-white">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <Check size={15} /> Disque Local Direct (0s d&apos;upload)
                    </span>
                  </td>
                  <td className="p-5 sm:p-6 text-[#a39d91]">
                    Streaming P2P direct WebRTC (sans cloud)
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 sm:p-6">
                    <p className="font-bold text-white">Fonctionnement Hors-Ligne</p>
                    <p className="text-[11px] text-[#8e887d] mt-0.5">Utilisation sans connexion Internet active</p>
                  </td>
                  <td className="p-5 sm:p-6 font-semibold text-white">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <Check size={15} /> 100% Hors-ligne en plateau fermé
                    </span>
                  </td>
                  <td className="p-5 sm:p-6 text-[#a39d91]">
                    Nécessite une connexion au navigateur
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 sm:p-6">
                    <p className="font-bold text-white">Conversion de Bandes Rythmo</p>
                    <p className="text-[11px] text-[#8e887d] mt-0.5">Mosaic Excel, ERytmo Word, SRT, Cappella</p>
                  </td>
                  <td className="p-5 sm:p-6 font-semibold text-emerald-400">
                    <Check size={15} className="inline mr-1" /> Illimitée &amp; Haute Vitesse
                  </td>
                  <td className="p-5 sm:p-6 font-semibold text-emerald-400">
                    <Check size={15} className="inline mr-1" /> Illimitée &amp; Glisser-Déposer
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 sm:p-6">
                    <p className="font-bold text-white">Gestion Multi-Sociétés &amp; Tarifs</p>
                    <p className="text-[11px] text-[#8e887d] mt-0.5">Barèmes clients, temps passé et calcul de gains</p>
                  </td>
                  <td className="p-5 sm:p-6 text-[#a39d91]">
                    Synchronisation automatique
                  </td>
                  <td className="p-5 sm:p-6 font-semibold text-white">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <Check size={15} /> Hub Complet &amp; Rôles d&apos;Équipe
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 sm:p-6">
                    <p className="font-bold text-white">Conformité Sécurité TPN &amp; NDA Majors</p>
                    <p className="text-[11px] text-[#8e887d] mt-0.5">Garantie contre les fuites de masters</p>
                  </td>
                  <td className="p-5 sm:p-6 font-semibold text-white">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
                      Niveau Maximal (Isolation Physique)
                    </span>
                  </td>
                  <td className="p-5 sm:p-6 font-semibold text-white">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs">
                      Chiffrement P2P de Bout en Bout
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 sm:p-6">
                    <p className="font-bold text-white">Installation Requise</p>
                    <p className="text-[11px] text-[#8e887d] mt-0.5">Déploiement sur le poste de travail</p>
                  </td>
                  <td className="p-5 sm:p-6 font-mono text-xs text-white/80">
                    Installateur Windows (.exe)
                  </td>
                  <td className="p-5 sm:p-6 font-semibold text-emerald-400">
                    <Check size={15} className="inline mr-1" /> Zéro Installation (URL Directe)
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. EDITORIAL SECURITY & NDA COMPLIANCE GUARANTEE */}
      <section id="security" className="py-24 px-4 sm:px-8 max-w-5xl mx-auto scroll-mt-20">
        <div className="bg-[#0f0f11] rounded-[36px] p-8 sm:p-16 border border-white/5 text-center space-y-8 shadow-[0_20px_70px_rgba(0,0,0,0.8)] relative overflow-hidden">
          
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-amber-400 select-none">
            Sécurité Studio &amp; Confidentialité Totale
          </p>

          <blockquote className="space-y-2">
            <p className="text-2xl sm:text-4xl md:text-5xl font-black text-[#f4efe6] tracking-tight leading-[1.15]">
              Vos fichiers vidéo les plus confidentiels
            </p>
            <p className="font-editorial text-3xl sm:text-5xl md:text-6xl text-amber-200/90 italic font-normal tracking-wide leading-tight">
              ne touchent jamais le Cloud.
            </p>
            <p className="text-2xl sm:text-4xl md:text-5xl font-black text-[#f4efe6] tracking-tight leading-[1.15]">
              100% conforme aux protocoles TPN.
            </p>
          </blockquote>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#9f988b] leading-relaxed">
            Les contrats avec les majors (Netflix, Disney, Warner Bros, Canal+) interdisent le stockage non chiffré des masters vidéo sur des serveurs clouds tiers. DubFlow a été conçu dès le premier jour autour d&apos;une règle fondamentale : vos vidéos restent sur vos disques, vos scripts sont isolés par utilisateur, et vos transmissions s&apos;effectuent de pair à pair.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <span className="px-3.5 py-1.5 rounded-xl bg-white/5 text-[11px] text-[#c7c1b5] border border-white/5 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Zéro Stockage AWS S3
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-white/5 text-[11px] text-[#c7c1b5] border border-white/5 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Clés IA Chiffrées en Local
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-white/5 text-[11px] text-[#c7c1b5] border border-white/5 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> Isolation des Comptes Utilisateurs
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-white/5 text-[11px] text-[#c7c1b5] border border-white/5 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" /> WebRTC Direct P2P Chiffré
            </span>
          </div>
        </div>
      </section>

      {/* 6. CLOSING CALL TO ACTION */}
      <section className="py-28 px-4 sm:px-8 text-center max-w-4xl mx-auto relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#f4efe6] leading-[1.1]">
            Prêt à transformer votre
            <span className="block font-editorial text-5xl sm:text-7xl md:text-8xl text-amber-200 italic font-normal leading-[0.95] mt-1">
              plateau de doublage ?
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-[#9f988b] max-w-xl mx-auto leading-relaxed">
            Choisissez la solution adaptée à votre équipement : installez l&apos;application Desktop pour vos régies ou ouvrez la Web App pour tester la conversion instantanément.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/Setup_ERytmo_Script_Converter.exe"
              download
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black tracking-wide transition-all shadow-[0_15px_40px_rgba(245,158,11,0.25)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download size={15} />
              <span>Télécharger DubFlow Desktop (.exe)</span>
            </a>
            
            <Link
              href="/converter"
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 hover:scale-105 active:scale-95"
            >
              <Globe size={15} className="text-amber-400" />
              <span>Lancer la Web App en Direct</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. LUXURY MINIMAL FOOTER WITH VECTOR SVG LOGO */}
      <footer className="py-16 px-6 sm:px-12 border-t border-white/5 bg-[#050506] text-xs text-[#78736a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <DubFlowIcon className="w-6 h-6 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1">
                <span className="text-base font-black text-[#f4efe6] tracking-tight">DubFlow Studio</span>
                <span className="text-amber-400 font-editorial text-base leading-none select-none">*</span>
              </div>
            </div>
            <p className="text-[11px] text-[#8e887d] max-w-sm">
              L&apos;écosystème nouvelle génération pour la post-synchronisation, la conversion rythmo et le streaming P2P sécurisé.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-wider text-[#a8a192]">
            <a href="#about" className="hover:text-white transition-colors">About us</a>
            <a href="#web" className="hover:text-white transition-colors">Web App</a>
            <a href="#desktop" className="hover:text-white transition-colors">Desktop App</a>
            <a href="#synergy" className="hover:text-white transition-colors">Comparatif</a>
            <a href="#security" className="hover:text-white transition-colors">Sécurité TPN</a>
            <button onClick={() => setDemoModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">
              Démo Interactive
            </button>
            <Link href="/login" className="hover:text-white transition-colors">
              Connexion
            </Link>
          </div>

        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#635f56]">
          <p>© 2026 DubFlow Studio Inc. Tous droits réservés.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Architecture P2P Active • Zéro Stockage Cloud • Conformité TPN</span>
          </p>
        </div>
      </footer>

      {/* 9. INTERACTIVE PRESENTATION & DEMO MODAL */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200 relative">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-2 flex items-center justify-center shadow-md">
                  <DubFlowIcon className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Présentation Interactive DubFlow</h3>
                  <p className="text-[11px] text-[#938d81]">Découverte instantanée pour votre studio</p>
                </div>
              </div>
              <button
                onClick={() => setDemoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-white/5 px-6 pt-2 gap-2 text-xs">
              <button
                onClick={() => setActiveTab("convert")}
                className={`py-2 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
                  activeTab === "convert" ? "border-amber-400 text-amber-300" : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                Conversion de Scripts
              </button>
              <button
                onClick={() => setActiveTab("p2p")}
                className={`py-2 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
                  activeTab === "p2p" ? "border-amber-400 text-amber-300" : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                Streaming P2P 0-Cloud
              </button>
              <button
                onClick={() => setActiveTab("rates")}
                className={`py-2 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
                  activeTab === "rates" ? "border-amber-400 text-amber-300" : "border-transparent text-white/50 hover:text-white"
                }`}
              >
                Gestion &amp; Tarifs
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs text-[#cfc8bc]">
              {activeTab === "convert" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-white/50 text-[10px] pb-2 border-b border-white/5">
                      <span>SYNTAX VALIDATOR • ERYTMO CORE ENGINE</span>
                      <span className="text-emerald-400">STATUS: READY</span>
                    </div>
                    <p className="text-amber-200">&gt; Détection automatique des timecodes et répliques comédiens...</p>
                    <p className="text-white/70">&gt; Formats pris en charge : Bandes rythmo Mosaic, Cappella, SRT, TXT, Aegisub.</p>
                    <p className="text-emerald-400 font-bold">&gt; Résultat : 0 décalage, validation syntaxique en 0.4s.</p>
                  </div>

                  <p className="leading-relaxed">
                    Le convertisseur ERytmo analyse vos scripts, détecte automatiquement les balises de respiration, les chevauchements et formate le fichier prêt à être projeté sur la bande rythmo de votre plateau.
                  </p>
                </div>
              )}

              {activeTab === "p2p" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/30 text-rose-300">
                      <p className="font-bold mb-1">Méthode Traditionnelle</p>
                      <p className="text-[11px] text-rose-400/80">Upload 4 Go vers AWS (20 min) + risque de fuite de master vidéo.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 text-emerald-300">
                      <p className="font-bold mb-1">Solution DubFlow</p>
                      <p className="text-[11px] text-emerald-400/80">0 seconde d&apos;upload. Streaming direct chiffré PC à PC.</p>
                    </div>
                  </div>

                  <p className="leading-relaxed">
                    L&apos;architecture DubFlow indexe les vidéos directement depuis le disque dur de la machine. Lors d&apos;un travail en équipe, le flux vidéo est acheminé de navigateur à navigateur via WebRTC chiffré sans passer par un serveur cloud.
                  </p>
                </div>
              )}

              {activeTab === "rates" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex justify-between font-semibold text-white">
                      <span>Prestation</span>
                      <span>Barème Paramétrable</span>
                    </div>
                    <div className="flex justify-between text-white/70 border-t border-white/5 pt-1.5">
                      <span>Détection Rythmo</span>
                      <span className="text-amber-300 font-mono">Taux / min ou heure</span>
                    </div>
                    <div className="flex justify-between text-white/70">
                      <span>Conformation &amp; Pose</span>
                      <span className="text-amber-300 font-mono">Taux horaire studio</span>
                    </div>
                    <div className="flex justify-between text-white/70">
                      <span>Doublage Chantant</span>
                      <span className="text-amber-300 font-mono">Taux spécial comédie</span>
                    </div>
                  </div>

                  <p className="leading-relaxed">
                    Chaque client et donneur d&apos;ordre possède sa fiche dédiée. Le studio génère des estimations précises et suit le temps réellement passé grâce au chronomètre de détection intégré.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer CTAs */}
            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
              <Link
                href="/converter"
                onClick={() => setDemoModalOpen(false)}
                className="text-xs text-white/70 hover:text-white underline"
              >
                Ouvrir le convertisseur libre
              </Link>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDemoModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-white/10 text-white/70 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Fermer
                </button>
                <Link
                  href="/projects"
                  onClick={() => setDemoModalOpen(false)}
                  className="px-5 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all cursor-pointer"
                >
                  Accéder à l&apos;Espace Studio
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
