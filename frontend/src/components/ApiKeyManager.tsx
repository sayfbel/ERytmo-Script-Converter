"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Key, CheckCircle, AlertCircle, Loader2, ArrowLeft, Trash2, 
  Power, Plus, Copy, Eye, EyeOff, Edit3, ShieldAlert, Check, RefreshCw 
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import { apiFetch } from "@/lib/api";

export interface ApiKeyItem {
  id: number;
  provider: string;
  label: string;
  key: string;
  masked_key: string;
  is_active: boolean;
  created_at: string | null;
}

interface ApiKeyManagerProps {
  provider: "gemini" | "openai" | "groq";
  title: string;
  subtitle: string;
  iconColor: string;
  placeholder: string;
}

export default function ApiKeyManager({
  provider,
  title,
  subtitle,
  iconColor,
  placeholder,
}: ApiKeyManagerProps) {
  const { t } = useSettings();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states for adding new key
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [showNewKey, setShowNewKey] = useState(false);

  // Editing state
  const [editingKeyId, setEditingKeyId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editKeyValue, setEditKeyValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch(`/api/settings/keys?provider=${provider}`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (err) {
      console.error("Failed to fetch API keys", err);
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleAddKey = async () => {
    if (!newKey.trim()) {
      setStatus({ type: "error", message: "Please enter an API Key." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const res = await apiFetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          key: newKey.trim(),
          label: newLabel.trim() || undefined,
          is_active: true,
        }),
      });

      if (res.ok) {
        setStatus({ type: "success", message: "API key validated & added successfully!" });
        setNewKey("");
        setNewLabel("");
        fetchKeys();
      } else {
        const errData = await res.json();
        setStatus({ type: "error", message: errData.detail || "Failed to add API key." });
      }
    } catch {
      setStatus({ type: "error", message: "An unexpected network error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const res = await apiFetch(`/api/settings/keys/${id}/toggle`, {
        method: "PATCH",
      });
      if (res.ok) {
        fetchKeys();
      } else {
        const errData = await res.json();
        setStatus({ type: "error", message: errData.detail || "Failed to toggle status." });
      }
    } catch {
      setStatus({ type: "error", message: "Network error toggling status." });
    }
  };

  const handleStartEdit = (k: ApiKeyItem) => {
    setEditingKeyId(k.id);
    setEditLabel(k.label);
    setEditKeyValue("");
  };

  const handleSaveEdit = async (id: number) => {
    setIsUpdating(true);
    setStatus(null);

    try {
      const payload: { label?: string; key?: string } = {
        label: editLabel.trim(),
      };
      if (editKeyValue.trim()) {
        payload.key = editKeyValue.trim();
      }

      const res = await apiFetch(`/api/settings/keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus({ type: "success", message: "Key updated successfully!" });
        setEditingKeyId(null);
        fetchKeys();
      } else {
        const errData = await res.json();
        setStatus({ type: "error", message: errData.detail || "Failed to update key." });
      }
    } catch {
      setStatus({ type: "error", message: "Network error updating key." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    try {
      const res = await apiFetch(`/api/settings/keys/${deleteTargetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setStatus({ type: "success", message: "API key deleted successfully." });
        setDeleteTargetId(null);
        fetchKeys();
      } else {
        const errData = await res.json();
        setStatus({ type: "error", message: errData.detail || "Failed to delete key." });
      }
    } catch {
      setStatus({ type: "error", message: "Network error deleting key." });
    }
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeCount = keys.filter((k) => k.is_active).length;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50 dark:bg-slate-900 relative p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center">
          <Link
            href="/settings"
            className="mr-3.5 rtl:mr-0 rtl:ml-3.5 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title={t("gemini.back") || "Back to Settings"}
          >
            <ArrowLeft size={22} className="rtl:rotate-180" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <button
          onClick={fetchKeys}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-xs"
          title="Refresh Keys"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Info Banner about Multi-Key Sequential Fallback */}
      <div className="mb-6 bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 rounded-2xl p-4 flex items-start space-x-3 rtl:space-x-reverse">
        <ShieldAlert className="text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" size={20} />
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-teal-700 dark:text-teal-300">
            Sequential Fallback Active:
          </span>{" "}
          {t("keys.fallback.info") ||
            "The system automatically iterates through all active keys sequentially. If Key 1 fails or hits rate limits (429/503), it will try Key 2, then OpenAI keys, then Groq keys. Deactivated keys are skipped automatically."}
        </div>
      </div>

      {/* Feedback Banner */}
      {status && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm flex items-center justify-between ${
            status.type === "error"
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50"
              : "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50"
          }`}
        >
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {status.type === "error" ? (
              <AlertCircle size={18} className="shrink-0" />
            ) : (
              <CheckCircle size={18} className="shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
          <button
            onClick={() => setStatus(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="space-y-6 w-full pb-6">
        {/* Add New Key Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
            <Plus className={`${iconColor}`} size={20} />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {t("keys.btn.add") || "Add New API Key"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                {t("keys.table.name") || "Key Name / Label"}
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={t("keys.add.label_placeholder") || "e.g. Main Key, Backup 1"}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                {t("keys.table.key") || "API Key Value"}
              </label>
              <div className="relative">
                <input
                  type={showNewKey ? "text" : "password"}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewKey(!showNewKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="md:col-span-3">
              <button
                onClick={handleAddKey}
                disabled={isSubmitting}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium py-2.5 px-5 rounded-xl transition-all flex items-center justify-center shadow-sm text-sm"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin mr-2 rtl:ml-2" />
                ) : (
                  <Plus size={16} className="mr-2 rtl:ml-2" />
                )}
                {t("keys.btn.add") || "Add & Validate Key"}
              </button>
            </div>
          </div>
        </div>

        {/* API Keys Table Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Key className={iconColor} size={22} />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Configured Keys List
              </h2>
            </div>
            <div className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
              {activeCount} Active / {keys.length} Total
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 flex justify-center items-center text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" /> Loading keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
              <Key size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-600 dark:text-slate-300">No API keys found</p>
              <p className="text-xs mt-1">Add your first key above to start using the engine.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4"># / {t("keys.table.name") || "Label"}</th>
                    <th className="px-6 py-4">{t("keys.table.key") || "API Key"}</th>
                    <th className="px-6 py-4">{t("keys.table.status") || "Status"}</th>
                    <th className="px-6 py-4 text-right">{t("keys.table.actions") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {keys.map((k, index) => {
                    const isEditing = editingKeyId === k.id;
                    return (
                      <tr
                        key={k.id}
                        className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30 ${
                          !k.is_active ? "opacity-60 bg-slate-50/30 dark:bg-slate-900/20" : ""
                        }`}
                      >
                        {/* Label Column */}
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 text-sm font-medium focus:ring-1 focus:ring-teal-500 outline-none"
                            />
                          ) : (
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <span className="text-xs text-slate-400 font-mono">#{index + 1}</span>
                              <span className="font-semibold">{k.label}</span>
                            </div>
                          )}
                        </td>

                        {/* API Key Value Column */}
                        <td className="px-6 py-4 font-mono text-xs">
                          {isEditing ? (
                            <input
                              type="password"
                              value={editKeyValue}
                              onChange={(e) => setEditKeyValue(e.target.value)}
                              placeholder="Leave blank to keep unchanged"
                              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          ) : (
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <span className="bg-slate-100 dark:bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                {k.masked_key}
                              </span>
                              <button
                                onClick={() => handleCopy(k.id, k.key)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title="Copy Key"
                              >
                                {copiedId === k.id ? (
                                  <Check size={14} className="text-teal-500" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(k.id)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                              k.is_active
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 hover:bg-green-200"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                            }`}
                            title={k.is_active ? "Click to Deactivate" : "Click to Activate"}
                          >
                            <span
                              className={`w-2 h-2 rounded-full mr-2 rtl:ml-2 ${
                                k.is_active ? "bg-green-500 animate-pulse" : "bg-slate-400"
                              }`}
                            />
                            {k.is_active
                              ? t("keys.table.active") || "Active"
                              : t("keys.table.inactive") || "Deactivated"}
                          </button>
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(k.id)}
                                  disabled={isUpdating}
                                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                  {isUpdating ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : (
                                    <Check size={12} />
                                  )}
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingKeyId(null)}
                                  className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Toggle Active Button */}
                                <button
                                  onClick={() => handleToggleActive(k.id)}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    k.is_active
                                      ? "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-400"
                                      : "text-green-600 border-green-200 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400"
                                  }`}
                                  title={
                                    k.is_active
                                      ? t("keys.btn.deactivate") || "Deactivate Key"
                                      : t("keys.btn.activate") || "Activate Key"
                                  }
                                >
                                  <Power size={15} />
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => handleStartEdit(k)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title={t("keys.btn.edit") || "Update Key"}
                                >
                                  <Edit3 size={15} />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => setDeleteTargetId(k.id)}
                                  className="p-1.5 rounded-lg border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                  title={t("keys.btn.delete") || "Delete Key"}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title={t("keys.btn.delete") || "Delete API Key"}
        message={
          t("keys.delete.confirm") ||
          "Are you sure you want to delete this API key? This action cannot be undone."
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
        type="danger"
      />
    </div>
  );
}
