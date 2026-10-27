"use client";

import { useState, useEffect } from "react";
import { 
  Users, Search, Plus, Mail, X, Loader2, Trash2, Edit2, 
  ShieldCheck, Eye, Zap, Check
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import PageHeader from "@/components/PageHeader";
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
  const [staffUserId, setStaffUserId] = useState<number | null>(null);

  // Registered User Search State
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string } | null>(null);

  // Edit / Delete State
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'update' | 'delete';
    member: Staff | null;
  }>({ isOpen: false, type: 'update', member: null });

  // Live search registered users
  useEffect(() => {
    if (!showModal || editingStaffId || !userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(userSearchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const existingIds = new Set(staff.map(s => s.staff_user_id).filter(Boolean));
          const filtered = (data as Array<{ id: number; name: string; email: string }>).filter(
            u => u.id !== user?.id && !existingIds.has(u.id)
          );
          setUserSearchResults(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchQuery, showModal, editingStaffId, user?.id, staff]);

  const openCreateModal = () => {
    setEditingStaffId(null);
    setName("");
    setEmail("");
    setStaffUserId(null);
    setSelectedUser(null);
    setUserSearchQuery("");
    setUserSearchResults([]);
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
    setStaffUserId(member.staff_user_id || null);
    setSelectedUser(member.staff_user_id ? { id: member.staff_user_id, name: member.name, email: member.email || "" } : null);
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

    const targetUserId = selectedUser?.id || staffUserId;
    if (!editingStaffId && !targetUserId) {
      setError("Please search and select a registered user to add as collaborator.");
      return;
    }

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
    if (targetUserId) {
      params.append("staff_user_id", String(targetUserId));
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
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 md:p-8 text-[#111111] transition-colors">
      {/* Top Header */}
      <PageHeader
        title="Staff & Collaborators"
        subtitle="Manage your project collaborators, granular access levels, and P2P transfer permissions."
        icon={<Users size={28} />}
        actionButton={
          <button 
            onClick={openCreateModal}
            className="bg-[#111111] hover:bg-black text-white font-bold py-2.5 px-5 rounded-full shadow-xs flex items-center justify-center text-sm shrink-0 cursor-pointer transition-transform active:scale-95"
          >
            <Plus size={16} className="mr-2 rtl:mr-0 rtl:ml-2" />
            Add Collaborator
          </button>
        }
      />

      {/* Filters Bar */}
      <div className="flex gap-3 sm:gap-4 mb-5 flex-wrap shrink-0">
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[240px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#71717a] group-focus-within:text-amber-500 dark:group-focus-within:text-amber-400 transition-colors" size={17} />
          <input 
            type="text" 
            placeholder="Search collaborator by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2.5 bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-xl shadow-xs focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 transition-all text-sm font-medium text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder-[#71717a]"
          />
        </div>

        {/* Access Level Filter */}
        <div className="shrink-0 w-36 sm:w-44">
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
        <div className="shrink-0 w-36 sm:w-44">
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
        <div className="shrink-0 w-36 sm:w-44">
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
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
            <Users className="text-slate-400 dark:text-[#71717a] mb-4" size={48} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#f4efe6]">No Collaborators Found</h3>
            <p className="text-slate-500 dark:text-[#9f988b] mb-4 text-center text-xs">
              Add collaborators to share projects, control access permissions, and enable P2P file transfers.
            </p>
            <button 
              onClick={openCreateModal}
              className="text-amber-600 dark:text-amber-400 font-bold text-xs hover:underline cursor-pointer"
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
                className="bg-white dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-[#16161a] rounded-2xl shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden hover:shadow-md dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.7)] hover:border-amber-400/40 transition-all group cursor-pointer flex flex-col relative"
                onClick={() => openEditModal(member)}
              >
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    {/* Header Row: Name & Action buttons */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-[#f4efe6] truncate group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
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
                          className="p-1.5 text-slate-400 dark:text-[#71717a] hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors cursor-pointer"
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
                          className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-[#71717a] border border-slate-200 dark:border-white/[0.06]">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-600" />
                          Offline
                        </span>
                      )}

                      {/* Access Level Badge */}
                      {isFullAccess ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-400/10 border border-amber-400/25">
                          <ShieldCheck size={13} className="text-amber-500 dark:text-amber-400" />
                          Full Access
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10">
                          <Eye size={13} className="text-slate-500 dark:text-zinc-400" />
                          Spectator
                        </span>
                      )}

                      {/* Role/Task Badge */}
                      <span className="inline-flex items-center text-[11px] font-medium text-slate-600 dark:text-[#c2bcaf] bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] px-2 py-0.5 rounded-md">
                        {member.task || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Approval Footer Toggle Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-[#71717a] font-medium">
                      P2P Transfers:
                    </span>

                    {member.auto_accept_transfers ? (
                      <button
                        type="button"
                        onClick={(e) => handleToggleAutoAccept(member, e)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Click to revoke auto-approval"
                      >
                        <Zap size={12} className="text-amber-500 dark:text-amber-400 fill-amber-400" />
                        <span>Auto-Approved</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleToggleAutoAccept(member, e)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-[#71717a] hover:text-slate-900 dark:hover:text-[#f4efe6] bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/[0.07] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#F7F4EB] rounded-[28px] shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col animate-in zoom-in-95 duration-200 border border-[#DDD7C5] text-[#111111] overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#DDD7C5] flex justify-between items-center bg-[#ECE8DD] shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-[#111111] flex items-center gap-2">
                <Users size={18} className="text-amber-500" />
                <span>{editingStaffId ? "Edit Collaborator" : "Add Direct Collaborator"}</span>
              </h2>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-[#111111] hover:bg-black/5 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitStaff} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 min-h-0 bg-[#F7F4EB]">
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs rounded-2xl font-medium">
                    {error}
                  </div>
                )}

                {/* Registered User Search / Selection */}
                {!editingStaffId ? (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Select Registered User <span className="text-amber-500">*</span>
                    </label>

                    {selectedUser ? (
                      <div className="p-3 bg-[#ECE8DD] border border-amber-400/50 rounded-2xl flex items-center justify-between animate-in fade-in duration-200">
                        <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
                          <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            <Check size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#111111] truncate">
                              {selectedUser.name}
                            </p>
                            <p className="text-[11px] text-amber-700 truncate">
                              {selectedUser.email}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(null);
                            setName("");
                            setEmail("");
                            setStaffUserId(null);
                          }}
                          className="text-xs font-semibold text-stone-600 hover:text-[#111111] px-3 py-1 hover:bg-black/5 rounded-full transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-8 py-2.5 bg-white/90 border border-[#DDD7C5] rounded-xl text-xs text-[#111111] placeholder:text-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-colors shadow-xs"
                            placeholder="Search registered user by name or email..."
                            autoFocus
                          />
                          {isSearchingUsers && (
                            <Loader2 className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" size={15} />
                          )}
                        </div>

                        {/* Search Results Dropdown */}
                        {userSearchQuery.trim().length > 0 && (
                          <div className="mt-1.5 max-h-48 overflow-y-auto bg-[#ECE8DD] border border-[#DDD7C5] rounded-2xl shadow-xl divide-y divide-[#DDD7C5] z-10">
                            {userSearchResults.length === 0 && !isSearchingUsers ? (
                              <div className="p-3 text-center text-xs text-stone-400">
                                No registered user found matching &quot;{userSearchQuery}&quot;
                              </div>
                            ) : (
                              userSearchResults.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setName(u.name);
                                    setEmail(u.email);
                                    setStaffUserId(u.id);
                                    setUserSearchQuery("");
                                    setUserSearchResults([]);
                                  }}
                                  className="w-full p-2.5 text-left rtl:text-right hover:bg-amber-400/10 flex items-center justify-between transition-colors group cursor-pointer"
                                >
                                  <div className="min-w-0 pr-2">
                                    <p className="font-semibold text-xs text-[#111111] group-hover:text-amber-600 truncate">
                                      {u.name}
                                    </p>
                                    <p className="text-[11px] text-stone-500 truncate">
                                      {u.email}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold text-[#111111] shrink-0 px-2.5 py-0.5 rounded-full bg-amber-400 border border-amber-400">
                                    Select
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-stone-400 mt-1">
                          Only registered accounts in DubFlow can be added as project collaborators.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-[#ECE8DD] border border-[#DDD7C5] rounded-2xl">
                    <p className="font-bold text-xs text-[#111111]">{name}</p>
                    <p className="text-[11px] text-stone-500">{email}</p>
                  </div>
                )}

                {/* Role / Task */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
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
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Project Access Level <span className="text-amber-500">*</span>
                  </label>
                  <CustomSelect
                    options={[
                      { label: "Full Access", value: "full_access", icon: <ShieldCheck size={15} /> },
                      { label: "Spectator", value: "spectator", icon: <Eye size={15} /> }
                    ]}
                    value={accessLevel}
                    onChange={(val) => setAccessLevel(val as "full_access" | "spectator")}
                  />
                  <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                    {accessLevel === "full_access" 
                      ? "Can view shared projects, inspect files, and download via P2P." 
                      : "Read-only. Can inspect project metadata. All downloads strictly disabled."}
                  </p>
                </div>

                {/* Auto-Approval Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start space-x-2.5 rtl:space-x-reverse cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAcceptTransfers}
                      onChange={(e) => setAutoAcceptTransfers(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-amber-500 accent-amber-500 focus:ring-amber-400 border-[#DDD7C5] bg-white cursor-pointer"
                    />
                    <div className="text-xs text-stone-700">
                      <span className="font-semibold flex items-center gap-1 text-[#111111]">
                        <Zap size={12} className="text-amber-500 fill-amber-400" />
                        Auto-approve P2P transfer requests
                      </span>
                      <p className="text-[11px] text-stone-500">
                        Files will stream immediately when this collaborator requests downloads without waiting for prompt.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Action Buttons Footer */}
              <div className="px-6 py-4 flex justify-end gap-2.5 border-t border-[#DDD7C5] bg-[#ECE8DD] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-xs font-semibold text-stone-700 hover:text-[#111111] bg-[#F7F4EB] hover:bg-white border border-[#DDD7C5] rounded-full transition-colors cursor-pointer shadow-xs"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-6 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold rounded-full text-xs transition-all shadow-md flex items-center cursor-pointer"
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
