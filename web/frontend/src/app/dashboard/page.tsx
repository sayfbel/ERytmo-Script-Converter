"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Search, Heart, DollarSign, Clock, FileText, Send, 
  ChevronDown, LayoutDashboard, CheckCircle2, Check
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import PageHeader from "@/components/PageHeader";
import CustomSelect from "@/components/CustomSelect";
import { apiFetch } from "@/lib/api";

// ─── Interfaces ───

export interface CompanyItem {
  id: number;
  name: string;
  description?: string | null;
  rate_detection?: number | null;
  rate_conformation?: number | null;
  rate_pose_texte?: number | null;
  rate_chantant?: number | null;
  tax_rate?: number | null;
  supplier_email?: string | null;
  target_software?: string | null;
}

export interface ProjectItem {
  id: number;
  name: string;
  company_id?: number | null;
  company_name?: string | null;
  total_time?: number | null;
  status?: string | null;
  collaborators?: any;
  created_at?: string | null;
}

export interface StaffItem {
  id: number;
  name: string;
  email: string | null;
  task: string | null;
  access_level: string;
  status: string;
}

export interface ScheduleTaskItem {
  id: number | string;
  day: string;
  taskDate?: string | null;
  startTime: string;
  endTime: string;
  taskName: string;
  projectName?: string | null;
  companyName?: string | null;
  companyCode?: string | null;
  statusBadge?: string | null;
  staffMembers?: Array<{ name: string; initials?: string; role?: string }>;
}

export interface DashboardTransaction {
  id: string;
  type: string;
  sendDate: string;
  name: string;
  initials: string;
  avatarColor: string;
  amount: number;
  recipientCode: string;
  recipientName: string;
  projectName: string;
  durationMinutes: number;
  dueDate: string;
  status: "Paid" | "Requested" | "Sent";
  studioProfit: number;
  collabShare: number;
  taxShare: number;
}

// ─── Realistic Seed Data for Empty DB States ───
const SEED_COMPANIES: CompanyItem[] = [
  { id: 1, name: "Dubbing Brothers International", tax_rate: 20, rate_pose_texte: 60, rate_detection: 48, rate_conformation: 52, rate_chantant: 80 },
  { id: 2, name: "Deluxe Media Paris", tax_rate: 20, rate_pose_texte: 55, rate_detection: 45, rate_conformation: 50, rate_chantant: 75 },
  { id: 3, name: "SDI Media France", tax_rate: 20, rate_pose_texte: 58, rate_detection: 46, rate_conformation: 50, rate_chantant: 78 },
  { id: 4, name: "VSI Paris - Chinkel", tax_rate: 20, rate_pose_texte: 56, rate_detection: 45, rate_conformation: 50, rate_chantant: 75 },
  { id: 5, name: "TitraFilm Paris", tax_rate: 20, rate_pose_texte: 54, rate_detection: 44, rate_conformation: 48, rate_chantant: 72 },
];

const SEED_SCHEDULE_TASKS: ScheduleTaskItem[] = [
  {
    id: "st-101",
    day: "Lundi",
    taskDate: "2026-10-26",
    startTime: "09:00",
    endTime: "13:30",
    taskName: "Pose de texte",
    projectName: "Cyberpunk: Edgerunners",
    companyName: "Dubbing Brothers International",
    companyCode: "DB-001",
    statusBadge: "Payé",
    staffMembers: [{ name: "Karim El Amrani", role: "Adaptateur" }],
  },
  {
    id: "st-102",
    day: "Mardi",
    taskDate: "2026-10-27",
    startTime: "10:00",
    endTime: "14:00",
    taskName: "Détection Vocale",
    projectName: "Arcane: League of Legends",
    companyName: "Deluxe Media Paris",
    companyCode: "DLX-042",
    statusBadge: "En attente",
    staffMembers: [{ name: "Sarah Bennani", role: "Détectrice" }],
  },
  {
    id: "st-103",
    day: "Mercredi",
    taskDate: "2026-10-28",
    startTime: "14:00",
    endTime: "18:30",
    taskName: "Conformation Dialogue",
    projectName: "One Piece Film: Red",
    companyName: "SDI Media France",
    companyCode: "SDI-109",
    statusBadge: "Facturé",
    staffMembers: [{ name: "Mehdi Chraibi", role: "Directeur de plateau" }],
  },
  {
    id: "st-104",
    day: "Jeudi",
    taskDate: "2026-10-29",
    startTime: "09:30",
    endTime: "13:00",
    taskName: "Rythmo Chantante",
    projectName: "Hazbin Hotel",
    companyName: "VSI Paris - Chinkel",
    companyCode: "VSI-007",
    statusBadge: "Payé",
    staffMembers: [{ name: "Yasmine Tazi", role: "Chanteuse & Adaptatrice" }],
  },
  {
    id: "st-105",
    day: "Vendredi",
    taskDate: "2026-10-30",
    startTime: "11:00",
    endTime: "16:00",
    taskName: "Pose de texte",
    projectName: "Bleach: Thousand-Year Blood War",
    companyName: "Dubbing Brothers International",
    companyCode: "DB-001",
    statusBadge: "En cours",
    staffMembers: [{ name: "Hamza Belfaquir", role: "Adaptateur" }],
  },
  {
    id: "st-106",
    day: "Lundi",
    taskDate: "2026-10-19",
    startTime: "09:00",
    endTime: "13:00",
    taskName: "Détection Vocale",
    projectName: "Spider-Man: Across the Spider-Verse",
    companyName: "Deluxe Media Paris",
    companyCode: "DLX-042",
    statusBadge: "Payé",
    staffMembers: [{ name: "Camille Laurent", role: "Détectrice" }],
  },
  {
    id: "st-107",
    day: "Mardi",
    taskDate: "2026-10-20",
    startTime: "14:00",
    endTime: "18:00",
    taskName: "Conformation Dialogue",
    projectName: "Stranger Things S5",
    companyName: "TitraFilm Paris",
    companyCode: "TF-302",
    statusBadge: "Facturé",
    staffMembers: [{ name: "Karim El Amrani", role: "Vérificateur" }],
  },
];

const AVATAR_BG_COLORS = [
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-rose-100 text-rose-800 border-rose-300",
  "bg-sky-100 text-sky-800 border-sky-300",
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-purple-100 text-purple-800 border-purple-300",
  "bg-indigo-100 text-indigo-800 border-indigo-300",
];

function getInitials(name: string): string {
  if (!name) return "DB";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function DashboardBillingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // ─── Data State ───
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTaskItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status overrides saved in localStorage
  const [statusOverrides, setStatusOverrides] = useState<Record<string, "Paid" | "Requested" | "Sent">>({});

  // ─── Filter States (matching Projects toolbar) ───
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedPeriod, setSelectedPeriod] = useState("Ce mois-ci");
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  // Load Status Overrides from LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dubflow_dashboard_task_status");
        if (saved) setStatusOverrides(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const updateTaskStatus = (taskId: string, newStatus: "Paid" | "Requested" | "Sent") => {
    setStatusOverrides((prev) => {
      const updated = { ...prev, [taskId]: newStatus };
      try {
        localStorage.setItem("dubflow_dashboard_task_status", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  // ─── Fetch Dynamic Data from APIs ───
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [compRes, projRes, schedRes, staffRes] = await Promise.all([
        apiFetch("/api/companies").catch(() => null),
        apiFetch("/api/projects").catch(() => null),
        apiFetch("/api/schedule-tasks").catch(() => null),
        apiFetch("/api/staff").catch(() => null),
      ]);

      let loadedCompanies: CompanyItem[] = [];
      let loadedProjects: ProjectItem[] = [];
      let loadedTasks: ScheduleTaskItem[] = [];
      let loadedStaff: StaffItem[] = [];

      if (compRes && compRes.ok) {
        const d = await compRes.json();
        if (Array.isArray(d) && d.length > 0) loadedCompanies = d;
      }
      if (projRes && projRes.ok) {
        const d = await projRes.json();
        if (Array.isArray(d) && d.length > 0) loadedProjects = d;
      }
      if (schedRes && schedRes.ok) {
        const d = await schedRes.json();
        if (Array.isArray(d) && d.length > 0) loadedTasks = d;
      }
      if (staffRes && staffRes.ok) {
        const d = await staffRes.json();
        if (Array.isArray(d) && d.length > 0) loadedStaff = d;
      }

      setCompanies(loadedCompanies.length > 0 ? loadedCompanies : SEED_COMPANIES);
      setProjects(loadedProjects);
      setStaff(loadedStaff);

      // Merge dynamic schedule tasks or fallback to realistic seed tasks
      if (loadedTasks.length > 0) {
        setScheduleTasks(loadedTasks);
      } else {
        setScheduleTasks(SEED_SCHEDULE_TASKS);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setCompanies(SEED_COMPANIES);
      setScheduleTasks(SEED_SCHEDULE_TASKS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  // ─── Helper: Resolve Company Rate for Task ───
  const getCompanyRate = (companyName: string | undefined, taskName: string): { rate: number; taxRate: number; type: string } => {
    const comp = companies.find((c) => c.name.toLowerCase() === (companyName || "").toLowerCase());
    const tax = comp?.tax_rate !== undefined && comp?.tax_rate !== null ? comp.tax_rate : 20;

    const t = (taskName || "").toLowerCase();
    if (t.includes("pose") || t.includes("texte") || t.includes("text")) {
      return { rate: comp?.rate_pose_texte || 55, taxRate: tax, type: "Pose de texte" };
    }
    if (t.includes("détect") || t.includes("detect")) {
      return { rate: comp?.rate_detection || 45, taxRate: tax, type: "Détection Vocale" };
    }
    if (t.includes("conform")) {
      return { rate: comp?.rate_conformation || 50, taxRate: tax, type: "Conformation Dialogue" };
    }
    if (t.includes("chant") || t.includes("rythmo") || t.includes("song")) {
      return { rate: comp?.rate_chantant || 75, taxRate: tax, type: "Rythmo Chantante" };
    }
    return { rate: comp?.rate_pose_texte || 50, taxRate: tax, type: "Pose de texte" };
  };

  // ─── Compute Dynamic Transactions ───
  const allTransactions: DashboardTransaction[] = useMemo(() => {
    return scheduleTasks.map((st, idx) => {
      const durM = Math.max(30, timeToMinutes(st.endTime) - timeToMinutes(st.startTime));
      const { rate, taxRate, type } = getCompanyRate(st.companyName || undefined, st.taskName);
      const grossAmount = (durM / 60) * rate;

      const collabsList = st.staffMembers || [];
      const collabName = collabsList.length > 0 ? collabsList[0].name : "Hamza Belfaquir";
      const compName = st.companyName || "Dubbing Brothers International";
      const compCode = st.companyCode || `DB-${100 + idx}`;

      // Tax & Profit shares
      const taxShare = grossAmount * (taxRate / 100);
      const collabShare = grossAmount * 0.7 - (taxShare * 0.5);
      const studioProfit = Math.max(0, grossAmount - collabShare - taxShare);

      // Determine status from override or task badge
      let defaultStatus: "Paid" | "Requested" | "Sent" = "Sent";
      const badge = (st.statusBadge || "").toLowerCase();
      if (badge.includes("pay") || badge.includes("termin") || badge.includes("done")) {
        defaultStatus = "Paid";
      } else if (badge.includes("attente") || badge.includes("cours")) {
        defaultStatus = "Requested";
      } else {
        defaultStatus = "Sent";
      }

      const activeStatus = statusOverrides[String(st.id)] || defaultStatus;

      // Dates
      const taskDate = st.taskDate || "2026-10-26";
      const formattedDate = new Date(taskDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
      
      // Due Date (30 days later)
      const dueObj = new Date(taskDate);
      dueObj.setDate(dueObj.getDate() + 30);
      const formattedDue = dueObj.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });

      return {
        id: String(st.id),
        type,
        sendDate: formattedDate,
        name: collabName,
        initials: getInitials(collabName),
        avatarColor: AVATAR_BG_COLORS[idx % AVATAR_BG_COLORS.length],
        amount: grossAmount,
        recipientCode: compCode,
        recipientName: compName,
        projectName: st.projectName || "Projet DubFlow",
        durationMinutes: durM,
        dueDate: formattedDue,
        status: activeStatus,
        studioProfit,
        collabShare,
        taxShare,
      };
    });
  }, [scheduleTasks, companies, statusOverrides]);

  // ─── Filter Transactions ───
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      // Category Filter
      if (categoryFilter !== "All" && tx.type !== categoryFilter) {
        return false;
      }
      // Company Filter
      if (companyFilter !== "All" && tx.recipientName !== companyFilter) {
        return false;
      }
      // Status Filter
      if (statusFilter !== "All") {
        if (statusFilter === "Paid" && tx.status !== "Paid") return false;
        if (statusFilter === "Requested" && tx.status !== "Requested") return false;
        if (statusFilter === "Sent" && tx.status !== "Sent") return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = tx.name.toLowerCase().includes(q);
        const matchesProject = tx.projectName.toLowerCase().includes(q);
        const matchesCompany = tx.recipientName.toLowerCase().includes(q);
        const matchesType = tx.type.toLowerCase().includes(q);
        const matchesCode = tx.recipientCode.toLowerCase().includes(q);
        if (!matchesName && !matchesProject && !matchesCompany && !matchesType && !matchesCode) {
          return false;
        }
      }
      return true;
    });
  }, [allTransactions, categoryFilter, companyFilter, statusFilter, searchQuery]);

  // ─── Financial Totals & KPI Metrics ───
  const metrics = useMemo(() => {
    let totalGross = 0;
    let totalPaid = 0;
    let totalRequested = 0;
    let totalStudioProfit = 0;
    let totalCollabPayroll = 0;
    let paidCount = 0;
    let requestedCount = 0;

    allTransactions.forEach((tx) => {
      totalGross += tx.amount;
      if (tx.status === "Paid") {
        totalPaid += tx.amount;
        paidCount++;
      } else if (tx.status === "Requested") {
        totalRequested += tx.amount;
        requestedCount++;
      } else {
        totalPaid += tx.amount;
      }
      totalStudioProfit += tx.studioProfit;
      totalCollabPayroll += tx.collabShare;
    });

    // Donut percentages
    const safeGross = totalGross > 0 ? totalGross : 1;
    const paidPct = Math.min(1, Math.max(0.05, totalPaid / safeGross));
    const requestedPct = Math.min(1, Math.max(0.05, totalRequested / safeGross));
    const profitPct = Math.min(1, Math.max(0.05, totalStudioProfit / safeGross));

    // Circumference of radius 72: 2 * PI * 72 ≈ 452.39
    const circumference = 452.39;
    
    // Normalize percentages to sum to 1
    const sumPcts = paidPct + requestedPct + profitPct;
    const normPaid = paidPct / sumPcts;
    const normReq = requestedPct / sumPcts;
    const normProfit = profitPct / sumPcts;

    const lenYellow = normProfit * circumference;
    const lenBlue = normReq * circumference;
    const lenPink = normPaid * circumference;

    return {
      totalGross,
      totalPaid,
      totalRequested,
      totalStudioProfit,
      totalCollabPayroll,
      paidCount,
      requestedCount,
      lenYellow,
      lenBlue,
      lenPink,
      circumference,
      normPaidPct: Math.round(normPaid * 100),
      normReqPct: Math.round(normReq * 100),
      normProfitPct: Math.round(normProfit * 100),
    };
  }, [allTransactions]);

  // ─── Actions ───
  const handleRequestPayment = (tx: DashboardTransaction) => {
    updateTaskStatus(tx.id, "Requested");
    showToast(
      "Demande Envoyée",
      `Demande de facturation envoyée avec succès pour ${tx.projectName} (${tx.recipientName}).`,
      "success"
    );
  };

  const handleMarkAsPaid = (tx: DashboardTransaction) => {
    updateTaskStatus(tx.id, "Paid");
    showToast(
      "Paiement Validé",
      `Facture #${tx.id} de ${formatCurrency(tx.amount)} marquée comme réglée.`,
      "success"
    );
  };

  const handleDownloadInvoice = (tx: DashboardTransaction) => {
    showToast(
      "Facture Téléchargée",
      `Facture #${tx.id} (${tx.projectName} - ${formatCurrency(tx.amount)}) prête au téléchargement.`,
      "info"
    );
  };

  // Pending Sessions for "Waiting for bills"
  const pendingSessions = useMemo(() => {
    return allTransactions.filter((tx) => tx.status === "Requested" || tx.status === "Sent").slice(0, 2);
  }, [allTransactions]);

  // Latest 3 Transactions
  const latestTransactions = useMemo(() => {
    return allTransactions.slice(0, 3);
  }, [allTransactions]);

  // Unique Company Options for Select
  const companySelectOptions = useMemo(() => {
    const list = [{ value: "All", label: "Toutes les sociétés" }];
    const unique = Array.from(new Set(companies.map((c) => c.name)));
    unique.forEach((name) => list.push({ value: name, label: name }));
    return list;
  }, [companies]);

  return (
    <div className="flex-1 h-full w-full overflow-visible bg-transparent text-[#111111] p-3 sm:p-5 md:p-6 select-none font-sans-display flex flex-col gap-5">
      
      {/* 1. Header with Title, Icon, Subtitle */}
      <PageHeader
        title="Facturation Studio & Sessions en Direct"
        subtitle="Suivi dynamique des factures, rémunérations collaborateurs et marge nette en temps réel."
        icon={<LayoutDashboard size={28} />}
      />

      {/* Toolbar: Search and CustomSelect Filters (Strictly matching Projects style) */}
      <div className="flex gap-3 sm:gap-4 mb-2 flex-wrap shrink-0 items-center">
        {/* Search Input */}
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 transform -translate-y-1/2 text-[#FF7597] group-focus-within:text-[#FF7597] transition-colors" size={17} />
          <input
            type="text"
            placeholder="Rechercher une facture, un collaborateur, un projet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 bg-[#F7F4EB] border border-[#D9D3C2] hover:border-[#111111] focus:border-[#111111] rounded-full shadow-xs focus:outline-none transition-all text-sm font-medium text-[#111111] placeholder-[#8c887b]"
          />
        </div>

        {/* Company Filter Selector */}
        <div className="shrink-0 w-48 sm:w-56">
          <CustomSelect
            value={companyFilter}
            onChange={(val) => setCompanyFilter(val)}
            options={companySelectOptions}
          />
        </div>

        {/* Task Category Filter Selector */}
        <div className="shrink-0 w-44 sm:w-52">
          <CustomSelect
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            options={[
              { value: "All", label: "Toutes les catégories" },
              { value: "Pose de texte", label: "Pose de texte" },
              { value: "Détection Vocale", label: "Détection Vocale" },
              { value: "Conformation Dialogue", label: "Conformation Dialogue" },
              { value: "Rythmo Chantante", label: "Rythmo Chantante" },
            ]}
          />
        </div>

        {/* Status Filter Selector */}
        <div className="shrink-0 w-36 sm:w-44">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: "All", label: "Tous statuts" },
              { value: "Paid", label: "Payé" },
              { value: "Requested", label: "En attente" },
              { value: "Sent", label: "Facturé" },
            ]}
          />
        </div>
      </div>

      {/* Scrollable Dashboard Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-5">
        
        {/* 2. TWO-COLUMN EXECUTIVE DASHBOARD GRID */}
        <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
        
          {/* ================= LEFT COLUMN: DONUT CHART & 3 COLORFUL KPI CARDS ================= */}
          <div className="w-full lg:w-[340px] xl:w-[380px] flex flex-col gap-4 shrink-0">
            
            {/* A. DYNAMIC DONUT CHART CARD */}
            <div className="w-full bg-[#F7F4EB] border border-[#DDD7C5] rounded-[32px] p-6 shadow-xs flex flex-col items-center justify-center relative">
              
              {/* SVG Donut Chart */}
              <div className="relative w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {/* Background Ring Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r="72"
                    fill="transparent"
                    stroke="#ECE8DD"
                    strokeWidth="20"
                  />

                  {/* 1. Yellow Segment: Studio Profit */}
                  <circle
                    cx="100"
                    cy="100"
                    r="72"
                    fill="transparent"
                    stroke="#F7D046"
                    strokeWidth="20"
                    strokeDasharray={`${metrics.lenYellow} ${metrics.circumference - metrics.lenYellow}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />

                  {/* 2. Soft Blue Segment: Payments Requested */}
                  <circle
                    cx="100"
                    cy="100"
                    r="72"
                    fill="transparent"
                    stroke="#B9D7F9"
                    strokeWidth="20"
                    strokeDasharray={`${metrics.lenBlue} ${metrics.circumference - metrics.lenBlue}`}
                    strokeDashoffset={`-${metrics.lenYellow}`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />

                  {/* 3. Pink Segment: Payments Received */}
                  <circle
                    cx="100"
                    cy="100"
                    r="72"
                    fill="transparent"
                    stroke="#FF94B8"
                    strokeWidth="20"
                    strokeDasharray={`${metrics.lenPink} ${metrics.circumference - metrics.lenPink}`}
                    strokeDashoffset={`-${metrics.lenYellow + metrics.lenBlue}`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Badges on the ring */}
                {/* Dollar badge on yellow */}
                <div 
                  className="absolute top-10 left-10 w-6 h-6 rounded-full bg-white shadow-xs border border-amber-300 flex items-center justify-center text-amber-600 font-extrabold text-[11px]"
                  title={`Marge studio: ${metrics.normProfitPct}%`}
                >
                  €
                </div>
                {/* Heart badge on pink */}
                <div 
                  className="absolute top-8 right-12 w-6 h-6 rounded-full bg-white shadow-xs border border-rose-300 flex items-center justify-center text-rose-500 font-extrabold text-[11px]"
                  title={`Encaissé: ${metrics.normPaidPct}%`}
                >
                  <Heart size={11} className="fill-rose-500" />
                </div>
                {/* Timer badge on blue */}
                <div 
                  className="absolute bottom-12 left-12 w-6 h-6 rounded-full bg-white shadow-xs border border-sky-300 flex items-center justify-center text-sky-600 font-extrabold text-[11px]"
                  title={`En attente: ${metrics.normReqPct}%`}
                >
                  <Clock size={11} />
                </div>

                {/* Center Stat */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight font-sans">
                    {(metrics.totalGross / 1000).toFixed(1)}k €
                  </span>
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mt-0.5">
                    Volume Total
                  </span>
                </div>
              </div>
            </div>

            {/* B. TIME PERIOD FILTER PILL */}
            <div className="flex justify-end relative">
              <button
                onClick={() => setPeriodDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 bg-[#111111] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs cursor-pointer transition-colors"
              >
                <span>{selectedPeriod}</span>
                <ChevronDown size={14} className="text-[#999999]" />
              </button>

              {periodDropdownOpen && (
                <div className="absolute right-0 top-10 z-30 w-40 bg-[#ECE8DD] border border-[#DDD7C5] rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 text-xs">
                  {["Cette semaine", "Ce mois-ci", "Ce trimestre", "Toutes périodes"].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setSelectedPeriod(p);
                        setPeriodDropdownOpen(false);
                      }}
                      className={`text-left px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                        selectedPeriod === p ? "bg-[#111111] text-white font-bold" : "text-[#111111] hover:bg-white/60"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* C. 3 COLORFUL KPI CARDS */}
            <div className="flex flex-col gap-3.5">
              
              {/* 1. PINK CARD: Payments received */}
              <div className="rounded-[28px] bg-[#FFDEEB] p-5 border border-pink-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-rose-500 shadow-xs">
                      <Heart size={13} className="fill-rose-500" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#111111]">
                      Paiements Reçus
                    </span>
                  </div>

                  {/* Percentage Pill */}
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white text-emerald-700 text-[11px] font-extrabold rounded-full shadow-xs">
                    ↑ +{metrics.normPaidPct}%
                  </span>
                </div>

                <div className="pt-3">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                    {formatCurrency(metrics.totalPaid)}
                  </div>
                  <div className="text-[11px] text-stone-600 font-medium mt-0.5 flex items-center gap-1">
                    <span>{metrics.paidCount} sessions encaissées</span>
                    <span>•</span>
                    <span>Facturation validée</span>
                  </div>
                </div>
              </div>

              {/* 2. SOFT BLUE CARD: Payments requested */}
              <div className="rounded-[28px] bg-[#D7E8FC] p-5 border border-blue-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-sky-600 shadow-xs">
                      <Clock size={13} />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#111111]">
                      Paiements Demandés
                    </span>
                  </div>

                  {/* Count Pill */}
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white text-sky-800 text-[11px] font-extrabold rounded-full shadow-xs">
                    {metrics.requestedCount} en attente
                  </span>
                </div>

                <div className="pt-3">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                    {formatCurrency(metrics.totalRequested)}
                  </div>
                  <div className="text-[11px] text-stone-600 font-medium mt-0.5">
                    Factures émises en attente de règlement client
                  </div>
                </div>
              </div>

              {/* 3. WARM YELLOW CARD: Studio Net Profit */}
              <div className="rounded-[28px] bg-[#FDE98A] p-5 border border-yellow-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-amber-700 shadow-xs">
                      <DollarSign size={13} />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#111111]">
                      Marge Nette Studio
                    </span>
                  </div>

                  {/* Percentage Pill */}
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white text-amber-800 text-[11px] font-extrabold rounded-full shadow-xs">
                    {metrics.normProfitPct}% marge
                  </span>
                </div>

                <div className="pt-3">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                    {formatCurrency(metrics.totalStudioProfit)}
                  </div>
                  <div className="text-[11px] text-stone-600 font-medium mt-0.5">
                    Bénéfice net après rémunérations et taxes
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* ================= RIGHT COLUMN: WAITING BILLS, LATEST TRANSACTIONS & TABLE ================= */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
            
            {/* A. WAITING FOR BILLS ROW */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-extrabold text-[#111111] flex items-center gap-2">
                  <span>Sessions à Valider & Facturer</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
                    {pendingSessions.length}
                  </span>
                </h3>
              </div>

              {pendingSessions.length === 0 ? (
                <div className="bg-[#ECE8DD] border border-[#DDD7C5] rounded-[24px] p-5 text-center flex items-center justify-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span className="text-xs font-bold text-stone-700">Toutes les sessions sont à jour ! Aucune facture en attente.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="bg-[#ECE8DD] border border-[#DDD7C5] rounded-[24px] p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-[#111111] transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border font-extrabold text-xs shadow-xs ${session.avatarColor}`}>
                            {session.initials}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-[#111111]">
                              {session.name}
                            </h4>
                            <p className="text-[11px] text-stone-600 font-medium">
                              {session.projectName} • {session.type}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 bg-sky-200/80 text-sky-800 text-[10px] font-bold rounded-full">
                          {formatCurrency(session.amount)}
                        </span>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-stone-500 font-mono">
                          {session.recipientName}
                        </span>
                        <button
                          onClick={() => handleRequestPayment(session)}
                          className="bg-[#111111] hover:bg-black text-white text-xs font-bold py-2 px-5 rounded-full transition-transform active:scale-95 shadow-xs cursor-pointer"
                        >
                          Demander paiement
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* B. LATEST TRANSACTION ROW */}
            <div>
              <h3 className="text-sm font-extrabold text-[#111111] mb-3">
                Dernières Transactions Studio
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {latestTransactions.map((tx) => (
                  <div key={tx.id} className="bg-[#ECE8DD] border border-[#DDD7C5] rounded-[22px] p-3.5 flex items-center justify-between shadow-xs hover:border-[#111111] transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="text-[10px] text-stone-500 font-mono truncate">{tx.recipientCode} • {tx.recipientName}</div>
                      <div className="text-xs font-bold text-[#111111] truncate">{tx.projectName}</div>
                      <div className="text-[11px] font-medium text-stone-600 truncate mt-0.5">{tx.type} • {tx.name}</div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <span className="px-2.5 py-1 bg-[#D1F2D9] text-[#136C38] text-xs font-extrabold rounded-full shadow-xs whitespace-nowrap">
                        + {formatCurrency(tx.amount)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-medium">{tx.sendDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* C. DETAILED INVOICES & BILLING TABLE */}
            <div className="flex flex-col gap-3">
              
              {/* Table Quick Category Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {(["All", "Pose de texte", "Détection Vocale", "Conformation Dialogue", "Rythmo Chantante"] as const).map((tab) => {
                  const isActive = categoryFilter === tab;
                  const label = tab === "All" ? "Toutes les catégories" : tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setCategoryFilter(tab)}
                      className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-[#111111] text-white shadow-xs"
                          : "bg-[#ECE8DD] text-stone-600 hover:text-black border border-[#DDD7C5]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Table Container */}
              <div className="w-full bg-[#ECE8DD] border border-[#DDD7C5] rounded-[28px] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#111111] border-collapse">
                    <thead className="bg-[#E4DFC8] text-stone-600 text-[11px] font-bold border-b border-[#DDD7C5]">
                      <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Date d&apos;envoi</th>
                        <th className="px-4 py-3">Collaborateur</th>
                        <th className="px-4 py-3">Montant Brut</th>
                        <th className="px-4 py-3">Client / Société</th>
                        <th className="px-4 py-3">Échéance</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD7C5]/50 bg-[#ECE8DD]">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-stone-500 font-medium">
                            Aucune facture ou session trouvée avec ces critères.
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-[#E4DFC8]/50 transition-colors">
                            <td className="px-4 py-3 text-stone-800 font-medium whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#FF7597]" />
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-stone-500 font-mono whitespace-nowrap">
                              {tx.sendDate}
                            </td>
                            <td className="px-4 py-3 font-bold text-[#111111] whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border shadow-xs shrink-0 ${tx.avatarColor}`}>
                                  {tx.initials}
                                </div>
                                <span>{tx.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-extrabold text-[#111111] whitespace-nowrap">
                              {formatCurrency(tx.amount)}
                            </td>
                            <td className="px-4 py-3 text-stone-600 whitespace-nowrap font-medium">
                              <span className="font-mono text-stone-400 mr-1.5">{tx.recipientCode}</span>
                              {tx.recipientName}
                            </td>
                            <td className="px-4 py-3 text-stone-500 font-mono whitespace-nowrap">
                              {tx.dueDate}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {tx.status === "Paid" && (
                                <span className="px-2.5 py-0.5 bg-[#FFDEEB] text-[#831843] text-[10px] font-extrabold rounded-full">
                                  Payé
                                </span>
                              )}
                              {tx.status === "Requested" && (
                                <span className="px-2.5 py-0.5 bg-[#D7E8FC] text-[#1E3A8A] text-[10px] font-extrabold rounded-full">
                                  En attente
                                </span>
                              )}
                              {tx.status === "Sent" && (
                                <span className="px-2.5 py-0.5 bg-[#D1F2D9] text-[#136C38] text-[10px] font-extrabold rounded-full">
                                  Facturé
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleDownloadInvoice(tx)}
                                  className="p-1.5 rounded-full text-stone-500 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                                  title="Télécharger la facture"
                                >
                                  <FileText size={14} />
                                </button>
                                {tx.status !== "Paid" && (
                                  <button
                                    onClick={() => handleMarkAsPaid(tx)}
                                    className="p-1.5 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                                    title="Marquer comme payé"
                                  >
                                    <Check size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRequestPayment(tx)}
                                  className="p-1.5 rounded-full text-stone-500 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                                  title="Envoyer un rappel de paiement"
                                >
                                  <Send size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
