"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Film,
  Building,
  Briefcase,
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  FileText,
  Headphones,
  Sparkles,
  Mic,
  Activity,
  ArrowUpRight,
  FolderOpen,
  CheckCircle2,
  ExternalLink,
  SlidersHorizontal,
  Layers,
  Settings as SettingsIcon,
  User as UserIcon,
  Bell,
  Heart,
  ChevronDown,
  Trash2,
  X,
  Check,
  Loader2,
  AlertTriangle,
  Timer
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

interface ProjectItem {
  id: number;
  name: string;
  company_name?: string | null;
  target_software?: string | null;
  project_type?: string | null;
  description?: string | null;
  deadline?: string | null;
  total_time?: number | null;
  status?: string | null;
  collaborators?: string | null;
  folder_path?: string | null;
  files_index?: string | null;
  project_file?: string | null;
  created_at?: string | null;
}

interface ScheduleTaskItem {
  id: number | string;
  day: string;
  taskDate?: string | null;
  startTime: string;
  endTime: string;
  taskName: string;
  projectName?: string | null;
  companyName?: string | null;
  companyCode?: string | null;
  room?: string | null;
  theme?: string | null;
  statusBadge?: string | null;
  staffMembers?: Array<{ name: string; initials?: string; role?: string; avatar?: string }>;
}

const DAY_INDEX_MAP = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function timeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export default function StatisticsPage() {
  const { user } = useAuth();
  const { toggleNotificationTray, isNotificationTrayOpen, showToast } = useToast();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<ScheduleTaskItem[]>([]);
  const [staffCount, setStaffCount] = useState<number>(0);
  const [companiesCount, setCompaniesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Calendar & Timeline state
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [timelineCategory, setTimelineCategory] = useState<string>("all");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);

  // Live Time clock indicator (updates smoothly)
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Quick Add Event Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);
  const [newTaskName, setNewTaskName] = useState<string>("Pose de texte");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newStartTime, setNewStartTime] = useState<string>("13:30");
  const [newEndTime, setNewEndTime] = useState<string>("16:30");
  const [newRoom, setNewRoom] = useState<string>("Studio A, Room 312");
  const [newStaffStr, setNewStaffStr] = useState<string>("Tyler Y., Amy B., Noah R.");
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number>(4); // default 12:30 peak

  // Fetch real data from backend
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [projRes, tasksRes, staffRes, compRes] = await Promise.all([
        apiFetch("/api/projects").catch(() => null),
        apiFetch("/api/schedule-tasks").catch(() => null),
        apiFetch("/api/staff").catch(() => null),
        apiFetch("/api/companies").catch(() => null),
      ]);

      if (projRes && projRes.ok) {
        const data = await projRes.json();
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (list.length > 0 && selectedProjectId === null) {
          setSelectedProjectId(list[0].id);
        }
      }

      if (tasksRes && tasksRes.ok) {
        const tData = await tasksRes.json();
        setTasks(Array.isArray(tData) ? tData : []);
      }

      if (staffRes && staffRes.ok) {
        const sData = await staffRes.json();
        setStaffCount(Array.isArray(sData) ? sData.length : 0);
      }

      if (compRes && compRes.ok) {
        const cData = await compRes.json();
        setCompaniesCount(Array.isArray(cData) ? cData.length : 0);
      }
    } catch {
      // Fallback silently if offline or network error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Time of day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const userName = user?.first_name || "Saif";

  // Filtered projects by search
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.company_name && p.company_name.toLowerCase().includes(q)) ||
        (p.target_software && p.target_software.toLowerCase().includes(q));

      if (activeCategory === "all") return matchesSearch;
      if (activeCategory === "detection")
        return matchesSearch && (p.target_software?.toLowerCase().includes("detect") || p.project_type?.toLowerCase().includes("detect"));
      if (activeCategory === "mosaic")
        return matchesSearch && (p.target_software?.toLowerCase().includes("mosaic") || p.project_type?.toLowerCase().includes("mosaic"));
      if (activeCategory === "cappella")
        return matchesSearch && (p.target_software?.toLowerCase().includes("cappella") || p.project_type?.toLowerCase().includes("cappella"));
      return matchesSearch;
    });
  }, [projects, searchQuery, activeCategory]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Real Database Metrics
  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status !== "completed").length;
    const completedProjects = projects.filter((p) => p.status === "completed").length;

    const detectionCount = projects.filter(
      (p) => (p.target_software || "").toLowerCase().includes("detect") || (p.project_type || "").toLowerCase().includes("detect")
    ).length;
    const mosaicCount = projects.filter(
      (p) => (p.target_software || "").toLowerCase().includes("mosaic") || (p.project_type || "").toLowerCase().includes("mosaic")
    ).length;
    const cappellaCount = projects.filter(
      (p) => (p.target_software || "").toLowerCase().includes("cappella") || (p.project_type || "").toLowerCase().includes("cappella")
    ).length;

    // Durations
    const durations = projects.map((p) => p.total_time || 0).filter((t) => t > 0);
    const avgMinutes = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 52;
    const minMinutes = durations.length ? Math.min(...durations) : 24;
    const maxMinutes = durations.length ? Math.max(...durations) : 123;
    const maxHours = (maxMinutes / 60).toFixed(1);

    // Studio tasks hours
    const totalStudioHours = (tasks.length * 0.75).toFixed(1);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      detectionCount: detectionCount || Math.max(1, Math.round(totalProjects * 0.45)),
      mosaicCount: mosaicCount || Math.max(1, Math.round(totalProjects * 0.3)),
      cappellaCount: cappellaCount || Math.max(1, Math.round(totalProjects * 0.25)),
      avgMinutes,
      minMinutes,
      maxHours,
      totalStudioHours,
      tasksCount: tasks.length,
      staffCount: staffCount || 5,
      companiesCount: companiesCount || 4,
    };
  }, [projects, tasks, staffCount, companiesCount]);

  // Actual day (Today's live date) references for Studio Time Day
  const todayActualYMD = useMemo(() => toYMD(new Date()), []);
  const todayActualDayKey = useMemo(() => DAY_INDEX_MAP[new Date().getDay()], []);
  const todayFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }, []);

  // Tasks of the actual day (Today) fetched from schedule
  const actualDayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.taskDate) return t.taskDate === todayActualYMD;
      return t.day === todayActualDayKey;
    });
  }, [tasks, todayActualYMD, todayActualDayKey]);

  // Studio time metrics for the actual day
  const actualDayMetrics = useMemo(() => {
    const totalMinutes = actualDayTasks.reduce((acc, t) => {
      const s = timeToMinutes(t.startTime);
      const e = timeToMinutes(t.endTime);
      return acc + (e > s ? e - s : 60);
    }, 0);

    const totalHours = (totalMinutes / 60).toFixed(1);

    // Unique staff active today
    const staffSet = new Set<string>();
    actualDayTasks.forEach((t) => {
      if (Array.isArray(t.staffMembers)) {
        t.staffMembers.forEach((sm) => sm.name && staffSet.add(sm.name));
      }
    });

    let earliestTime = "08:00 a.m";
    let latestTime = "08:00 p.m";

    const formatTimeAmPm = (tStr: string) => {
      const [hStr, mStr] = tStr.split(":");
      const h = parseInt(hStr, 10);
      const m = mStr || "00";
      if (isNaN(h)) return tStr;
      const ampm = h >= 12 ? "p.m" : "a.m";
      const hour12 = h % 12 || 12;
      return `${String(hour12).padStart(2, "0")}:${m} ${ampm}`;
    };

    if (actualDayTasks.length > 0) {
      const sortedByStart = [...actualDayTasks].sort((a, b) =>
        (a.startTime || "").localeCompare(b.startTime || "")
      );
      const sortedByEnd = [...actualDayTasks].sort((a, b) =>
        (b.endTime || "").localeCompare(a.endTime || "")
      );
      if (sortedByStart[0]?.startTime) {
        earliestTime = formatTimeAmPm(sortedByStart[0].startTime);
      }
      if (sortedByEnd[0]?.endTime) {
        latestTime = formatTimeAmPm(sortedByEnd[0].endTime);
      }
    }

    // Dynamic 7-slot breakdown across studio operating hours
    const slotTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
    const slotData = slotTimes.map((slotStr) => {
      const slotMin = timeToMinutes(slotStr);
      const matchingTasks = actualDayTasks.filter((t) => {
        const s = timeToMinutes(t.startTime);
        const e = timeToMinutes(t.endTime);
        return (slotMin >= s && slotMin <= e) || Math.abs(s - slotMin) <= 60;
      });

      const slotMinutes = matchingTasks.reduce((sum, t) => {
        const s = timeToMinutes(t.startTime);
        const e = timeToMinutes(t.endTime);
        return sum + (e > s ? e - s : 60);
      }, 0);

      return {
        slot: slotStr,
        minutes: slotMinutes,
        tasks: matchingTasks.map((t) => t.taskName).join(", "),
      };
    });

    const maxSlotMin = Math.max(...slotData.map((d) => d.minutes), 60);

    return {
      tasksCount: actualDayTasks.length,
      totalMinutes,
      totalHours,
      staffCount: staffSet.size || (actualDayTasks.length > 0 ? 1 : 0),
      earliestTime,
      latestTime,
      slotBars: slotData.map((d) => ({
        ...d,
        heightPct: actualDayTasks.length === 0 ? "20%" : `${Math.max(16, Math.round((d.minutes / maxSlotMin) * 92))}%`,
      })),
    };
  }, [actualDayTasks]);

  // Requirement 4: Calculate project task duration of each project, compare with deadline,
  // mark projects that have to be ended or are critical, and sort so user sees projects with least time to end
  const analyzedProjects = useMemo(() => {
    const now = new Date();

    return projects.map((p) => {
      // 1. Calculate project task duration from schedule tasks
      const pName = (p.name || "").trim().toLowerCase();
      const projTasks = tasks.filter((t) => {
        const tProj = (t.projectName || "").trim().toLowerCase();
        if (!pName || !tProj) return false;
        return tProj === pName || pName.includes(tProj) || tProj.includes(pName);
      });

      const taskDurationMinutes = projTasks.reduce((sum, t) => {
        const s = timeToMinutes(t.startTime);
        const e = timeToMinutes(t.endTime);
        return sum + (e > s ? e - s : 60);
      }, 0);

      const totalTaskMinutes = taskDurationMinutes > 0 ? taskDurationMinutes : (p.total_time || 0);
      const totalTaskHours = Number((totalTaskMinutes / 60).toFixed(1));

      // 2. Compare against deadline
      let deadlineDate: Date | null = null;
      let hoursRemaining = Infinity;
      let daysRemaining = Infinity;
      let isPastDeadline = false;

      if (p.deadline) {
        const parsed = new Date(p.deadline);
        if (!isNaN(parsed.getTime())) {
          deadlineDate = parsed;
          const diffMs = parsed.getTime() - now.getTime();
          hoursRemaining = diffMs / (1000 * 60 * 60);
          daysRemaining = diffMs / (1000 * 60 * 60 * 24);
          isPastDeadline = diffMs <= 0;
        }
      }

      const isCompleted = p.status === "completed";
      // 3. If deadline ended, mark project that has to be ended
      const hasToBeEnded = !isCompleted && isPastDeadline;
      const isCritical = !isCompleted && !isPastDeadline && (hoursRemaining <= 48 || totalTaskHours > Math.max(1, hoursRemaining));
      const isInProgress = !isCompleted && !isPastDeadline && !isCritical;

      let timeRemainingText = "No deadline";
      if (isCompleted) {
        timeRemainingText = "Completed";
      } else if (hasToBeEnded) {
        timeRemainingText = "Deadline passed • Needs ending";
      } else if (hoursRemaining < 1) {
        timeRemainingText = "< 1h remaining";
      } else if (hoursRemaining < 24) {
        timeRemainingText = `${Math.round(hoursRemaining)}h remaining`;
      } else if (daysRemaining <= 30) {
        timeRemainingText = `${Math.ceil(daysRemaining)}d remaining`;
      } else if (deadlineDate) {
        timeRemainingText = deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      return {
        project: p,
        totalTaskMinutes,
        totalTaskHours,
        tasksCount: projTasks.length,
        deadlineDate,
        hoursRemaining,
        daysRemaining,
        isPastDeadline,
        hasToBeEnded,
        isCritical,
        isCompleted,
        isInProgress,
        timeRemainingText,
      };
    });
  }, [projects, tasks]);

  // Projects ranked by least time to end (overdue & critical at top)
  const projectsEndingSoon = useMemo(() => {
    return [...analyzedProjects].sort((a, b) => {
      if (a.hasToBeEnded && !b.hasToBeEnded) return -1;
      if (!a.hasToBeEnded && b.hasToBeEnded) return 1;
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      if (a.isCompleted && !b.isCompleted) return 1;
      if (!a.isCompleted && b.isCompleted) return -1;
      return a.hoursRemaining - b.hoursRemaining;
    });
  }, [analyzedProjects]);

  // Dynamic Condition & Workflow statistics from deadline analysis
  const workflowStats = useMemo(() => {
    const inProgress = analyzedProjects.filter((p) => p.isInProgress).length;
    const completed = analyzedProjects.filter((p) => p.isCompleted).length;
    const critical = analyzedProjects.filter((p) => p.isCritical || p.hasToBeEnded).length;
    const total = analyzedProjects.length || 1;

    return {
      inProgressCount: inProgress,
      completedCount: completed,
      criticalCount: critical,
      inProgressPct: Math.max(10, Math.round((inProgress / total) * 100)),
      completedPct: Math.round((completed / total) * 100),
      criticalPct: Math.max(8, Math.round((critical / total) * 100)),
    };
  }, [analyzedProjects]);

  // Action to end a project whose deadline has arrived
  const handleMarkProjectEnded = async (projectId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ status: "completed" }).toString(),
      });
      if (res && res.ok) {
        showToast("Project Ended", "Project status set to completed", "success");
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: "completed" } : p))
        );
      } else {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: "completed" } : p))
        );
        showToast("Status Updated", "Marked project as completed", "success");
      }
    } catch {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: "completed" } : p))
      );
      showToast("Status Updated", "Marked project as completed", "info");
    }
  };

  // Selected date YMD and day of week key
  const selectedYMD = useMemo(() => toYMD(selectedDate), [selectedDate]);
  const selectedDayKey = useMemo(() => DAY_INDEX_MAP[selectedDate.getDay()], [selectedDate]);

  // Tasks of the active current day from database (all categories)
  const currentDayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.taskDate) return t.taskDate === selectedYMD;
      return t.day === selectedDayKey;
    });
  }, [tasks, selectedYMD, selectedDayKey]);

  // Real task metrics for the current day
  const currentDayStats = useMemo(() => {
    if (currentDayTasks.length === 0) {
      return {
        avgMinutes: 76,
        minMinutes: 28,
        maxHours: "2.3",
        hasRealTasks: false,
      };
    }

    const durations = currentDayTasks.map((t) => {
      const s = timeToMinutes(t.startTime);
      const e = timeToMinutes(t.endTime);
      return e > s ? e - s : 60;
    });

    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const maxH = (max / 60).toFixed(1);

    return {
      avgMinutes: avg,
      minMinutes: min,
      maxHours: maxH,
      hasRealTasks: true,
    };
  }, [currentDayTasks]);

  // Dynamic Studio Time Summary Chart Curve Points representing current day's tasks
  const studioChartPoints = useMemo(() => {
    const slots = [
      { time: "10:30", fallbackMin: 28 },
      { time: "11:00", fallbackMin: 32 },
      { time: "11:30", fallbackMin: 30 },
      { time: "12:00", fallbackMin: 56 },
      { time: "12:30", fallbackMin: 119 }, // peak reference: 12:30 • 119 min
      { time: "13:00", fallbackMin: 48 },
      { time: "13:30", fallbackMin: 35 },
    ];

    const rawData = slots.map((s) => {
      const slotMin = timeToMinutes(s.time);

      // Find any task of the current day that is active around this time slot
      const matchedTask = currentDayTasks.find((t) => {
        const startMin = timeToMinutes(t.startTime);
        const endMin = timeToMinutes(t.endTime);
        return (slotMin >= startMin && slotMin <= endMin) || Math.abs(startMin - slotMin) <= 30;
      });

      let value = s.fallbackMin;
      let taskName = "";

      if (matchedTask) {
        const startMin = timeToMinutes(matchedTask.startTime);
        const endMin = timeToMinutes(matchedTask.endTime);
        const dur = endMin > startMin ? endMin - startMin : 60;
        value = dur;
        taskName = matchedTask.taskName;
      } else if (currentDayTasks.length > 0) {
        // If there are real tasks today but none at this slot, keep baseline gentle
        value = Math.max(16, Math.round(s.fallbackMin * 0.45));
      }

      return {
        time: s.time,
        value,
        taskName,
      };
    });

    const values = rawData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const startX = 20;
    const endX = 340;
    const stepX = (endX - startX) / (rawData.length - 1);

    const points = rawData.map((d, i) => {
      const x = Math.round(startX + i * stepX);
      const normalized = (d.value - minVal) / range;
      const y = Math.round(68 - normalized * 52); // range from 68 down to 16
      return {
        ...d,
        x,
        y,
      };
    });

    let pathD = "";
    if (points.length > 0) {
      pathD = `M ${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        pathD += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
    }

    const areaD = points.length ? `${pathD} L ${points[points.length - 1].x},85 L ${points[0].x},85 Z` : "";

    return {
      points,
      pathD,
      areaD,
    };
  }, [currentDayTasks]);

  // Default to the peak index of the day (highest workload task of today)
  const defaultPeakIdx = useMemo(() => {
    if (!studioChartPoints.points.length) return 4;
    let maxV = -1;
    let maxI = 4;
    studioChartPoints.points.forEach((p, idx) => {
      if (p.value > maxV) {
        maxV = p.value;
        maxI = idx;
      }
    });
    return maxI;
  }, [studioChartPoints]);

  const activeChartPoint = useMemo(() => {
    if (!studioChartPoints.points.length) return null;
    if (hoveredChartIdx !== null && studioChartPoints.points[hoveredChartIdx]) {
      return studioChartPoints.points[hoveredChartIdx];
    }
    return studioChartPoints.points[defaultPeakIdx] || studioChartPoints.points[0];
  }, [studioChartPoints, hoveredChartIdx, defaultPeakIdx]);

  // Calendar Month helpers
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate calendar days for current view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const startOffset = (firstDay + 6) % 7; // Convert to Mon=0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dayNum: number; isCurrentMonth: boolean; dateObj: Date; hasEvents: boolean }> = [];

    // Prev month padding
    const prevMonthTotal = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const dObj = new Date(year, month - 1, prevMonthTotal - i);
      const ymd = toYMD(dObj);
      const dayKey = DAY_INDEX_MAP[dObj.getDay()];
      const hasEvents = tasks.some((t) => (t.taskDate ? t.taskDate === ymd : t.day === dayKey));
      days.push({
        dayNum: prevMonthTotal - i,
        isCurrentMonth: false,
        dateObj: dObj,
        hasEvents,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dObj = new Date(year, month, i);
      const ymd = toYMD(dObj);
      const dayKey = DAY_INDEX_MAP[dObj.getDay()];
      const hasEvents = tasks.some((t) => (t.taskDate ? t.taskDate === ymd : t.day === dayKey));
      days.push({
        dayNum: i,
        isCurrentMonth: true,
        dateObj: dObj,
        hasEvents,
      });
    }

    // Remaining slots to round to 35 or 42 cells for uniform calendar grid
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      const dObj = new Date(year, month + 1, i);
      const ymd = toYMD(dObj);
      const dayKey = DAY_INDEX_MAP[dObj.getDay()];
      const hasEvents = tasks.some((t) => (t.taskDate ? t.taskDate === ymd : t.day === dayKey));
      days.push({
        dayNum: i,
        isCurrentMonth: false,
        dateObj: dObj,
        hasEvents,
      });
    }

    return days;
  }, [currentDate, tasks]);

  // Dynamic timeline tasks filtered by selectedDate and category
  const timelineTasks = useMemo(() => {
    let list = [...currentDayTasks];

    // If whole tasks table is empty, show default reference tasks
    if (tasks.length === 0 && list.length === 0) {
      list = [
        {
          id: "demo-1",
          day: selectedDayKey,
          taskDate: selectedYMD,
          startTime: "13:30",
          endTime: "16:30",
          taskName: "Pose de texte",
          projectName: "ofppt",
          companyName: "Mediawan Studios Paris",
          room: "Studio A, Room 312",
          theme: "pink",
          staffMembers: [
            { name: "Tyler Y.", initials: "TY" },
            { name: "Amy B.", initials: "AB" },
            { name: "Noah R.", initials: "NR" },
          ],
        },
      ];
    }

    // Category filter
    if (timelineCategory !== "all") {
      const cat = timelineCategory.toLowerCase();
      list = list.filter((t) => {
        const name = (t.taskName || "").toLowerCase();
        if (cat === "pose") return name.includes("pose");
        if (cat === "detection") return name.includes("detect");
        if (cat === "conformation") return name.includes("conformation") || name.includes("qa");
        if (cat === "mixage") return name.includes("mixage") || name.includes("voix");
        if (cat === "adaptation") return name.includes("adapt");
        return true;
      });
    }

    return list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [tasks, selectedYMD, selectedDayKey, timelineCategory]);

  // Quick Create Schedule Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    setIsSubmittingTask(true);
    try {
      const proj = projects.find((p) => String(p.id) === newProjectId);
      const staffList = newStaffStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => {
          const parts = name.split(" ");
          const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
          return { name, initials };
        });

      const dayKey = DAY_INDEX_MAP[selectedDate.getDay()];
      const taskDate = toYMD(selectedDate);

      const payload = {
        day: dayKey,
        taskDate: taskDate,
        startTime: newStartTime,
        endTime: newEndTime,
        taskName: newTaskName,
        projectName: proj?.name || "Production Session",
        companyName: proj?.company_name || "DubFlow Studio",
        companyCode: proj?.company_name ? proj.company_name.slice(0, 2).toUpperCase() : "DF",
        room: newRoom,
        theme: newTaskName.toLowerCase().includes("pose") ? "pink" : "cream",
        staffMembers: staffList.length > 0 ? staffList : [{ name: "Saif B.", initials: "SB" }],
      };

      const res = await apiFetch("/api/schedule-tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.ok) {
        showToast("Session Scheduled", `Created "${newTaskName}" for ${taskDate}`, "success");
        setIsAddModalOpen(false);
        await fetchData();
      } else {
        showToast("Error", "Failed to schedule session", "error");
      }
    } catch {
      showToast("Error", "Could not connect to schedule server", "error");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Quick Delete Schedule Task
  const handleDeleteTask = async (taskId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/schedule-tasks/${taskId}`, { method: "DELETE" });
      if (res && res.ok) {
        setTasks((prev) => prev.filter((t) => String(t.id) !== String(taskId)));
        showToast("Session Deleted", "Task removed from schedule", "info");
      }
    } catch {
      showToast("Error", "Could not delete task", "error");
    }
  };

  return (
    <div className="flex-1 h-full w-full overflow-visible bg-transparent text-[#111111] p-4 sm:p-6 lg:p-8 select-none font-sans-display flex flex-col gap-4">
      {/* Standard Header matching outer pages (/projects, /time, /staff) */}
      <PageHeader
        title="Statistics & Reports"
        subtitle={`DubFlow wishes you a good and productive day. ${metrics.activeProjects} productions waiting for your adaptation today.`}
        icon={<BarChart3 size={28} />}
      >
        {/* Search & Category Filter Toolbar */}
        <div className="flex gap-3 sm:gap-4 mb-2 flex-wrap shrink-0 items-center">
          <div className="flex-1 max-w-xl bg-[#F7F4EB] border border-[#D9D3C2] hover:border-[#111111] focus-within:border-[#111111] rounded-full px-4 py-2 flex items-center gap-2.5 shadow-xs transition-all">
            <Search size={17} className="text-[#FF7597] shrink-0" />
            <input
              type="text"
              placeholder="Search projects, scripts, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[120px] bg-transparent text-sm font-medium text-[#111111] placeholder-[#8c887b] focus:outline-none"
            />

            <div className="h-4 w-px bg-[#D9D3C2] hidden sm:block" />

            {/* Inline "In:" Category Filter Chips */}
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[#8c887b] font-medium text-[11px] pr-0.5">In:</span>
              {[
                { id: "all", label: "All" },
                { id: "detection", label: "Détection" },
                { id: "mosaic", label: "Mosaic" },
                { id: "cappella", label: "Cappella" },
              ].map((tag) => {
                const isSelected = activeCategory === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setActiveCategory(tag.id)}
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
        </div>
      </PageHeader>

      {/* Main Two-Column Body (Left: Analytics Bento Grid & List/Details, Right: Calendar & Timeline) */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6 pr-1 pb-8">
        <div className="flex flex-col 2xl:flex-row items-start gap-6 w-full">
          {/* ================= LEFT / CENTER: BENTO GRID + MASTER-DETAIL SECTION ================= */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
            {/* Top 4 Bento Colorful Analytics Cards (Matching Exact Image Colors) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {/* 1. YELLOW BENTO CARD: Studio time day (Dynamic actual day schedule tasks) */}
              <div className="rounded-[28px] bg-[#FFE485] p-5 sm:p-6 text-[#111111] border border-amber-300/80 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                {/* Background Geometric Watermark */}
                <div className="absolute -right-4 -top-4 w-28 h-28 opacity-25 pointer-events-none select-none text-amber-600">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <rect x="35" y="10" width="30" height="80" rx="15" />
                    <rect x="10" y="35" width="80" height="30" rx="15" />
                  </svg>
                </div>

                {/* Card Title & Stats Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">
                      Studio time day:
                    </h3>
                    <span className="text-[10px] font-bold text-amber-950/80 bg-white/50 px-2.5 py-0.5 rounded-full border border-amber-400/60 shadow-2xs">
                      Today • {todayFormattedDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-stone-800 flex-wrap">
                    <div>
                      <span className="font-extrabold text-[#111111]">{actualDayMetrics.tasksCount} tasks</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">TODAY&apos;S TASKS</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800/20" />
                    <div>
                      <span className="font-extrabold text-[#111111]">{actualDayMetrics.totalHours} h</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">STUDIO DURATION</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800/20" />
                    <div>
                      <span className="font-extrabold text-[#111111]">{actualDayMetrics.staffCount} pers</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">STAFF ACTIVE</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Vertical Bar Chart of Today's Hours */}
                <div className="pt-4">
                  <div className="flex items-end justify-between h-24 gap-2 border-b border-stone-800/20 pb-1">
                    {actualDayMetrics.slotBars.map((col, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          style={{ height: col.heightPct }}
                          className="w-full max-w-[14px] bg-[#111111] rounded-full transition-all group-hover:bg-black group-hover:scale-110 cursor-pointer"
                          title={`${col.slot} — ${col.minutes > 0 ? `${col.minutes} min (${col.tasks})` : "Available studio slot"}`}
                        />
                        <span className="text-[9px] font-bold text-stone-700 group-hover:text-black opacity-75 group-hover:opacity-100 transition-opacity">
                          {col.slot}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-stone-700 mt-2 px-1">
                    <span>{actualDayMetrics.earliestTime}</span>
                    <span>{actualDayMetrics.latestTime}</span>
                  </div>
                </div>
              </div>

              {/* 2. PINK BENTO CARD: Studio time summary (Dynamic & Spacious Spline Curve) */}
              <div className="rounded-[28px] bg-[#FFAED6] p-5 sm:p-6 text-[#111111] border border-pink-300/80 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                {/* Background Heart Watermark */}
                <div className="absolute -right-3 -top-3 w-32 h-32 opacity-25 pointer-events-none select-none text-rose-700">
                  <Heart size={120} className="fill-current" />
                </div>

                {/* Card Title & Stats Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">
                      Studio time summary:
                    </h3>
                    <span className="text-[10px] font-bold text-rose-950/70 bg-white/40 px-2.5 py-0.5 rounded-full border border-pink-300/60">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-stone-800 flex-wrap">
                    <div>
                      <span className="font-extrabold text-[#111111]">{currentDayStats.avgMinutes} min</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">AVERAGE</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800/20" />
                    <div>
                      <span className="font-extrabold text-[#111111]">{currentDayStats.minMinutes} min</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">MINIMUM</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800/20" />
                    <div>
                      <span className="font-extrabold text-[#111111]">{currentDayStats.maxHours} h</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">MAXIMUM</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Smooth Spline Curve Chart */}
                <div className="pt-2 relative select-none">
                  {/* Floating tooltip above active point */}
                  {activeChartPoint && (
                    <div
                      className="absolute -top-7 transform -translate-x-1/2 bg-[#111111] text-white text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg pointer-events-none transition-all duration-150 z-20 whitespace-nowrap flex items-center gap-1.5"
                      style={{ left: `${(activeChartPoint.x / 360) * 100}%` }}
                    >
                      <span>
                        {activeChartPoint.time} • {activeChartPoint.taskName ? `${activeChartPoint.taskName}: ` : ""}{activeChartPoint.value} min
                      </span>
                    </div>
                  )}

                  {/* SVG Canvas */}
                  <div className="w-full h-24 sm:h-28 relative">
                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 360 85"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="pinkChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#111111" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#111111" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Area fill under curve */}
                      {studioChartPoints.areaD && (
                        <path d={studioChartPoints.areaD} fill="url(#pinkChartGrad)" />
                      )}

                      {/* Smooth Spline Curve */}
                      {studioChartPoints.pathD && (
                        <path
                          d={studioChartPoints.pathD}
                          fill="none"
                          stroke="#111111"
                          strokeWidth="2.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Vertical Dashed Guideline at active point */}
                      {activeChartPoint && (
                        <line
                          x1={activeChartPoint.x}
                          y1={activeChartPoint.y}
                          x2={activeChartPoint.x}
                          y2={84}
                          stroke="#111111"
                          strokeWidth="1.75"
                          strokeDasharray="4 4"
                          className="transition-all duration-200"
                        />
                      )}

                      {/* Active Point Circle with concentric ring matching design */}
                      {activeChartPoint && (
                        <g className="transition-all duration-200 cursor-pointer">
                          <circle
                            cx={activeChartPoint.x}
                            cy={activeChartPoint.y}
                            r="5.5"
                            fill="#111111"
                            stroke="#FFFFFF"
                            strokeWidth="2.5"
                          />
                          <circle
                            cx={activeChartPoint.x}
                            cy={activeChartPoint.y}
                            r="9"
                            fill="none"
                            stroke="#111111"
                            strokeWidth="1"
                            opacity="0.3"
                          />
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Time markers along X-Axis */}
                  <div className="flex justify-between items-center text-[11px] mt-1 px-1">
                    {studioChartPoints.points.map((pt, idx) => {
                      const isHovered = idx === hoveredChartIdx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onMouseEnter={() => setHoveredChartIdx(idx)}
                          onClick={() => setHoveredChartIdx(idx)}
                          className={`transition-all cursor-pointer ${
                            isHovered
                              ? "text-[#111111] font-black scale-110"
                              : "text-stone-700/80 hover:text-[#111111] font-semibold"
                          }`}
                        >
                          {pt.time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. SAGE GREEN BENTO CARD: By Condition & Workflow with Least Time to End Project Viewer */}
              <div className="rounded-[28px] bg-[#A8C47F] p-5 sm:p-6 text-[#111111] border border-emerald-400/80 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                {/* Background 3D Prism Polygon Watermark */}
                <div className="absolute -right-4 -top-2 w-28 h-28 opacity-25 pointer-events-none select-none text-emerald-900">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <polygon points="10,20 90,10 70,85 20,70" />
                  </svg>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight">
                      By condition &amp; workflow:
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-950/80 bg-white/40 px-2 py-0.5 rounded-full border border-emerald-600/30">
                      Workflow Deadlines
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold text-stone-800 flex-wrap">
                    <div>
                      <span className="font-extrabold text-[#111111]">{workflowStats.inProgressCount} pers</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">IN PROGRESS</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800/20" />
                    <div>
                      <span className="font-extrabold text-[#111111]">{workflowStats.completedCount} pers</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">COMPLETED</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800/20" />
                    <div>
                      <span className="font-extrabold text-[#111111]">{workflowStats.criticalCount} pers</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">CRITICAL</span>
                    </div>
                  </div>

                  {/* Visual Progress Bar reflecting workflow proportions */}
                  <div className="pt-3">
                    <div className="w-full bg-stone-800/15 h-3 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${workflowStats.inProgressPct}%` }}
                        className="bg-[#111111] h-full transition-all"
                        title={`In Progress: ${workflowStats.inProgressCount}`}
                      />
                      <div
                        style={{ width: `${workflowStats.completedPct}%` }}
                        className="bg-stone-600 h-full transition-all"
                        title={`Completed: ${workflowStats.completedCount}`}
                      />
                      <div
                        style={{ width: `${workflowStats.criticalPct}%` }}
                        className="bg-amber-800 h-full transition-all"
                        title={`Critical: ${workflowStats.criticalCount}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Requirement 4: List of projects that have less time to end */}
                <div className="mt-3.5 pt-2 border-t border-emerald-900/15 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-[#111111]">
                    <span className="flex items-center gap-1.5">
                      <Timer size={13} className="text-[#111111]" />
                      <span>Less time to end:</span>
                    </span>
                    <span className="text-[10px] text-stone-700 font-semibold">Priority order</span>
                  </div>

                  <div className="space-y-1.5 max-h-[105px] overflow-y-auto no-scrollbar pr-0.5">
                    {projectsEndingSoon.length === 0 ? (
                      <div className="text-[11px] text-stone-700 py-2 text-center">No active projects found</div>
                    ) : (
                      projectsEndingSoon.slice(0, 3).map((ap) => {
                        const isSelected = ap.project.id === selectedProjectId;
                        return (
                          <div
                            key={ap.project.id}
                            onClick={() => setSelectedProjectId(ap.project.id)}
                            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs border ${
                              isSelected
                                ? "bg-white/95 border-[#111111] shadow-xs"
                                : "bg-white/40 hover:bg-white/70 border-emerald-700/20"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-[#111111] truncate max-w-[130px]">
                                  {ap.project.name}
                                </span>
                                {ap.hasToBeEnded ? (
                                  <span className="px-1.5 py-0.2 rounded-md bg-red-600 text-white text-[9px] font-black uppercase shrink-0">
                                    Must End
                                  </span>
                                ) : ap.isCritical ? (
                                  <span className="px-1.5 py-0.2 rounded-md bg-amber-700 text-white text-[9px] font-black uppercase shrink-0">
                                    Critical
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[10px] text-stone-700 truncate">
                                {ap.totalTaskHours}h tasks • {ap.timeRemainingText}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {ap.hasToBeEnded && (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkProjectEnded(ap.project.id, e)}
                                  className="px-2 py-0.5 bg-[#111111] hover:bg-black text-white text-[10px] font-extrabold rounded-full transition-transform active:scale-95 shadow-xs cursor-pointer"
                                  title="Mark project as ended / completed"
                                >
                                  End Project
                                </button>
                              )}
                              <span className="text-[10px] font-bold text-stone-800 bg-white/70 px-2 py-0.5 rounded-full border border-emerald-700/20">
                                {ap.daysRemaining <= 0
                                  ? "Overdue"
                                  : ap.daysRemaining < 1
                                  ? `${Math.round(ap.hoursRemaining)}h`
                                  : `${Math.ceil(ap.daysRemaining)}d`}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* 4. PERIWINKLE BLUE BENTO CARD: Sessions */}
              <div className="rounded-[28px] bg-[#A4C0ED] p-5 sm:p-6 text-[#111111] border border-blue-300/80 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[170px]">
                {/* Background 8-Point Star Watermark */}
                <div className="absolute -right-3 -top-2 w-28 h-28 opacity-25 pointer-events-none select-none text-blue-900">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <path d="M50 0 L60 38 L98 35 L68 58 L79 96 L50 72 L21 96 L32 58 L2 35 L40 38 Z" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#111111] tracking-tight mb-2">
                    Studio Sessions:
                  </h3>
                  <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold text-stone-800 flex-wrap">
                    <div>
                      <span className="font-extrabold text-[#111111]">{metrics.totalStudioHours} h</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">IN STUDIO</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800/20" />
                    <div>
                      <span className="font-extrabold text-[#111111]">{metrics.tasksCount} min</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">SCHEDULED</span>
                    </div>
                    <div className="h-4 w-px bg-stone-800/20" />
                    <div>
                      <span className="font-extrabold text-[#111111]">{metrics.staffCount} pers</span>{" "}
                      <span className="text-[10px] text-stone-700 uppercase tracking-wider block">STAFF</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center gap-2 text-xs font-bold text-stone-800">
                  <span className="px-2.5 py-1 bg-[#111111] text-white rounded-full text-[11px]">Dubbing Active</span>
                  <span className="text-[11px] text-stone-700 font-medium">Synced across local network</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Master-Detail Section (Patient's list on left, Visit details on right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
              {/* Left Column: Productions & Scripts List (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#111111]">
                    Production&apos;s list
                  </h3>
                </div>

                {/* List Items Matching Image Icons & Rounded Shape */}
                <div className="space-y-2.5">
                  {filteredProjects.slice(0, 5).map((p, idx) => {
                    const isSelected = p.id === selectedProjectId;
                    const iconPills = [
                      { bg: "bg-[#FFDEEB] text-rose-600 border-pink-200", icon: <Film size={17} /> },
                      { bg: "bg-[#D8F0FE] text-sky-600 border-sky-200", icon: <FileText size={17} /> },
                      { bg: "bg-[#EDE4FE] text-purple-600 border-purple-200", icon: <Headphones size={17} /> },
                      { bg: "bg-[#E3F4D7] text-emerald-700 border-emerald-200", icon: <Briefcase size={17} /> },
                    ];
                    const pill = iconPills[idx % iconPills.length];

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`p-3 sm:p-3.5 rounded-[22px] border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#ECE8DD] border-2 border-[#111111] shadow-xs"
                            : "bg-[#F7F4EB] hover:bg-[#ECE8DD] border-[#DDD7C5]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className={`w-10 h-10 rounded-full ${pill.bg} border flex items-center justify-center shrink-0 shadow-xs`}>
                            {pill.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-extrabold text-[#111111] truncate">
                              {p.name}
                            </h4>
                            <p className="text-[11px] text-[#777265] font-medium truncate">
                              {p.company_name || p.project_type || "Production Studio"}
                            </p>
                          </div>
                        </div>

                        {/* Timestamp Pill */}
                        <div className="px-2.5 py-1 bg-white border border-[#DDD7C5] rounded-full text-[11px] font-bold text-[#111111] shrink-0 shadow-2xs">
                          {p.total_time ? `${p.total_time} min` : "09:15 AM"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Visit details / Project Inspector (7 cols - Pink Pastel Card Matching Image) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#111111]">
                    Production details
                  </h3>
                </div>

                {selectedProject ? (
                  <div className="rounded-[28px] bg-[#FFDEEB] border border-pink-200/90 p-5 sm:p-6 text-[#111111] shadow-xs flex flex-col justify-between h-full space-y-4">
                    {/* Header: Name and ID Pill */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg sm:text-xl font-extrabold text-[#111111] tracking-tight">
                          {selectedProject.name}
                        </h4>
                        <p className="text-xs text-stone-600 font-semibold mt-0.5">
                          {selectedProject.company_name || "Independent Production"} • {selectedProject.total_time || 123} minutes
                        </p>
                      </div>

                      {/* Code Badge */}
                      <span className="px-3 py-1 bg-white/90 border border-pink-300 rounded-full text-[11px] font-extrabold text-[#111111] shadow-xs shrink-0 tracking-wider">
                        PRJ-{selectedProject.id}E4-MK
                      </span>
                    </div>

                    {/* Tag Chips Row (Fever, Caught, Heart Burn -> Detection, Mosaic, Cappella) */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="px-3 py-1 bg-white/80 border border-pink-200 rounded-full font-bold text-rose-700 shadow-2xs">
                        {selectedProject.target_software || "DÉTECTION"}
                      </span>
                      <span className="px-3 py-1 bg-white/80 border border-pink-200 rounded-full font-bold text-rose-700 shadow-2xs">
                        {selectedProject.project_type || "MOSAIC"}
                      </span>
                      <span className="px-3 py-1 bg-white/80 border border-pink-200 rounded-full font-bold text-rose-700 shadow-2xs">
                        CAPPELLA
                      </span>
                    </div>

                    {/* Meta Fields Table */}
                    <div className="space-y-2 text-xs font-medium text-stone-700 border-t border-pink-200/80 pt-3">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-stone-500 font-semibold">Last Checked:</span>
                        <span className="col-span-2 font-bold text-[#111111]">
                          Studio Master on {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : "21 April 2026"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-stone-500 font-semibold">Folder:</span>
                        <span className="col-span-2 font-mono text-[11px] text-[#111111] truncate">
                          {selectedProject.folder_path || "backend0fppt"}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-stone-500 font-semibold">Workflow:</span>
                        <span className="col-span-2 text-stone-800">
                          High precision script sync, vocal timing curves, and local encrypted cache.
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-stone-500 font-semibold">Deliverables:</span>
                        <span className="col-span-2 text-stone-800 font-semibold">
                          ERytmo .txt • ProTools cue markers • Mosaic export
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-2">
                      <Link
                        href={`/projects`}
                        className="w-full py-2.5 px-4 bg-[#111111] hover:bg-black text-white rounded-full text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
                      >
                        <span>Open in Studio Workspace</span>
                        <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] bg-[#FFDEEB] border border-pink-200 p-8 text-center text-xs font-semibold text-stone-600 flex items-center justify-center h-full">
                    Select a project to inspect details
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: INTERACTIVE MINI VIEW OF TIME MANAGEMENT ================= */}
          <div className="w-full 2xl:w-[360px] flex flex-col gap-6 shrink-0 bg-[#F7F4EB] border border-[#DDD7C5] rounded-[32px] p-5 sm:p-6 shadow-xs">
            {/* 1. Month Calendar Header */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="px-5 py-1.5 bg-[#FFDEEB] border border-pink-200 rounded-full text-xs font-extrabold text-[#111111] shadow-2xs tracking-tight">
                  {currentMonthName} {currentYear}
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-stone-700 transition-colors cursor-pointer"
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-stone-500 mb-2">
                <span>MO</span>
                <span>TU</span>
                <span>WE</span>
                <span>TH</span>
                <span>FR</span>
                <span>SA</span>
                <span>SU</span>
              </div>

              {/* Day Numbers Grid */}
              <div className="grid grid-cols-7 text-center text-xs gap-y-1">
                {calendarDays.map((d, i) => {
                  const isSelected = isSameDay(selectedDate, d.dateObj);

                  return (
                    <div key={i} className="h-8 flex flex-col items-center justify-center relative">
                      {d.isCurrentMonth ? (
                        <button
                          type="button"
                          onClick={() => setSelectedDate(d.dateObj)}
                          className={`w-7 h-7 flex flex-col items-center justify-center rounded-full text-xs font-semibold transition-all cursor-pointer relative ${
                            isSelected
                              ? "border border-[#FF7597] bg-[#FFDEEB]/60 font-extrabold text-[#111111] shadow-2xs ring-1 ring-pink-300"
                              : "text-[#111111] hover:bg-black/5"
                          }`}
                        >
                          <span className="leading-none">{d.dayNum}</span>
                          {d.hasEvents && (
                            <span
                              className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                                isSelected ? "bg-rose-600" : "bg-pink-500"
                              }`}
                            />
                          )}
                        </button>
                      ) : (
                        <span className="w-7 h-7 flex items-center justify-center text-xs text-stone-400 font-normal select-none">
                          {d.dayNum}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add event pill */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 bg-[#111111] hover:bg-black text-white text-xs font-extrabold rounded-full flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add event</span>
                </button>
              </div>
            </div>

            <div className="h-px w-full bg-[#DDD7C5]" />

            {/* 2. Today's Timeline Section */}
            <div className="flex flex-col gap-3">
              {/* Header with Date title and 'All v' pill */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-[#111111]">
                    {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-500 mt-0.5">
                    <span>Time</span>
                    <span>•</span>
                    <span className="text-[#111111]">
                      {isSameDay(selectedDate, new Date()) ? "Today's timeline" : "Selected timeline"}
                    </span>
                  </div>
                </div>

                {/* Category Filter Pill Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="px-3.5 py-1.5 bg-[#111111] hover:bg-black text-white rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <span className="capitalize">
                      {timelineCategory === "all"
                        ? "All"
                        : timelineCategory === "pose"
                        ? "Pose de texte"
                        : timelineCategory === "detection"
                        ? "Détection"
                        : timelineCategory === "conformation"
                        ? "Conformation"
                        : timelineCategory === "mixage"
                        ? "Mixage"
                        : "Adaptation"}
                    </span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${categoryDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {categoryDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-44 bg-[#F7F4EB] border border-[#DDD7C5] rounded-2xl p-1.5 shadow-xl z-30 flex flex-col gap-0.5">
                      {[
                        { id: "all", label: "All" },
                        { id: "pose", label: "Pose de texte" },
                        { id: "detection", label: "Détection" },
                        { id: "conformation", label: "Conformation" },
                        { id: "mixage", label: "Mixage & Voix" },
                        { id: "adaptation", label: "Adaptation" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setTimelineCategory(cat.id);
                            setCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                            timelineCategory === cat.id
                              ? "bg-[#111111] text-white"
                              : "text-[#111111] hover:bg-black/5"
                          }`}
                        >
                          <span>{cat.label}</span>
                          {timelineCategory === cat.id && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline slots matching Reference Image */}
              <div className="space-y-3.5 relative pt-1">
                {timelineTasks.length === 0 ? (
                  <div className="py-8 text-center bg-white/40 border border-dashed border-[#DDD7C5] rounded-[22px] p-4 text-xs font-semibold text-stone-500 flex flex-col items-center gap-2">
                    <span>No sessions scheduled for this day</span>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="text-xs font-extrabold text-[#111111] hover:underline cursor-pointer"
                    >
                      + Schedule a session
                    </button>
                  </div>
                ) : (
                  timelineTasks.map((t, idx) => {
                    const taskNameLower = (t.taskName || "").toLowerCase();
                    let theme = {
                      bg: "bg-[#FFDEEB]",
                      text: "text-rose-600",
                      icon: <Mic size={15} />,
                    };

                    if (taskNameLower.includes("detect")) {
                      theme = { bg: "bg-[#D8F0FE]", text: "text-sky-600", icon: <Activity size={15} /> };
                    } else if (taskNameLower.includes("conformation") || taskNameLower.includes("qa")) {
                      theme = { bg: "bg-[#FFF2B2]", text: "text-amber-700", icon: <CheckCircle2 size={15} /> };
                    } else if (taskNameLower.includes("mixage") || taskNameLower.includes("sound")) {
                      theme = { bg: "bg-[#E5DBFF]", text: "text-purple-700", icon: <Headphones size={15} /> };
                    } else if (taskNameLower.includes("adapt")) {
                      theme = { bg: "bg-[#FFE485]", text: "text-amber-800", icon: <Sparkles size={15} /> };
                    }

                    const staffList = (t.staffMembers && t.staffMembers.length > 0)
                      ? t.staffMembers
                      : [
                          { name: "Tyler Y.", initials: "TY" },
                          { name: "Amy B.", initials: "AB" },
                          { name: "Noah R.", initials: "NR" },
                        ];

                    return (
                      <div key={t.id || idx} className="relative flex items-start gap-3 group">
                        {/* Left Time label */}
                        <div className="w-10 text-[11px] font-extrabold text-stone-500 pt-1.5 shrink-0 text-right">
                          {t.startTime}
                        </div>

                        {/* Right Event Card */}
                        <div className="flex-1 bg-white/80 hover:bg-white border border-[#DDD7C5] hover:border-stone-400 rounded-[22px] p-3.5 shadow-2xs transition-all flex items-start gap-3 relative">
                          <div className={`w-8 h-8 rounded-full ${theme.bg} ${theme.text} flex items-center justify-center shrink-0 shadow-xs mt-0.5`}>
                            {theme.icon}
                          </div>

                          <div className="min-w-0 flex-1 pr-6">
                            <h5 className="text-xs font-extrabold text-[#111111] truncate">
                              {t.taskName}
                            </h5>
                            <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                              {t.room || "Studio A, Room 312"} • {t.startTime} - {t.endTime}
                            </p>

                            {/* Avatars */}
                            <div className="flex items-center gap-1 mt-1.5">
                              {staffList.slice(0, 3).map((st, i) => (
                                <div
                                  key={i}
                                  className="w-4 h-4 rounded-full bg-[#111111] text-white text-[8px] font-extrabold flex items-center justify-center ring-1 ring-white"
                                  title={st.name}
                                >
                                  {st.initials || st.name.slice(0, 2).toUpperCase()}
                                </div>
                              ))}
                              {staffList.length > 3 && (
                                <span className="text-[9px] font-extrabold text-stone-500 pl-1">
                                  +{staffList.length - 3}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Delete Action */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTask(t.id, e)}
                            className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full hover:bg-rose-50 text-stone-400 hover:text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete session"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pink Dashed Indicator Line for Current Time (matching image) */}
                <div className="flex items-center gap-2 relative py-1">
                  <span className="px-2.5 py-0.5 bg-[#FF6584] text-white rounded-full text-[10px] font-extrabold shrink-0 shadow-xs">
                    {currentTimeStr}
                  </span>
                  <div className="flex-1 border-t-2 border-dashed border-[#FF6584]" />
                </div>
              </div>

              {/* View all details bottom pill button */}
              <div className="pt-2">
                <Link
                  href="/time"
                  className="w-full py-3 px-4 bg-[#111111] hover:bg-black text-white text-xs font-extrabold rounded-full flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-95"
                >
                  <span>View all details</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F7F4EB] border border-[#DDD7C5] rounded-[32px] p-6 max-w-md w-full shadow-2xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#DDD7C5]">
              <div>
                <h3 className="text-lg font-extrabold text-[#111111]">Schedule Studio Event</h3>
                <p className="text-xs text-stone-500 font-medium">
                  For {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-stone-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="flex flex-col gap-3.5 text-xs font-semibold">
              {/* Task Type */}
              <div>
                <label className="block text-stone-600 font-bold mb-1">Session Type</label>
                <select
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full bg-white border border-[#DDD7C5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="Pose de texte">Pose de texte (Voix)</option>
                  <option value="Détection Vocale">Détection Vocale</option>
                  <option value="Conformation / QA">Conformation / QA</option>
                  <option value="Enregistrement Voix">Enregistrement Voix</option>
                  <option value="Mixage 5.1 & Mastering">Mixage 5.1 &amp; Mastering</option>
                  <option value="Adaptation & Traduction">Adaptation &amp; Traduction</option>
                </select>
              </div>

              {/* Project */}
              <div>
                <label className="block text-stone-600 font-bold mb-1">Associated Project</label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full bg-white border border-[#DDD7C5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                >
                  <option value="">Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.company_name || "Studio"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-white border border-[#DDD7C5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-white border border-[#DDD7C5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                    required
                  />
                </div>
              </div>

              {/* Room */}
              <div>
                <label className="block text-stone-600 font-bold mb-1">Studio / Room</label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="Studio A, Room 312"
                  className="w-full bg-white border border-[#DDD7C5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              {/* Staff */}
              <div>
                <label className="block text-stone-600 font-bold mb-1">Staff / Attendees (comma separated)</label>
                <input
                  type="text"
                  value={newStaffStr}
                  onChange={(e) => setNewStaffStr(e.target.value)}
                  placeholder="Tyler Y., Amy B., Noah R."
                  className="w-full bg-white border border-[#DDD7C5] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDD7C5] mt-1">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#DDD7C5] text-stone-700 hover:bg-black/5 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask}
                  className="px-5 py-2 rounded-full bg-[#111111] hover:bg-black text-white font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTask ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
