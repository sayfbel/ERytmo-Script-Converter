"use client";

import ApiKeyManager from "@/components/ApiKeyManager";
import { useSettings } from "@/context/SettingsContext";

export default function GroqSettingsPage() {
  const { t } = useSettings();

  return (
    <ApiKeyManager
      provider="groq"
      title={t("groq.title") || "Groq AI Settings"}
      subtitle={t("groq.subtitle") || "Configure multiple Groq API Keys for ultra-fast fallback parsing."}
      iconColor="text-orange-500"
      placeholder="gsk_..."
    />
  );
}
