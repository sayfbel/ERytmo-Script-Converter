"use client";

import { useState, useEffect } from "react";
import { 
  Users, Search, Plus, Mail, X, Loader2, Trash2, Edit2, 
  ShieldCheck, Eye, Zap
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useSignaling } from "@/context/SignalingContext";
import { apiFetch } from "@/lib/api";

export interface Staff {
  id: number;
  name: string;
  email: string | null;
  task: string | null;
  access_level: "full_access" | "spectator";
  auto_accept_transfers: boolean;
  staff_user_id?: number | null;
  is_online?: boolean;
  created_at?: string | null;
}

export default function StaffPage() {
  const { t } = useSettings();
  const { user } = useAuth();
  const { isUserOnline } = useSignaling();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTask, setFilterTask] = useState("All");
  const [filterAccess, setFilterAccess] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [task, setTask] = useState("pose le text");
  const [accessLevel, setAccessLevel] = useState<"full_access" | "spectator">("spectator");
  const [autoAcceptTransfers, setAutoAcceptTransfers] = useState(false);

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
    setAccessLevel("spectator");
    setAutoAcceptTransfers(false);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (member: Staff, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingStaffId(member.id);
    setName(member.name);
    setEmail(member.email || "");
    setTask(member.task || "pose le text");
    setAccessLevel(member.access_level || "spectator");
    setAutoAcceptTransfers(!!member.auto_accept_transfers);
    setError(null);
    setShowModal(true);
  };

  useEffect(() => {
    if (user?.id) {
      fetchStaff();
    } else {
      setStaff([]);
    }
  }, [user?.id]);

  const fetchStaff = async () => {
    try {
      const res = await apiFetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      } else {
        setStaff([]);
      }
    } catch (err) {
      console.error(err);
      setStaff([]);
    }
  };

  const handleToggleAutoAccept = async (member: Staff, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/staff/${member.id}/auto-accept`, {
        method: "PATCH"
      });
      if (res.ok) {
        fetchStaff();
      }
    } catch (err) {
      console.error("Failed to toggle auto-accept", err);
    }
  };

  const handleSubmitStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Collaborator name is required");
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
    if (email.trim()) params.append("email", email.trim().toLowerCase());
    if (task) params.append("task", task);
    params.append("access_level", accessLevel);
    params.append("auto_accept_transfers", String(autoAcceptTransfers));

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
        setAccessLevel("spectator");
        setAutoAcceptTransfers(false);
        setEditingStaffId(null);
      } else {
        const data = await res.json();
        setError(data.detail || `Failed to ${editingStaffId ? 'update' : 'create'} collaborator`);
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
    const matchesAccess = filterAccess === "All" || s.access_level === filterAccess;
    return matchesSearch && matchesTask && matchesAccess;
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
            <span>Staff &amp; Collaborators</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your project collaborators, granular access levels, and P2P transfer permissions.
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center text-sm shrink-0 self-start sm:self-auto transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Plus size={18} className="mr-2 rtl:mr-0 rtl:ml-2" />
          Add Collaborator
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex gap-3 sm:gap-4 mb-5 flex-wrap shrink-0">
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[240px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" size={17} />
          <input 
            type="text" 
            placeholder="Search collaborator by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl shadow-xs focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {/* Access Level Filter */}
        <div className="shrink-0 w-36 sm:w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
          <CustomSelect
            options={[
              { label: "All Access", value: "All" },
              { label: "Full Access", value: "full_access" },
              { label: "Spectator", value: "spectator" }
            ]}
            value={filterAccess}
            onChange={setFilterAccess}
          />
        </div>
        
        {/* Task Filter */}
        <div className="shrink-0 w-36 sm:w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
          <CustomSelect
            options={[
              { label: "All Roles", value: "All" },
              { label: "pose le text", value: "pose le text" },
              { label: "les apois", value: "les apois" },
              { label: "complet", value: "complet" },
              { label: "partner", value: "partner" }
            ]}
            value={filterTask}
            onChange={setFilterTask}
          />
        </div>
        
        {/* Sort Filter */}
        <div className="shrink-0 w-36 sm:w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
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

      {/* Collaborators Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 pb-6">
        {filteredStaff.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
            <Users className="text-slate-300 dark:text-slate-600 mb-4" size={48} />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No Collaborators Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4 text-center text-xs">
              Add collaborators to share projects, control access permissions, and enable P2P file transfers.
            </p>
            <button 
              onClick={openCreateModal}
              className="text-teal-600 dark:text-teal-400 font-semibold text-xs hover:text-teal-700 dark:hover:text-teal-300 hover:underline cursor-pointer"
            >
              + Add first collaborator
            </button>
          </div>
        ) : (
          filteredStaff.map((member) => {
            const online = member.is_online || isUserOnline(member.staff_user_id);
            const isFullAccess = member.access_level === "full_access";

            return (
              <div 
                key={member.id} 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700/60 transition-all group cursor-pointer flex flex-col relative"
                onClick={() => openEditModal(member)}
              >
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    {/* Header Row: Name & Action buttons */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
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
                          title="Edit collaborator"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ isOpen: true, type: 'delete', member });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Remove collaborator"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mb-3 truncate">
                      <Mail size={13} className="mr-1.5 rtl:mr-0 rtl:ml-1.5 shrink-0 text-slate-400" />
                      <span className="truncate">{member.email || "No email provided"}</span>
                    </div>

                    {/* Badges Row: Live Online Status & Access Level */}
                    <div className="flex items-center gap-2 flex-wrap mb-3.5">
                      {/* Live Peer Status */}
                      {online ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                          Offline
                        </span>
                      )}

                      {/* Access Level Badge */}
                      {isFullAccess ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80">
                          <ShieldCheck size={13} className="text-blue-600 dark:text-blue-400" />
                          Full Access
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80">
                          <Eye size={13} className="text-amber-600 dark:text-amber-400" />
                          Spectator
                        </span>
                      )}

                      {/* Role/Task Badge */}
                      <span className="inline-flex items-center text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {member.task || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Approval Footer Toggle Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      P2P Transfers:
                    </span>

                    {member.auto_accept_transfers ? (
                      <button
                        type="button"
                        onClick={(e) => handleToggleAutoAccept(member, e)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Click to revoke auto-approval"
                      >
                        <Zap size={12} className="text-teal-600 dark:text-teal-400 fill-teal-500" />
                        <span>Auto-Approved</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleToggleAutoAccept(member, e)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        title="Click to allow auto-approval without prompting"
                      >
                        <span>Prompt on request</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Create / Edit Collaborator Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-700 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                <Users size={20} className="text-teal-600 dark:text-teal-400" />
                <span>{editingStaffId ? "Edit Collaborator" : "Add Direct Collaborator"}</span>
              </h2>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitStaff} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Collaborator Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Collaborator Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors"
                  placeholder="e.g. Marie Curie"
                  required
                />
              </div>

              {/* Collaborator Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors"
                  placeholder="e.g. marie.curie@example.com"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  If registered in ERytmo, presence and direct P2P transfers are automatically matched.
                </p>
              </div>

              {/* Role / Task */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Role / Task
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

              {/* Granular Access Level Control */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Project Access Level <span className="text-red-500">*</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Full Access Option */}
                  <div
                    onClick={() => setAccessLevel("full_access")}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all select-none ${
                      accessLevel === "full_access"
                        ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-2xs"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                      <ShieldCheck size={16} className={accessLevel === "full_access" ? "text-blue-600" : "text-slate-400"} />
                      <span className="text-xs font-bold">Full Access</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80">
                      Can view shared projects, inspect files, and download via P2P.
                    </p>
                  </div>

                  {/* Spectator Option */}
                  <div
                    onClick={() => setAccessLevel("spectator")}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all select-none ${
                      accessLevel === "spectator"
                        ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-2xs"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                      <Eye size={16} className={accessLevel === "spectator" ? "text-amber-600" : "text-slate-400"} />
                      <span className="text-xs font-bold">Spectator</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80">
                      Read-only. Can inspect project metadata. All downloads strictly disabled.
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-Approval Checkbox */}
              <div className="pt-1">
                <label className="flex items-start space-x-2.5 rtl:space-x-reverse cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAcceptTransfers}
                    onChange={(e) => setAutoAcceptTransfers(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                  />
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold flex items-center gap-1">
                      <Zap size={12} className="text-teal-600 fill-teal-600" />
                      Auto-approve P2P transfer requests
                    </span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Files will stream immediately when this collaborator requests downloads without waiting for prompt.
                    </p>
                  </div>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin mr-1.5 rtl:mr-0 rtl:ml-1.5" />}
                  {editingStaffId ? "Update Collaborator" : "Add Collaborator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'delete' ? 'Delete Collaborator' : 'Update Collaborator'}
        message={
          confirmModal.type === 'delete' 
            ? `Are you sure you want to remove "${confirmModal.member?.name}" from your collaborators list?`
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
