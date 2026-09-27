"use client";

import ApiKeyManager from "@/components/ApiKeyManager";
import { useSettings } from "@/context/SettingsContext";

export default function OpenAISettingsPage() {
  const { t } = useSettings();

  return (
    <ApiKeyManager
      provider="openai"
      title={t("openai.title") || "OpenAI Settings"}
      subtitle={t("openai.subtitle") || "Configure multiple OpenAI API Keys for fallback script parsing."}
      iconColor="text-blue-500"
      placeholder="sk-..."
    />
  );
}
