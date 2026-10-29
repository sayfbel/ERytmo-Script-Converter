"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Users, Search, Plus, Mail, X, Loader2, Trash2, Edit2, 
  ShieldCheck, Eye, Zap, Check, ArrowLeft, ArrowUpRight,
  Briefcase, Film, Percent, CheckCircle2, ChevronRight,
  ChevronDown, Download, Play, Pause, Printer, FileText,
  Mic, Headphones, Music, Sparkles, User, Bell, Settings as SettingsIcon,
  Award, TrendingUp, Clock, AlertCircle
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import PageHeader from "@/components/PageHeader";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useSignaling } from "@/context/SignalingContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api";

// ─── Interfaces ───

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

export interface Company {
  id: number;
  name: string;
  rate_detection: number | null;
  rate_conformation: number | null;
  rate_pose_texte: number | null;
  rate_chantant: number | null;
  tax_rate?: number | null;
}

export interface ProjectItem {
  id: number;
  name: string;
  company_name?: string | null;
  collaborators?: any;
  created_at?: string | null;
}

export interface ScheduleTaskItem {
  id: number | string;
  taskDate?: string | null;
  startTime: string;
  endTime: string;
  taskName: string;
  projectName?: string | null;
  companyName?: string | null;
  statusBadge?: string | null;
  staffMembers?: Array<{ name: string; initials?: string; role?: string }>;
}



function timeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function StaffContent() {
  const searchParams = useSearchParams();
  const { t } = useSettings();
  const { user } = useAuth();
  const { isUserOnline } = useSignaling();
  const { showToast, toggleNotificationTray } = useToast();

  // Data
  const [staff, setStaff] = useState<Staff[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state: "directory" (team cards & add button) vs "profile" (Intelly staff profile view)
  const [viewMode, setViewMode] = useState<"profile" | "directory">("directory");
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  // Profile tabs matching image: "overview" (Clinical history) vs "details" (Visit Details & yellow test voucher)
  const [profileTab, setProfileTab] = useState<"overview" | "details">("overview");

  // Audio Playback Simulation
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchTag, setActiveSearchTag] = useState("all");
  const [filterTask, setFilterTask] = useState("All");
  const [filterAccess, setFilterAccess] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  // Local payment status overrides
  const [payoutOverrides, setPayoutOverrides] = useState<Record<string, "Paid" | "Pending" | "Processing">>({});

  // Form State (Add / Edit Staff)
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [task, setTask] = useState("pose le text");
  const [accessLevel, setAccessLevel] = useState<"full_access" | "spectator">("spectator");
  const [autoAcceptTransfers, setAutoAcceptTransfers] = useState(false);
  const [staffUserId, setStaffUserId] = useState<number | null>(null);

  // Registered User Search
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string } | null>(null);

  // Edit / Delete State
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "update" | "delete";
    member: Staff | null;
  }>({ isOpen: false, type: "update", member: null });

  // Load Saved Payouts
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dubflow_payout_status");
        if (saved) setPayoutOverrides(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const savePayoutStatus = (collabId: number, status: "Paid" | "Pending" | "Processing") => {
    setPayoutOverrides((prev) => {
      const updated = { ...prev, [`staff-${collabId}`]: status };
      try {
        localStorage.setItem("dubflow_payout_status", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    showToast("Statut Mis à Jour", `Statut de paiement actualisé: ${status}`, "success");
  };

  // Fetch initial data
  useEffect(() => {
    if (user?.id) {
      loadAllData();
    } else {
      setStaff([]);
    }
  }, [user?.id]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, compRes, projRes, schedRes] = await Promise.all([
        apiFetch("/api/staff").catch(() => null),
        apiFetch("/api/companies").catch(() => null),
        apiFetch("/api/projects").catch(() => null),
        apiFetch("/api/schedule-tasks").catch(() => null),
      ]);

      let staffLoaded: Staff[] = [];
      if (staffRes && staffRes.ok) {
        staffLoaded = await staffRes.json();
        setStaff(staffLoaded || []);
      }
      if (compRes && compRes.ok) setCompanies(await compRes.json());
      if (projRes && projRes.ok) setProjects(await projRes.json());
      if (schedRes && schedRes.ok) setScheduleTasks(await schedRes.json());

      // Check query param e.g. ?id=2
      const qId = searchParams.get("id");
      if (qId) {
        const targetId = parseInt(qId, 10);
        if (staffLoaded.some((s) => s.id === targetId)) {
          setSelectedStaffId(targetId);
          setViewMode("profile");
        }
      } else {
        setViewMode("directory");
      }

      if (staffLoaded.length > 0 && selectedStaffId === null) {
        const karim = staffLoaded.find((s) => s.name.toLowerCase().includes("karim"));
        setSelectedStaffId(karim ? karim.id : staffLoaded[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync route query param when clicking links (e.g. from /finance or sidebar)
  useEffect(() => {
    const qId = searchParams.get("id");
    if (qId) {
      const targetId = parseInt(qId, 10);
      if (!isNaN(targetId)) {
        setSelectedStaffId(targetId);
        setViewMode("profile");
      }
    } else {
      setViewMode("directory");
    }
  }, [searchParams]);

  // User search for staff addition
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
          const existingIds = new Set(staff.map((s) => s.staff_user_id).filter(Boolean));
          const filtered = (data as Array<{ id: number; name: string; email: string }>).filter(
            (u) => u.id !== user?.id && !existingIds.has(u.id)
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

  // Modal Openers
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

  // Submit Handler
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

    if (editingStaffId && (!confirmModal.isOpen || confirmModal.type !== "update")) {
      setShowModal(false);
      setConfirmModal({
        isOpen: true,
        type: "update",
        member: staff.find((s) => s.id === editingStaffId) || null,
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
    if (targetUserId) params.append("staff_user_id", String(targetUserId));

    try {
      const res = await apiFetch(`${url}?${params.toString()}`, { method });
      if (res.ok) {
        setShowModal(false);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        loadAllData();
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to save staff member");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!confirmModal.member) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/staff/${confirmModal.member.id}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Financial & Work Calculations for Selected Staff ───
  const selectedStaff = useMemo(() => {
    return staff.find((s) => s.id === selectedStaffId) || staff[0] || null;
  }, [staff, selectedStaffId]);

  const filteredStaff = useMemo(() => {
    let result = staff.filter((st) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || (
        st.name.toLowerCase().includes(q) ||
        (st.email || "").toLowerCase().includes(q) ||
        (st.task || "").toLowerCase().includes(q)
      );

      const matchesTask = filterTask === "All" || (st.task || "").toLowerCase().includes(filterTask.toLowerCase());
      const matchesAccess = filterAccess === "All" || st.access_level === filterAccess;

      return matchesQuery && matchesTask && matchesAccess;
    });

    if (sortBy === "Name (A-Z)") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "Name (Z-A)") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [staff, searchQuery, filterTask, filterAccess, sortBy]);

  const staffWorkStats = useMemo(() => {
    if (!selectedStaff) return null;

    // Projects helped on
    const projectsHelped: Array<{ id: number; name: string; company: string; date: string; role: string }> = [];
    projects.forEach((p) => {
      let collabs = [];
      if (Array.isArray(p.collaborators)) collabs = p.collaborators;
      else if (typeof p.collaborators === "string") {
        try { collabs = JSON.parse(p.collaborators); } catch {}
      }
      const matched = collabs.some(
        (c: any) => c.staff_id === selectedStaff.id || c.staff_name?.toLowerCase() === selectedStaff.name.toLowerCase()
      );
      if (matched) {
        projectsHelped.push({
          id: p.id,
          name: p.name,
          company: p.company_name || "Dubbing Brothers International",
          date: p.created_at ? p.created_at.split("T")[0] : "12/10/2026",
          role: selectedStaff.task || "Rythmo-Adaptateur",
        });
      }
    });

    // Baseline sample projects if fresh
    if (projectsHelped.length === 0) {
      projects.slice(0, 3).forEach((p, i) => {
        projectsHelped.push({
          id: p.id,
          name: p.name,
          company: p.company_name || "Canal+ Création Originale",
          date: `1${2 + i}/10/2026`,
          role: selectedStaff.task || "Pose de texte & Détection",
        });
      });
    }

    // Task Breakdown
    const breakdown = {
      "Pose de texte": { count: 4, gross: 320, tax: 64, net: 256, score: "8.3" },
      "Détection Vocale": { count: 3, gross: 270, tax: 54, net: 216, score: "9.3" },
      "Conformation Dialogue": { count: 2, gross: 140, tax: 28, net: 112, score: "4.7" },
      "Rythmo Chantante": { count: 2, gross: 220, tax: 44, net: 176, score: "7.8" },
      "Calligraphie & QA": { count: 1, gross: 80, tax: 16, net: 64, score: "8.7" },
    };

    const totalGross = Object.values(breakdown).reduce((s, b) => s + b.gross, 0);
    const totalTax = Object.values(breakdown).reduce((s, b) => s + b.tax, 0);
    const totalNet = totalGross - totalTax;

    return {
      projectsHelped,
      breakdown,
      totalGross,
      totalTax,
      totalNet,
      tasksCount: Object.values(breakdown).reduce((s, b) => s + b.count, 0),
      hoursWorked: 18.5,
      hourlyRate: 55,
    };
  }, [selectedStaff, projects]);

  const activePaymentStatus = selectedStaff ? payoutOverrides[`staff-${selectedStaff.id}`] || "Paid" : "Paid";

  return (
    <div className="flex-1 h-full w-full overflow-y-auto no-scrollbar bg-[#F7F4EB] text-[#111111] p-3 sm:p-5 md:p-6 select-none font-sans-display flex flex-col gap-5">
      
      {/* Standard PageHeader matching all pages (/projects, /company, /time, /dashboard) */}
      <PageHeader
        title={t("staff.title") || "Staff & Collaborators"}
        subtitle={
          t("staff.subtitle") ||
          "Manage dubbing actors, adaptateurs rythmo, voice directors, sound engineers, and track their work and payments."
        }
        icon={<Users size={28} />}
        actionButton={
          <button
            onClick={openCreateModal}
            className="bg-[#111111] hover:bg-black text-white font-bold py-2.5 px-5 rounded-full shadow-xs flex items-center justify-center text-sm shrink-0 cursor-pointer transition-transform active:scale-95 gap-2"
          >
            <Plus size={16} />
            <span>{t("staff.add") || "+ Add Staff"}</span>
          </button>
        }
      />

      {/* Toolbar: Search and Filter (Matching Projects page) */}
      <div className="flex gap-3 sm:gap-4 mb-3 flex-wrap shrink-0">
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 transform -translate-y-1/2 text-[#FF7597] group-focus-within:text-[#FF7597] transition-colors" size={17} />
          <input
            type="text"
            placeholder={t("staff.search") || "Search projects by name or company..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 bg-[#F7F4EB] border border-[#D9D3C2] hover:border-[#111111] focus:border-[#111111] rounded-full shadow-xs focus:outline-none transition-all text-sm font-medium text-[#111111] placeholder-[#8c887b]"
          />
        </div>

        {/* Sort Filter */}
        <div className="shrink-0 w-36 sm:w-44">
          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val)}
            options={[
              { value: "Newest", label: t("newest") || "Newest" },
              { value: "Name (A-Z)", label: t("name.az") || "Name (A-Z)" },
              { value: "Name (Z-A)", label: "Name (Z-A)" },
            ]}
          />
        </div>

        {/* Task / Role Filter */}
        <div className="shrink-0 w-44 sm:w-52">
          <CustomSelect
            value={filterTask}
            onChange={(val) => setFilterTask(val)}
            options={[
              { value: "All", label: "All Tasks" },
              { value: "pose le text", label: "Pose de texte" },
              { value: "detection", label: "Détection Vocale" },
              { value: "conformation", label: "Conformation Dialogue" },
              { value: "chantant", label: "Rythmo Chantante" },
              { value: "mixage", label: "Mixage & Son" },
            ]}
          />
        </div>

        {/* Access Level Filter */}
        <div className="shrink-0 w-40 sm:w-48">
          <CustomSelect
            value={filterAccess}
            onChange={(val) => setFilterAccess(val)}
            options={[
              { value: "All", label: "All Access" },
              { value: "full_access", label: "Full Access" },
              { value: "spectator", label: "Spectator" },
            ]}
          />
        </div>
      </div>

      {/* ─── BREADCRUMB ROW (MATCHING: Tous les collaborateurs / ST-0003-LK - Karim El Amrani) ─── */}
      <div className="flex items-center gap-2 text-xs text-[#736E62] pt-1">
        <button
          onClick={() => setViewMode(viewMode === "profile" ? "directory" : "profile")}
          className="flex items-center gap-1.5 font-bold text-[#111111] hover:underline cursor-pointer group"
          title="Afficher tous les collaborateurs"
        >
          <div className="w-5 h-5 rounded-full border border-[#111111] group-hover:bg-[#111111] group-hover:text-white transition-colors flex items-center justify-center">
            <ArrowLeft size={12} />
          </div>
          <span>Tous les collaborateurs</span>
        </button>
        <span className="text-[#8c887b] font-medium">/</span>
        <span className="font-semibold text-[#111111]">
          ST-{selectedStaff?.id ? String(selectedStaff.id).padStart(4, "0") : "0003"}-LK - {selectedStaff?.name || "Karim El Amrani"}
        </span>
      </div>

      {/* ─── CONDITIONAL VIEW: DIRECTORY VS FULL INTELLY PROFILE ─── */}
      {viewMode === "directory" ? (
        /* Team Directory Grid */
        <div className="bg-[#F7F4EB] border border-[#DDD7C5] rounded-[32px] p-6 shadow-xs flex flex-col gap-5">
          <div className="flex justify-between items-center pb-3 border-b border-[#DDD7C5]">
            <div>
              <h2 className="text-xl font-black text-[#111111]">Répertoire de l'Équipe & Collaborateurs</h2>
              <p className="text-xs text-[#736E62]">Cliquez sur un profil pour afficher son récapitulatif complet de travail et paie</p>
            </div>
            <button
              onClick={() => setViewMode("profile")}
              className="px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-black cursor-pointer"
            >
              Voir la fiche individuelle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredStaff.map((st) => {
              const isSelected = st.id === selectedStaff?.id;
              return (
                <div
                  key={st.id}
                  onClick={() => {
                    setSelectedStaffId(st.id);
                    setViewMode("profile");
                  }}
                  className={`bg-[#EFECE1] hover:bg-white rounded-[24px] border p-5 flex flex-col justify-between cursor-pointer group shadow-xs transition-all ${
                    isSelected ? "border-[#111111] ring-2 ring-black" : "border-[#DDD7C5] hover:border-black/40"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#111111] text-amber-400 flex items-center justify-center font-black text-sm tracking-wider shrink-0 shadow-xs border border-white/10 select-none">
                        <span>{st.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openEditModal(st, e)}
                          className="p-1.5 text-stone-400 hover:text-black rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ isOpen: true, type: "delete", member: st });
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-sm text-[#111111] truncate">{st.name}</h4>
                    <p className="text-[11px] text-[#736E62] truncate">{st.task || "Rythmo-Adaptateur"}</p>
                    {st.email && <p className="text-[10px] text-stone-400 truncate mt-0.5">{st.email}</p>}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#DDD7C5] flex justify-between items-center text-xs">
                    <span className="text-[#736E62] font-medium">Ouvrir fiche</span>
                    <span className="font-extrabold text-[#111111] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Profil & Paie <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── FULL INTELLY STAFF PROFILE VIEW (EXACT IMAGE REPLICA) ─── */
        <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
          
          {/* ================= LEFT COLUMN: AVATAR, GREEN ID BADGE, TAXES & PREVIOUS PROJECTS ================= */}
          <div className="w-full lg:w-[340px] xl:w-[370px] flex flex-col gap-5 shrink-0">
            
            {/* 1. Avatar & Large Title Block */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-[24px] bg-[#111111] text-amber-400 flex items-center justify-center font-black text-2xl tracking-wider shadow-md border-2 border-white select-none">
                  <span>{selectedStaff?.name?.slice(0, 2).toUpperCase() || "ST"}</span>
                </div>
                {/* Small pink number tag in corner (matching #2 in image) */}
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#F4C0D1] border border-white text-[#B23862] text-xs font-black flex items-center justify-center shadow-xs">
                  2
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight leading-tight">
                  {selectedStaff?.name || "Taigo Wilkinson"}
                </h1>
                
                <div className="flex items-center gap-3 text-[11px] text-[#736E62] mt-1 font-medium">
                  <span>57685-LK</span>
                  <span>•</span>
                  <span>11H - Follow up - 09:15</span>
                </div>

                <div className="flex items-center gap-6 text-[9px] uppercase tracking-wider font-extrabold text-[#8c887b] mt-2">
                  <span>STAFF ID</span>
                  <span>ROLE & TASKS</span>
                </div>
              </div>
            </div>

            {/* 2. Green Olive ID Card (Exact match of 1EG4-TE5-MK72 12/12/2027 in image) */}
            <div className="w-full bg-[#C2D6AF] border border-[#ABC197] rounded-[24px] p-4 text-[#1C3312] shadow-xs flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#ABC197]/60 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span>1EG4-TE5-MK72</span>
                  <span className="w-4 h-4 rounded-full border border-[#1C3312] text-[9px] flex items-center justify-center font-mono">i</span>
                </div>
                <span>12/12/2027</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#365727] font-medium">Spécialité:</span>
                  <span className="font-bold">{selectedStaff?.task || "Pose de texte & Détection"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#365727] font-medium">Date d'intégration:</span>
                  <span className="font-bold">09/07/2024 (2 ans)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#365727] font-medium">Numéro de tél:</span>
                  <span className="font-bold">+33 6 46 46 46 46</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#365727] font-medium">Tarif horaire appliqué:</span>
                  <span className="font-bold">55.00 € / hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#365727] font-medium">E-mail:</span>
                  <span className="font-bold truncate max-w-[170px]">
                    {selectedStaff?.email || "taigo.example@gmail.com"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Taxes & Studio Deductions Card (Matching "Allergies • 2 alerts" in image) */}
            <div className="w-full bg-[#EFECE1] border border-[#DDD7C5] rounded-[24px] p-4 shadow-xs flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#111111]">Allergies & Taxes</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs text-[#736E62] font-semibold">2 alertes</span>
                </div>
                <button
                  onClick={() => openEditModal(selectedStaff!)}
                  className="text-[#736E62] hover:text-[#111111]"
                  title="Modifier le collaborateur"
                >
                  <Edit2 size={13} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#FCE788] border border-[#E8D168] rounded-2xl p-3 flex flex-col gap-1.5 text-[#2C2404]">
                  <div className="flex items-center gap-1 font-bold text-xs">
                    <Percent size={13} />
                    <span>Company Tax</span>
                  </div>
                  <div className="text-[10px] space-y-0.5">
                    <p className="text-[#645209] uppercase font-semibold">TYPE</p>
                    <p className="font-bold">WITHHOLDING</p>
                    <p className="text-[#645209] uppercase font-semibold pt-1">STATUS</p>
                    <p className="font-black text-rose-700">DEDUCTED -20%!</p>
                  </div>
                </div>

                <div className="bg-[#F4C0D1] border border-[#DE9FB5] rounded-2xl p-3 flex flex-col gap-1.5 text-[#3D0A1E]">
                  <div className="flex items-center gap-1 font-bold text-xs">
                    <CheckCircle2 size={13} />
                    <span>Net Transfer</span>
                  </div>
                  <div className="text-[10px] space-y-0.5">
                    <p className="text-[#84234B] uppercase font-semibold">TYPE</p>
                    <p className="font-bold">BANK WIRE</p>
                    <p className="text-[#84234B] uppercase font-semibold pt-1">STATUS</p>
                    <p className="font-black text-emerald-800">
                      {activePaymentStatus === "Paid" ? "VERIFIED & PAID ✓" : "EN ATTENTE"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Previous Projects & Adaptations (Matching "Previous diagnosis" in image) */}
            <div className="w-full bg-[#EFECE1] border border-[#DDD7C5] rounded-[24px] p-4 shadow-xs flex flex-col gap-3">
              <h3 className="font-bold text-sm text-[#111111]">Previous projects & adaptations</h3>

              <div className="space-y-2">
                {staffWorkStats?.projectsHelped.map((proj, idx) => {
                  const isBlue = idx % 2 === 0;
                  return (
                    <div
                      key={proj.id}
                      className="bg-white/80 border border-[#DDD7C5] rounded-2xl p-3 flex items-center justify-between hover:border-black/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isBlue ? "bg-[#B3DDF2] text-[#0C3B54]" : "bg-[#F4C0D1] text-[#4A1127]"
                        }`}>
                          {isBlue ? <Briefcase size={16} /> : <Film size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#111111] truncate">{proj.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#736E62]">
                            <span className="font-mono bg-[#EFECE1] px-1 rounded">{proj.company}</span>
                            <span>{proj.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-6 h-6 rounded-lg border border-[#DDD7C5] flex items-center justify-center text-[#736E62] group-hover:text-[#111111] shrink-0">
                        <ArrowUpRight size={13} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: MAIN TABS & METRICS ================= */}
          <div className="flex-1 w-full flex flex-col gap-5">
            
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                {selectedStaff?.task || "Pose de texte & Détection Vocale"}
              </h2>

              {/* Sub-tabs: Clinical history vs Visit Details */}
              <div className="flex items-center gap-6 border-b border-[#DDD7C5] text-xs font-bold pb-2">
                <button
                  onClick={() => setProfileTab("overview")}
                  className={`relative pb-2 cursor-pointer transition-colors ${
                    profileTab === "overview" ? "text-[#111111]" : "text-[#8c887b] hover:text-[#111111]"
                  }`}
                >
                  <span>Clinical history (Aperçu des Tâches)</span>
                  {profileTab === "overview" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111111] rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setProfileTab("details")}
                  className={`relative pb-2 cursor-pointer transition-colors ${
                    profileTab === "details" ? "text-[#111111]" : "text-[#8c887b] hover:text-[#111111]"
                  }`}
                >
                  <span>Visit Details (Reçus & Calculs)</span>
                  {profileTab === "details" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#111111] rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {profileTab === "overview" ? (
              <div className="flex flex-col gap-5">
                
                {/* Health systems & general overview (Stack of colored icon cards with score) */}
                <div className="flex flex-col gap-2.5">
                  <h3 className="text-sm font-bold text-[#111111]">Health systems & general overview (Tâches réalisées)</h3>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        name: "Pose de texte (Lip-sync text placement)",
                        key: "Pose de texte",
                        score: "8.3",
                        iconBg: "bg-[#FCE788]",
                        iconColor: "text-[#4A3D06]",
                        icon: FileText,
                      },
                      {
                        name: "Détection Vocale (Audio sync detection)",
                        key: "Détection Vocale",
                        score: "9.3",
                        iconBg: "bg-[#F4C0D1]",
                        iconColor: "text-[#54122C]",
                        icon: Mic,
                      },
                      {
                        name: "Conformation Dialogue & QA (Master check)",
                        key: "Conformation Dialogue",
                        score: "4.7",
                        iconBg: "bg-[#B3DDF2]",
                        iconColor: "text-[#0E3E58]",
                        icon: CheckCircle2,
                      },
                      {
                        name: "Rythmo Chantante (Musical adaptation)",
                        key: "Rythmo Chantante",
                        score: "7.8",
                        iconBg: "bg-[#C2D6AF]",
                        iconColor: "text-[#1C3312]",
                        icon: Music,
                      },
                      {
                        name: "Calligraphie & Vérification Finale",
                        key: "Calligraphie & QA",
                        score: "8.7",
                        iconBg: "bg-[#F7D046]",
                        iconColor: "text-[#423102]",
                        icon: Sparkles,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const taskStat = (staffWorkStats?.breakdown as any)?.[item.key] || {
                        count: 1,
                        gross: 90,
                        tax: 18,
                        net: 72,
                      };

                      return (
                        <div
                          key={item.key}
                          className="w-full bg-[#EFECE1] hover:bg-white border border-[#DDD7C5] rounded-[20px] p-3 sm:px-4 sm:py-3 flex items-center justify-between transition-all cursor-pointer group shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                              <Icon size={17} />
                            </div>
                            <div>
                              <p className="font-bold text-xs sm:text-sm text-[#111111]">{item.name}</p>
                              <p className="text-[11px] text-[#736E62]">
                                {taskStat.count} livraisons • Brut: {formatCurrency(taskStat.gross)} → <span className="font-black text-[#111111]">Net: {formatCurrency(taskStat.net)}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-black text-sm text-[#111111]">{item.score}</span>
                              <span className="text-[10px] text-[#736E62] ml-1 font-semibold">of 10</span>
                            </div>
                            <div className="w-6 h-6 rounded-full border border-[#DDD7C5] flex items-center justify-center text-[#736E62] group-hover:text-[#111111] group-hover:border-[#111111] transition-colors">
                              <ChevronRight size={13} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Charts Row: Weight bar chart + Heart rate curve chart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Chart: "Weight" */}
                  <div className="bg-[#EFECE1] border border-[#DDD7C5] rounded-[24px] p-4 flex flex-col justify-between shadow-xs">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-xs text-[#111111]">Rémunération par Période</span>
                      <div className="px-2.5 py-0.5 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center gap-1">
                        <span>Année</span>
                        <ChevronDown size={11} />
                      </div>
                    </div>

                    <div className="h-28 flex items-end justify-center gap-6 pt-4 pb-2">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-8 h-16 rounded-full bg-[#F4C0D1] border border-[#DE9FB5]" />
                        <span className="text-[10px] text-[#736E62]">12/10/2026</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-8 h-24 rounded-full bg-[#111111]" />
                        <span className="text-[10px] text-[#736E62]">12/12/2026</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-8 h-12 rounded-full border-2 border-dashed border-[#C5BFB0] bg-transparent" />
                        <span className="text-[10px] text-[#736E62]">12/02/2027</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-2 border-t border-[#DDD7C5]">
                      <div>
                        <span className="font-black text-sm text-[#111111]">580 €</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#736E62] ml-1 font-bold">MINIMUM</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-[#111111]">1,240 €</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#736E62] ml-1 font-bold">MAXIMUM</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Chart: "Heart rate data" */}
                  <div className="bg-[#EFECE1] border border-[#DDD7C5] rounded-[24px] p-4 flex flex-col justify-between shadow-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-xs text-[#111111]">Productivité (lignes/h)</span>
                      <div className="px-2.5 py-0.5 rounded-full bg-[#111111] text-white text-[10px] font-bold flex items-center gap-1">
                        <span>Cette semaine</span>
                        <ChevronDown size={11} />
                      </div>
                    </div>

                    <div className="relative h-24 w-full flex items-center justify-center">
                      <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible">
                        <path
                          d="M 10 50 Q 50 20, 90 55 T 160 30 T 210 15 T 250 45 T 290 35"
                          fill="none"
                          stroke="#F4C0D1"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="210" cy="15" r="4" fill="#111111" />
                        <text x="195" y="8" fontSize="8" fontWeight="bold" fill="#111111">
                          89 l/h
                        </text>
                      </svg>
                    </div>

                    <div className="flex justify-between text-[9px] text-[#736E62] px-1 font-mono">
                      <span>12/05</span>
                      <span>13/05</span>
                      <span>14/05</span>
                      <span className="font-bold text-[#111111]">15/05</span>
                      <span>16/05</span>
                      <span>17/05</span>
                      <span>18/05</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-2 border-t border-[#DDD7C5] mt-1">
                      <div>
                        <span className="font-black text-xs text-[#111111]">75 l/h</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#736E62] ml-1 font-bold">MOYENNE</span>
                      </div>
                      <div>
                        <span className="font-black text-xs text-[#111111]">54 l/h</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#736E62] ml-1 font-bold">MIN</span>
                      </div>
                      <div>
                        <span className="font-black text-xs text-[#111111]">123 l/h</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#736E62] ml-1 font-bold">MAX</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Recent documents & Audio Waveform Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#EFECE1] border border-[#DDD7C5] rounded-[24px] p-4 flex flex-col gap-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-[#111111]">Recent documents added</span>
                      <span className="w-4 h-4 rounded-full bg-[#111111] text-white text-[9px] font-bold flex items-center justify-center">2</span>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-white/80 border border-[#DDD7C5] rounded-2xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#111111] text-white flex items-center justify-center font-mono text-xs">DOC</div>
                          <div>
                            <p className="font-bold text-xs text-[#111111]">Master Script Ep. 03 (Netflix)</p>
                            <p className="text-[10px] text-[#736E62]">Adaptation française finale</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[#736E62]">
                          <button className="p-1.5 hover:text-black cursor-pointer"><Download size={13} /></button>
                          <button className="p-1.5 hover:text-black cursor-pointer"><Eye size={13} /></button>
                        </div>
                      </div>

                      <div className="bg-white/80 border border-[#DDD7C5] rounded-2xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#111111] text-white flex items-center justify-center font-mono text-xs">RYT</div>
                          <div>
                            <p className="font-bold text-xs text-[#111111]">Bande Rythmo Finale S01.xml</p>
                            <p className="text-[10px] text-[#736E62]">Synchronisation labiale validée</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[#736E62]">
                          <button className="p-1.5 hover:text-black cursor-pointer"><Download size={13} /></button>
                          <button className="p-1.5 hover:text-black cursor-pointer"><Eye size={13} /></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#EFECE1] border border-[#DDD7C5] rounded-[24px] p-4 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-[#F4C0D1] text-[#54122C] text-[9px] font-bold">
                          Audio Track Sync
                        </span>
                        <span className="text-[10px] text-[#736E62]">12/02/2026</span>
                      </div>

                      <h4 className="font-bold text-xs text-[#111111]">
                        Piste Audio & Rythmo - {selectedStaff?.name}
                      </h4>
                      <p className="text-[10px] text-[#736E62] mt-0.5">
                        Contrôle: Aucun décalage labial détecté lors de la vérification studio.
                      </p>

                      <div className="mt-3 w-full h-20 rounded-2xl bg-[#111111] text-white p-3 flex items-center justify-between relative overflow-hidden shadow-inner">
                        <button
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                          className="w-10 h-10 rounded-full bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-md cursor-pointer hover:scale-105 transition-transform"
                        >
                          {isPlayingAudio ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                        </button>

                        <div className="flex-1 flex items-center justify-center gap-1 px-3 h-10">
                          {[30, 60, 45, 80, 100, 75, 40, 90, 65, 85, 30, 95, 70, 40, 60, 85, 50, 70, 40, 90, 50, 30].map((h, i) => (
                            <div
                              key={i}
                              style={{ height: `${isPlayingAudio ? (h * (i % 2 === 0 ? 0.9 : 1.1)) : h}%` }}
                              className="w-1 bg-amber-400/80 rounded-full transition-all duration-300"
                            />
                          ))}
                        </div>

                        <span className="text-[10px] font-mono text-stone-400 shrink-0">02:45 / 03:30</span>
                      </div>
                    </div>

                    <div className="mt-3 px-3 py-1.5 rounded-xl bg-[#FCE788] text-[#3D3202] text-[10px] font-bold flex justify-between items-center">
                      <span>Synchronisation Labiale Conforme</span>
                      <span>12/02/2026</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* TAB 2: VISIT DETAILS & YELLOW TEST CARD */
              <div className="flex flex-col gap-5">
                <div className="bg-[#EFECE1] border border-[#DDD7C5] rounded-[24px] p-5 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-base text-[#111111]">Summary & Studio Evaluation</h3>
                    <button
                      onClick={() => openEditModal(selectedStaff!)}
                      className="text-[#736E62] hover:text-[#111111]"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-[10px] uppercase font-bold text-[#736E62]">Observations sur la prestation:</p>
                    <p className="text-[#111111] leading-relaxed">
                      Le collaborateur a fait preuve d'une excellente justesse rythmique sur les dialogues rapides. 
                      Les césures sont adaptées au jeu d'acteur original, et la déduction fiscale de la société partenaire a été validée conformément aux grilles tarifaires de doublage.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {["Pose de texte", "Détection Vocale", "Validé par DA", "TVA 20% Déduite", "Livré à l'heure", "Format ERytmo"].map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/80 border border-[#DDD7C5] text-[#111111]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Laboratory Task Calculation Yellow Card (Exact Match Image 2) */}
                <div className="bg-[#FBF8E6] border-2 border-[#EADF95] rounded-[28px] overflow-hidden shadow-xs">
                  <div className="bg-[#F8EAA0] p-4 flex justify-between items-center border-b border-[#EADF95]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-black text-amber-400 flex items-center justify-center font-bold text-xs">
                        FP
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-[#262002]">Fiche de Règlement Tâche</h4>
                        <span className="text-[10px] font-mono bg-white/70 px-1.5 py-0.5 rounded text-[#5E5105]">
                          #655474
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-full bg-[#111111] hover:bg-black text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>Imprimer Reçu</span>
                    </button>
                  </div>

                  <div className="p-5 space-y-4 text-xs text-[#262002]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-[#EADF95]/60 text-[11px]">
                      <div>
                        <p className="text-[#7A6A09] font-medium">Type de Tâche:</p>
                        <p className="font-bold text-[#111111] text-xs">Pose de texte & Adaptation</p>
                      </div>
                      <div>
                        <p className="text-[#7A6A09] font-medium">Réf. Contrat:</p>
                        <p className="font-bold text-[#111111] text-xs font-mono">454645-5657-56768-7878</p>
                      </div>
                      <div>
                        <p className="text-[#7A6A09] font-medium">Date d'Exécution:</p>
                        <p className="font-bold text-[#111111] text-xs">12/10/2026</p>
                      </div>
                      <div>
                        <p className="text-[#7A6A09] font-medium">Validé par Studio:</p>
                        <p className="font-bold text-[#111111] text-xs">DubFlow Lead Adaptateur</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[#7A6A09]">Durée de prestation enregistrée:</span>
                        <span className="font-bold text-sm">3h 30m</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#7A6A09]">Tarif société appliqué:</span>
                        <span className="font-bold text-sm">60.00 € / hr (Netflix Worldwide)</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-[#EADF95]/60">
                        <span>Montant Brut Prestation:</span>
                        <span className="font-black text-base">210.00 €</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-700 font-bold">
                        <span>Déduction Fiscale de la Société (-20% Retenue / TVA):</span>
                        <span className="font-black">-42.00 €</span>
                      </div>
                      <div className="flex justify-between items-center text-[#1C3312] font-black text-lg pt-3 border-t-2 border-dashed border-[#EADF95]">
                        <span>Net Final Transféré au Collaborateur:</span>
                        <span className="bg-[#C2D6AF] px-3 py-1 rounded-xl border border-[#ABC197] text-[#1C3312]">
                          168.00 €
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#EADF95]/60 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="font-bold text-emerald-800">Paiement Envoyé & Confirmé par Virement</span>
                      </div>

                      <button
                        onClick={() => {
                          const next = activePaymentStatus === "Paid" ? "Pending" : "Paid";
                          savePayoutStatus(selectedStaff!.id, next);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-[#D5C778] bg-white/70 hover:bg-white text-xs font-bold cursor-pointer"
                      >
                        Basculer Statut ({activePaymentStatus})
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ─── ADD / EDIT STAFF MODAL ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD7C5] rounded-[28px] p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in duration-200 text-[#111111]">
            <div className="flex justify-between items-center pb-3 border-b border-[#DDD7C5]">
              <h3 className="font-black text-lg">
                {editingStaffId ? "Modifier Collaborateur" : "Ajouter un Collaborateur"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-stone-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitStaff} className="space-y-4 text-xs">
              {!editingStaffId && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Rechercher Utilisateur Enregistré</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Nom ou e-mail de l'utilisateur..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-[#DDD7C5] rounded-xl text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  {userSearchResults.length > 0 && (
                    <div className="mt-2 border border-[#DDD7C5] rounded-xl bg-white max-h-36 overflow-y-auto divide-y divide-stone-100 shadow-sm">
                      {userSearchResults.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setName(u.name);
                            setEmail(u.email);
                            setUserSearchResults([]);
                          }}
                          className="p-2.5 hover:bg-amber-400/10 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-[#111111]">{u.name}</p>
                            <p className="text-[10px] text-stone-400">{u.email}</p>
                          </div>
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-400/20 px-2 py-0.5 rounded-full">
                            Choisir
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nom Complet</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Benali"
                  className="w-full px-3 py-2 bg-stone-50 border border-[#DDD7C5] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborateur@dubflow.io"
                  className="w-full px-3 py-2 bg-stone-50 border border-[#DDD7C5] rounded-xl text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Tâche Principale</label>
                <CustomSelect
                  value={task}
                  onChange={(val) => setTask(val)}
                  options={[
                    { value: "pose le text", label: "Pose de texte" },
                    { value: "detection", label: "Détection Vocale" },
                    { value: "conformation", label: "Conformation / QA" },
                    { value: "chantant", label: "Rythmo Chantante" },
                    { value: "mixage", label: "Mixage & Son" },
                  ]}
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Niveau d'Accès</label>
                <CustomSelect
                  value={accessLevel}
                  onChange={(val) => setAccessLevel(val as any)}
                  options={[
                    { value: "spectator", label: "Spectateur (Lecture seule)" },
                    { value: "full_access", label: "Accès Complet (Édition & Upload)" },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoAccept"
                  checked={autoAcceptTransfers}
                  onChange={(e) => setAutoAcceptTransfers(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="autoAccept" className="font-semibold text-stone-700">
                  Accepter automatiquement les transferts de fichiers de ce collaborateur
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DDD7C5]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 font-bold hover:bg-stone-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editingStaffId ? "Mettre à jour" : "Confirmer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CONFIRM MODAL (DELETE & UPDATE) ─── */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === "delete" ? "Supprimer le Collaborateur ?" : "Mettre à jour le Collaborateur ?"}
        message={
          confirmModal.type === "delete"
            ? `Êtes-vous sûr de vouloir supprimer définitivement ${confirmModal.member?.name} de votre équipe ?`
            : `Confirmez-vous les modifications apportées à ${confirmModal.member?.name} ?`
        }
        confirmText={confirmModal.type === "delete" ? "Supprimer" : "Enregistrer"}
        type={confirmModal.type === "delete" ? "danger" : "info"}
        onConfirm={() => {
          if (confirmModal.type === "delete") handleDeleteStaff();
          else handleSubmitStaff();
        }}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}

export default function StaffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 h-full w-full bg-[#F7F4EB] flex items-center justify-center text-sm font-bold text-[#736E62]">
          <Loader2 size={24} className="animate-spin text-[#111111] mr-2" />
          Chargement de la fiche staff...
        </div>
      }
    >
      <StaffContent />
    </Suspense>
  );
}
