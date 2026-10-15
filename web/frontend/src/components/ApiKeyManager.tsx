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
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-[#f8fafc] dark:bg-[#09090b] text-slate-800 dark:text-[#f4efe6] relative p-4 sm:p-6 lg:p-8 overflow-y-auto">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 pb-5 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center">
          <Link
            href="/settings"
            className="mr-3.5 rtl:mr-0 rtl:ml-3.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-[#71717a] dark:hover:text-[#f4efe6] transition-colors"
            title={t("gemini.back") || "Back to Settings"}
          >
            <ArrowLeft size={22} className="rtl:rotate-180" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#f4efe6] flex items-center tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9f988b] mt-0.5">{subtitle}</p>
          </div>
        </div>

        <button
          onClick={fetchKeys}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-white/[0.04] text-slate-800 dark:text-[#f4efe6] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-colors flex items-center gap-2 text-xs font-semibold shadow-xs cursor-pointer"
          title="Refresh Keys"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-amber-500 dark:text-amber-400" : "text-amber-500 dark:text-amber-400"} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Info Banner about Multi-Key Sequential Fallback */}
      <div className="mb-6 bg-amber-500/10 border border-amber-500/25 dark:border-amber-400/25 rounded-2xl p-4 flex items-start space-x-3 rtl:space-x-reverse">
        <ShieldAlert className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" size={20} />
        <div className="text-xs sm:text-sm text-slate-800 dark:text-[#f4efe6]">
          <span className="font-bold text-amber-700 dark:text-amber-300">
            Sequential Fallback Active:
          </span>{" "}
          <span className="text-slate-600 dark:text-[#c2bcaf]">
            {t("keys.fallback.info") ||
              "The system automatically iterates through all active keys sequentially. If Key 1 fails or hits rate limits (429/503), it will try Key 2, then OpenAI keys, then Groq keys. Deactivated keys are skipped automatically."}
          </span>
        </div>
      </div>

      {/* Feedback Banner */}
      {status && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs flex items-center justify-between border ${
            status.type === "error"
              ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          }`}
        >
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {status.type === "error" ? (
              <AlertCircle size={18} className="shrink-0 text-rose-500 dark:text-rose-400" />
            ) : (
              <CheckCircle size={18} className="shrink-0 text-emerald-500 dark:text-emerald-400" />
            )}
            <span>{status.message}</span>
          </div>
          <button
            onClick={() => setStatus(null)}
            className="text-slate-400 hover:text-slate-600 dark:text-[#71717a] dark:hover:text-[#f4efe6] ml-4 font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="space-y-6 w-full pb-6">
        {/* Add New Key Form Card */}
        <div className="bg-white dark:bg-[#121215] rounded-2xl shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-white/[0.08] p-6">
          <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
            <Plus className={iconColor || "text-amber-500 dark:text-amber-400"} size={20} />
            <h2 className="text-base font-bold text-slate-900 dark:text-[#f4efe6]">
              {t("keys.btn.add") || "Add New API Key"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#c2bcaf] mb-1.5 uppercase tracking-wider">
                {t("keys.table.name") || "Key Name / Label"}
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={t("keys.add.label_placeholder") || "e.g. Main Key, Backup 1"}
                className="w-full bg-slate-50/50 dark:bg-[#18181c] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder:text-[#71717a] rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-amber-400/20 focus:border-amber-500 dark:focus:border-amber-400 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#c2bcaf] mb-1.5 uppercase tracking-wider">
                {t("keys.table.key") || "API Key Value"}
              </label>
              <div className="relative">
                <input
                  type={showNewKey ? "text" : "password"}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-slate-50/50 dark:bg-[#18181c] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder:text-[#71717a] rounded-xl px-4 py-2.5 pr-10 text-xs font-mono focus:ring-1 focus:ring-amber-400/20 focus:border-amber-500 dark:focus:border-amber-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewKey(!showNewKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#71717a] dark:hover:text-[#f4efe6] cursor-pointer"
                >
                  {showNewKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="md:col-span-3">
              <button
                onClick={handleAddKey}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-black font-extrabold py-2.5 px-5 rounded-xl transition-all flex items-center justify-center shadow-[0_4px_15px_rgba(245,158,11,0.25)] text-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 size={15} className="animate-spin mr-2 rtl:ml-2" />
                ) : (
                  <Plus size={15} className="mr-2 rtl:ml-2" />
                )}
                {t("keys.btn.add") || "Add & Validate Key"}
              </button>
            </div>
          </div>
        </div>

        {/* API Keys Table Card */}
        <div className="bg-white dark:bg-[#121215] rounded-2xl shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Key className={iconColor || "text-amber-500 dark:text-amber-400"} size={20} />
              <h2 className="text-base font-bold text-slate-900 dark:text-[#f4efe6]">
                Configured Keys List
              </h2>
            </div>
            <div className="text-xs font-semibold px-3 py-1 bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-[#c2bcaf] border border-slate-200 dark:border-white/10 rounded-full">
              {activeCount} Active / {keys.length} Total
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 flex justify-center items-center text-slate-400 dark:text-[#71717a] text-xs">
              <Loader2 size={20} className="animate-spin mr-2 text-amber-500 dark:text-amber-400" /> Loading keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-[#71717a]">
              <Key size={36} className="mx-auto mb-3 opacity-30 text-amber-500 dark:text-amber-400" />
              <p className="font-semibold text-slate-900 dark:text-[#f4efe6] text-sm">No API keys found</p>
              <p className="text-xs mt-1 text-slate-500 dark:text-[#9f988b]">Add your first key above to start using the engine.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-[#c2bcaf]">
                <thead className="bg-slate-50 dark:bg-[#161619] text-slate-500 dark:text-[#71717a] uppercase text-[11px] font-bold border-b border-slate-100 dark:border-white/[0.08]">
                  <tr>
                    <th className="px-6 py-3.5"># / {t("keys.table.name") || "Label"}</th>
                    <th className="px-6 py-3.5">{t("keys.table.key") || "API Key"}</th>
                    <th className="px-6 py-3.5">{t("keys.table.status") || "Status"}</th>
                    <th className="px-6 py-3.5 text-right">{t("keys.table.actions") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {keys.map((k, index) => {
                    const isEditing = editingKeyId === k.id;
                    return (
                      <tr
                        key={k.id}
                        className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02] ${
                          !k.is_active ? "opacity-50" : ""
                        }`}
                      >
                        {/* Label Column */}
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-[#f4efe6]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="bg-white dark:bg-[#18181c] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-[#f4efe6] font-medium focus:border-amber-500 dark:focus:border-amber-400 outline-none"
                            />
                          ) : (
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <span className="text-xs text-slate-400 dark:text-[#71717a] font-mono">#{index + 1}</span>
                              <span className="font-bold">{k.label}</span>
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
                              className="w-full bg-white dark:bg-[#18181c] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-[#f4efe6] outline-none focus:border-amber-500 dark:focus:border-amber-400"
                            />
                          ) : (
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                              <span className="bg-slate-100 dark:bg-[#18181c] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-800 dark:text-[#f4efe6]">
                                {k.masked_key}
                              </span>
                              <button
                                onClick={() => handleCopy(k.id, k.key)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:text-[#71717a] dark:hover:text-[#f4efe6] transition-colors cursor-pointer"
                                title="Copy Key"
                              >
                                {copiedId === k.id ? (
                                  <Check size={14} className="text-amber-500 dark:text-amber-400" />
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
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              k.is_active
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-[#71717a] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.08]"
                            }`}
                            title={k.is_active ? "Click to Deactivate" : "Click to Activate"}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-2 rtl:ml-2 ${
                                k.is_active ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse" : "bg-slate-400 dark:bg-zinc-600"
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
                                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
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
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#f4efe6] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Toggle Active Button */}
                                <button
                                  onClick={() => handleToggleActive(k.id)}
                                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                    k.is_active
                                      ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 hover:bg-amber-100 dark:hover:bg-amber-400/20"
                                      : "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                  }`}
                                  title={
                                    k.is_active
                                      ? t("keys.btn.deactivate") || "Deactivate Key"
                                      : t("keys.btn.activate") || "Activate Key"
                                  }
                                >
                                  <Power size={14} />
                                </button>

                                {/* Edit Button */}
                                <button
                                  onClick={() => handleStartEdit(k)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:text-[#71717a] dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                                  title={t("keys.btn.edit") || "Update Key"}
                                >
                                  <Edit3 size={14} />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => setDeleteTargetId(k.id)}
                                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors cursor-pointer"
                                  title={t("keys.btn.delete") || "Delete Key"}
                                >
                                  <Trash2 size={14} />
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
