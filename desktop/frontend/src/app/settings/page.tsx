"use client";

import { useSettings } from "@/context/SettingsContext";
import { Settings, Globe, Moon, Sun, Cpu, ArrowRight } from "lucide-react";
import Link from "next/link";
import CustomSelect from "@/components/CustomSelect";

export default function SettingsPage() {
  const { theme, language, setTheme, setLanguage, t } = useSettings();

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-[#f8fafc] dark:bg-[#09090b] text-slate-800 dark:text-[#f4efe6] relative p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0 pb-5 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#f4efe6] flex items-center tracking-tight">
            <Settings className="mr-3 rtl:mr-0 rtl:ml-3 text-amber-500 dark:text-amber-400 shrink-0" size={28} />
            {t("settings.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9f988b] mt-1">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="w-full space-y-6 pb-6">
        {/* Preferences Section */}
        <div className="w-full bg-white dark:bg-[#121215] rounded-2xl shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
            <h2 className="text-base font-bold text-slate-900 dark:text-[#f4efe6]">{t("settings.preferences")}</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20 rounded-xl">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-[#f4efe6]">{t("settings.language")}</h3>
                </div>
              </div>
              <div className="w-48">
                <CustomSelect
                  options={[
                    { value: "en", label: "English" },
                    { value: "fr", label: "Français" },
                    { value: "ar", label: "العربية" }
                  ]}
                  value={language}
                  onChange={(val) => setLanguage(val as "en" | "fr" | "ar")}
                />
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-white/[0.06]" />

            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20 rounded-xl">
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-[#f4efe6]">{t("settings.theme")}</h3>
                </div>
              </div>
              <div className="flex bg-slate-100 dark:bg-[#18181c] border border-slate-200 dark:border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    theme === "light" 
                      ? "bg-amber-400 text-black shadow-xs font-extrabold" 
                      : "text-slate-500 dark:text-[#71717a] hover:text-slate-900 dark:hover:text-[#f4efe6]"
                  }`}
                >
                  {t("settings.theme.light")}
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    theme === "dark" 
                      ? "bg-amber-400 text-black shadow-xs font-extrabold" 
                      : "text-slate-500 dark:text-[#71717a] hover:text-slate-900 dark:hover:text-[#f4efe6]"
                  }`}
                >
                  {t("settings.theme.dark")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations Section */}
        <div className="bg-white dark:bg-[#121215] rounded-2xl shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
            <h2 className="text-base font-bold text-slate-900 dark:text-[#f4efe6]">{t("settings.integrations")}</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#161619] rounded-xl hover:border-amber-400/50 hover:bg-amber-500/5 dark:hover:bg-[#18181d] transition-all group">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20 rounded-xl">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-[#f4efe6] text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{t("settings.gemini")}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#9f988b] mt-0.5">{t("settings.gemini.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/gemini"
                className="px-4 py-2 bg-white dark:bg-white/[0.05] hover:bg-amber-400 hover:text-black border border-slate-200 dark:border-white/10 hover:border-amber-400 text-slate-800 dark:text-[#f4efe6] font-extrabold text-xs rounded-xl transition-all flex items-center group-hover:shadow-[0_2px_10px_rgba(245,158,11,0.2)] shadow-xs"
              >
                {t("settings.gemini.add")}
                <ArrowRight size={14} className="ml-1.5 rtl:hidden" />
                <ArrowRight size={14} className="mr-1.5 hidden rtl:block rotate-180" />
              </Link>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#161619] rounded-xl hover:border-amber-400/50 hover:bg-amber-500/5 dark:hover:bg-[#18181d] transition-all group">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20 rounded-xl">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-[#f4efe6] text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{t("settings.openai")}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#9f988b] mt-0.5">{t("settings.openai.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/openai"
                className="px-4 py-2 bg-white dark:bg-white/[0.05] hover:bg-amber-400 hover:text-black border border-slate-200 dark:border-white/10 hover:border-amber-400 text-slate-800 dark:text-[#f4efe6] font-extrabold text-xs rounded-xl transition-all flex items-center group-hover:shadow-[0_2px_10px_rgba(245,158,11,0.2)] shadow-xs"
              >
                {t("settings.openai.add")}
                <ArrowRight size={14} className="ml-1.5 rtl:hidden" />
                <ArrowRight size={14} className="mr-2 hidden rtl:block rotate-180" />
              </Link>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#161619] rounded-xl hover:border-amber-400/50 hover:bg-amber-500/5 dark:hover:bg-[#18181d] transition-all group">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20 rounded-xl">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-[#f4efe6] text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{t("settings.groq")}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#9f988b] mt-0.5">{t("settings.groq.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/groq"
                className="px-4 py-2 bg-white dark:bg-white/[0.05] hover:bg-amber-400 hover:text-black border border-slate-200 dark:border-white/10 hover:border-amber-400 text-slate-800 dark:text-[#f4efe6] font-extrabold text-xs rounded-xl transition-all flex items-center group-hover:shadow-[0_2px_10px_rgba(245,158,11,0.2)] shadow-xs"
              >
                {t("settings.groq.add")}
                <ArrowRight size={14} className="ml-1.5 rtl:hidden" />
                <ArrowRight size={14} className="mr-1.5 hidden rtl:block rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
