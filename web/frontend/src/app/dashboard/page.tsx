"use client";

export const dynamic = "force-dynamic";

import React, { useState, useMemo } from "react";
import { 
  Search, Heart, DollarSign, Clock, FileText, Send, 
  ChevronDown, LayoutDashboard, Stethoscope, Video
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import PageHeader from "@/components/PageHeader";

interface TransactionRow {
  id: string;
  type: "Telemedicine" | "In clinic" | "Insurance" | "Direct";
  sendDate: string;
  name: string;
  amount: number;
  recipientCode: string;
  recipientName: string;
  dueDate: string;
  status: "Paid" | "Requested" | "Sent";
}

const INITIAL_TRANSACTIONS: TransactionRow[] = [
  {
    id: "tx-1",
    type: "Telemedicine",
    sendDate: "12/12/26",
    name: "Rachel Mayers",
    amount: 345.65,
    recipientCode: "123456",
    recipientName: "American Family Insurance",
    dueDate: "12/12/26",
    status: "Requested",
  },
  {
    id: "tx-2",
    type: "In clinic",
    sendDate: "12/12/26",
    name: "Samantha Williams",
    amount: 345.65,
    recipientCode: "123456",
    recipientName: "Samantha Williams",
    dueDate: "-",
    status: "Paid",
  },
  {
    id: "tx-3",
    type: "Insurance",
    sendDate: "12/12/26",
    name: "Amy White",
    amount: 345.65,
    recipientCode: "123334",
    recipientName: "GEICO Localisation",
    dueDate: "12/12/26",
    status: "Sent",
  },
  {
    id: "tx-4",
    type: "In clinic",
    sendDate: "12/12/26",
    name: "Tyler Young",
    amount: 345.65,
    recipientCode: "123456",
    recipientName: "American Family Insurance",
    dueDate: "-",
    status: "Paid",
  },
  {
    id: "tx-5",
    type: "Telemedicine",
    sendDate: "12/12/26",
    name: "Amy White",
    amount: 345.65,
    recipientCode: "123334",
    recipientName: "GEICO Localisation",
    dueDate: "12/12/26",
    status: "Paid",
  },
  {
    id: "tx-6",
    type: "Telemedicine",
    sendDate: "12/12/26",
    name: "Rachel Mayers",
    amount: 345.65,
    recipientCode: "123456",
    recipientName: "American Family Insurance",
    dueDate: "12/12/26",
    status: "Requested",
  },
  {
    id: "tx-7",
    type: "Insurance",
    sendDate: "12/12/26",
    name: "Rachel Mayers",
    amount: 345.65,
    recipientCode: "123456",
    recipientName: "American Family Insurance",
    dueDate: "12/12/26",
    status: "Paid",
  },
];

const SEARCH_TAGS = [
  { id: "all", label: "All" },
  { id: "patients", label: "Patients" },
  { id: "education", label: "Education" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "tests", label: "Test results" },
];

export default function DashboardBillingPage() {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchTag, setActiveSearchTag] = useState("all");
  const [tableFilter, setTableFilter] = useState<"All" | "Telemedicine" | "In clinic" | "Insurance">("All");
  const [selectedPeriod, setSelectedPeriod] = useState("This week");
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return INITIAL_TRANSACTIONS.filter((row) => {
      if (tableFilter !== "All" && row.type !== tableFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.name.toLowerCase().includes(q);
        const matchesRecipient = row.recipientName.toLowerCase().includes(q);
        const matchesType = row.type.toLowerCase().includes(q);
        if (!matchesName && !matchesRecipient && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [tableFilter, searchQuery]);

  const handleRequestPayment = (name: string) => {
    showToast(
      "Payment Requested",
      `Payment request sent successfully to ${name}.`,
      "success"
    );
  };

  const handleDownloadInvoice = (rowId: string, name: string) => {
    showToast(
      "Invoice Downloaded",
      `Invoice for ${name} #${rowId} downloaded.`,
      "info"
    );
  };

  return (
    <div className="flex-1 h-full w-full overflow-visible bg-transparent text-[#111111] p-3 sm:p-5 md:p-6 select-none font-sans-display flex flex-col gap-5">
      
      {/* 1. Header with Title, Icon, Explanatory Subtitle, Header Action Pills */}
      <PageHeader
        title="Your patients billing & invoices"
        subtitle="Comprehensive studio billing breakdown, invoice statuses, and financial cashflow overview."
        icon={<LayoutDashboard size={28} />}
      >
        {/* Top Search Pill Bar with In: Category Filter Chips (Matching Image 3) */}
        <div className="flex-1 max-w-2xl bg-[#F7F4EB] border border-[#D9D3C2] rounded-full px-4 py-2 flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:border-[#111111] transition-all">
          <Search size={18} className="text-[#FF7597] shrink-0" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-28 sm:w-36 md:w-44 bg-transparent text-sm text-[#111111] placeholder-[#8c887b] focus:outline-none"
          />

          <div className="h-4 w-px bg-[#D9D3C2] hidden sm:block" />

          {/* Inline "In:" Category Filter Chips */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[#8c887b] font-medium text-[11px] pr-0.5">In:</span>
            {SEARCH_TAGS.filter((t) => t.id !== "all").map((tag) => {
              const isSelected = activeSearchTag === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => setActiveSearchTag(isSelected ? "all" : tag.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#111111] text-white border border-[#111111]"
                      : "border border-dashed border-[#C5BFB0] text-[#736E62] hover:text-[#111111] hover:border-[#111111]"
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </PageHeader>

      {/* Scrollable Dashboard Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-5">
        {/* 2. TWO-COLUMN EXECUTIVE DASHBOARD GRID */}
        <div className="flex flex-col lg:flex-row items-start gap-6 w-full">
        
        {/* ================= LEFT COLUMN: DONUT CHART & 3 COLORFUL KPI CARDS ================= */}
        <div className="w-full lg:w-[340px] xl:w-[380px] flex flex-col gap-4 shrink-0">
          
          {/* A. DONUT CHART CARD (Matching Image 3) */}
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

                {/* 1. Yellow Segment (e.g. 30%) */}
                <circle
                  cx="100"
                  cy="100"
                  r="72"
                  fill="transparent"
                  stroke="#F7D046"
                  strokeWidth="20"
                  strokeDasharray="135 317"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />

                {/* 2. Soft Blue Segment (e.g. 25%) */}
                <circle
                  cx="100"
                  cy="100"
                  r="72"
                  fill="transparent"
                  stroke="#B9D7F9"
                  strokeWidth="20"
                  strokeDasharray="100 352"
                  strokeDashoffset="-150"
                  strokeLinecap="round"
                />

                {/* 3. Pink Segment (e.g. 35%) */}
                <circle
                  cx="100"
                  cy="100"
                  r="72"
                  fill="transparent"
                  stroke="#FF94B8"
                  strokeWidth="20"
                  strokeDasharray="150 302"
                  strokeDashoffset="-270"
                  strokeLinecap="round"
                />
              </svg>

              {/* Badges on the ring */}
              {/* Dollar badge on yellow */}
              <div className="absolute top-10 left-10 w-6 h-6 rounded-full bg-white shadow-xs border border-amber-300 flex items-center justify-center text-amber-600 font-extrabold text-[11px]">
                $
              </div>
              {/* Heart badge on pink */}
              <div className="absolute top-8 right-12 w-6 h-6 rounded-full bg-white shadow-xs border border-rose-300 flex items-center justify-center text-rose-500 font-extrabold text-[11px]">
                <Heart size={11} className="fill-rose-500" />
              </div>
              {/* Hourglass/Timer badge on blue */}
              <div className="absolute bottom-12 left-12 w-6 h-6 rounded-full bg-white shadow-xs border border-sky-300 flex items-center justify-center text-sky-600 font-extrabold text-[11px]">
                <Clock size={11} />
              </div>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight font-sans">
                  23,4k
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
              <div className="absolute right-0 top-10 z-30 w-36 bg-[#ECE8DD] border border-[#DDD7C5] rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 text-xs">
                {["This week", "This month", "This quarter", "This year"].map((p) => (
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

          {/* C. 3 COLORFUL KPI CARDS (Matching Image 3) */}
          <div className="flex flex-col gap-3.5">
            
            {/* 1. PINK CARD: Payments received */}
            <div className="rounded-[28px] bg-[#FFDEEB] p-5 border border-pink-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-rose-500 shadow-xs">
                    <Heart size={13} className="fill-rose-500" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#111111]">
                    Payments received
                  </span>
                </div>

                {/* Percentage Pill */}
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white text-emerald-700 text-[11px] font-extrabold rounded-full shadow-xs">
                  ↑ +13%
                </span>
              </div>

              <div className="pt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                  $ 14,568
                </div>
                <div className="text-[11px] text-stone-600 font-medium mt-0.5">
                  Total receipts value
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
                    Payments requested
                  </span>
                </div>

                {/* Percentage Pill */}
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white text-rose-600 text-[11px] font-extrabold rounded-full shadow-xs">
                  ↓ -6%
                </span>
              </div>

              <div className="pt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                  $ 6,234
                </div>
                <div className="text-[11px] text-stone-600 font-medium mt-0.5">
                  Total waiting payments value
                </div>
              </div>
            </div>

            {/* 3. WARM YELLOW CARD: Non insurance payments */}
            <div className="rounded-[28px] bg-[#FDE98A] p-5 border border-yellow-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-amber-700 shadow-xs">
                    <DollarSign size={13} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#111111]">
                    Non insurance payments
                  </span>
                </div>

                {/* Percentage Pill */}
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-white text-rose-600 text-[11px] font-extrabold rounded-full shadow-xs">
                  ↓ -17%
                </span>
              </div>

              <div className="pt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                  $ 3,786
                </div>
                <div className="text-[11px] text-stone-600 font-medium mt-0.5">
                  Total value of non covered by insurance
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ================= RIGHT COLUMN: WAITING BILLS, LATEST TRANSACTIONS & TABLE ================= */}
        <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
          
          {/* A. WAITING FOR BILLS ROW */}
          <div>
            <h3 className="text-sm font-extrabold text-[#111111] mb-3">
              Waiting for bills
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Samantha Williams */}
              <div className="bg-[#ECE8DD] border border-[#DDD7C5] rounded-[24px] p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-amber-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 border border-sky-200 shadow-xs">
                      <Stethoscope size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#111111]">
                        Samantha Williams
                      </h4>
                      <p className="text-[11px] text-stone-600 font-medium">
                        12KL • Routine Check-Up
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 bg-sky-200/80 text-sky-800 text-[10px] font-bold rounded-full">
                    09:15 AM
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => handleRequestPayment("Samantha Williams")}
                    className="bg-[#111111] hover:bg-black text-white text-xs font-bold py-2 px-5 rounded-full transition-transform active:scale-95 shadow-xs cursor-pointer"
                  >
                    Request payment
                  </button>
                </div>
              </div>

              {/* Card 2: Amy White */}
              <div className="bg-[#ECE8DD] border border-[#DDD7C5] rounded-[24px] p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-amber-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 border border-pink-200 shadow-xs">
                      <Video size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#111111]">
                        Amy White
                      </h4>
                      <p className="text-[11px] text-stone-600 font-medium">
                        1200 • Video Consultation
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 bg-pink-200/80 text-pink-800 text-[10px] font-bold rounded-full">
                    09:45 AM
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => handleRequestPayment("Amy White")}
                    className="bg-[#111111] hover:bg-black text-white text-xs font-bold py-2 px-5 rounded-full transition-transform active:scale-95 shadow-xs cursor-pointer"
                  >
                    Request payment
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* B. LATEST TRANSACTION ROW */}
          <div>
            <h3 className="text-sm font-extrabold text-[#111111] mb-3">
              Latest transaction
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              
              {/* Tx 1 */}
              <div className="bg-[#ECE8DD] border border-[#DDD7C5] rounded-[22px] p-3.5 flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[10px] text-stone-500 font-mono">121377 GEICO ***5684</div>
                  <div className="text-xs font-bold text-[#111111]">324343 IntellyMed</div>
                  <div className="text-[11px] font-extrabold text-[#111111] mt-1">#3586895</div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 bg-[#D1F2D9] text-[#136C38] text-xs font-extrabold rounded-full shadow-xs">
                    + $ 568.56
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">15 min ago</span>
                </div>
              </div>

              {/* Tx 2 */}
              <div className="bg-[#ECE8DD] border border-[#DDD7C5] rounded-[22px] p-3.5 flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[10px] text-stone-500 font-mono">Wilkinson T. ***5684</div>
                  <div className="text-xs font-bold text-[#111111]">24245 Dr.Olivia ***4567</div>
                  <div className="text-[11px] font-extrabold text-[#111111] mt-1">#1244657</div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 bg-[#D1F2D9] text-[#136C38] text-xs font-extrabold rounded-full shadow-xs">
                    + $ 465.4
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">18 min ago</span>
                </div>
              </div>

              {/* Tx 3 */}
              <div className="bg-[#ECE8DD] border border-[#DDD7C5] rounded-[22px] p-3.5 flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[10px] text-stone-500 font-mono">121377 GEICO ***5684</div>
                  <div className="text-xs font-bold text-[#111111]">324343 IntellyMed</div>
                  <div className="text-[11px] font-extrabold text-[#111111] mt-1">#5476856</div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 bg-[#D1F2D9] text-[#136C38] text-xs font-extrabold rounded-full shadow-xs">
                    + $ 547.85
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">35 min ago</span>
                </div>
              </div>

            </div>
          </div>

          {/* C. DETAILED INVOICES & BILLING TABLE */}
          <div className="flex flex-col gap-3">
            
            {/* Table Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {(["All", "Telemedicine", "In clinic", "Insurance"] as const).map((tab) => {
                const isActive = tableFilter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setTableFilter(tab)}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#111111] text-white shadow-xs"
                        : "bg-[#ECE8DD] text-stone-600 hover:text-black border border-[#DDD7C5]"
                    }`}
                  >
                    {tab}
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
                      <th className="px-4 py-3">Send date</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Due date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD7C5]/50 bg-[#ECE8DD]">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#E4DFC8]/50 transition-colors">
                        <td className="px-4 py-3 text-stone-700 font-medium whitespace-nowrap">
                          {tx.type}
                        </td>
                        <td className="px-4 py-3 text-stone-500 font-mono whitespace-nowrap">
                          {tx.sendDate}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#111111] whitespace-nowrap">
                          {tx.name}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-[#111111] whitespace-nowrap">
                          ${tx.amount.toFixed(2)}
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
                              Paid
                            </span>
                          )}
                          {tx.status === "Requested" && (
                            <span className="px-2.5 py-0.5 bg-[#D7E8FC] text-[#1E3A8A] text-[10px] font-extrabold rounded-full">
                              Requested
                            </span>
                          )}
                          {tx.status === "Sent" && (
                            <span className="px-2.5 py-0.5 bg-[#D1F2D9] text-[#136C38] text-[10px] font-extrabold rounded-full">
                              Sent
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDownloadInvoice(tx.id, tx.name)}
                              className="p-1 rounded-full text-stone-500 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                              title="Download PDF Invoice"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => handleRequestPayment(tx.name)}
                              className="p-1 rounded-full text-stone-500 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
                              title="Share / Send reminder"
                            >
                              <Send size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
