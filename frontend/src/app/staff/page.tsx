"use client";

import { useState, useEffect } from "react";
import { Users, Search, Plus, Mail, X, Loader2, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import { useSettings } from "@/context/SettingsContext";

export interface Staff {
  id: number;
  name: string;
  email: string | null;
  task: string | null;
}

export default function StaffPage() {
  const { t } = useSettings();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTask, setFilterTask] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [task, setTask] = useState("pose le text");

  // Edit / Delete State
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'update' | 'delete';
    member: Staff | null;
  }>({ isOpen: false, type: 'update', member: null });

  const openCreateModal = () => {
    setEditingStaffId(null);
    setName("");
    setEmail("");
    setTask("pose le text");
    setShowModal(true);
  };

  const openEditModal = (member: Staff, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStaffId(member.id);
    setName(member.name);
    setEmail(member.email || "");
    setTask(member.task || "pose le text");
    setShowModal(true);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    
    // For updating, show confirmation modal first
    if (editingStaffId && (!confirmModal.isOpen || confirmModal.type !== 'update')) {
      setShowModal(false);
      setConfirmModal({
        isOpen: true,
        type: 'update',
        member: staff.find(s => s.id === editingStaffId) || null
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const url = editingStaffId ? `/api/staff/${editingStaffId}` : "/api/staff";
    const method = editingStaffId ? "PUT" : "POST";

    const params = new URLSearchParams();
    params.append("name", name);
    if (email) params.append("email", email);
    if (task) params.append("task", task);

    try {
      const res = await fetch(`${url}?${params.toString()}`, {
        method: method,
      });

      if (res.ok) {
        setShowModal(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchStaff();
        // Clear form
        setName("");
        setEmail("");
        setTask("pose le text");
        setEditingStaffId(null);
      } else {
        const data = await res.json();
        setError(data.detail || `Failed to ${editingStaffId ? 'update' : 'create'} staff member`);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteStaff = async () => {
    if (!confirmModal.member) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${confirmModal.member.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchStaff();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'delete') {
      executeDeleteStaff();
    } else if (confirmModal.type === 'update') {
      handleSubmitStaff();
    }
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTask = filterTask === "All" || s.task === filterTask;
    return matchesSearch && matchesTask;
  }).sort((a, b) => {
    if (sortBy === "Name (A-Z)") {
      return a.name.localeCompare(b.name);
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
            <Users className="mr-3 rtl:mr-0 rtl:ml-3 text-teal-600 dark:text-teal-400 shrink-0" size={28} />
            {t("staff.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{t("staff.subtitle")}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center text-sm shrink-0 self-start sm:self-auto transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} className="mr-2 rtl:mr-0 rtl:ml-2" />
          {t("staff.add")}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex gap-3 sm:gap-4 mb-5 flex-wrap shrink-0">
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" size={17} />
          <input 
            type="text" 
            placeholder={t("staff.search")} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl shadow-xs focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
        
        <div className="shrink-0 w-40 sm:w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
          <CustomSelect
            options={[
              { label: "All", value: "All" },
              { label: "pose le text", value: "pose le text" },
              { label: "les apois", value: "les apois" },
              { label: "complet", value: "complet" },
              { label: "partner", value: "partner" }
            ]}
            value={filterTask}
            onChange={setFilterTask}
          />
        </div>
        
        <div className="shrink-0 w-40 sm:w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
          <CustomSelect
            options={[
              { label: t("newest"), value: "Newest" },
              { label: t("name.az"), value: "Name (A-Z)" }
            ]}
            value={sortBy}
            onChange={setSortBy}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 pb-6">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
            <Users className="text-slate-300 dark:text-slate-600 mb-4" size={48} />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">{t("staff.no_found")}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4 text-center">{t("staff.no_found_desc")}</p>
            <button 
              onClick={openCreateModal}
              className="text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 dark:hover:text-teal-300 hover:underline"
            >
              {t("staff.add_new")}
            </button>
          </div>
        ) : (
          filteredStaff.map((member) => (
            <div 
              key={member.id} 
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col"
              onClick={(e) => openEditModal(member, e)}
            >
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1 flex-1 pr-4 rtl:pr-0 rtl:pl-4">{member.name}</h3>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({ isOpen: true, type: 'delete', member });
                      }}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center text-sm font-medium text-teal-600 dark:text-teal-400 mb-4 bg-teal-50 dark:bg-teal-900/30 w-max px-3 py-1 rounded-full">
                  {member.task || t("staff.unassigned")}
                </div>
                
                <div className="space-y-2 mt-4 text-sm text-slate-600 dark:text-slate-400">
                  {member.email ? (
                    <div className="flex items-center">
                      <Mail size={16} className="text-slate-400 dark:text-slate-500 mr-3 rtl:mr-0 rtl:ml-3 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center italic text-slate-400 dark:text-slate-500">
                      <Mail size={16} className="mr-3 rtl:mr-0 rtl:ml-3 shrink-0" />
                      {t("staff.no_email")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {editingStaffId ? t('staff.edit') : t('staff.add_new')}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 p-2 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitStaff} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("staff.form.name")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 dark:placeholder-slate-500 transition-colors"
                    placeholder="E.g. John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("staff.form.email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 dark:placeholder-slate-500 transition-colors"
                    placeholder="E.g. john@erytmo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("staff.form.task")}
                  </label>
                  <CustomSelect
                    options={[
                      { label: "pose le text", value: "pose le text" },
                      { label: "les apois", value: "les apois" },
                      { label: "complet", value: "complet" },
                      { label: "partner", value: "partner" }
                    ]}
                    value={task}
                    onChange={setTask}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 text-white font-medium rounded-xl transition-all shadow-sm flex items-center"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin mr-2 rtl:mr-0 rtl:ml-2" />}
                  {editingStaffId ? t("update") : t("create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'delete' ? t('delete') : t('update')}
        message={
          confirmModal.type === 'delete' 
            ? `Are you sure you want to delete "${confirmModal.member?.name}"?`
            : `Are you sure you want to update "${confirmModal.member?.name}"?`
        }
        type={confirmModal.type === 'delete' ? 'danger' : 'info'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          if (confirmModal.type === 'update') {
            setShowModal(true); // Go back to edit modal
          }
          setConfirmModal({ isOpen: false, type: 'update', member: null });
        }}
      />
    </div>
  );
}
