"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations } from "@/i18n/translations";

type Theme = "light" | "dark";
type Language = "en" | "fr" | "ar";

interface SettingsContextType {
  theme: Theme;
  language: Language;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const savedTheme = localStorage.getItem("theme") as Theme;
    const savedLang = localStorage.getItem("language") as Language;
    
    if (savedTheme) setTheme(savedTheme);
    if (savedLang) setLanguage(savedLang);
    
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    localStorage.setItem("theme", theme);
    localStorage.setItem("language", language);
    
    // Apply theme class to HTML
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Apply text direction for Arabic
    if (language === "ar") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  }, [theme, language, mounted]);

  // Provide default translations for SSR to prevent errors
  const t = (key: string): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ theme, language, setTheme, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
