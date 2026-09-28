"use client";

import { useState, useEffect } from "react";
import { Building, Search, Plus, Mail, DollarSign, X, Loader2, Edit2, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import { useSettings } from "@/context/SettingsContext";
import { apiFetch } from "@/lib/api";

export interface Company {
  id: number;
  name: string;
  description: string | null;
  rate_detection: number | null;
  rate_conformation: number | null;
  rate_pose_texte: number | null;
  rate_chantant: number | null;
  supplier_email: string | null;
  target_software: string | null;
}

export default function CompanyPage() {
  const { t } = useSettings();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSoftware, setFilterSoftware] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rateDetection, setRateDetection] = useState<string>("");
  const [rateConformation, setRateConformation] = useState<string>("");
  const [ratePoseTexte, setRatePoseTexte] = useState<string>("");
  const [rateChantant, setRateChantant] = useState<string>("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [targetSoftware, setTargetSoftware] = useState("ERytmo");

  // Edit / Delete State
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'update' | 'delete';
    company: Company | null;
  }>({ isOpen: false, type: 'update', company: null });

  const openCreateModal = () => {
    setEditingCompanyId(null);
    setName("");
    setDescription("");
    setRateDetection("");
    setRateConformation("");
    setRatePoseTexte("");
    setRateChantant("");
    setSupplierEmail("");
    setTargetSoftware("ERytmo");
    setShowModal(true);
  };

  const openEditModal = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCompanyId(company.id);
    setName(company.name);
    setDescription(company.description || "");
    setRateDetection(company.rate_detection ? company.rate_detection.toString() : "");
    setRateConformation(company.rate_conformation ? company.rate_conformation.toString() : "");
    setRatePoseTexte(company.rate_pose_texte ? company.rate_pose_texte.toString() : "");
    setRateChantant(company.rate_chantant ? company.rate_chantant.toString() : "");
    setSupplierEmail(company.supplier_email || "");
    setTargetSoftware(company.target_software || "ERytmo");
    setShowModal(true);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await apiFetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitCompany = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required");
      return;
    }
    
    // For updating, show confirmation modal first
    if (editingCompanyId && (!confirmModal.isOpen || confirmModal.type !== 'update')) {
      setShowModal(false);
      setConfirmModal({
        isOpen: true,
        type: 'update',
        company: companies.find(c => c.id === editingCompanyId) || null
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const url = editingCompanyId ? `/api/companies/${editingCompanyId}` : "/api/companies";
    const method = editingCompanyId ? "PUT" : "POST";

    const params = new URLSearchParams();
    params.append("name", name);
    if (description) params.append("description", description);
    if (rateDetection) params.append("rate_detection", rateDetection);
    if (rateConformation) params.append("rate_conformation", rateConformation);
    if (ratePoseTexte) params.append("rate_pose_texte", ratePoseTexte);
    if (rateChantant) params.append("rate_chantant", rateChantant);
    if (supplierEmail) params.append("supplier_email", supplierEmail);
    if (targetSoftware) params.append("target_software", targetSoftware);

    try {
      const res = await apiFetch(`${url}?${params.toString()}`, {
        method: method,
      });

      if (res.ok) {
        setShowModal(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchCompanies();
        // Clear form
        setName("");
        setDescription("");
        setRateDetection("");
        setRateConformation("");
        setRatePoseTexte("");
        setRateChantant("");
        setSupplierEmail("");
        setTargetSoftware("ERytmo");
        setEditingCompanyId(null);
      } else {
        const data = await res.json();
        setError(data.detail || `Failed to ${editingCompanyId ? 'update' : 'create'} company`);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteCompany = async () => {
    if (!confirmModal.company) return;
    
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/companies/${confirmModal.company.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchCompanies();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'delete') {
      executeDeleteCompany();
    } else if (confirmModal.type === 'update') {
      handleSubmitCompany();
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (c.supplier_email && c.supplier_email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSoftware = filterSoftware === "All" || c.target_software === filterSoftware;
    return matchesSearch && matchesSoftware;
  }).sort((a, b) => {
    if (sortBy === "Name (A-Z)") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "Rate (High-Low)") {
      return (b.rate_detection || 0) - (a.rate_detection || 0);
    }
    if (sortBy === "Rate (Low-High)") {
      return (a.rate_detection || 0) - (b.rate_detection || 0);
    }
    // Newest
    return b.id - a.id;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50 dark:bg-slate-900 relative p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
            <Building className="mr-3 rtl:mr-0 rtl:ml-3 text-teal-600 dark:text-teal-400 shrink-0" size={28} />
            {t("company.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{t("company.subtitle")}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center text-sm shrink-0 self-start sm:self-auto transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} className="mr-2 rtl:mr-0 rtl:ml-2" />
          {t("company.add")}
        </button>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="flex gap-3 sm:gap-4 mb-5 flex-wrap shrink-0">
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" size={17} />
          <input 
            type="text" 
            placeholder={t("company.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl shadow-xs focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
        
        {/* Sort Filter */}
        <div className="shrink-0 w-40 sm:w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            options={[
              { value: "Newest", label: t("newest") },
              { value: "Name (A-Z)", label: t("name.az") },
              { value: "Rate (High-Low)", label: t("company.sort.rate_high") },
              { value: "Rate (Low-High)", label: t("company.sort.rate_low") }
            ]}
          />
        </div>

        {/* Software Filter */}
        <div className="shrink-0 w-36 sm:w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
          <CustomSelect
            value={filterSoftware}
            onChange={(val) => setFilterSoftware(val)}
            options={[
              { value: "All", label: "All Software" },
              { value: "ERytmo", label: "ERytmo" },
              { value: "Mosaic", label: "Mosaic" }
            ]}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {filteredCompanies.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 p-8 text-center flex flex-col items-center justify-center h-64 mt-6">
            <div className="bg-teal-50 dark:bg-teal-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-3">
              <Building className="text-teal-600 dark:text-teal-400" size={28} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">{t("company.no_found")}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-sm mb-4">
              {t("company.no_found_desc")}
            </p>
            <button 
              onClick={openCreateModal}
              className="text-teal-600 dark:text-teal-400 text-sm font-semibold hover:underline"
            >
              + {t("company.add")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-5 pb-6">
            {filteredCompanies.map((c) => (
              <div 
                key={c.id}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all duration-200 flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xl truncate" title={c.name}>{c.name}</h3>
                    {c.target_software && (
                      <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        c.target_software === 'Mosaic' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      }`}>
                        {c.target_software}
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-1 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={(e) => openEditModal(c, e)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                      title={t("company.edit")}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({ isOpen: true, type: 'delete', company: c });
                      }}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title={t("delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {c.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{c.description}</p>
                )}
                
                <div className="mt-auto space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center">
                      <DollarSign size={14} className="text-emerald-500 mr-1" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Détection</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">{c.rate_detection ? `${c.rate_detection} MAD` : "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <DollarSign size={14} className="text-emerald-500 mr-1" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Conformation</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">{c.rate_conformation ? `${c.rate_conformation} MAD` : "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <DollarSign size={14} className="text-emerald-500 mr-1" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Pose de texte</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">{c.rate_pose_texte ? `${c.rate_pose_texte} MAD` : "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <DollarSign size={14} className="text-emerald-500 mr-1" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Chantant</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">{c.rate_chantant ? `${c.rate_chantant} MAD` : "-"}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mr-3 rtl:mr-0 rtl:ml-3 shrink-0 text-blue-600 dark:text-blue-400">
                      <Mail size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Supplier Email</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200 truncate" title={c.supplier_email || ""}>{c.supplier_email || "No email"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Company Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200 relative z-10 border border-transparent dark:border-slate-700">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingCompanyId ? t("company.edit") : t("company.add_new")}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCompany} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800/50">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("company.form.name")} *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Netflix, Amazon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("company.form.desc")}</label>
                <textarea 
                  placeholder="Notes about this company..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all resize-none h-20 text-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("company.form.rate.detection")}</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input 
                      type="number" step="0.01" placeholder="e.g. 50"
                      value={rateDetection} onChange={(e) => setRateDetection(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("company.form.rate.conformation")}</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input 
                      type="number" step="0.01" placeholder="e.g. 50"
                      value={rateConformation} onChange={(e) => setRateConformation(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("company.form.rate.pose_texte")}</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input 
                      type="number" step="0.01" placeholder="e.g. 50"
                      value={ratePoseTexte} onChange={(e) => setRatePoseTexte(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("company.form.rate.chantant")}</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input 
                      type="number" step="0.01" placeholder="e.g. 50"
                      value={rateChantant} onChange={(e) => setRateChantant(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("company.form.software")}</label>
                  <CustomSelect
                    value={targetSoftware}
                    onChange={(val) => setTargetSoftware(val)}
                    options={[
                      { value: "ERytmo", label: "ERytmo Factory" },
                      { value: "Mosaic", label: "Mosaic Formate" }
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("company.form.email")}</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input 
                    type="email"
                    placeholder="e.g. supplier@company.com"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all text-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-6 border-t border-slate-100 dark:border-slate-700 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors disabled:opacity-50">
                  {t("cancel")}
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex items-center shadow-sm disabled:opacity-50">
                  {isSubmitting && <Loader2 size={16} className="animate-spin mr-2 rtl:mr-0 rtl:ml-2" />}
                  {editingCompanyId ? t("update") : t("create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'delete' ? t("delete") : t("update")}
        message={
          confirmModal.type === 'delete' 
            ? t("company.delete.confirm")
            : `Are you sure you want to update "${confirmModal.company?.name}" with these changes?`
        }
        type={confirmModal.type === 'delete' ? 'danger' : 'info'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          if (confirmModal.type === 'update') {
            setShowModal(true);
          }
        }}
      />
    </div>
  );
}
