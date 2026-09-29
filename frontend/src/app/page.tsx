"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import FloatingNav from "@/components/FloatingNav";

export default function WelcomePage() {
  const { isAuthenticated } = useAuth();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"convert" | "p2p" | "rates">("convert");

  // Ensure scroll is strictly at y=0 on page mount or navigation from login/register
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.location.hash || window.location.hash === "#about" || window.location.hash === "#home") {
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

      {/* 3. FEATURE CARDS SECTION (INSPIRED BY SCREENSHOT 2) */}
      <section id="workflows" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5">
        
        {/* Section Header with Editorial Mixing */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-2">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#f4efe6]">
            Studio-grade workflows for visionary dubbing teams.
          </h2>
          <p className="font-editorial text-2xl sm:text-3xl text-amber-200/80 italic font-normal tracking-wide">
            Built for pure vision. Powered by local precision.
          </p>
        </div>

        {/* 3-Column Studio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Creative Canvas (Image Background) */}
          <div className="relative h-[480px] rounded-3xl overflow-hidden border border-white/10 group p-6 flex flex-col justify-end shadow-[0_15px_50px_rgba(0,0,0,0.6)]">
            <Image
              src="/studio_card.jpg"
              alt="Creative Dubbing Studio Canvas"
              fill
              className="object-cover object-center filter brightness-[0.75] contrast-[1.08] group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">
                STUDIO WORKSPACE
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Your creative canvas.
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Importez vos dossiers d&apos;épisodes locaux sans temps de chargement. Vos bandes rythmo et vidéos se synchronisent à zéro latence.
              </p>
            </div>
          </div>

          {/* Card 2: 01 Universal Script Engine */}
          <div className="bg-[#121214] rounded-3xl p-7 border border-white/5 hover:border-white/15 transition-all duration-300 flex flex-col justify-between group shadow-xl">
            <div className="space-y-6">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white/60">
                01
              </div>

              <div>
                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-amber-200 transition-colors">
                  Moteur de Script Universel.
                </h3>
                <p className="text-xs text-[#9d978a] mt-1.5 leading-relaxed">
                  Passez d&apos;un standard de logiciel de plateau à un autre en 2 clics avec validation instantanée.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-[#d2ccc0] pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span>
                  <span>Conversion Mosaic, ERytmo, Cappella, SRT</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span>
                  <span>Validation syntaxique & timecodes en temps réel</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span>
                  <span>Zéro perte de balises, comédiens et métadonnées</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span>
                  <span>Prêt pour le plateau d&apos;enregistrement en secondes</span>
                </li>
              </ul>
            </div>

            <div className="pt-8 border-t border-white/5 flex items-center justify-between text-xs text-white/60 group-hover:text-white transition-colors">
              <button onClick={() => setDemoModalOpen(true)} className="flex items-center gap-1.5 font-medium hover:underline cursor-pointer">
                <span>Tester la conversion</span>
                <span className="text-amber-400 font-bold">↗</span>
              </button>
            </div>
          </div>

          {/* Card 3: 02 Zero-Cloud Storage & P2P Streaming */}
          <div className="bg-[#121214] rounded-3xl p-7 border border-white/5 hover:border-white/15 transition-all duration-300 flex flex-col justify-between group shadow-xl">
            <div className="space-y-6">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white/60">
                02
              </div>

              <div>
                <h3 className="text-xl font-black text-white tracking-tight group-hover:text-amber-200 transition-colors">
                  Zero-Cloud & P2P Stream.
                </h3>
                <p className="text-xs text-[#9d978a] mt-1.5 leading-relaxed">
                  Vos épisodes 4K ne touchent jamais aucun serveur cloud. Streaming direct sécurisé PC à PC.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-[#d2ccc0] pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span>
                  <span>Lecture locale instantanée sans téléversement</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span>
                  <span>Streaming P2P crypté direct de machine à machine</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span>
                  <span>Conformité absolue aux NDA Netflix, Disney, Warner</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-amber-400">✓</span>
                  <span>0 € de facture de serveurs cloud et stockage AWS</span>
                </li>
              </ul>
            </div>

            <div className="pt-8 border-t border-white/5 flex items-center justify-between text-xs text-white/60 group-hover:text-white transition-colors">
              <button onClick={() => setDemoModalOpen(true)} className="flex items-center gap-1.5 font-medium hover:underline cursor-pointer">
                <span>Voir l&apos;architecture P2P</span>
                <span className="text-amber-400 font-bold">↗</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 4. EDITORIAL VISION STATEMENT (INSPIRED BY SCREENSHOT 3) */}
      <section id="vision" className="py-20 px-4 sm:px-8 max-w-5xl mx-auto">
        <div className="bg-[#0f0f11] rounded-[36px] p-8 sm:p-16 border border-white/5 text-center space-y-8 shadow-[0_20px_70px_rgba(0,0,0,0.8)] relative overflow-hidden">
          
          <div className="inline-block px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold tracking-widest text-[#a8a192]">
            L&apos;Excellence Post-Synchronisation
          </div>

          <blockquote className="space-y-2">
            <p className="text-2xl sm:text-4xl md:text-5xl font-black text-[#f4efe6] tracking-tight leading-[1.15]">
              Optimisez votre chaîne de post-production,
            </p>
            <p className="font-editorial text-3xl sm:text-5xl md:text-6xl text-amber-200/90 italic font-normal tracking-wide leading-tight">
              automatisez vos bandes rythmo,
            </p>
            <p className="text-2xl sm:text-4xl md:text-5xl font-black text-[#f4efe6] tracking-tight leading-[1.15]">
              avec 100% de confidentialité garantie.
            </p>
          </blockquote>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#9f988b] leading-relaxed">
            Conçu spécialement pour les studios de doublage, de localisation audiovisuelle et de sous-titrage. ERytmo élimine plus de 70% du temps perdu à réadapter manuellement les fichiers, tout en vous affranchissant des serveurs cloud coûteux.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-white/5 text-[11px] text-[#c7c1b5] border border-white/5">
              Détection Rythmo
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 text-[11px] text-[#c7c1b5] border border-white/5">
              Conformation
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 text-[11px] text-[#c7c1b5] border border-white/5">
              Pose de Texte
            </span>
            <span className="px-3 py-1 rounded-lg bg-white/5 text-[11px] text-[#c7c1b5] border border-white/5">
              Doublage Chantant
            </span>
          </div>
        </div>
      </section>

      {/* 5. METRICS & "FROM THE FIELD" TESTIMONIALS (INSPIRED BY SCREENSHOT 4) */}
      <section id="impact" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5">
        
        {/* Metric Badges Row */}
        <div className="text-center mb-6">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#8c867b]">
            Performances &amp; ROI Studio
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
          <div className="bg-[#121214] p-6 sm:p-8 rounded-3xl border border-white/5 text-center space-y-2">
            <span className="font-editorial text-4xl sm:text-5xl text-amber-200 italic font-normal">
              +70%
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-white">Gain de temps</h4>
            <p className="text-[11px] text-[#8e887d] leading-relaxed">
              Préparation instantanée des scripts avant entrée en plateau.
            </p>
          </div>

          <div className="bg-[#121214] p-6 sm:p-8 rounded-3xl border border-white/5 text-center space-y-2">
            <span className="font-editorial text-4xl sm:text-5xl text-amber-200 italic font-normal">
              0 €
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-white">Frais de stockage cloud</h4>
            <p className="text-[11px] text-[#8e887d] leading-relaxed">
              Vos vidéos restent sur vos disques, zéro facture AWS S3.
            </p>
          </div>

          <div className="bg-[#121214] p-6 sm:p-8 rounded-3xl border border-white/5 text-center space-y-2">
            <span className="font-editorial text-4xl sm:text-5xl text-amber-200 italic font-normal">
              100%
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-white">Conformité TPN / NDA</h4>
            <p className="text-[11px] text-[#8e887d] leading-relaxed">
              Sécurité absolue contre les fuites de masters audiovisuels.
            </p>
          </div>

          <div className="bg-[#121214] p-6 sm:p-8 rounded-3xl border border-white/5 text-center space-y-2">
            <span className="font-editorial text-4xl sm:text-5xl text-amber-200 italic font-normal">
              P2P
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-white">Streaming direct</h4>
            <p className="text-[11px] text-[#8e887d] leading-relaxed">
              Partage chiffré temps réel entre la régie et les adaptateurs.
            </p>
          </div>
        </div>

        {/* Section Headline */}
        <div className="mb-12 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#8c867b]">
            Retours d&apos;expérience
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-[#f4efe6] tracking-tight">
            From the field.
          </h2>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-[#121214] rounded-3xl p-7 border border-white/5 flex flex-col justify-between space-y-6">
            <p className="text-xs sm:text-sm text-[#d0cac0] leading-relaxed font-normal">
              &ldquo;ERytmo a résolu le cauchemar de la réadaptation des fichiers entre la détection et le logiciel de plateau. Nos séances d&apos;enregistrement démarrent sans aucun retard.&rdquo;
            </p>
            <div className="flex items-center justify-between text-xs pt-4 border-t border-white/5">
              <div>
                <p className="font-bold text-white">Marc Lefebvre</p>
                <p className="text-[11px] text-[#8e887d]">Directeur Artistique</p>
              </div>
              <span className="text-[11px] text-amber-300 font-editorial italic">Paris</span>
            </div>
          </div>

          <div className="bg-[#121214] rounded-3xl p-7 border border-white/5 flex flex-col justify-between space-y-6">
            <p className="text-xs sm:text-sm text-[#d0cac0] leading-relaxed font-normal">
              &ldquo;Nos clients comme les chaînes et plateformes internationales exigent des protocoles de sécurité stricts. Le fait que les vidéos restent en local sans upload cloud est un argument décisif.&rdquo;
            </p>
            <div className="flex items-center justify-between text-xs pt-4 border-t border-white/5">
              <div>
                <p className="font-bold text-white">Émilie Vasseur</p>
                <p className="text-[11px] text-[#8e887d]">Superviseure Post-production</p>
              </div>
              <span className="text-[11px] text-amber-300 font-editorial italic">Bruxelles</span>
            </div>
          </div>

          <div className="bg-[#121214] rounded-3xl p-7 border border-white/5 flex flex-col justify-between space-y-6">
            <p className="text-xs sm:text-sm text-[#d0cac0] leading-relaxed font-normal">
              &ldquo;La grille tarifaire par société et le mode Spectateur pour les relecteurs nous permettent de sécuriser nos projets tout en éditant les factures au centime près.&rdquo;
            </p>
            <div className="flex items-center justify-between text-xs pt-4 border-t border-white/5">
              <div>
                <p className="font-bold text-white">Youssef Benali</p>
                <p className="text-[11px] text-[#8e887d]">Ingénieur du Son &amp; Gérant</p>
              </div>
              <span className="text-[11px] text-amber-300 font-editorial italic">Casablanca</span>
            </div>
          </div>

        </div>
      </section>

      {/* 6. THREE WAYS TO DEPLOY (INSPIRED BY SCREENSHOT 5) */}
      <section id="formules" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-white/5">
        
        <div className="mb-12 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#8c867b]">
            Déploiement Studio
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-[#f4efe6] tracking-tight">
            Three ways to empower your studio.
          </h2>
        </div>

        {/* 3 Horizontal Sleek Cards */}
        <div className="space-y-4">
          
          {/* Tier 1: Solo */}
          <div className="bg-[#121214] rounded-3xl p-6 sm:p-8 border border-white/5 hover:border-white/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
            <div className="w-full lg:w-48 shrink-0">
              <h3 className="font-editorial text-3xl sm:text-4xl text-amber-200/90 italic font-normal">
                Solo Studio
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-[#8c867b] font-bold mt-1">
                Adaptateurs &amp; Freelances
              </p>
            </div>

            <div className="flex-1 space-y-2">
              <p className="text-xs sm:text-sm text-[#d0cac0]">
                Pour les détectiveurs et adaptateurs indépendants préparant des scripts pour les studios.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#938d81]">
                <span>• Conversion illimitée multi-formats</span>
                <span>• Validation syntaxique temps réel</span>
                <span>• Indexation locale sans upload</span>
              </div>
            </div>

            <div className="shrink-0">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f4efe6] hover:bg-white text-black text-xs font-bold transition-all hover:scale-105 active:scale-95"
              >
                <span>Démarrer</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Tier 2: Studio Pro */}
          <div className="bg-[#141417] rounded-3xl p-6 sm:p-8 border border-amber-400/20 hover:border-amber-400/50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group relative overflow-hidden shadow-[0_10px_40px_rgba(245,158,11,0.05)]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full lg:w-48 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-editorial text-3xl sm:text-4xl text-amber-300 italic font-normal">
                  Studio Pro
                </h3>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-bold mt-1">
                Plateaux &amp; Régies de Doublage
              </p>
            </div>

            <div className="flex-1 space-y-2">
              <p className="text-xs sm:text-sm text-[#d0cac0]">
                Pour les studios gérant plusieurs postes d&apos;enregistrement, des collaborateurs et des clients réguliers.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-200/70">
                <span>• Réseau streaming P2P direct</span>
                <span>• Grille tarifaire par client &amp; prestation</span>
                <span>• Rôles Full Access &amp; Spectateur</span>
                <span>• Suivi des deadlines &amp; temps</span>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => setDemoModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Activer l&apos;accès Pro</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Tier 3: Enterprise / Major */}
          <div className="bg-[#121214] rounded-3xl p-6 sm:p-8 border border-white/5 hover:border-white/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
            <div className="w-full lg:w-48 shrink-0">
              <h3 className="font-editorial text-3xl sm:text-4xl text-amber-200/90 italic font-normal">
                Enterprise
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-[#8c867b] font-bold mt-1">
                Groupes &amp; Diffuseurs
              </p>
            </div>

            <div className="flex-1 space-y-2">
              <p className="text-xs sm:text-sm text-[#d0cac0]">
                Déploiement sur mesure pour les diffuseurs et réseaux de studios internationaux avec protocoles stricts.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#938d81]">
                <span>• Audits de conformité TPN &amp; Majors</span>
                <span>• Passerelles API pour logiciels propriétaires</span>
                <span>• Accompagnement &amp; support 24/7 dédié</span>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => setDemoModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Demander un audit</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 7. CLOSING CALL TO ACTION (INSPIRED BY SCREENSHOT 6) */}
      <section className="py-32 px-4 sm:px-8 text-center max-w-4xl mx-auto relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#f4efe6] leading-[1.1]">
            There&apos;s room for a smarter
            <span className="block font-editorial text-5xl sm:text-7xl md:text-8xl text-amber-200 italic font-normal leading-[0.95] mt-1">
              post-sync workflow.
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-[#9f988b] max-w-xl mx-auto leading-relaxed">
            Prêt à transformer vos séances de détection et à éliminer définitivement les blocages de formats ? Démarrez un test pilote gratuit sur vos projets dès aujourd&apos;hui.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setDemoModalOpen(true)}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#f4efe6] hover:bg-white text-black text-xs font-extrabold tracking-wide transition-all shadow-[0_15px_40px_rgba(244,239,230,0.25)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Demander une démo personnalisée</span>
              <ArrowRight size={13} />
            </button>
            
            <Link
              href="/converter"
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold transition-all border border-white/10"
            >
              <FileText size={13} />
              <span>Accéder au convertisseur en ligne</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 8. LUXURY MINIMAL FOOTER (INSPIRED BY SCREENSHOT 6) */}
      <footer className="py-16 px-6 sm:px-12 border-t border-white/5 bg-[#050506] text-xs text-[#78736a]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold tracking-tight">
              <span className="text-base font-black text-[#f4efe6]">DubFlow Studio</span>
              <span className="text-amber-400 font-editorial text-base leading-none">*</span>
            </div>
            <p className="text-[11px] text-[#8e887d]">
              L&apos;écosystème nouvelle génération pour la post-synchronisation et l&apos;adaptation de scripts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-wider text-[#a8a192]">
            <a href="#workflows" className="hover:text-white transition-colors">Workflows</a>
            <a href="#vision" className="hover:text-white transition-colors">Sécurité TPN</a>
            <a href="#formules" className="hover:text-white transition-colors">Formules</a>
            <button onClick={() => setDemoModalOpen(true)} className="hover:text-white transition-colors cursor-pointer">
              Démo Client
            </button>
            <Link href="/login" className="hover:text-white transition-colors">
              Connexion
            </Link>
          </div>

        </div>

        <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#635f56]">
          <p>© 2026 DubFlow Studio. Tous droits réservés.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Serveurs P2P opérationnels • Zéro stockage cloud</span>
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-1.5 flex items-center justify-center">
                  <Image src="/app_logo.png" alt="ERytmo" width={24} height={24} className="object-contain" />
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
