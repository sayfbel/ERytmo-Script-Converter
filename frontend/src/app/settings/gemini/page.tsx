"use client";

import ApiKeyManager from "@/components/ApiKeyManager";
import { useSettings } from "@/context/SettingsContext";

export default function GeminiSettingsPage() {
  const { t } = useSettings();

  return (
    <ApiKeyManager
      provider="gemini"
      title={t("gemini.title") || "Gemini AI Settings"}
      subtitle={t("gemini.subtitle") || "Configure multiple Gemini API Keys. Active keys are used sequentially."}
      iconColor="text-purple-500"
      placeholder="AIzaSy..."
    />
  );
}
