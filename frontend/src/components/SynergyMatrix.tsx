'use client';

import React from 'react';
import { Check, Minus, Download, ArrowUpRight, Monitor, Globe } from 'lucide-react';
import Link from 'next/link';

interface ComparisonRow {
  feature: string;
  category?: string;
  desktop: boolean | string;
  web: boolean | string;
}

const ROWS: ComparisonRow[] = [
  // SECTION: MOTEUR & FICHIERS
  {
    category: 'Traitement Vidéo & Formats',
    feature: 'Rushes Vidéos 4K & Masters ProRes (> 15 Go)',
    desktop: 'Local SSD (0s)',
    web: 'P2P WebRTC',
  },
  {
    feature: 'Conversion Bandes Rythmo (Mosaic, Word, SRT)',
    desktop: true,
    web: true,
  },
  {
    feature: 'Indexation automatique des dossiers de production',
    desktop: true,
    web: false,
  },
  {
    feature: 'Accès sans aucune installation (1 clic navigateur)',
    desktop: false,
    web: true,
  },

  // SECTION: STUDIO & RÉSEAU
  {
    category: 'Environnement & Connexion',
    feature: '100% Fonctionnel Hors-ligne (Cabine fermée)',
    desktop: true,
    web: false,
  },
  {
    feature: 'Partage en direct de flux régie vers adaptateur',
    desktop: true,
    web: true,
  },
  {
    feature: 'Streaming direct sans stockage AWS S3',
    desktop: true,
    web: true,
  },

  // SECTION: SÉCURITÉ & COLLABORATION
  {
    category: 'Sécurité & Pilotage Studio',
    feature: 'Conformité TPN & NDA Majors (Netflix, Disney+)',
    desktop: true,
    web: true,
  },
  {
    feature: 'Coffre-fort clés IA (OpenAI, Gemini, Groq)',
    desktop: true,
    web: true,
  },
  {
    feature: 'Gestion multi-sociétés, grilles clients & barèmes',
    desktop: false,
    web: true,
  },
  {
    feature: 'Chronomètre & Calcul automatique des gains',
    desktop: false,
    web: true,
  },
  {
    feature: 'Système d’exploitation supporté',
    desktop: 'Windows 10 / 11',
    web: 'Tous navigateurs',
  },
];

export default function SynergyMatrix() {
  return (
    <div className="w-full space-y-12">
      {/* 1. TOP CARDS DECK (Like Threekit cards in the screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
        
        {/* Left Intro Title Column */}
        <div className="md:col-span-4 space-y-3 pb-2">
          <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-amber-400 font-bold">
            ARCHITECTURE DUO
          </p>
          <h3 className="text-3xl sm:text-4xl font-black text-[#f4efe6] tracking-tight leading-tight">
            Deux piliers.<br />
            <span className="font-editorial italic font-normal text-amber-200/90 text-4xl sm:text-5xl">
              Zéro compromis.
            </span>
          </h3>
          <p className="text-xs text-[#9f988b] leading-relaxed max-w-sm">
            Choisissez l&apos;application native pour vos régies de plateau ou la Web App pour équiper instantanément toute votre équipe.
          </p>
        </div>

        {/* Right Cards: Desktop vs Web */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card 1: DubFlow Desktop (Tinted Luxury Amber Card) */}
          <div className="rounded-[28px] p-6 sm:p-7 bg-[#1c1712] border border-amber-500/25 flex flex-col justify-between space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/25">
                  Plateaux &amp; Régies
                </span>
                <Monitor size={18} className="text-amber-400" />
              </div>

              <div>
                <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  DubFlow Desktop
                </h4>
                <p className="text-xs text-amber-200/70 mt-1">
                  Station locale &bull; Rushes 4K &bull; Hors-ligne
                </p>
              </div>

              <div className="pt-2">
                <span className="font-mono text-xs uppercase tracking-wider text-white/50 block">Licence</span>
                <p className="text-2xl sm:text-3xl font-black text-[#f4efe6]">
                  Native <span className="text-xs font-normal text-white/60">.exe 64-bit</span>
                </p>
              </div>
            </div>

            <a
              href="/Setup_ERytmo_Script_Converter.exe"
              download
              className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
            >
              <Download size={14} />
              <span>Télécharger (.exe)</span>
            </a>
          </div>

          {/* Card 2: DubFlow Web (Tinted Clean Studio Card) */}
          <div className="rounded-[28px] p-6 sm:p-7 bg-[#111114] border border-white/10 flex flex-col justify-between space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                  Collaboratif &amp; Nomade
                </span>
                <Globe size={18} className="text-white" />
              </div>

              <div>
                <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  DubFlow Web
                </h4>
                <p className="text-xs text-white/70 mt-1">
                  Cloud Hub &bull; P2P WebRTC &bull; 0 Installation
                </p>
              </div>

              <div className="pt-2">
                <span className="font-mono text-xs uppercase tracking-wider text-white/50 block">Accès</span>
                <p className="text-2xl sm:text-3xl font-black text-[#f4efe6]">
                  Direct <span className="text-xs font-normal text-white/60">URL sécurisée</span>
                </p>
              </div>
            </div>

            <Link
              href="/converter"
              className="w-full py-3 px-4 rounded-xl bg-[#f4efe6] hover:bg-white text-black text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer"
            >
              <span>Lancer en ligne</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

        </div>

      </div>

      {/* 2. MINIMALIST CLEAN MATRIX TABLE (Exact Threekit layout from screenshot) */}
      <div className="pt-6">
        
        {/* Table Header Row */}
        <div className="grid grid-cols-12 pb-4 border-b border-white/10 text-xs font-bold text-white/50">
          <div className="col-span-6 sm:col-span-7">
            <span className="text-sm font-extrabold text-white">Fonctionnalités Clés</span>
          </div>
          <div className="col-span-3 sm:col-span-2.5 text-center text-amber-300 font-bold text-xs sm:text-sm">
            Desktop
          </div>
          <div className="col-span-3 sm:col-span-2.5 text-center text-white font-bold text-xs sm:text-sm">
            Web App
          </div>
        </div>

        {/* Rows with Clean Dividers */}
        <div className="divide-y divide-white/5">
          {ROWS.map((row, idx) => (
            <React.Fragment key={idx}>
              {/* Optional Category Divider */}
              {row.category && (
                <div className="pt-8 pb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
                    {row.category}
                  </span>
                </div>
              )}

              {/* Data Row */}
              <div className="grid grid-cols-12 py-4 items-center text-xs sm:text-sm hover:bg-white/[0.015] transition-colors rounded-lg px-1">
                
                {/* Feature Name */}
                <div className="col-span-6 sm:col-span-7 pr-4">
                  <span className="text-[#d8d2c5] font-medium leading-relaxed block">
                    {row.feature}
                  </span>
                </div>

                {/* Desktop Value */}
                <div className="col-span-3 sm:col-span-2.5 flex items-center justify-center">
                  {typeof row.desktop === 'boolean' ? (
                    row.desktop ? (
                      <div className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center">
                        <Check size={13} strokeWidth={3} />
                      </div>
                    ) : (
                      <Minus size={14} className="text-white/20" />
                    )
                  ) : (
                    <span className="font-mono text-[11px] sm:text-xs font-semibold text-amber-300 text-center">
                      {row.desktop}
                    </span>
                  )}
                </div>

                {/* Web Value */}
                <div className="col-span-3 sm:col-span-2.5 flex items-center justify-center">
                  {typeof row.web === 'boolean' ? (
                    row.web ? (
                      <div className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center shadow-sm">
                        <Check size={13} strokeWidth={3} />
                      </div>
                    ) : (
                      <Minus size={14} className="text-white/20" />
                    )
                  ) : (
                    <span className="font-mono text-[11px] sm:text-xs font-semibold text-white text-center">
                      {row.web}
                    </span>
                  )}
                </div>

              </div>
            </React.Fragment>
          ))}
        </div>

      </div>
    </div>
  );
}
