"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
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
  duration: number; // in minutes
}

export default function TimeManagementPage() {
  const { t } = useSettings();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [projectId, setProjectId] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
    
    // Load from local storage
    const saved = localStorage.getItem("erytmo_time_entries");
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await apiFetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await apiFetch("/api/companies");
      if (res.ok) setCompanies(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const getRateForProject = (projId: number): number => {
    const proj = projects.find(p => p.id === projId);
    if (!proj) return 0;
    
    // Fallback: match by company_name if company_id is null (older data)
    let comp = companies.find(c => c.id === proj.company_id);
    if (!comp && proj.company_name) {
      comp = companies.find(c => c.name === proj.company_name);
    }
    if (!comp) return 0;
    
    let rate = 0;
    switch (proj.project_type) {
      case "Détection": rate = comp.rate_detection || 0; break;
      case "Conformation": rate = comp.rate_conformation || 0; break;
      case "Pose de texte": rate = comp.rate_pose_texte || 0; break;
      case "Chantant": rate = comp.rate_chantant || 0; break;
      default: rate = 0; break;
    }
    return rate;
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !duration || !date) return;
    
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      date,
      projectId: parseInt(projectId),
      duration: parseInt(duration)
    };
    
    const updated = [...entries, newEntry];
    setEntries(updated);
    localStorage.setItem("erytmo_time_entries", JSON.stringify(updated));
    
    setShowModal(false);
    setDuration("");
  };

  const handleDeleteEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    localStorage.setItem("erytmo_time_entries", JSON.stringify(updated));
  };

  // Calculations
  const totalMinutes = entries.reduce((acc, curr) => acc + curr.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  
  const totalEarned = entries.reduce((acc, curr) => {
    const rate = getRateForProject(curr.projectId);
    return acc + (curr.duration * rate);
  }, 0).toFixed(2);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50 dark:bg-slate-900 relative p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
            <Clock className="mr-3 rtl:mr-0 rtl:ml-3 text-teal-600 dark:text-teal-400 shrink-0" size={28} />
            {t("time.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{t("time.subtitle")}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center text-sm shrink-0 self-start sm:self-auto transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} className="mr-2 rtl:mr-0 rtl:ml-2" />
          {t("time.add")}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 shrink-0">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center">
          <div className="w-12 h-12 bg-blue-100/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mr-4 rtl:mr-0 rtl:ml-4 shrink-0 shadow-xs">
            <Clock size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("time.total_hours")}</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 tracking-tight">
              {totalHours} <span className="text-sm text-slate-400 font-normal">hrs</span>
            </p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center">
          <div className="w-12 h-12 bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mr-4 rtl:mr-0 rtl:ml-4 shrink-0 shadow-xs">
            <DollarSign size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("time.total_earned")}</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 tracking-tight">
              {totalEarned} <span className="text-sm text-slate-400 font-normal">MAD</span>
            </p>
          </div>
        </div>

        <div className="hidden lg:flex bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs items-center">
          <div className="w-12 h-12 bg-teal-100/80 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center mr-4 rtl:mr-0 rtl:ml-4 shrink-0 shadow-xs">
            <CalendarIcon size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Sessions</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 tracking-tight">
              {entries.length} <span className="text-sm text-slate-400 font-normal">entries</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-slate-100 dark:bg-slate-800/80 w-16 h-16 rounded-2xl flex items-center justify-center mb-3">
              <Clock className="text-slate-400 dark:text-slate-500" size={28} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t("time.no_found")}</h3>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mb-4 max-w-xs">Start logging work duration to automatically track billable amounts.</p>
            <button 
              onClick={() => setShowModal(true)}
              className="text-teal-600 dark:text-teal-400 text-sm font-semibold hover:underline"
            >
              + {t("time.add")}
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">{t("time.table.date")}</th>
                  <th className="py-3.5 px-4 sm:px-6">{t("time.table.project")}</th>
                  <th className="py-3.5 px-4 sm:px-6">{t("time.table.duration")}</th>
                  <th className="py-3.5 px-4 sm:px-6">{t("time.table.rate")}</th>
                  <th className="py-3.5 px-4 sm:px-6">{t("time.table.cost")}</th>
                  <th className="py-3.5 px-4 sm:px-6 w-16 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => {
                  const proj = projects.find(p => p.id === entry.projectId);
                  const rate = getRateForProject(entry.projectId);
                  const cost = (entry.duration * rate).toFixed(2);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group">
                      <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center">
                          <CalendarIcon size={14} className="mr-2 text-slate-400 shrink-0" />
                          <span>{new Date(entry.date).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{proj ? proj.name : "Unknown"}</span>
                          {proj?.project_type && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                              {proj.project_type}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-300">
                        {entry.duration} min
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-300">
                        {rate > 0 ? `${rate} MAD` : "-"}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-bold font-mono text-teal-600 dark:text-teal-400">
                        {cost} MAD
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <button 
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t("time.add")}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("time.form.date")}</label>
                <input 
                  type="date" required
                  value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("time.form.project")}</label>
                <CustomSelect
                  value={projectId}
                  onChange={(val) => setProjectId(val)}
                  options={projects.map(p => ({ value: p.id.toString(), label: `${p.name} (${p.project_type || 'Unknown'})` }))}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("time.form.duration")}</label>
                <input 
                  type="number" required min="1"
                  placeholder="e.g. 120"
                  value={duration} onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex items-center shadow-sm">
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
