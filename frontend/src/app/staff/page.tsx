"use client";

import { useState, useEffect } from "react";
import { Users, Search, Plus, Mail, X, Loader2, Trash2, Edit2, UserCheck, UserPlus, CheckCircle2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import { useSettings } from "@/context/SettingsContext";
import { apiFetch } from "@/lib/api";

export interface Staff {
  id: number;
  name: string;
  email: string | null;
  task: string | null;
  staff_user_id?: number | null;
  created_at?: string | null;
}

export interface RegisteredUser {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone_number?: string | null;
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

  // User Account Search & Link State
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<RegisteredUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<number | null>(null);
  const [linkedUserAccount, setLinkedUserAccount] = useState<RegisteredUser | null>(null);

  // Edit / Delete State
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'update' | 'delete';
    member: Staff | null;
  }>({ isOpen: false, type: 'update', member: null });

  // Live search for registered user accounts by name/last name
  useEffect(() => {
    if (!searchUserQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(searchUserQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setUserSearchResults(data);
        }
      } catch (err) {
        console.error("User search failed", err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchUserQuery]);

  const handleSelectUser = (u: RegisteredUser) => {
    const fullName = u.name || `${u.first_name} ${u.last_name}`.trim();
    setName(fullName);
    setEmail(u.email || "");
    setSelectedStaffUserId(u.id);
    setLinkedUserAccount(u);
    setSearchUserQuery("");
    setUserSearchResults([]);
    if (error) setError(null);
  };

  const handleUnlinkUser = () => {
    setSelectedStaffUserId(null);
    setLinkedUserAccount(null);
  };

  const openCreateModal = () => {
    setEditingStaffId(null);
    setName("");
    setEmail("");
    setTask("pose le text");
    setSelectedStaffUserId(null);
    setLinkedUserAccount(null);
    setSearchUserQuery("");
    setUserSearchResults([]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (member: Staff, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingStaffId(member.id);
    setName(member.name);
    setEmail(member.email || "");
    setTask(member.task || "pose le text");
    setSelectedStaffUserId(member.staff_user_id || null);
    
    if (member.staff_user_id) {
      setLinkedUserAccount({
        id: member.staff_user_id,
        first_name: member.name.split(" ")[0] || "",
        last_name: member.name.split(" ").slice(1).join(" ") || "",
        name: member.name,
        email: member.email || "",
      });
    } else {
      setLinkedUserAccount(null);
    }
    setSearchUserQuery("");
    setUserSearchResults([]);
    setError(null);
    setShowModal(true);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await apiFetch("/api/staff");
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
    params.append("name", name.trim());
    if (email.trim()) params.append("email", email.trim());
    if (task) params.append("task", task);
    if (selectedStaffUserId) {
      params.append("staff_user_id", String(selectedStaffUserId));
    } else {
      params.append("staff_user_id", "0");
    }

    try {
      const res = await apiFetch(`${url}?${params.toString()}`, {
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
        setSelectedStaffUserId(null);
        setLinkedUserAccount(null);
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
      const res = await apiFetch(`/api/staff/${confirmModal.member.id}`, {
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
    if (sortBy === "Name (A-Z)") return a.name.localeCompare(b.name);
    return b.id - a.id;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 md:p-8 bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <Users className="text-teal-600 dark:text-teal-400" size={28} />
            <span>{t("staff.title")}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("staff.subtitle")}
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center text-sm shrink-0 self-start sm:self-auto transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
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
              className="text-teal-600 dark:text-teal-400 font-medium hover:text-teal-700 dark:hover:text-teal-300 hover:underline cursor-pointer"
            >
              {t("staff.add_new")}
            </button>
          </div>
        ) : (
          filteredStaff.map((member) => (
            <div 
              key={member.id} 
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col relative"
              onClick={() => openEditModal(member)}
            >
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 pr-3 rtl:pr-0 rtl:pl-3">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                      {member.name}
                    </h3>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 shrink-0">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(member);
                      }}
                      className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors"
                      title="Edit staff member"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmModal({ isOpen: true, type: 'delete', member });
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete staff member"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Registered Account Linked Badge */}
                {member.staff_user_id ? (
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 px-2 py-0.5 rounded-full mb-3">
                    <UserCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Registered Account</span>
                  </div>
                ) : null}
                
                <div className="flex items-center text-xs font-semibold text-teal-700 dark:text-teal-300 mb-3 bg-teal-50 dark:bg-teal-900/30 w-max px-2.5 py-1 rounded-lg">
                  {member.task || t("staff.unassigned")}
                </div>
                
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {member.email ? (
                    <div className="flex items-center truncate">
                      <Mail size={14} className="text-slate-400 dark:text-slate-500 mr-2 rtl:mr-0 rtl:ml-2 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center italic text-slate-400 dark:text-slate-500">
                      <Mail size={14} className="mr-2 rtl:mr-0 rtl:ml-2 shrink-0" />
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users size={20} className="text-teal-600 dark:text-teal-400" />
                <span>{editingStaffId ? t('staff.edit') : t('staff.add_new')}</span>
              </h2>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitStaff} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* SEARCH REGISTERED USER ACCOUNTS */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserPlus size={14} className="text-teal-600 dark:text-teal-400" />
                    <span>Search Registered User</span>
                  </label>
                  {linkedUserAccount && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={12} /> Linked
                    </span>
                  )}
                </div>

                {linkedUserAccount ? (
                  /* Linked Account Display Card */
                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-teal-200 dark:border-teal-700/60 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {linkedUserAccount.first_name?.[0] || linkedUserAccount.name?.[0] || "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {linkedUserAccount.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {linkedUserAccount.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlinkUser}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="Unlink account"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  /* Autocomplete Live Search Input */
                  <div className="relative">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        placeholder="Search user by first or last name..."
                        className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors"
                      />
                      {isSearchingUsers && (
                        <Loader2 size={13} className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-600" />
                      )}
                    </div>

                    {/* Results Dropdown */}
                    {userSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 divide-y divide-slate-100 dark:divide-slate-700/60">
                        {userSearchResults.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            className="p-2.5 hover:bg-teal-50/70 dark:hover:bg-teal-900/30 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {u.first_name?.[0] || u.name?.[0] || "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {u.name}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded bg-teal-100/70 dark:bg-teal-900/50 shrink-0">
                              Select
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Staff Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("staff.form.name")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors"
                  placeholder="E.g. John Doe"
                  required
                />
              </div>

              {/* Staff Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("staff.form.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors"
                  placeholder="E.g. john@example.com"
                />
              </div>

              {/* Role / Task */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
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

              {/* Modal Action Buttons */}
              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin mr-1.5 rtl:mr-0 rtl:ml-1.5" />}
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
            setShowModal(true); // Return to edit modal
          }
          setConfirmModal({ isOpen: false, type: 'update', member: null });
        }}
      />
    </div>
  );
}
