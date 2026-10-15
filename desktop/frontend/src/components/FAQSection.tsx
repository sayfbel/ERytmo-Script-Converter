'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ShieldCheck, Lock, Sparkles, Film, Cpu, HardDrive } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  icon?: React.ElementType;
}

const FAQS: FAQItem[] = [
  {
    id: 'tpn-security',
    question: 'Comment DubFlow garantit-il la conformité totale aux normes TPN & Majors ?',
    answer: 'Les accords avec les majors (Netflix, Disney, Warner Bros, Canal+) interdisent formellement le stockage non chiffré des masters vidéo sur des clouds tiers. DubFlow respecte cela à la lettre : vos vidéos 4K restent sur vos disques SSD locaux, et les partages se font directement de PC à PC via WebRTC sécurisé de bout en bout, sans aucun stockage AWS S3 intermédiaire.',
    icon: ShieldCheck,
  },
  {
    id: 'offline-mode',
    question: 'Puis-je utiliser DubFlow Desktop 100% hors-ligne en cabine fermée ?',
    answer: 'Absolument. DubFlow Desktop est une application native 64-bit conçue pour fonctionner en environnement "Air-Gapped" sans aucune connexion Internet active. L’analyse récursive des épisodes, le décodage vidéo GPU et la conversion de scripts s’exécutent localement sur le matériel de votre régie.',
    icon: HardDrive,
  },
  {
    id: 'p2p-streaming',
    question: 'Comment fonctionne le streaming P2P direct de régie vers l’adaptateur ?',
    answer: 'Au lieu d’uploader 18 Go de vidéo ProRes sur un serveur distant (ce qui prendrait 20 minutes), DubFlow établit un tunnel direct WebRTC chiffré entre le poste régie et le navigateur de l’adaptateur. Le flux est projeté avec une latence inférieure à 40 ms, zéro Go consommé sur le cloud, et le fichier source ne quitte jamais la régie.',
    icon: Film,
  },
  {
    id: 'ai-keys',
    question: 'Mes clés d’API IA (Gemini, OpenAI, Groq) sont-elles partagées ou stockées ?',
    answer: 'Non. Vos clés d’API personnelles sont stockées dans votre propre coffre-fort local chiffré (LocalStorage sécurisé). Aucune requête ne passe par des serveurs tiers et vous payez directement vos tokens à coût coûtant sans abonnement intermédiaire.',
    icon: Lock,
  },
  {
    id: 'formats-supported',
    question: 'Quels sont les formats de bandes rythmo supportés en import et export ?',
    answer: 'DubFlow prend en charge tous les standards de l’industrie : import de scénarios et dialogues Word (.docx), texte brut ou sous-titres .srt, et export instantané vers Mosaic Studio Excel (.xlsx), ERytmo Word (.docx), formats Cappella et synchronisation Timecode SMPTE.',
    icon: Cpu,
  },
  {
    id: 'rates-gains',
    question: 'Comment est calculée la rémunération des sessions de détection et conformation ?',
    answer: 'La Web App intègre un gestionnaire de barèmes multi-sociétés : vous configurez vos grilles tarifaires par minute ou par heure (détection rythmo, pose de texte, doublage chantant). Le chronomètre de session calcule automatiquement le montant exact à facturer pour chaque épisode.',
    icon: Sparkles,
  },
];

export default function FAQSection() {
  const [openId, setOpenId] = useState<string | null>('tpn-security');

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-24 px-4 sm:px-8 max-w-5xl mx-auto scroll-mt-20">
      
      {/* Section Header matching exact design system of other sections */}
      <div className="max-w-3xl mx-auto text-center space-y-3 mb-16">
        <p className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.25em] text-amber-400 select-none">
          Questions Fréquentes • Sécurité &amp; Architecture
        </p>

        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#f4efe6] leading-[1.1]">
          Tout ce que vous devez savoir.
        </h2>

        <p className="font-editorial text-3xl sm:text-4xl md:text-5xl text-amber-200/90 italic font-normal tracking-wide leading-tight pt-1">
          La clarté absolue sur la conformité TPN et notre écosystème.
        </p>

        <p className="text-xs sm:text-sm text-[#9f988b] max-w-xl mx-auto leading-relaxed pt-2">
          Des réponses transparentes sur le stockage local, le streaming P2P sans cloud tiers et l&apos;intégration dans vos flux de production.
        </p>
      </div>

      {/* Staggered Alternating Accordion List */}
      <div className="space-y-4 max-w-3xl mx-auto">
        {FAQS.map((faq, index) => {
          const isOpen = openId === faq.id;
          const isShiftedRight = index % 2 === 1;

          return (
            <div
              key={faq.id}
              className={`transition-all duration-500 ${
                isShiftedRight ? 'sm:ml-8 sm:mr-0' : 'sm:mr-8 sm:ml-0'
              }`}
            >
              {/* Outer Gradient Border Wrapper: Fades from lighter on the right to transparent on the left */}
              <div
                className={`relative rounded-2xl p-[1px] transition-all duration-300 ${
                  isOpen
                    ? 'bg-gradient-to-l from-white/35 via-white/10 to-transparent shadow-[20px_0_40px_rgba(0,0,0,0.95)]'
                    : 'bg-gradient-to-l from-white/15 via-white/5 to-transparent hover:from-white/25 hover:via-white/10 shadow-[12px_0_25px_rgba(0,0,0,0.85)]'
                }`}
              >
                {/* Inner Card: Gradient Background fading from right to dark shadow on the left */}
                <div
                  className={`relative rounded-[15px] overflow-hidden transition-all duration-300 ${
                    isOpen
                      ? 'bg-gradient-to-l from-[#1c1f29] via-[#121319] to-[#070709]'
                      : 'bg-gradient-to-l from-[#14161f] via-[#0d0e13] to-[#060608]'
                  }`}
                >
                  {/* Question Trigger Button */}
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    aria-expanded={isOpen}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <span
                      className={`font-semibold text-xs sm:text-sm tracking-tight transition-colors duration-200 ${
                        isOpen ? 'text-[#f4efe6] font-bold' : 'text-[#c2bcaf] hover:text-[#f4efe6]'
                      }`}
                    >
                      {faq.question}
                    </span>

                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                        isOpen
                          ? 'rotate-180 bg-white/10 text-white border-white/20 shadow-sm'
                          : 'rotate-0 bg-white/5 text-white/50 border-white/5'
                      }`}
                    >
                      <ChevronDown size={15} />
                    </div>
                  </button>

                  {/* Animated Answer Body */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 sm:px-6 pb-6 pt-1 text-xs text-[#a09a8e] leading-relaxed border-t border-white/5">
                          <p>{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}
