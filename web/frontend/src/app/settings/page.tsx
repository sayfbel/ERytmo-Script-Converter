"use client";

import { useSettings } from "@/context/SettingsContext";
import { Settings, Globe, Moon, Sun, Cpu, ArrowRight } from "lucide-react";
import Link from "next/link";
import CustomSelect from "@/components/CustomSelect";
import PageHeader from "@/components/PageHeader";

export default function SettingsPage() {
  const { theme, language, setTheme, setLanguage, t } = useSettings();

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 text-[#111111] relative p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header with Title, Icon, Subtitle, and Top-Right Action Pills */}
      <PageHeader
        title={t("settings.title") || "Settings"}
        subtitle={t("settings.subtitle") || "Customize application appearance, preferred localization, and third-party AI provider credentials."}
        icon={<Settings size={28} />}
      />

      <div className="w-full space-y-6 pb-6">
        {/* Preferences Section */}
        <div className="w-full bg-[#ECE8DD] rounded-[28px] shadow-xs border border-[#DDD7C5] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DDD7C5] bg-[#E4DFC8]">
            <h2 className="text-base font-bold text-[#111111]">{t("settings.preferences")}</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-2.5 bg-amber-400/20 text-amber-700 border border-amber-400/30 rounded-full">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#111111]">{t("settings.language")}</h3>
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

            <div className="h-px bg-[#DDD7C5]/60" />

            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-2.5 bg-amber-400/20 text-amber-700 border border-amber-400/30 rounded-full">
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#111111]">{t("settings.theme")}</h3>
                </div>
              </div>
              <div className="flex bg-[#F7F4EB] border border-[#DDD7C5] rounded-full p-1 shadow-xs">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    theme === "light" 
                      ? "bg-amber-400 text-black shadow-xs" 
                      : "text-stone-500 hover:text-[#111111]"
                  }`}
                >
                  {t("settings.theme.light")}
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                    theme === "dark" 
                      ? "bg-amber-400 text-black shadow-xs" 
                      : "text-stone-500 hover:text-[#111111]"
                  }`}
                >
                  {t("settings.theme.dark")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations Section */}
        <div className="bg-[#ECE8DD] rounded-[28px] shadow-xs border border-[#DDD7C5] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DDD7C5] bg-[#E4DFC8]">
            <h2 className="text-base font-bold text-[#111111]">{t("settings.integrations")}</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 border border-[#DDD7C5] bg-[#F7F4EB] rounded-2xl hover:border-amber-400 hover:bg-white transition-all group shadow-xs">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-amber-400/20 text-amber-700 border border-amber-400/30 rounded-2xl">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-[#111111] text-base group-hover:text-amber-700 transition-colors">{t("settings.gemini")}</h3>
                  <p className="text-xs text-stone-600 mt-0.5">{t("settings.gemini.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/gemini"
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-full transition-all flex items-center shadow-xs"
              >
                {t("settings.gemini.add")}
                <ArrowRight size={14} className="ml-1.5 rtl:hidden" />
                <ArrowRight size={14} className="mr-1.5 hidden rtl:block rotate-180" />
              </Link>
            </div>

            <div className="flex items-center justify-between p-4 border border-[#DDD7C5] bg-[#F7F4EB] rounded-2xl hover:border-amber-400 hover:bg-white transition-all group shadow-xs">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-amber-400/20 text-amber-700 border border-amber-400/30 rounded-2xl">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-[#111111] text-base group-hover:text-amber-700 transition-colors">{t("settings.openai")}</h3>
                  <p className="text-xs text-stone-600 mt-0.5">{t("settings.openai.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/openai"
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-full transition-all flex items-center shadow-xs"
              >
                {t("settings.openai.add")}
                <ArrowRight size={14} className="ml-1.5 rtl:hidden" />
                <ArrowRight size={14} className="mr-2 hidden rtl:block rotate-180" />
              </Link>
            </div>

            <div className="flex items-center justify-between p-4 border border-[#DDD7C5] bg-[#F7F4EB] rounded-2xl hover:border-amber-400 hover:bg-white transition-all group shadow-xs">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-amber-400/20 text-amber-700 border border-amber-400/30 rounded-2xl">
                  <Cpu size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-[#111111] text-base group-hover:text-amber-700 transition-colors">{t("settings.groq")}</h3>
                  <p className="text-xs text-stone-600 mt-0.5">{t("settings.groq.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/groq"
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-full transition-all flex items-center shadow-xs"
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
