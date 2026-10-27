"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  Search, Plus, RotateCw, Edit3, ChevronDown, MoreVertical,
  Calendar, Clock, User, Users, FileText, CheckCircle2,
  Video, Mic, Headphones, Sparkles, X, Building2, Briefcase,
  Play, ExternalLink, ChevronLeft, ChevronRight, Check, Trash2, Loader2,
  Folder, File
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import CustomSelect, { SelectOption } from "@/components/CustomSelect";
import ConfirmModal from "@/components/ConfirmModal";
import TimeRangePicker from "@/components/TimeRangePicker";
import { apiFetch } from "@/lib/api";

export interface ScheduleTask {
  id: string;
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  startTime: string; // "07:00"
  endTime: string;   // "07:30"
  taskName: string;  // "Pose de texte", "Détection", "Conformation", "Mixage"
  projectName: string;
  companyName: string;
  companyCode?: string; // "C+", "CR", "TF", "DB", "NW"
  room?: string;
  theme: "cream" | "yellow" | "blue" | "white";
  staffMembers: { name: string; initials: string; role?: string }[];
  statusBadge?: string;
  hasJoinButton?: boolean;
}

const DAYS_HEADER: { key: ScheduleTask["day"]; label: string; dateNum: string; isToday?: boolean }[] = [
  { key: "mon", label: "MONDAY", dateNum: "11/05" },
  { key: "tue", label: "TUESDAY", dateNum: "12/05" },
  { key: "wed", label: "WEDNESDAY", dateNum: "13/05" },
  { key: "thu", label: "THU", dateNum: "14/05", isToday: true },
  { key: "fri", label: "FR", dateNum: "15/05" },
  { key: "sat", label: "SA", dateNum: "16/05" },
  { key: "sun", label: "SU", dateNum: "17/05" },
];

const START_HOUR = 7; // 07:00
const END_HOUR = 24;  // 24:00 (Midnight)
const HOUR_HEIGHT = 88; // 88px per hour (44px per 30 minutes)
const SLOT_HEIGHT = HOUR_HEIGHT / 2; // 44px
const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;
const TOTAL_TIMELINE_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT; // 1496px

// Time slots from 07:00 to 24:00
const TIME_SLOTS: string[] = [];
for (let h = START_HOUR; h <= END_HOUR; h++) {
  const hStr = String(h).padStart(2, "0");
  TIME_SLOTS.push(`${hStr}:00`);
  if (h < END_HOUR) {
    TIME_SLOTS.push(`${hStr}:30`);
  }
}

// Convert "HH:MM" to total minutes from midnight
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

// Calculate top and height in px for a task
const getTaskPosition = (startTime: string, endTime: string) => {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const baseMin = START_HOUR * 60; // 07:00 -> 420 mins

  // Top offset in px
  const top = Math.max(0, (startMin - baseMin) * PIXELS_PER_MINUTE);

  // Duration in minutes (min 30 min duration for visibility)
  const durationMin = Math.max(30, endMin > startMin ? endMin - startMin : 60);
  const height = Math.max(44, durationMin * PIXELS_PER_MINUTE);

  return { top, height, durationMin };
};

// Check if a task is taking place at current time and current day
const isTaskActiveNow = (task: ScheduleTask): boolean => {
  const dayIndexMap: ScheduleTask["day"][] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const now = new Date();
  const realTodayKey = dayIndexMap[now.getDay()];
  const headerTodayKey = DAYS_HEADER.find(d => d.isToday)?.key;

  // Day match: matches real day or active calendar header day
  const isToday = task.day === realTodayKey || task.day === headerTodayKey;
  if (!isToday) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(task.startTime);
  const endMinutes = timeToMinutes(task.endTime);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const TASK_CATEGORIES = [
  { id: "all", label: "All Tasks" },
  { id: "pose", label: "Pose de texte" },
  { id: "detection", label: "Détection" },
  { id: "conformation", label: "Conformation" },
  { id: "mixage", label: "Mixage & Voix" },
  { id: "adaptation", label: "Adaptation" },
];

const TASK_TYPE_OPTIONS: SelectOption[] = [
  { value: "Pose de texte", label: "Pose de texte", icon: <FileText size={14} className="text-amber-500" /> },
  { value: "Détection Vocale", label: "Détection Vocale", icon: <Mic size={14} className="text-amber-500" /> },
  { value: "Conformation / QA", label: "Conformation / QA", icon: <CheckCircle2 size={14} className="text-amber-500" /> },
  { value: "Enregistrement Voix", label: "Enregistrement Voix", icon: <Headphones size={14} className="text-amber-500" /> },
  { value: "Mixage 5.1 & Mastering", label: "Mixage 5.1 & Mastering", icon: <Video size={14} className="text-amber-500" /> },
  { value: "Adaptation & Traduction", label: "Adaptation & Traduction", icon: <Sparkles size={14} className="text-amber-500" /> },
  { value: "Calligraphie Bande Rythmo", label: "Calligraphie Bande Rythmo", icon: <Edit3 size={14} className="text-amber-500" /> },
];

const DAY_OPTIONS: SelectOption[] = [
  { value: "mon", label: "Lundi" },
  { value: "tue", label: "Mardi" },
  { value: "wed", label: "Mercredi" },
  { value: "thu", label: "Jeudi" },
  { value: "fri", label: "Vendredi" },
  { value: "sat", label: "Samedi" },
  { value: "sun", label: "Dimanche" },
];

const MAY_2026_DAYS = [
  // Week 1 (Apr 27 - May 3)
  { dateNum: 27, isCurrentMonth: false, isToday: false, dayKey: "mon" as ScheduleTask["day"] },
  { dateNum: 28, isCurrentMonth: false, isToday: false, dayKey: "tue" as ScheduleTask["day"] },
  { dateNum: 29, isCurrentMonth: false, isToday: false, dayKey: "wed" as ScheduleTask["day"] },
  { dateNum: 30, isCurrentMonth: false, isToday: false, dayKey: "thu" as ScheduleTask["day"] },
  { dateNum: 1,  isCurrentMonth: true,  isToday: false, dayKey: "fri" as ScheduleTask["day"] },
  { dateNum: 2,  isCurrentMonth: true,  isToday: false, dayKey: "sat" as ScheduleTask["day"] },
  { dateNum: 3,  isCurrentMonth: true,  isToday: false, dayKey: "sun" as ScheduleTask["day"] },

  // Week 2 (May 4 - May 10)
  { dateNum: 4,  isCurrentMonth: true,  isToday: false, dayKey: "mon" as ScheduleTask["day"] },
  { dateNum: 5,  isCurrentMonth: true,  isToday: false, dayKey: "tue" as ScheduleTask["day"] },
  { dateNum: 6,  isCurrentMonth: true,  isToday: false, dayKey: "wed" as ScheduleTask["day"] },
  { dateNum: 7,  isCurrentMonth: true,  isToday: false, dayKey: "thu" as ScheduleTask["day"] },
  { dateNum: 8,  isCurrentMonth: true,  isToday: false, dayKey: "fri" as ScheduleTask["day"] },
  { dateNum: 9,  isCurrentMonth: true,  isToday: false, dayKey: "sat" as ScheduleTask["day"] },
  { dateNum: 10, isCurrentMonth: true,  isToday: false, dayKey: "sun" as ScheduleTask["day"] },

  // Week 3 (May 11 - May 17) -> Current Active Week
  { dateNum: 11, isCurrentMonth: true,  isToday: false, dayKey: "mon" as ScheduleTask["day"] },
  { dateNum: 12, isCurrentMonth: true,  isToday: false, dayKey: "tue" as ScheduleTask["day"] },
  { dateNum: 13, isCurrentMonth: true,  isToday: false, dayKey: "wed" as ScheduleTask["day"] },
  { dateNum: 14, isCurrentMonth: true,  isToday: true,  dayKey: "thu" as ScheduleTask["day"] },
  { dateNum: 15, isCurrentMonth: true,  isToday: false, dayKey: "fri" as ScheduleTask["day"] },
  { dateNum: 16, isCurrentMonth: true,  isToday: false, dayKey: "sat" as ScheduleTask["day"] },
  { dateNum: 17, isCurrentMonth: true,  isToday: false, dayKey: "sun" as ScheduleTask["day"] },

  // Week 4 (May 18 - May 24)
  { dateNum: 18, isCurrentMonth: true,  isToday: false, dayKey: "mon" as ScheduleTask["day"] },
  { dateNum: 19, isCurrentMonth: true,  isToday: false, dayKey: "tue" as ScheduleTask["day"] },
  { dateNum: 20, isCurrentMonth: true,  isToday: false, dayKey: "wed" as ScheduleTask["day"] },
  { dateNum: 21, isCurrentMonth: true,  isToday: false, dayKey: "thu" as ScheduleTask["day"] },
  { dateNum: 22, isCurrentMonth: true,  isToday: false, dayKey: "fri" as ScheduleTask["day"] },
  { dateNum: 23, isCurrentMonth: true,  isToday: false, dayKey: "sat" as ScheduleTask["day"] },
  { dateNum: 24, isCurrentMonth: true,  isToday: false, dayKey: "sun" as ScheduleTask["day"] },

  // Week 5 (May 25 - May 31)
  { dateNum: 25, isCurrentMonth: true,  isToday: false, dayKey: "mon" as ScheduleTask["day"] },
  { dateNum: 26, isCurrentMonth: true,  isToday: false, dayKey: "tue" as ScheduleTask["day"] },
  { dateNum: 27, isCurrentMonth: true,  isToday: false, dayKey: "wed" as ScheduleTask["day"] },
  { dateNum: 28, isCurrentMonth: true,  isToday: false, dayKey: "thu" as ScheduleTask["day"] },
  { dateNum: 29, isCurrentMonth: true,  isToday: false, dayKey: "fri" as ScheduleTask["day"] },
  { dateNum: 30, isCurrentMonth: true,  isToday: false, dayKey: "sat" as ScheduleTask["day"] },
  { dateNum: 31, isCurrentMonth: true,  isToday: false, dayKey: "sun" as ScheduleTask["day"] },
];

export default function TimeManagementPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedView, setSelectedView] = useState<"day" | "week" | "month">("week");
  const [selectedDayKey, setSelectedDayKey] = useState<ScheduleTask["day"]>("thu");
  const [activeMonth, setActiveMonth] = useState("Mai 2026");
  const [selectedWeek, setSelectedWeek] = useState("May 11/05–17/05");

  // Projects & Staff fetched from database for the Add Modal
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [availableStaff, setAvailableStaff] = useState<{ id: number; name: string; task?: string }[]>([]);

  // Add/Edit Task Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProject, setNewProject] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newTaskName, setNewTaskName] = useState("Pose de texte");
  const [newDay, setNewDay] = useState<ScheduleTask["day"]>("thu");
  const [newStartTime, setNewStartTime] = useState("08:30");
  const [newEndTime, setNewEndTime] = useState("09:30");
  const [newTheme, setNewTheme] = useState<ScheduleTask["theme"]>("cream");
  const [currentProjectCollabs, setCurrentProjectCollabs] = useState<{ id?: number | string; name: string; role?: string }[]>([]);
  const [selectedStaffNames, setSelectedStaffNames] = useState<string[]>([]);

  // Delete Confirmation Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskTitle: string;
  }>({
    isOpen: false,
    taskId: null,
    taskTitle: ""
  });

  // Dynamic Current Time Indicator State
  const [currentIndicator, setCurrentIndicator] = useState<{ str: string; top: number }>({
    str: "07:21",
    top: (7 * 60 + 21 - START_HOUR * 60) * PIXELS_PER_MINUTE
  });

  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const totalMins = h * 60 + m;
      const baseMins = START_HOUR * 60;
      const top = (totalMins - baseMins) * PIXELS_PER_MINUTE;
      setCurrentIndicator({ str: timeStr, top });
    };
    updateTime();
    const timer = setInterval(updateTime, 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll timeline to current time on initial load
  useEffect(() => {
    if (timelineScrollRef.current && currentIndicator.top > 0) {
      const targetScroll = Math.max(0, currentIndicator.top - 180);
      timelineScrollRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }, [isLoading]);

  // Load tasks from database API
  const loadScheduleTasks = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch("/api/schedule-tasks");
      if (res && res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load schedule tasks from database:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Purge old static cache in localStorage
    try {
      localStorage.removeItem("dubflow_timeline_tasks");
      if (user?.id) localStorage.removeItem(`dubflow_timeline_tasks_${user.id}`);
    } catch {
      // ignore
    }
    loadScheduleTasks();
  }, [user?.id]);

  // Fetch real projects and staff for the modal
  useEffect(() => {
    async function loadResources() {
      try {
        const [projRes, staffRes] = await Promise.all([
          apiFetch("/api/projects").catch(() => null),
          apiFetch("/api/staff").catch(() => null),
        ]);

        let loadedStaff: any[] = [];
        if (staffRes && staffRes.ok) {
          const staffData = await staffRes.json();
          loadedStaff = staffData || [];
          setAvailableStaff(loadedStaff);
        }

        if (projRes && projRes.ok) {
          const projData = await projRes.json();
          const projectsList = Array.isArray(projData) ? projData : [];
          setAvailableProjects(projectsList);

          if (projectsList.length > 0) {
            const firstP = projectsList[0];
            setSelectedProjectId(String(firstP.id));
            setNewProject(firstP.name);
            setNewCompany(firstP.company_name || "");

            // Extract collaborators of the first project
            let collabs: { id?: number | string; name: string; role?: string }[] = [];
            if (Array.isArray(firstP.collaborators) && firstP.collaborators.length > 0) {
              collabs = firstP.collaborators.map((c: any, idx: number) => ({
                id: c.staff_id || c.staff_user_id || idx,
                name: c.staff_name || c.name || "Collaborateur",
                role: c.task || c.role || "Collaborateur"
              }));
            } else if (loadedStaff.length > 0) {
              collabs = loadedStaff.map(s => ({
                id: s.id,
                name: s.name,
                role: s.task || "Staff"
              }));
            }
            setCurrentProjectCollabs(collabs);
            if (collabs.length > 0) {
              setSelectedStaffNames([collabs[0].name]);
            }
          }
        }
      } catch {
        // fallback smoothly
      }
    }
    loadResources();
  }, []);

  // Handle project selection change in CustomSelect
  const handleSelectProject = (projectIdStr: string) => {
    setSelectedProjectId(projectIdStr);
    const p = availableProjects.find(item => String(item.id) === projectIdStr);
    if (p) {
      setNewProject(p.name);
      setNewCompany(p.company_name || "");

      // Update collaborators specific to this selected project
      let collabs: { id?: number | string; name: string; role?: string }[] = [];
      if (Array.isArray(p.collaborators) && p.collaborators.length > 0) {
        collabs = p.collaborators.map((c: any, idx: number) => ({
          id: c.staff_id || c.staff_user_id || idx,
          name: c.staff_name || c.name || "Collaborateur",
          role: c.task || c.role || "Collaborateur"
        }));
      } else if (availableStaff.length > 0) {
        // Fallback to studio staff if this project has no specific collaborators
        collabs = availableStaff.map(s => ({
          id: s.id,
          name: s.name,
          role: s.task || "Staff"
        }));
      }

      setCurrentProjectCollabs(collabs);
      if (collabs.length > 0) {
        setSelectedStaffNames([collabs[0].name]);
      } else {
        setSelectedStaffNames([]);
      }
    }
  };

  // Select options for Projects
  const projectSelectOptions: SelectOption[] = useMemo(() => {
    if (availableProjects.length === 0) {
      return [{ value: "", label: "Aucun projet trouvé" }];
    }
    return availableProjects.map(p => ({
      value: String(p.id),
      label: p.name,
      icon: <Briefcase size={14} className="text-amber-500 shrink-0" />
    }));
  }, [availableProjects]);

  // Filter tasks based on Search and Selected Task Category
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Category filter
      if (activeCategory !== "all") {
        const catMap: Record<string, string> = {
          pose: "pose de texte",
          detection: "détection",
          conformation: "conformation",
          mixage: "mixage",
          adaptation: "adaptation"
        };
        const target = catMap[activeCategory];
        if (target && !task.taskName.toLowerCase().includes(target)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = task.taskName.toLowerCase().includes(q);
        const matchesProject = task.projectName.toLowerCase().includes(q);
        const matchesCompany = task.companyName.toLowerCase().includes(q);
        const matchesStaff = (task.staffMembers || []).some(s => s.name.toLowerCase().includes(q));
        if (!matchesName && !matchesProject && !matchesCompany && !matchesStaff) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, activeCategory, searchQuery]);

  // Helper to get initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper to compute stats for a single day in Day View
  const getDayStats = (dayKey: ScheduleTask["day"]) => {
    const dayTasks = filteredTasks.filter(t => t.day === dayKey);
    let totalMinutes = 0;
    const staffSet = new Set<string>();
    dayTasks.forEach(t => {
      const [sH, sM] = t.startTime.split(":").map(Number);
      const [eH, eM] = t.endTime.split(":").map(Number);
      const s = sH * 60 + sM;
      const e = eH * 60 + eM;
      if (e > s) totalMinutes += (e - s);
      (t.staffMembers || []).forEach(m => staffSet.add(m.name));
    });
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationStr = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
    return {
      dayTasks,
      count: dayTasks.length,
      durationStr,
      staffCount: staffSet.size
    };
  };

  // Open modal in Create mode
  const handleOpenCreateTask = (day?: ScheduleTask["day"], startTime?: string, endTime?: string) => {
    setEditingTaskId(null);
    setNewTaskName("Pose de texte");
    if (day) setNewDay(day);
    if (startTime) setNewStartTime(startTime);
    if (endTime) setNewEndTime(endTime);
    setNewTheme("cream");

    if (availableProjects.length > 0) {
      const firstP = availableProjects[0];
      setSelectedProjectId(String(firstP.id));
      setNewProject(firstP.name);
      setNewCompany(firstP.company_name || "");

      let collabs: { id?: number | string; name: string; role?: string }[] = [];
      if (Array.isArray(firstP.collaborators) && firstP.collaborators.length > 0) {
        collabs = firstP.collaborators.map((c: any, idx: number) => ({
          id: c.staff_id || c.staff_user_id || idx,
          name: c.staff_name || c.name || "Collaborateur",
          role: c.task || c.role || "Collaborateur"
        }));
      } else if (availableStaff.length > 0) {
        collabs = availableStaff.map(s => ({
          id: s.id,
          name: s.name,
          role: s.task || "Staff"
        }));
      }
      setCurrentProjectCollabs(collabs);
      if (collabs.length > 0) {
        setSelectedStaffNames([collabs[0].name]);
      }
    }
    setAddModalOpen(true);
  };

  // Open modal in Edit mode with existing task details
  const handleOpenEditTask = (task: ScheduleTask) => {
    setEditingTaskId(task.id);
    setNewTaskName(task.taskName);
    setNewDay(task.day);
    setNewStartTime(task.startTime);
    setNewEndTime(task.endTime);
    setNewTheme(task.theme || "cream");

    // Match project from available projects
    const foundProj = availableProjects.find(p => p.name.toLowerCase() === task.projectName.toLowerCase());
    if (foundProj) {
      setSelectedProjectId(String(foundProj.id));
      setNewProject(foundProj.name);
      setNewCompany(foundProj.company_name || task.companyName || "");

      let collabs: { id?: number | string; name: string; role?: string }[] = [];
      if (Array.isArray(foundProj.collaborators) && foundProj.collaborators.length > 0) {
        collabs = foundProj.collaborators.map((c: any, idx: number) => ({
          id: c.staff_id || c.staff_user_id || idx,
          name: c.staff_name || c.name || "Collaborateur",
          role: c.task || c.role || "Collaborateur"
        }));
      } else if (availableStaff.length > 0) {
        collabs = availableStaff.map(s => ({
          id: s.id,
          name: s.name,
          role: s.task || "Staff"
        }));
      }
      setCurrentProjectCollabs(collabs);
    } else {
      setSelectedProjectId("");
      setNewProject(task.projectName);
      setNewCompany(task.companyName);
      if (task.staffMembers && task.staffMembers.length > 0) {
        setCurrentProjectCollabs(task.staffMembers.map(s => ({ name: s.name, role: s.role || "Collaborateur" })));
      }
    }

    setSelectedStaffNames((task.staffMembers || []).map(s => s.name));
    setAddModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName || isSaving) return;

    setIsSaving(true);
    const assignedStaff = selectedStaffNames.map(name => {
      const found = currentProjectCollabs.find(c => c.name === name);
      return {
        name,
        initials: getInitials(name),
        role: found?.role || "Collaborateur"
      };
    });

    const compCode = newCompany ? newCompany.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "DF";

    const payload = {
      day: newDay,
      startTime: newStartTime,
      endTime: newEndTime,
      taskName: newTaskName,
      projectName: newProject || "Projet de Doublage",
      companyName: newCompany || "Client Studio",
      companyCode: compCode,
      room: "",
      theme: newTheme,
      staffMembers: assignedStaff.length > 0 ? assignedStaff : [{ name: user?.first_name || "Moi", initials: "ME" }],
      hasJoinButton: false
    };

    try {
      if (editingTaskId) {
        // PUT update
        const res = await apiFetch(`/api/schedule-tasks/${editingTaskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res && res.ok) {
          const updatedTask = await res.json();
          setTasks(prev => prev.map(t => t.id === editingTaskId ? updatedTask : t));
          setAddModalOpen(false);
          setEditingTaskId(null);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.detail || "Erreur lors de la mise à jour de la tâche.");
        }
      } else {
        // POST create
        const res = await apiFetch("/api/schedule-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res && res.ok) {
          const savedTask = await res.json();
          setTasks(prev => [...prev, savedTask]);
          setAddModalOpen(false);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.detail || "Erreur lors de la sauvegarde de la tâche.");
        }
      }
    } catch (err) {
      console.error("Failed to save task:", err);
      alert("Erreur de connexion lors de l'enregistrement de la tâche.");
    } finally {
      setIsSaving(false);
    }
  };

  const promptDeleteTask = (taskId: string, taskTitle: string) => {
    setDeleteModalState({
      isOpen: true,
      taskId,
      taskTitle
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.taskId) return;
    const idToDelete = deleteModalState.taskId;

    setDeleteModalState({ isOpen: false, taskId: null, taskTitle: "" });

    try {
      const res = await apiFetch(`/api/schedule-tasks/${idToDelete}`, {
        method: "DELETE"
      });
      if (res && res.ok) {
        setTasks(prev => prev.filter(t => t.id !== idToDelete));
      } else {
        alert("Impossible de supprimer la tâche.");
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
      alert("Erreur réseau lors de la suppression.");
    }
  };

  // Theme styling for the task cards
  const getCardThemeClasses = (theme: ScheduleTask["theme"]) => {
    switch (theme) {
      case "yellow":
        return "bg-[#F7D046] text-[#111111] border-transparent shadow-[0_4px_16px_rgba(247,208,70,0.25)]";
      case "blue":
        return "bg-[#B9D7F9] text-[#111111] border-transparent shadow-[0_4px_16px_rgba(185,215,249,0.25)]";
      case "white":
        return "bg-white text-[#111111] border border-[#DDD7C5] shadow-xs";
      case "cream":
      default:
        return "bg-[#ECE8DD] text-[#111111] border border-[#DDD7C5] shadow-xs hover:border-amber-400";
    }
  };

  return (
    <div className="flex-1 h-full w-full overflow-y-auto no-scrollbar text-[#111111] p-3 sm:p-5 md:p-6 select-none font-sans-display flex flex-col gap-5">
      
      {/* 1. Header with Title, Icon, Explanatory Subtitle, Header Action Pills & Event Button */}
      <PageHeader
        title="Schedule & Time Management"
        subtitle="Weekly post-synchronization timeline, assigned dubbing tasks, and staff synchronization."
        icon={<Calendar size={28} />}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateTask()}
              className="bg-[#111111] hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-full flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              Plan Task
            </button>

            <button
              onClick={loadScheduleTasks}
              className="w-9 h-9 rounded-full bg-[#ECE8DD] hover:bg-[#DDD7C5] border border-[#D9D3C2] flex items-center justify-center text-[#111111] transition-colors shadow-xs cursor-pointer"
              title="Refresh Timeline from Database"
            >
              <RotateCw size={15} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      >
        {/* Full Screen Width Search Bar - Category Filters hide automatically when screen narrows */}
        <div className="w-full bg-[#F7F4EB] border border-[#D9D3C2] rounded-full px-4 py-2 flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:border-[#111111] transition-all">
          <Search size={18} className="text-[#FF7597] shrink-0" />
          <input
            type="text"
            placeholder="Search tasks, projects, companies or staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 w-full min-w-0 bg-transparent text-sm text-[#111111] placeholder-[#8c887b] focus:outline-none"
          />

          {/* Separator - hides on smaller screens */}
          <div className="h-4 w-px bg-[#D9D3C2] hidden xl:block shrink-0" />

          {/* Inline "In:" Task Filter Chips - hidden when screen shrinks */}
          <div className="hidden xl:flex items-center gap-1.5 shrink-0 text-xs">
            <span className="text-[#8c887b] font-medium text-[11px] pr-0.5">In:</span>
            {TASK_CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? "bg-[#111111] text-white border border-[#111111]"
                      : "border border-dashed border-[#C5BFB0] text-[#736E62] hover:text-[#111111] hover:border-[#111111]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </PageHeader>

      {/* 2. DATE SELECTOR & VIEW SWITCHER ROW */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Black Pill Date Picker */}
        <div className="inline-flex items-center gap-2 bg-[#111111] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs cursor-pointer hover:bg-black transition-colors">
          <span>
            {selectedView === "day"
              ? `Aujourd'hui — ${DAYS_HEADER.find(d => d.key === selectedDayKey)?.label || "Jeudi"} ${DAYS_HEADER.find(d => d.key === selectedDayKey)?.dateNum || "14/05"}`
              : selectedView === "month"
              ? activeMonth
              : selectedWeek}
          </span>
          <ChevronDown size={14} className="text-[#999999]" />
        </div>

        {/* View Switcher: Today / Week / Month */}
        <div className="flex items-center bg-[#ECE8DD] border border-[#DDD7C5] p-1 rounded-full text-xs font-medium">
          <button
            onClick={() => {
              setSelectedView("day");
              setSelectedDayKey("thu");
            }}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              selectedView === "day" ? "bg-[#111111] text-white font-bold shadow-xs" : "text-[#736E62] hover:text-[#111111]"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedView("week")}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              selectedView === "week" ? "bg-[#111111] text-white font-bold shadow-xs" : "text-[#736E62] hover:text-[#111111]"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setSelectedView("month")}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              selectedView === "month" ? "bg-[#111111] text-white font-bold shadow-xs" : "text-[#736E62] hover:text-[#111111]"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* 3. MAIN SCHEDULE CONTAINER */}
      <div className="flex-1 w-full bg-[#F7F4EB] border border-[#DDD7C5] rounded-[32px] p-3 sm:p-5 relative shadow-xs flex flex-col min-h-[580px] max-h-[820px] overflow-hidden">
        
        {/* ========================================================================= */}
        {/* VIEW A: TODAY / SINGLE DAY TIMELINE                                       */}
        {/* ========================================================================= */}
        {selectedView === "day" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* 1. Day Top Info & Metrics Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD7C5]/70 shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-[#111111]">
                      {selectedDayKey === "mon" ? "Lundi 11 Mai 2026"
                        : selectedDayKey === "tue" ? "Mardi 12 Mai 2026"
                        : selectedDayKey === "wed" ? "Mercredi 13 Mai 2026"
                        : selectedDayKey === "thu" ? "Jeudi 14 Mai 2026"
                        : selectedDayKey === "fri" ? "Vendredi 15 Mai 2026"
                        : selectedDayKey === "sat" ? "Samedi 16 Mai 2026"
                        : "Dimanche 17 Mai 2026"}
                    </h2>
                    {selectedDayKey === "thu" && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1.5 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Aujourd'hui en direct
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    Vue focalisée par journée — sessions d'enregistrement & mixage
                  </p>
                </div>
              </div>

              {/* Day Quick Stats */}
              {(() => {
                const stats = getDayStats(selectedDayKey);
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="px-3 py-1 rounded-full bg-[#ECE8DD] border border-[#DDD7C5] text-xs font-bold text-[#111111] flex items-center gap-1.5 shadow-xs">
                      <span className="text-amber-600 font-black">●</span>
                      {stats.count} session{stats.count !== 1 ? "s" : ""}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-[#ECE8DD] border border-[#DDD7C5] text-xs font-bold text-[#111111] flex items-center gap-1.5 shadow-xs">
                      <Clock size={12} className="text-stone-500" />
                      {stats.durationStr}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-[#ECE8DD] border border-[#DDD7C5] text-xs font-bold text-[#111111] flex items-center gap-1.5 shadow-xs">
                      <Users size={12} className="text-stone-500" />
                      {stats.staffCount} staff
                    </div>
                    <button
                      onClick={() => handleOpenCreateTask(selectedDayKey, "09:00", "10:00")}
                      className="px-3.5 py-1.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer ml-1"
                    >
                      <Plus size={13} />
                      Planifier
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* 2. Days selector tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5 border-b border-[#DDD7C5]/50 shrink-0">
              {DAYS_HEADER.map(d => {
                const isSelected = selectedDayKey === d.key;
                const dayCount = filteredTasks.filter(t => t.day === d.key).length;
                return (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDayKey(d.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                      isSelected
                        ? "bg-[#111111] text-white shadow-xs"
                        : "bg-[#ECE8DD] text-stone-700 hover:text-black border border-[#DDD7C5]"
                    }`}
                  >
                    <span>{d.label}</span>
                    <span className={`text-[10px] ${isSelected ? "text-amber-400 font-extrabold" : "text-stone-500"}`}>
                      {d.dateNum}
                    </span>
                    {d.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                    {dayCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                        isSelected ? "bg-white/20 text-white" : "bg-black/10 text-stone-700"
                      }`}>
                        {dayCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 3. Single Day Full-Width Timeline Body */}
            <div ref={timelineScrollRef} className="flex-1 overflow-y-auto relative pt-2 pr-1 custom-scrollbar">
              {isLoading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-2 text-stone-500">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                  <span className="text-xs font-semibold">Chargement du planning...</span>
                </div>
              ) : (
                <div
                  className="grid grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr] gap-3 relative"
                  style={{ height: `${TOTAL_TIMELINE_HEIGHT}px` }}
                >
                  {/* Live Pink Line for Today */}
                  {selectedDayKey === "thu" && (() => {
                    const clampedTop = Math.max(0, Math.min(TOTAL_TIMELINE_HEIGHT, currentIndicator.top));
                    return (
                      <div
                        style={{ top: `${clampedTop}px` }}
                        className="absolute left-0 right-0 pointer-events-none z-30 flex items-center transition-all duration-1000 -translate-y-1/2"
                      >
                        <span className="ml-1 sm:ml-2 px-2.5 py-0.5 bg-[#FF6B8B] text-white text-[10px] sm:text-[11px] font-bold rounded-full shadow-md flex items-center gap-1.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          {currentIndicator.str}
                        </span>
                        <div className="flex-1 h-0 border-t-2 border-dashed border-[#FF6B8B]/80 ml-2 mr-3" />
                      </div>
                    );
                  })()}

                  {/* Time labels column */}
                  <div className="relative text-right pr-2 select-none" style={{ height: `${TOTAL_TIMELINE_HEIGHT}px` }}>
                    {TIME_SLOTS.map((time, idx) => {
                      const isHour = time.endsWith(":00");
                      const topPx = idx * SLOT_HEIGHT;
                      return (
                        <div
                          key={time}
                          style={{ top: `${topPx}px` }}
                          className={`absolute right-1 -translate-y-1/2 text-[11px] font-medium transition-colors ${
                            isHour ? "text-[#111111] font-bold" : "text-[#8C887B] text-[10px]"
                          }`}
                        >
                          {time}
                        </div>
                      );
                    })}
                  </div>

                  {/* Wide Day Column */}
                  <div className="relative h-full group/col">
                    {/* Background guidelines */}
                    {TIME_SLOTS.map((slot, idx) => {
                      const topPx = idx * SLOT_HEIGHT;
                      const isHour = slot.endsWith(":00");
                      return (
                        <div
                          key={slot}
                          style={{ top: `${topPx}px`, height: `${SLOT_HEIGHT}px` }}
                          onClick={() => {
                            const [h, m] = slot.split(":").map(Number);
                            const nextH = Math.min(23, h + 1);
                            handleOpenCreateTask(selectedDayKey, slot, `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                          }}
                          className={`absolute left-0 right-0 border-t cursor-pointer hover:bg-amber-400/5 transition-colors ${
                            isHour ? "border-[#DDD7C5]/70" : "border-dashed border-[#DDD7C5]/35"
                          }`}
                          title={`Planifier à ${slot}`}
                        />
                      );
                    })}

                    {/* Cards in this day */}
                    {filteredTasks.filter(t => t.day === selectedDayKey).map(task => {
                      const { top, height } = getTaskPosition(task.startTime, task.endTime);
                      const isActive = isTaskActiveNow(task);
                      const [sH, sM] = task.startTime.split(":").map(Number);
                      const [eH, eM] = task.endTime.split(":").map(Number);
                      const durationMins = (eH * 60 + eM) - (sH * 60 + sM);
                      const durHrs = Math.floor(durationMins / 60);
                      const durRemMins = durationMins % 60;
                      const durFormatted = durHrs > 0 ? `${durHrs}h${durRemMins > 0 ? ` ${durRemMins}m` : ""}` : `${durRemMins}m`;

                      return (
                        <div
                          key={task.id}
                          onClick={() => handleOpenEditTask(task)}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          className={`absolute left-2 right-4 rounded-[22px] p-3 sm:p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between group overflow-hidden z-10 ${
                            isActive
                              ? "border-[2.5px] !border-[#F7D046] shadow-[0_0_24px_rgba(247,208,70,0.55),0_4px_16px_rgba(0,0,0,0.1)] ring-2 ring-[#F7D046]/40 z-20"
                              : `${getCardThemeClasses(task.theme)} hover:shadow-md hover:z-20`
                          } ${task.theme === "yellow" ? "bg-[#F7D046]" : task.theme === "blue" ? "bg-[#B9D7F9]" : task.theme === "white" ? "bg-white" : "bg-[#ECE8DD]"}`}
                        >
                          {/* TOP / MAIN ROW */}
                          <div className="flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full bg-white shadow-xs border border-black/5 flex items-center justify-center font-extrabold text-xs text-[#111111] shrink-0"
                                title={`Société / Studio: ${task.companyName}`}
                              >
                                {task.companyCode || <Building2 size={13} className="text-amber-500" />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-extrabold text-[#111111] leading-tight truncate">
                                  {task.taskName}
                                </h4>
                                <p className="text-xs text-stone-600 font-medium truncate">
                                  {task.projectName} • <span className="font-semibold">{task.companyName}</span>
                                </p>
                              </div>
                            </div>

                            {/* Right details & actions */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="bg-white/80 border border-black/5 px-3 py-1 rounded-full text-xs font-bold text-[#111111] shadow-xs flex items-center gap-1.5">
                                <Clock size={12} className="text-stone-500" />
                                {task.startTime} – {task.endTime} ({durFormatted})
                              </span>

                              {/* Staff list */}
                              <div className="hidden md:flex items-center -space-x-2">
                                {(task.staffMembers || []).map((st, i) => (
                                  <div
                                    key={i}
                                    className="w-7 h-7 rounded-full bg-[#111111] text-white border-2 border-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-xs"
                                    title={`${st.name} (${st.role || "Collaborateur"})`}
                                  >
                                    {st.initials}
                                  </div>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  promptDeleteTask(task.id, task.taskName);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-rose-600 p-1.5 rounded-full hover:bg-black/10 transition-opacity cursor-pointer shrink-0"
                                title="Supprimer cette tâche"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: WEEK TIMELINE GRID (7 Days x Time Rows)                           */}
        {/* ========================================================================= */}
        {selectedView === "week" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* A. STICKY DAYS HEADER ROW */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] sm:grid-cols-[64px_repeat(7,1fr)] gap-2 pb-3 border-b border-[#DDD7C5]/70 items-center shrink-0 z-30 bg-[#F7F4EB]">
              {/* Week number */}
              <div className="text-center font-bold text-xs text-[#736E62] leading-tight">
                W<br />
                <span className="text-sm sm:text-base text-[#111111]">24</span>
              </div>

              {/* 7 Days Columns */}
              {DAYS_HEADER.map((d) => (
                <div key={d.key} className="text-center">
                  {d.isToday ? (
                    <div className="inline-block bg-[#111111] text-white rounded-full px-3 py-1 shadow-xs">
                      <div className="text-[10px] font-bold tracking-wider">{d.label}</div>
                      <div className="text-xs font-bold">{d.dateNum}</div>
                    </div>
                  ) : (
                    <div className="text-[#111111]">
                      <div className={`text-[10px] font-semibold tracking-wider ${d.key === "sun" ? "text-rose-500 font-bold" : "text-[#736E62]"}`}>
                        {d.label}
                      </div>
                      <div className={`text-xs font-bold ${d.key === "sun" ? "text-rose-500 font-bold" : "text-[#111111]"}`}>
                        {d.dateNum}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* B. SCROLLABLE TIMELINE BODY: TIME SLOTS & CARDS */}
            <div ref={timelineScrollRef} className="flex-1 overflow-y-auto relative pt-2 pr-1 custom-scrollbar">
              {isLoading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-2 text-stone-500">
                  <Loader2 className="animate-spin text-amber-500" size={32} />
                  <span className="text-xs font-semibold">Chargement du planning...</span>
                </div>
              ) : (
                <div 
                  className="grid grid-cols-[56px_repeat(7,1fr)] sm:grid-cols-[64px_repeat(7,1fr)] gap-2 relative"
                  style={{ height: `${TOTAL_TIMELINE_HEIGHT}px` }}
                >
                  {/* Dynamic Live Current Time Pink Line - Always represents the actual current time */}
                  {(() => {
                    const clampedTop = Math.max(0, Math.min(TOTAL_TIMELINE_HEIGHT, currentIndicator.top));
                    return (
                      <div 
                        style={{ top: `${clampedTop}px` }}
                        className="absolute left-0 right-0 pointer-events-none z-30 flex items-center transition-all duration-1000 -translate-y-1/2"
                      >
                        <span className="ml-1 sm:ml-2 px-2.5 py-0.5 bg-[#FF6B8B] text-white text-[10px] sm:text-[11px] font-bold rounded-full shadow-md flex items-center gap-1.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          {currentIndicator.str}
                        </span>
                        <div className="flex-1 h-0 border-t-2 border-dashed border-[#FF6B8B]/80 ml-2 mr-3" />
                      </div>
                    );
                  })()}

                  {/* 1. Time labels column */}
                  <div className="relative text-right pr-2 select-none" style={{ height: `${TOTAL_TIMELINE_HEIGHT}px` }}>
                    {TIME_SLOTS.map((time, idx) => {
                      const isHour = time.endsWith(":00");
                      const topPx = idx * SLOT_HEIGHT;
                      return (
                        <div 
                          key={time} 
                          style={{ top: `${topPx}px` }}
                          className={`absolute right-1 -translate-y-1/2 text-[11px] font-medium transition-colors ${
                            isHour ? "text-[#111111] font-bold" : "text-[#8C887B] text-[10px]"
                          }`}
                        >
                          {time}
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. 7 Days Columns for Tasks */}
                  {DAYS_HEADER.map((day) => {
                    const dayTasks = filteredTasks.filter((t) => t.day === day.key);

                    return (
                      <div 
                        key={day.key} 
                        className="relative h-full border-r border-[#DDD7C5]/30 last:border-r-0 group/col"
                      >
                        {/* Background guidelines for each half-hour slot */}
                        {TIME_SLOTS.map((slot, idx) => {
                          const topPx = idx * SLOT_HEIGHT;
                          const isHour = slot.endsWith(":00");
                          return (
                            <div
                              key={slot}
                              style={{ top: `${topPx}px`, height: `${SLOT_HEIGHT}px` }}
                              onClick={() => {
                                const [h, m] = slot.split(":").map(Number);
                                const nextH = Math.min(23, h + 1);
                                handleOpenCreateTask(day.key, slot, `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                              }}
                              className={`absolute left-0 right-0 border-t cursor-pointer hover:bg-amber-400/5 transition-colors ${
                                isHour ? "border-[#DDD7C5]/70" : "border-dashed border-[#DDD7C5]/35"
                              }`}
                              title={`Planifier à ${slot} (${day.label})`}
                            />
                          );
                        })}

                        {/* Task Cards in this day */}
                        {dayTasks.map((task) => {
                          const { top, height } = getTaskPosition(task.startTime, task.endTime);
                          const isTall = height >= 140;
                          const isCompact = height < 75;
                          const isActive = isTaskActiveNow(task);

                          return (
                            <div
                              key={task.id}
                              onClick={() => handleOpenEditTask(task)}
                              style={{ top: `${top}px`, height: `${height}px` }}
                              className={`absolute left-1 right-1 rounded-[20px] p-2.5 sm:p-3 transition-all duration-300 cursor-pointer flex flex-col justify-between group overflow-hidden z-10 ${
                                isActive
                                  ? "border-[2.5px] !border-[#F7D046] shadow-[0_0_24px_rgba(247,208,70,0.55),0_4px_16px_rgba(0,0,0,0.1)] ring-2 ring-[#F7D046]/40 z-20"
                                  : `${getCardThemeClasses(task.theme)} hover:shadow-md hover:z-20`
                              } ${task.theme === "yellow" ? "bg-[#F7D046]" : task.theme === "blue" ? "bg-[#B9D7F9]" : task.theme === "white" ? "bg-white" : "bg-[#ECE8DD]"}`}
                            >
                              {/* TOP ROW: Company Badge & Delete Button */}
                              <div className="flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div
                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white shadow-xs border border-black/5 flex items-center justify-center font-extrabold text-[10px] text-[#111111] shrink-0"
                                    title={`Société / Studio: ${task.companyName}`}
                                  >
                                    {task.companyCode || <Building2 size={12} className="text-amber-500" />}
                                  </div>

                                  {!isCompact && (
                                    <span className="text-[10px] font-semibold text-stone-600 truncate hidden sm:inline">
                                      {task.companyName}
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    promptDeleteTask(task.id, task.taskName);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-rose-600 p-1 rounded-full hover:bg-black/10 transition-opacity cursor-pointer shrink-0"
                                  title="Supprimer cette tâche"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              {/* MIDDLE: Task Name & Project */}
                              <div className={`min-w-0 ${isCompact ? "my-0.5" : "my-1"}`}>
                                <h4 className="text-xs font-extrabold text-[#111111] leading-snug line-clamp-2">
                                  {task.taskName}
                                </h4>
                                {!isCompact && (
                                  <p className="text-[11px] text-stone-600 line-clamp-1 font-medium mt-0.5">
                                    {task.projectName}
                                  </p>
                                )}
                              </div>

                              {/* BOTTOM ROW: Time Slot & Staff Circles */}
                              <div className="pt-1.5 border-t border-black/5 flex flex-col gap-1.5 shrink-0">
                                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-stone-700">
                                  <span className="flex items-center gap-1">
                                    <Clock size={11} className="text-stone-500 shrink-0" />
                                    {task.startTime} – {task.endTime}
                                  </span>
                                  {task.statusBadge && !isActive && (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-400/25 px-1.5 py-0.2 rounded-full">
                                      {task.statusBadge}
                                    </span>
                                  )}
                                </div>

                                {/* Overlapping Staff Circles */}
                                {(!isCompact || isTall) && (
                                  <div className="flex items-center justify-between pt-0.5">
                                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                                      {(task.staffMembers || []).slice(0, 3).map((st, i) => (
                                        <div
                                          key={i}
                                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#111111] text-white border-2 border-white flex items-center justify-center text-[9px] font-bold shrink-0 shadow-xs"
                                          title={`${st.name} (${st.role || "Collaborateur"})`}
                                        >
                                          {st.initials}
                                        </div>
                                      ))}
                                      {(task.staffMembers || []).length > 3 && (
                                        <div
                                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 text-black border-2 border-white flex items-center justify-center text-[9px] font-black shrink-0 shadow-xs"
                                          title={`+${task.staffMembers.length - 3} autres collaborateurs`}
                                        >
                                          +{task.staffMembers.length - 3}
                                        </div>
                                      )}
                                    </div>

                                    {task.hasJoinButton && (
                                      <button
                                        type="button"
                                        className="px-2 py-0.5 bg-[#111111] hover:bg-black text-white text-[10px] font-bold rounded-full transition-transform active:scale-95 shadow-xs cursor-pointer"
                                      >
                                        Join
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW C: MONTH PLANNING BOARD                                              */}
        {/* ========================================================================= */}
        {selectedView === "month" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* 1. Month Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD7C5]/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-[#ECE8DD] border border-[#DDD7C5] rounded-full p-1 shadow-xs">
                  <button
                    onClick={() => setActiveMonth("Avril 2026")}
                    className="p-1 rounded-full hover:bg-black/10 text-stone-600 hover:text-black transition-colors cursor-pointer"
                    title="Mois précédent"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 text-xs font-extrabold text-[#111111]">{activeMonth}</span>
                  <button
                    onClick={() => setActiveMonth("Juin 2026")}
                    className="p-1 rounded-full hover:bg-black/10 text-stone-600 hover:text-black transition-colors cursor-pointer"
                    title="Mois suivant"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <span className="text-xs text-stone-600 hidden md:inline font-medium">
                  Planning général du studio & livrables
                </span>
              </div>

              {/* Month Metrics */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1 rounded-full bg-[#ECE8DD] border border-[#DDD7C5] text-xs font-bold text-[#111111] shadow-xs">
                  📅 31 Jours
                </div>
                <div className="px-3 py-1 rounded-full bg-[#ECE8DD] border border-[#DDD7C5] text-xs font-bold text-[#111111] shadow-xs">
                  🎯 {filteredTasks.length} Tâche(s)
                </div>
                <button
                  onClick={() => handleOpenCreateTask("thu", "09:00", "10:00")}
                  className="px-3.5 py-1.5 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer ml-1"
                >
                  <Plus size={13} />
                  Planifier
                </button>
              </div>
            </div>

            {/* 2. Days of week labels */}
            <div className="grid grid-cols-7 gap-2 pb-2.5 pt-3 border-b border-[#DDD7C5]/60 text-center font-bold text-xs text-[#736E62] shrink-0">
              {["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"].map((dayName, idx) => (
                <div key={dayName} className={idx === 6 ? "text-rose-500 font-extrabold" : ""}>
                  {dayName}
                </div>
              ))}
            </div>

            {/* 3. 5-Week Calendar Grid (Kintsugi Folder Design with Pop-out Effect) */}
            <div className="flex-1 overflow-y-auto pt-8 pb-4 px-2 grid grid-cols-7 gap-y-7 gap-x-3.5 custom-scrollbar">
              {MAY_2026_DAYS.map((cell, idx) => {
                const isWeek3 = cell.dateNum >= 11 && cell.dateNum <= 17 && cell.isCurrentMonth;
                const tasksInCell = isWeek3 ? filteredTasks.filter(t => t.day === cell.dayKey) : [];

                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenCreateTask(cell.dayKey, "09:00", "10:00")}
                    className={`relative w-full h-[162px] flex flex-col justify-end group/folder cursor-pointer select-none transition-all duration-300 hover:z-40 ${
                      !cell.isCurrentMonth ? "opacity-30 pointer-events-none" : ""
                    }`}
                  >
                    {/* Folder Backplate */}
                    <div
                      className={`absolute inset-0 rounded-[26px] pointer-events-none transition-all duration-300 ${
                        !cell.isCurrentMonth
                          ? "bg-[#ECE8DD]"
                          : cell.isToday
                          ? "bg-gradient-to-b from-[#F7D046] via-[#F5CB3D] to-[#E5B620] shadow-[0_20px_40px_-8px_rgba(247,208,70,0.5),0_8px_18px_-4px_rgba(247,208,70,0.32)] border border-[#F7D046]/60 group-hover/folder:scale-[1.015]"
                          : "bg-[#ECE8DD] shadow-[0_14px_30px_-6px_rgba(0,0,0,0.06),0_4px_10px_-2px_rgba(0,0,0,0.03)] border border-black/[0.04] group-hover/folder:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.12)] group-hover/folder:-translate-y-0.5"
                      }`}
                    />

                    {/* 1. PAPER SHEETS PEEKING AND POPPING OUT FROM INSIDE THE FOLDER */}
                    {cell.isCurrentMonth && (
                      <>
                        {tasksInCell.length === 0 ? (
                          <>
                            {/* Layer 1: Background paper sheet slightly offset */}
                            <div className={`absolute left-3.5 right-3.5 top-3.5 h-[105px] rounded-t-xl rotate-[1.5deg] shadow-xs pointer-events-none transition-colors ${
                              cell.isToday ? "bg-white/85" : "bg-white/70"
                            }`} />

                            {/* Layer 2: Main foreground paper sheet (empty/clean) */}
                            <div className="absolute left-3 right-3 top-4 h-[105px] rounded-t-xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-black/[0.04] p-2.5 transition-all duration-300 ease-out group-hover/folder:-translate-y-4 select-none">
                              <div className="w-10 h-1.5 bg-stone-200 rounded-full mb-1.5" />
                              <div className="w-16 h-1.5 bg-stone-100 rounded-full mb-2" />
                              <span className="text-[8px] text-stone-300 font-medium block">Libre</span>
                            </div>
                          </>
                        ) : tasksInCell.length === 1 ? (
                          <>
                            {/* Background decorative offset paper */}
                            <div className={`absolute left-3.5 right-3.5 top-3.5 h-[105px] rounded-t-xl rotate-[1.5deg] shadow-xs pointer-events-none transition-colors ${
                              cell.isToday ? "bg-white/85" : "bg-white/70"
                            }`} />

                            {/* Single Task Paper Sheet (Pops out from the top of the folder on hover) */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditTask(tasksInCell[0]);
                              }}
                              className="absolute left-3 right-3 top-4 h-[115px] rounded-t-xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-black/[0.05] p-2.5 transition-all duration-300 ease-out group-hover/folder:-translate-y-9 group-hover/folder:shadow-[0_16px_32px_rgba(0,0,0,0.2)] cursor-pointer z-[15] hover:!z-[35] hover:scale-105"
                              title={`${tasksInCell[0].taskName} (${tasksInCell[0].startTime})`}
                            >
                              <div className="flex items-center justify-between text-[8.5px] font-bold text-stone-500 mb-1">
                                <span className="flex items-center gap-1 font-mono text-stone-900 font-extrabold">
                                  <FileText size={10} className="text-amber-500" />
                                  {tasksInCell[0].startTime}
                                </span>
                                <span className="text-[7.5px] font-black uppercase px-1 py-0.2 rounded bg-black/5 text-stone-700">
                                  DOC
                                </span>
                              </div>
                              <div className="text-[9.5px] font-black text-[#111111] leading-tight line-clamp-1">
                                {tasksInCell[0].taskName}
                              </div>
                              <div className="text-[8px] text-stone-500 font-medium truncate mt-0.5">
                                {tasksInCell[0].projectName}
                              </div>
                              <div className="mt-1.5 pt-1 border-t border-black/5 flex items-center gap-1 text-[7.5px] text-stone-400 opacity-0 group-hover/folder:opacity-100 transition-opacity">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span className="truncate">{tasksInCell[0].companyName || "Studio"}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* MULTIPLE TASKS IN SAME DAY (Both files pop out and fan out from the top on hover) */}
                            {/* Rear Task Paper Sheet (Task 2 - Right side, pops up high) */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditTask(tasksInCell[1]);
                              }}
                              className="absolute right-1.5 left-7 top-1.5 h-[120px] rounded-t-xl bg-[#FAF9F5] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/[0.07] p-2 pt-1.5 rotate-[4deg] group-hover/folder:rotate-[7deg] group-hover/folder:-translate-y-10 group-hover/folder:translate-x-2 group-hover/folder:shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition-all duration-300 ease-out z-[10] hover:!z-[35] hover:scale-105 hover:bg-white cursor-pointer"
                              title={`${tasksInCell[1].taskName} (${tasksInCell[1].startTime})`}
                            >
                              <div className="flex items-center justify-between text-[7.5px] font-bold text-stone-500 mb-0.5">
                                <span className="flex items-center gap-0.5 font-mono text-stone-900 font-extrabold">
                                  <FileText size={8} className="text-amber-500" />
                                  {tasksInCell[1].startTime}
                                </span>
                                <span className="text-[6.5px] font-black uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-900">
                                  DOC 2
                                </span>
                              </div>
                              <div className="text-[8.5px] font-black text-[#111111] leading-tight truncate">
                                {tasksInCell[1].taskName}
                              </div>
                              <div className="text-[7.5px] text-stone-400 font-medium truncate mt-0.5">
                                {tasksInCell[1].projectName}
                              </div>
                              <div className="mt-1.5 pt-1 border-t border-black/5 text-[7px] text-stone-400 opacity-0 group-hover/folder:opacity-100 transition-opacity truncate">
                                {tasksInCell[1].companyName || "Studio"}
                              </div>
                            </div>

                            {/* Front Task Paper Sheet (Task 1 - Left side, pops up) */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditTask(tasksInCell[0]);
                              }}
                              className="absolute left-1.5 right-7 top-4 h-[120px] rounded-t-xl bg-white shadow-[0_5px_18px_rgba(0,0,0,0.1)] border border-black/[0.05] p-2 pt-1.5 rotate-[-2deg] group-hover/folder:rotate-[-4deg] group-hover/folder:-translate-y-8 group-hover/folder:-translate-x-1.5 group-hover/folder:shadow-[0_16px_32px_rgba(0,0,0,0.22)] transition-all duration-300 ease-out z-[15] hover:!z-[35] hover:scale-105 cursor-pointer"
                              title={`${tasksInCell[0].taskName} (${tasksInCell[0].startTime})`}
                            >
                              <div className="flex items-center justify-between text-[8px] font-bold text-stone-500 mb-0.5">
                                <span className="flex items-center gap-0.5 font-mono text-stone-900 font-extrabold">
                                  <FileText size={8} className="text-amber-500" />
                                  {tasksInCell[0].startTime}
                                </span>
                                <span className="text-[6.5px] font-black uppercase px-1 py-0.2 rounded bg-black/5 text-stone-700">
                                  DOC 1
                                </span>
                              </div>
                              <div className="text-[9px] font-black text-[#111111] leading-tight truncate">
                                {tasksInCell[0].taskName}
                              </div>
                              <div className="text-[7.5px] text-stone-500 font-medium truncate mt-0.5">
                                {tasksInCell[0].projectName}
                              </div>
                              <div className="mt-1.5 pt-1 border-t border-black/5 text-[7px] text-stone-400 opacity-0 group-hover/folder:opacity-100 transition-opacity truncate">
                                {tasksInCell[0].companyName || "Studio"}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* 2. FRONT FLAP (The signature Kintsugi Tabbed Pocket) */}
                    <div className={`relative z-[30] w-full h-[58%] flex flex-col justify-between p-3 pt-4 select-none rounded-b-[26px] overflow-hidden ${
                      cell.isToday ? "text-[#111111]" : "text-[#111111]"
                    }`}>
                      {/* SVG Flap with Iconic Smooth Tab Contour */}
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className={`absolute inset-0 w-full h-full -z-10 filter ${
                          cell.isToday
                            ? "drop-shadow-[0_-3px_8px_rgba(212,169,32,0.35)]"
                            : "drop-shadow-[0_-3px_8px_rgba(0,0,0,0.04)]"
                        }`}
                      >
                        {cell.isToday ? (
                          <>
                            <defs>
                              <linearGradient id={`todayFlap-desk-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#FDE047" />
                                <stop offset="50%" stopColor="#F7D046" />
                                <stop offset="100%" stopColor="#EAB308" />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 0,0 L 46,0 C 54,0 58,15 68,15 L 100,15 L 100,100 L 0,100 Z"
                              fill={`url(#todayFlap-desk-${idx})`}
                            />
                          </>
                        ) : (
                          <path
                            d="M 0,0 L 46,0 C 54,0 58,15 68,15 L 100,15 L 100,100 L 0,100 Z"
                            fill={cell.isCurrentMonth ? "#FFFFFF" : "#F4EFE6"}
                          />
                        )}
                      </svg>

                      {/* Flap Header: Day number & Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black tracking-tight">
                            {cell.dateNum}
                          </span>
                          <span className={`text-[9.5px] font-extrabold uppercase tracking-wider ${
                            cell.isToday ? "text-black/75" : "text-stone-400"
                          }`}>
                            {cell.dayKey}
                          </span>
                        </div>

                        {cell.isToday ? (
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black text-[#F7D046] shadow-xs shrink-0">
                            Today
                          </span>
                        ) : tasksInCell.length > 0 ? (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        ) : (
                          <span className="opacity-0 group-hover/folder:opacity-100 text-stone-400 hover:text-black transition-opacity">
                            <Plus size={11} />
                          </span>
                        )}
                      </div>

                      {/* Flap Middle: Task Title / Studio Status */}
                      <div className="my-0.5 min-w-0 flex-1 flex flex-col justify-center">
                        {tasksInCell.length > 0 ? (
                          <>
                            <h4 className="text-[11.5px] font-black leading-tight truncate">
                              {tasksInCell[0].taskName}
                              {tasksInCell.length > 1 && (
                                <span className="text-amber-600 font-bold ml-1">+{tasksInCell.length - 1}</span>
                              )}
                            </h4>
                            <p className={`text-[9px] font-semibold truncate mt-0.5 ${
                              cell.isToday ? "text-black/80" : "text-stone-500"
                            }`}>
                              {tasksInCell.length > 1
                                ? `${tasksInCell.length} fiches dans le dossier`
                                : tasksInCell[0].projectName}
                            </p>
                          </>
                        ) : (
                          <div>
                            <h4 className={`text-[10.5px] font-bold leading-tight ${
                              cell.isCurrentMonth ? "text-stone-600" : "text-stone-400"
                            }`}>
                              Studio
                            </h4>
                            <p className="text-[9px] text-stone-400 font-medium">Libre</p>
                          </div>
                        )}
                      </div>

                      {/* Flap Bottom: Time / Session Counter */}
                      {tasksInCell.length > 0 ? (
                        <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[8.5px] font-semibold">
                          <span className={`font-mono ${cell.isToday ? "text-black/90 font-black" : "text-stone-600 font-bold"}`}>
                            {tasksInCell.length > 1
                              ? `${tasksInCell[0].startTime} - ${tasksInCell[tasksInCell.length - 1].endTime || tasksInCell[0].endTime}`
                              : tasksInCell[0].startTime}
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full ${
                            cell.isToday ? "bg-black/15 text-black" : "bg-stone-100 text-stone-700"
                          }`}>
                            {tasksInCell.length} {tasksInCell.length > 1 ? "fiches" : "fiche"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-0.5 text-[8.5px] font-semibold text-stone-400">
                          <span className="opacity-0 group-hover/folder:opacity-100 transition-opacity text-black font-bold flex items-center gap-0.5">
                            <Plus size={9} /> Planifier
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 4. MODAL: ADD / SCHEDULE TASK */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#F7F4EB] border border-[#DDD7C5] rounded-[32px] w-full max-w-lg shadow-2xl p-6 text-[#111111] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#DDD7C5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold">
                  {editingTaskId ? <Edit3 size={18} /> : <Calendar size={18} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#111111]">
                    {editingTaskId ? "Modifier la Tâche de Doublage" : "Planifier une Tâche de Doublage"}
                  </h3>
                  <p className="text-xs text-stone-600">
                    {editingTaskId
                      ? "Modifiez le type de tâche, le projet, les horaires ou les collaborateurs."
                      : "Assignez une tâche, un projet, et les collaborateurs du projet."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-black hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTask} className="space-y-4 pt-4">
              {/* Type de Tâche (CustomSelect Component Style) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Type de Tâche</label>
                <CustomSelect
                  options={TASK_TYPE_OPTIONS}
                  value={newTaskName}
                  onChange={(val) => setNewTaskName(val)}
                  placeholder="Sélectionner le type de tâche"
                />
              </div>

              {/* Projet (Selector from Database) & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Projet (Database)</label>
                  <CustomSelect
                    options={projectSelectOptions}
                    value={selectedProjectId}
                    onChange={handleSelectProject}
                    placeholder="Sélectionner un projet"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Société / Client</label>
                  <input
                    type="text"
                    readOnly
                    value={newCompany || "Client Studio"}
                    className="w-full bg-[#ECE8DD] border border-[#DDD7C5] rounded-full px-4 py-2.5 text-xs font-semibold text-[#111111] focus:outline-none cursor-default shadow-xs"
                    title="Déterminé automatiquement par le projet sélectionné"
                  />
                </div>
              </div>

              {/* Jour (CustomSelect) & Horaires Début - Fin (Unified Input with Clock Icon) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Jour</label>
                  <CustomSelect
                    options={DAY_OPTIONS}
                    value={newDay}
                    onChange={(val) => setNewDay(val as ScheduleTask["day"])}
                    placeholder="Sélectionner un jour"
                  />
                </div>
                <div>
                  <TimeRangePicker
                    startTime={newStartTime}
                    endTime={newEndTime}
                    onChange={(st, et) => {
                      setNewStartTime(st);
                      setNewEndTime(et);
                    }}
                    label="Horaires (Début – Fin)"
                  />
                </div>
              </div>

              {/* Collaborateurs du Projet Assignés */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700">
                    Collaborateurs du Projet Assignés
                  </label>
                  {currentProjectCollabs.length > 0 && (
                    <span className="text-[10px] text-stone-500 font-semibold">
                      {selectedStaffNames.length} sélectionné(s)
                    </span>
                  )}
                </div>

                {currentProjectCollabs.length === 0 ? (
                  <div className="p-3 bg-[#ECE8DD] rounded-2xl border border-[#DDD7C5] text-center text-xs text-stone-500 font-medium">
                    Aucun collaborateur spécifique sur ce projet. L'utilisateur connecté sera assigné.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-[#ECE8DD] rounded-2xl border border-[#DDD7C5]">
                    {currentProjectCollabs.map((st, i) => {
                      const isSelected = selectedStaffNames.includes(st.name);
                      return (
                        <button
                          type="button"
                          key={st.id || `${st.name}-${i}`}
                          onClick={() => {
                            setSelectedStaffNames(prev =>
                              isSelected ? prev.filter(n => n !== st.name) : [...prev, st.name]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#111111] text-white shadow-xs"
                              : "bg-[#F7F4EB] text-stone-700 hover:text-black border border-[#DDD7C5]"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-black text-[9px] font-extrabold flex items-center justify-center shrink-0">
                            {getInitials(st.name)}
                          </span>
                          <span className="truncate max-w-[130px]">{st.name}</span>
                          {st.role && (
                            <span className={`text-[10px] opacity-80 ${isSelected ? "text-amber-300" : "text-stone-500"}`}>
                              ({st.role})
                            </span>
                          )}
                          {isSelected && <Check size={12} className="text-amber-400 shrink-0 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Theme Color Picker */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Couleur du Badge</label>
                <div className="flex items-center gap-3">
                  {[
                    { id: "cream", label: "Beige", bg: "bg-[#ECE8DD] border-[#DDD7C5]" },
                    { id: "yellow", label: "Jaune", bg: "bg-[#F7D046]" },
                    { id: "blue", label: "Bleu", bg: "bg-[#B9D7F9]" },
                    { id: "white", label: "Blanc", bg: "bg-white border-[#DDD7C5]" },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setNewTheme(t.id as ScheduleTask["theme"])}
                      className={`w-7 h-7 rounded-full ${t.bg} border transition-transform cursor-pointer ${
                        newTheme === t.id ? "scale-125 ring-2 ring-[#111111] shadow-xs" : "hover:scale-110"
                      }`}
                      title={t.label}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[#DDD7C5]">
                {editingTaskId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAddModalOpen(false);
                      promptDeleteTask(editingTaskId, newTaskName);
                    }}
                    className="px-4 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    Supprimer
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-5 py-2 text-xs font-bold text-stone-600 hover:text-black rounded-full transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <Loader2 size={13} className="animate-spin" />}
                    {editingTaskId ? "Enregistrer les modifications" : "Ajouter au Planning"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 5. MODAL: DELETE CONFIRMATION */}
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        title="Supprimer la tâche du planning"
        message={`Voulez-vous vraiment supprimer "${deleteModalState.taskTitle}" de votre planning ? Cette action est irréversible.`}
        type="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState({ isOpen: false, taskId: null, taskTitle: "" })}
      />
    </div>
  );
}
