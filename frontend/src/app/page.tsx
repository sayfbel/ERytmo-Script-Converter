"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowRight, X, Globe, Download, 
  FolderSync, Share2, Layers, Lock, 
  Sparkles, Clock, Minus, Square
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FloatingNav from "@/components/FloatingNav";
import { DubFlowIcon } from "@/components/DubFlowLogo";
import CinematicLogoCloud from "@/components/CinematicLogoCloud";
import SynergyMatrix from "@/components/SynergyMatrix";
import FAQSection from "@/components/FAQSection";
import BlurFade from "@/components/ui/BlurFade";
import { motion } from "framer-motion";

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
        <BlurFade className="max-w-3xl mx-auto text-center space-y-3 mb-6">
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
        </BlurFade>

        {/* 3D Fanned-Out Cards Showcase with Staggered Blur-Fade entrance */}
        <div className="relative py-10 sm:py-16 overflow-visible">
          
          {/* Fanned-Out Cards Array (5 unique images with staggered blur-fade entrance) */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              visible: { transition: { staggerChildren: 0.12 } },
              hidden: {},
            }}
            className="relative z-10 flex items-center justify-center -space-x-12 sm:-space-x-16 md:-space-x-14 lg:-space-x-12 xl:-space-x-10 px-8 py-8 overflow-visible"
          >

            {/* Card 1: Far Left - Unique Image 4 (Tilt -12deg) */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 45, rotate: -12, scale: 0.88, filter: "blur(14px)" },
                visible: {
                  opacity: 0.5,
                  y: 0,
                  rotate: -12,
                  scale: 0.88,
                  filter: "blur(0px)",
                  transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="hidden lg:block relative shrink-0 w-[205px] xl:w-[225px] rounded-[26px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none"
            >
              <Image
                src="/card_4.webp"
                alt="DubFlow Studio Pass - Alexandre Dubois"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </motion.div>

            {/* Card 2: Center-Left - Unique Image 1 (Tilt -6deg) */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 50, rotate: -6, filter: "blur(14px)" },
                visible: {
                  opacity: 1,
                  y: 12,
                  rotate: -6,
                  filter: "blur(0px)",
                  transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="relative shrink-0 w-[230px] sm:w-[250px] md:w-[265px] lg:w-[280px] rounded-[26px] sm:rounded-[28px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none"
            >
              <Image
                src="/card_1.webp"
                alt="DubFlow Studio Pass - Margaret O. Guidry"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </motion.div>

            {/* Card 3: Center Featured - Unique Image 2 (Straight & Featured scale 1.1) */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 40, rotate: 0, scale: 1.05, filter: "blur(16px)" },
                visible: {
                  opacity: 1,
                  y: 0,
                  rotate: 0,
                  scale: 1.1,
                  filter: "blur(0px)",
                  transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="relative shrink-0 w-[245px] sm:w-[270px] md:w-[285px] lg:w-[305px] rounded-[28px] sm:rounded-[30px] overflow-hidden z-20 shadow-[0_30px_70px_rgba(0,0,0,0.95)] select-none"
            >
              <Image
                src="/card_2.webp"
                alt="DubFlow Studio Pass - Robert M. McCray"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </motion.div>

            {/* Card 4: Center-Right - Unique Image 5 (Tilt +6deg) */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 50, rotate: 6, filter: "blur(14px)" },
                visible: {
                  opacity: 1,
                  y: 12,
                  rotate: 6,
                  filter: "blur(0px)",
                  transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="relative shrink-0 w-[230px] sm:w-[250px] md:w-[265px] lg:w-[280px] rounded-[26px] sm:rounded-[28px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none"
            >
              <Image
                src="/card_5.webp"
                alt="DubFlow Studio Pass - Clara Vanderbilt"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </motion.div>

            {/* Card 5: Far Right - Unique Image 3 (Tilt +12deg) */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 45, rotate: 12, scale: 0.88, filter: "blur(14px)" },
                visible: {
                  opacity: 0.5,
                  y: 0,
                  rotate: 12,
                  scale: 0.88,
                  filter: "blur(0px)",
                  transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                },
              }}
              className="hidden lg:block relative shrink-0 w-[205px] xl:w-[225px] rounded-[26px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] select-none"
            >
              <Image
                src="/card_3.webp"
                alt="DubFlow Studio Pass - Janice W. Seymour"
                width={640}
                height={960}
                className="w-full h-auto object-cover block"
                priority
              />
            </motion.div>

          </motion.div>
        </div>

        {/* Cinematic Logo Cloud Section */}
        <CinematicLogoCloud />
      </section>

      {/* 3. DUBFLOW WEB APP PRESENTATION */}
      <section id="web" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
        
        {/* Section Header */}
        <BlurFade className="max-w-3xl mx-auto text-center space-y-3 mb-16">
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
        </BlurFade>

        {/* Web App Showcase Feature Banner (Clean Minimalist Browser Frame) */}
        <BlurFade delay={0.15} className="bg-gradient-to-b from-[#141417] to-[#0c0c0e] rounded-[32px] sm:rounded-[40px] border border-white/10 p-6 sm:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.85)] relative overflow-hidden mb-10">
          
          {/* Complete Browser Top Bar */}
          <div className="flex items-center justify-between gap-3 sm:gap-4 pb-6 border-b border-white/10 relative z-10">
            
            {/* Left Browser Controls (3 dots: Red, Yellow, Green macOS style) */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400/40" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/40" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
            </div>

            {/* Center: Full-Width Search & Address Bar (Takes full available width) */}
            <div className="flex-1 min-w-0 mx-1 sm:mx-3">
              <div className="flex items-center justify-between bg-black/60 border border-white/10 px-4 py-2 sm:py-2.5 rounded-full text-xs font-mono text-white/70 w-full shadow-inner">
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <DubFlowIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <Lock size={12} className="text-emerald-400 shrink-0" />
                  <span className="truncate text-[#e6e1d6]">https://app.dubflow.studio/converter</span>
                </div>
                <span className="hidden sm:inline text-[10px] text-white/40 uppercase tracking-widest font-sans font-medium">
                  SSL Encrypted
                </span>
              </div>
            </div>

            {/* Right: Window Action Buttons (Minimize -, Maximize Square, Close X) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-white/50">
              {/* Minimize - */}
              <button 
                type="button"
                aria-label="Minimize window"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors text-xs"
              >
                <Minus size={13} strokeWidth={2.5} />
              </button>

              {/* Maximize / Square */}
              <button 
                type="button"
                aria-label="Maximize window"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors text-xs"
              >
                <Square size={11} strokeWidth={2.2} />
              </button>

              {/* Close X */}
              <button 
                type="button"
                aria-label="Close window"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-colors text-xs"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>

          </div>

          {/* Clean Empty Browser Viewport (Awaiting future content) */}
          <div className="relative min-h-[360px] sm:min-h-[460px] w-full rounded-2xl bg-[#09090b]/80 border border-white/5 mt-6 flex items-center justify-center p-6 text-center">
            {/* Kept clean & empty as requested */}
          </div>

        </BlurFade>

        {/* 3 Pillars Grid for Web */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <BlurFade delay={0.1} className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-amber-400/30 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Share2 size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Streaming Vidéo P2P WebRTC</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Partagez la vidéo de régie en streaming direct chiffré vers l&apos;écran de votre adaptateur sans jamais uploader les 20 Go sur un serveur tiers. Latence ultra-faible garantie.
            </p>
          </BlurFade>

          <BlurFade delay={0.2} className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-amber-400/30 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Clock size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Grilles Tarifaires &amp; Calcul des Gains</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Chaque client dispose de sa propre grille : détection, conformation, pose de texte et chantant. Le chronomètre calcule automatiquement le montant exact à facturer.
            </p>
          </BlurFade>

          <BlurFade delay={0.3} className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-amber-400/30 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Sparkles size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Clés IA Personnelles &amp; Sécurisées</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Branchez vos propres clés Gemini, OpenAI ou Groq dans votre coffre-fort sécurisé pour bénéficier de l&apos;alignement automatique des timecodes sans frais d&apos;abonnement cachés.
            </p>
          </BlurFade>

        </div>
      </section>

      {/* 4. DUBFLOW DESKTOP WORKSTATION PRESENTATION */}
      <section id="desktop" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
        
        {/* Section Header */}
        <BlurFade className="max-w-3xl mx-auto text-center space-y-3 mb-16">
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
        </BlurFade>

        {/* Workstation Showcase Feature Banner (Clean Native Desktop App Window) */}
        <BlurFade delay={0.15} className="bg-gradient-to-b from-[#141417] to-[#0c0c0e] rounded-[32px] sm:rounded-[40px] border border-white/10 p-6 sm:p-8 shadow-[0_20px_80px_rgba(0,0,0,0.85)] relative overflow-hidden mb-10">
          
          {/* Native Desktop App Window Header */}
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
            
            {/* Left: App Identity & Native Menus */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shadow-sm">
                <DubFlowIcon className="w-4 h-4 text-amber-400" />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white">DubFlow Workstation</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50 hidden sm:inline">
                  v2.0 Native
                </span>
              </div>

              {/* Native App Top Menu Bar */}
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-white/10 text-xs text-white/40">
                <span className="hover:text-white transition-colors cursor-default">Fichier</span>
                <span className="hover:text-white transition-colors cursor-default">Édition</span>
                <span className="hover:text-white transition-colors cursor-default">Projet</span>
                <span className="hover:text-white transition-colors cursor-default">Affichage</span>
                <span className="hover:text-white transition-colors cursor-default">Outils</span>
                <span className="hover:text-white transition-colors cursor-default">Aide</span>
              </div>
            </div>

            {/* Center: Session Status Bar */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-white/40 truncate max-w-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="truncate">Direct SSD Access • 0ms Upload • 100% Offline</span>
            </div>

            {/* Right: Window Action Buttons (Minimize -, Maximize Square, Close X) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-white/50">
              {/* Minimize - */}
              <button 
                type="button"
                aria-label="Minimize window"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors text-xs"
              >
                <Minus size={13} strokeWidth={2.5} />
              </button>

              {/* Maximize / Square */}
              <button 
                type="button"
                aria-label="Maximize window"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors text-xs"
              >
                <Square size={11} strokeWidth={2.2} />
              </button>

              {/* Close X */}
              <button 
                type="button"
                aria-label="Close window"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-colors text-xs"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>

          </div>

          {/* Clean Empty Desktop App Viewport (Awaiting future content) */}
          <div className="relative min-h-[380px] sm:min-h-[480px] w-full rounded-2xl bg-[#09090b]/80 border border-white/5 mt-6 flex items-center justify-center p-6 text-center">
            {/* Kept clean & empty as requested */}
          </div>

        </BlurFade>

        {/* 3 Pillars Grid for Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <BlurFade delay={0.1} className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-white/15 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <FolderSync size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Indexation Automatique de Dossiers</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Sélectionnez le dossier racine de la production. DubFlow analyse récursivement les sous-dossiers pour associer automatiquement chaque épisode à son script et sa vidéo de référence.
            </p>
          </BlurFade>

          <BlurFade delay={0.2} className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-white/15 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Layers size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Export Multi-Formats pour Plateau</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Passez d&apos;un fichier dialogue brut à une bande rythmo prête à projeter : export instantané vers Mosaic Excel (.xlsx), ERytmo Word (.docx), Cappella ou fichiers sous-titres .srt.
            </p>
          </BlurFade>

          <BlurFade delay={0.3} className="bg-[#111113] rounded-3xl p-7 border border-white/5 hover:border-white/15 transition-all space-y-4 shadow-lg group">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/10 transition-colors">
              <Lock size={20} />
            </div>
            <h4 className="text-lg font-black text-white tracking-tight">Sanctuarisation Totale des Masters</h4>
            <p className="text-xs text-[#a39d91] leading-relaxed">
              Aucun risque de fuite ni d&apos;interception réseau. Vos vidéos ne transitent par aucun serveur intermédiaire : conformité totale aux audits de sécurité les plus exigeants de l&apos;industrie.
            </p>
          </BlurFade>

        </div>
      </section>

      {/* 5. DUAL ECOSYSTEM COMPARISON & SYNERGY MATRIX */}
      <section id="comparatif" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5 scroll-mt-20">
        
        {/* Section Headline */}
        <BlurFade className="max-w-3xl mx-auto text-center space-y-3 mb-16">
          <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-amber-400 select-none">
            Architecture &amp; Synergie
          </p>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#f4efe6] leading-[1.1]">
            Desktop vs. Web : L&apos;alliance parfaite.
          </h2>

          <p className="font-editorial text-3xl sm:text-4xl md:text-5xl text-amber-200/90 italic font-normal tracking-wide leading-tight pt-1">
            Deux plateformes connectées pour orchestrer chaque étape de votre studio.
          </p>
        </BlurFade>

        {/* High-End Architecture & Synergy Matrix */}
        <BlurFade delay={0.15}>
          <SynergyMatrix />
        </BlurFade>
      </section>

      {/* 5. FAQ & SECURITY ACCORDION */}
      <BlurFade delay={0.1}>
        <FAQSection />
      </BlurFade>

      {/* 6. CLOSING CALL TO ACTION */}
      <section className="py-28 px-4 sm:px-8 text-center max-w-4xl mx-auto relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

        <BlurFade className="relative z-10 space-y-6">
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
        </BlurFade>
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
            <a href="#comparatif" className="hover:text-white transition-colors">Comparatif</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
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
