"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, Plus, Trash2, Calendar as CalendarIcon, DollarSign, TrendingUp, BarChart2, ChevronDown } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import CustomSelect from "@/components/CustomSelect";
import { apiFetch } from "@/lib/api";

interface Project {
  id: number;
  name: string;
  company_id: number;
  company_name: string;
  project_type: string;
}

interface Company {
  id: number;
  name: string;
  rate_detection: number | null;
  rate_conformation: number | null;
  rate_pose_texte: number | null;
  rate_chantant: number | null;
}

interface TimeEntry {
  id: string;
  date: string;
  projectId: number;
  duration: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Détection":    { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20",  dot: "bg-violet-400"  },
  "Conformation": { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/20",     dot: "bg-sky-400"     },
  "Pose de texte":{ bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  "Chantant":     { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   dot: "bg-amber-400"   },
};

const DEFAULT_COLOR = { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", dot: "bg-slate-400" };

export default function TimeManagementPage() {
  const { t } = useSettings();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [projectId, setProjectId] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [filterType, setFilterType] = useState<string>("all");

  const storageKey = user?.id ? `erytmo_time_entries_${user.id}` : "erytmo_time_entries";

  useEffect(() => {
    if (user?.id) { fetchProjects(); fetchCompanies(); }
    else { setProjects([]); setCompanies([]); }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem(`erytmo_time_entries_${user.id}`);
    if (saved) { try { setEntries(JSON.parse(saved)); } catch { setEntries([]); } }
    else setEntries([]);
  }, [user]);

  const fetchProjects = async () => {
    try { const r = await apiFetch("/api/projects"); if (r.ok) setProjects(await r.json()); } catch {}
  };
  const fetchCompanies = async () => {
    try { const r = await apiFetch("/api/companies"); if (r.ok) setCompanies(await r.json()); } catch {}
  };

  const getRateForProject = (pid: number): number => {
    const proj = projects.find(p => p.id === pid);
    if (!proj) return 0;
    let comp = companies.find(c => c.id === proj.company_id);
    if (!comp && proj.company_name) comp = companies.find(c => c.name === proj.company_name);
    if (!comp) return 0;
    switch (proj.project_type) {
      case "Détection":    return comp.rate_detection    || 0;
      case "Conformation": return comp.rate_conformation || 0;
      case "Pose de texte":return comp.rate_pose_texte   || 0;
      case "Chantant":     return comp.rate_chantant     || 0;
      default:             return 0;
    }
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !duration || !date) return;
    const newEntry: TimeEntry = { id: Date.now().toString(), date, projectId: parseInt(projectId), duration: parseInt(duration) };
    const updated = [...entries, newEntry];
    setEntries(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setShowModal(false); setDuration(""); setProjectId("");
  };

  const handleDeleteEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // --- Derived metrics ---
  const totalMinutes = entries.reduce((a, c) => a + c.duration, 0);
  const totalHours   = (totalMinutes / 60).toFixed(1);
  const totalEarned  = entries.reduce((a, c) => a + c.duration * getRateForProject(c.projectId), 0).toFixed(2);

  // Top-earning project
  const topProjectData = useMemo(() => {
    const map: Record<number, number> = {};
    entries.forEach(e => { map[e.projectId] = (map[e.projectId] || 0) + e.duration * getRateForProject(e.projectId); });
    const topId = Object.keys(map).sort((a, b) => map[+b] - map[+a])[0];
    if (!topId) return null;
    const proj = projects.find(p => p.id === +topId);
    return proj ? { name: proj.name, earned: map[+topId].toFixed(0) } : null;
  }, [entries, projects, companies]);

  // Type breakdown for mini bar chart
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => {
      const proj = projects.find(p => p.id === e.projectId);
      const type = proj?.project_type || "Unknown";
      map[type] = (map[type] || 0) + e.duration;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map).map(([type, mins]) => ({ type, mins, pct: Math.round((mins / total) * 100) }));
  }, [entries, projects]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filterType === "all") return sorted;
    return sorted.filter(e => {
      const proj = projects.find(p => p.id === e.projectId);
      return proj?.project_type === filterType;
    });
  }, [entries, projects, filterType]);

  const uniqueTypes = useMemo(() => Array.from(new Set(entries.map(e => projects.find(p => p.id === e.projectId)?.project_type || "Unknown"))), [entries, projects]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#09090b] text-slate-800 dark:text-[#f4efe6] p-4 sm:p-6 lg:p-8 overflow-y-auto gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#f4efe6] flex items-center gap-3 tracking-tight">
            <span className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <Clock size={20} />
            </span>
            {t("time.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#9f988b] mt-1 ml-13">{t("time.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="self-start sm:self-auto bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 text-sm shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Plus size={18} /> {t("time.add")}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Hours */}
        <div className="col-span-1 bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Clock size={17} />
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-[#71717a] uppercase tracking-wider">{t("time.total_hours")}</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-[#f4efe6] tracking-tight">{totalHours}<span className="text-sm font-normal text-slate-400 dark:text-[#71717a] ml-1">hrs</span></p>
        </div>

        {/* Total Earned */}
        <div className="col-span-1 bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign size={17} />
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-[#71717a] uppercase tracking-wider">{t("time.total_earned")}</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-[#f4efe6] tracking-tight">{totalEarned}<span className="text-sm font-normal text-slate-400 dark:text-[#71717a] ml-1">MAD</span></p>
        </div>

        {/* Sessions */}
        <div className="col-span-1 bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <CalendarIcon size={17} />
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-[#71717a] uppercase tracking-wider">Sessions</span>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-[#f4efe6] tracking-tight">{entries.length}<span className="text-sm font-normal text-slate-400 dark:text-[#71717a] ml-1">entries</span></p>
        </div>

        {/* Top Project */}
        <div className="col-span-1 bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <TrendingUp size={17} />
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-[#71717a] uppercase tracking-wider">Top Project</span>
          </div>
          {topProjectData ? (
            <>
              <p className="text-sm font-bold text-slate-900 dark:text-[#f4efe6] truncate">{topProjectData.name}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{topProjectData.earned} MAD</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 dark:text-[#71717a]">—</p>
          )}
        </div>
      </div>

      {/* Type Breakdown Chart */}
      {typeBreakdown.length > 0 && (
        <div className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] p-5 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-slate-400 dark:text-[#71717a]" />
            <span className="text-xs font-bold text-slate-400 dark:text-[#71717a] uppercase tracking-wider">Breakdown by Type</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {typeBreakdown.map(({ type, pct }) => {
              const c = TYPE_COLORS[type] || DEFAULT_COLOR;
              return (
                <div key={type} className={`h-2 rounded-full ${c.dot}`} style={{ width: `${pct}%`, minWidth: "4px" }} title={`${type}: ${pct}%`} />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {typeBreakdown.map(({ type, mins, pct }) => {
              const c = TYPE_COLORS[type] || DEFAULT_COLOR;
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className="text-xs font-medium text-slate-600 dark:text-[#c2bcaf]">{type}</span>
                  <span className="text-xs text-slate-400 dark:text-[#71717a]">({Math.round(mins / 60 * 10) / 10}h · {pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col min-h-[280px]">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02]">
          <span className="text-sm font-bold text-slate-700 dark:text-[#f4efe6]">Time Entries <span className="text-xs font-normal text-slate-400 dark:text-[#71717a] ml-1">({filteredEntries.length})</span></span>
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="appearance-none text-xs font-semibold bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#c2bcaf] rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <Clock className="text-amber-400" size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#f4efe6] mb-1">{t("time.no_found")}</h3>
            <p className="text-xs text-slate-500 dark:text-[#9f988b] mb-4">Start logging work duration to automatically track billable amounts.</p>
            <button onClick={() => setShowModal(true)} className="text-amber-600 dark:text-amber-400 text-sm font-bold hover:underline cursor-pointer">+ {t("time.add")}</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-[#161619] border-b border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-[#71717a] text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">{t("time.table.date")}</th>
                  <th className="py-3 px-5">{t("time.table.project")}</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">{t("time.table.duration")}</th>
                  <th className="py-3 px-5">{t("time.table.rate")}</th>
                  <th className="py-3 px-5">{t("time.table.cost")}</th>
                  <th className="py-3 px-5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {filteredEntries.map(entry => {
                  const proj = projects.find(p => p.id === entry.projectId);
                  const rate = getRateForProject(entry.projectId);
                  const cost = (entry.duration * rate).toFixed(2);
                  const tc = TYPE_COLORS[proj?.project_type || ""] || DEFAULT_COLOR;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3.5 px-5 text-sm text-slate-600 dark:text-[#c2bcaf]">
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={13} className="text-slate-400 dark:text-[#71717a] shrink-0" />
                          {new Date(entry.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-sm font-bold text-slate-900 dark:text-[#f4efe6]">{proj?.name || "Unknown"}</td>
                      <td className="py-3.5 px-5">
                        {proj?.project_type ? (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${tc.bg} ${tc.text} ${tc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
                            {proj.project_type}
                          </span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3.5 px-5 text-sm font-mono text-slate-600 dark:text-[#c2bcaf]">
                        {entry.duration} <span className="text-xs text-slate-400">min</span>
                        <span className="text-xs text-slate-400 dark:text-[#71717a] ml-1">({(entry.duration / 60).toFixed(1)}h)</span>
                      </td>
                      <td className="py-3.5 px-5 text-sm font-mono text-slate-500 dark:text-[#9f988b]">{rate > 0 ? `${rate} MAD` : "—"}</td>
                      <td className="py-3.5 px-5 text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400">{cost} MAD</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white dark:bg-[#141417] rounded-2xl shadow-2xl w-full max-w-md border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-200/80 dark:border-white/[0.08]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#f4efe6]">{t("time.add")}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-[#f4efe6] hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded-full transition-colors cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">{t("time.form.date")}</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-[#f4efe6] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">{t("time.form.project")}</label>
                <CustomSelect
                  value={projectId}
                  onChange={val => setProjectId(val)}
                  options={projects.map(p => ({ value: p.id.toString(), label: `${p.name} — ${p.project_type || "?"}` }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">{t("time.form.duration")} <span className="font-normal text-slate-400">(e.g. 120 = 2h)</span></label>
                <input type="number" required min="1" placeholder="120" value={duration} onChange={e => setDuration(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#18181c] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20" />
                {projectId && duration && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-mono">
                    ≈ {(parseInt(duration) * getRateForProject(parseInt(projectId))).toFixed(2)} MAD at {getRateForProject(parseInt(projectId))} MAD/min
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200/80 dark:border-white/[0.08]">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-[#c2bcaf] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
                  {t("cancel")}
                </button>
                <button type="submit" className="px-5 py-2.5 text-sm font-black text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-[0_4px_15px_rgba(245,158,11,0.25)] cursor-pointer">
                  {t("time.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
