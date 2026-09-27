"use client";

import { useSettings } from "@/context/SettingsContext";
import { Settings, Globe, Moon, Sun, Cpu, ArrowRight } from "lucide-react";
import Link from "next/link";
import CustomSelect from "@/components/CustomSelect";

export default function SettingsPage() {
  const { theme, language, setTheme, setLanguage, t } = useSettings();

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50 dark:bg-slate-900 relative p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
            <Settings className="mr-3 rtl:mr-0 rtl:ml-3 text-teal-600 dark:text-teal-400 shrink-0" size={28} />
            {t("settings.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="w-full space-y-6 pb-6">
        {/* Preferences Section */}
        <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("settings.preferences")}</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t("settings.language")}</h3>
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

            <div className="h-px bg-slate-100 dark:bg-slate-700" />

            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">{t("settings.theme")}</h3>
                </div>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    theme === "light" 
                      ? "bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {t("settings.theme.light")}
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                    theme === "dark" 
                      ? "bg-white dark:bg-slate-700 shadow-sm text-teal-600 dark:text-teal-400" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {t("settings.theme.dark")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("settings.integrations")}</h2>
          </div>
          
          <div className="p-6">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-teal-300 dark:hover:border-teal-600 transition-colors group">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{t("settings.gemini")}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("settings.gemini.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/gemini"
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 group-hover:text-teal-600 dark:group-hover:text-teal-400"
              >
                {t("settings.gemini.add")}
                <ArrowRight size={16} className="ml-2 rtl:hidden" />
                <ArrowRight size={16} className="mr-2 hidden rtl:block rotate-180" />
              </Link>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-teal-300 dark:hover:border-teal-600 transition-colors group mt-4">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{t("settings.openai")}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("settings.openai.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/openai"
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 group-hover:text-teal-600 dark:group-hover:text-teal-400"
              >
                {t("settings.openai.add")}
                <ArrowRight size={16} className="ml-2 rtl:hidden" />
                <ArrowRight size={16} className="mr-2 hidden rtl:block rotate-180" />
              </Link>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-teal-300 dark:hover:border-teal-600 transition-colors group mt-4">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{t("settings.groq")}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("settings.groq.desc")}</p>
                </div>
              </div>
              <Link 
                href="/settings/groq"
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 group-hover:text-teal-600 dark:group-hover:text-teal-400"
              >
                {t("settings.groq.add")}
                <ArrowRight size={16} className="ml-2 rtl:hidden" />
                <ArrowRight size={16} className="mr-2 hidden rtl:block rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
