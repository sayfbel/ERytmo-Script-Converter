'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

interface StudioLogo {
  name: string;
  renderLogo: () => React.ReactNode;
}

const STUDIOS: StudioLogo[] = [
  {
    name: 'Netflix',
    renderLogo: () => (
      <span className="font-black tracking-[0.24em] text-xl sm:text-2xl text-[#E50914] drop-shadow-[0_0_16px_rgba(229,9,20,0.45)] select-none">
        NETFLIX
      </span>
    ),
  },
  {
    name: 'Disney+',
    renderLogo: () => (
      <span className="font-black italic tracking-wide text-xl sm:text-2xl text-[#f4efe6] font-serif select-none">
        Disney<span className="text-amber-400 not-italic font-sans text-base sm:text-xl ml-0.5">+</span>
      </span>
    ),
  },
  {
    name: 'Warner Bros.',
    renderLogo: () => (
      <div className="flex items-center gap-2 text-[#f4efe6] select-none">
        <div className="w-6 h-7 rounded-full border border-amber-400 flex items-center justify-center text-[11px] font-black text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
          WB
        </div>
        <span className="font-extrabold tracking-tight text-sm sm:text-base">WARNER BROS.</span>
      </div>
    ),
  },
  {
    name: 'Canal+',
    renderLogo: () => (
      <span className="font-black tracking-tight text-lg sm:text-xl text-white select-none">
        CANAL<span className="text-amber-400 font-bold ml-0.5">+</span>
      </span>
    ),
  },
  {
    name: 'Paramount',
    renderLogo: () => (
      <div className="flex flex-col items-center leading-none select-none">
        <span className="text-[10px] text-amber-300 tracking-[0.25em]">★★★★★</span>
        <span className="font-serif italic font-bold text-base sm:text-lg text-[#f4efe6] tracking-wide">
          Paramount
        </span>
      </div>
    ),
  },
  {
    name: 'Universal',
    renderLogo: () => (
      <span className="font-black tracking-[0.28em] text-xs sm:text-sm text-[#f4efe6] select-none">
        UNIVERSAL
      </span>
    ),
  },
  {
    name: 'Sony Pictures',
    renderLogo: () => (
      <span className="font-extrabold tracking-[0.2em] text-xs sm:text-sm text-white select-none">
        SONY PICTURES
      </span>
    ),
  },
  {
    name: 'Titra Film',
    renderLogo: () => (
      <span className="font-mono font-bold tracking-wider text-xs sm:text-sm text-amber-300 select-none">
        TITRA FILM
      </span>
    ),
  },
  {
    name: 'Dubbing Brothers',
    renderLogo: () => (
      <span className="font-black tracking-tight text-xs sm:text-sm text-[#e0dad0] select-none">
        DUBBING <span className="text-amber-400">BROTHERS</span>
      </span>
    ),
  },
  {
    name: 'HBO Max',
    renderLogo: () => (
      <span className="font-black tracking-wider text-base sm:text-lg text-white select-none">
        HBO <span className="font-light text-amber-300">MAX</span>
      </span>
    ),
  },
];

export default function CinematicLogoCloud() {
  return (
    <div className="relative mt-14 pt-12 border-t border-white/5 overflow-hidden">
      {/* Header with curated Trusted By title */}
      <div className="max-w-3xl mx-auto text-center space-y-2 mb-10 px-4 relative z-10">
        <motion.p
          initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.3em] text-amber-400 select-none"
        >
          TRUSTED BY POST-PRODUCTION STUDIOS &amp; MAJORS
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs sm:text-sm text-[#9f988b] max-w-lg mx-auto font-normal leading-relaxed"
        >
          Conçu pour répondre aux audits de sécurité les plus stricts de l&apos;industrie du doublage cinématographique et télévisuel.
        </motion.p>
      </div>

      {/* Pure Floating Logos Cloud (No Boxes, Pure Staggered Blur-Fade) */}
      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
            hidden: {},
          }}
          className="flex flex-wrap items-center justify-center gap-x-12 sm:gap-x-16 gap-y-8 sm:gap-y-10"
        >
          {STUDIOS.map((studio) => (
            <motion.div
              key={studio.name}
              variants={{
                hidden: { opacity: 0, y: 20, filter: 'blur(12px)' },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: {
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                  },
                },
              }}
              className="flex items-center justify-center transition-all duration-300 opacity-60 hover:opacity-100 hover:scale-110 cursor-default"
            >
              {studio.renderLogo()}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Cinematic Edge Gradient Mask & TPN Info */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 1 }}
        className="mt-12 flex items-center justify-center gap-3 text-[11px] text-[#7a7469] font-mono"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Protocoles de sécurité TPN, MPAA &amp; Chiffrement E2E validés</span>
      </motion.div>
    </div>
  );
}
