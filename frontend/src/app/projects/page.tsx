"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Briefcase, Search, Plus, FolderOpen, Video, FileText, Calendar, Building, X, 
  Loader2, ChevronRight, Edit2, Trash2, Clock, Download, CheckCircle2, AlertCircle, Eye, ShieldAlert,
  Play, Music
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useSignaling } from "@/context/SignalingContext";
import { apiFetch, getApiUrl } from "@/lib/api";

export interface Project {
  id: number;
  user_id?: number;
  name: string;
  company_name: string;
  folder_path: string;
  target_software: string;
  project_type?: string;
  deadline: string;
  total_time?: number;
  is_owner?: boolean;
  access_level?: "full_access" | "spectator";
  owner_id?: number;
  owner_name?: string;
}

export interface ProjectFile {
  name: string;
  path: string;
  type: 'video' | 'script' | 'audio';
  size: number;
  is_owner?: boolean;
  access_level?: "full_access" | "spectator";
  owner_id?: number;
}

export interface CompanyData {
  id: number;
  name: string;
  target_software: string;
}


const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

export default function ProjectsPage() {
  const { t } = useSettings();
  const { user } = useAuth();
  const { 
    isUserOnline, 
    requestTransfer, 
    fileTransfers, 
    transferBanner, 
    setTransferBanner, 
    registerFileProvider,
    otherDevicesCount
  } = useSignaling();

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSoftware, setFilterSoftware] = useState("All");
  const [filterCompany, setFilterCompany] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [realCompanies, setRealCompanies] = useState<CompanyData[]>([]);
  const [folderPath, setFolderPath] = useState("");
  const [targetSoftware, setTargetSoftware] = useState("ERytmo");
  const [projectType, setProjectType] = useState("Détection");
  const [deadline, setDeadline] = useState("");
  const [totalTime, setTotalTime] = useState("");

  // Project Details State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeFile, setActiveFile] = useState<{
    name: string;
    path: string;
    type: 'video' | 'script' | 'audio';
    size: number;
    url?: string;
    content?: string;
  } | null>(null);

  // Local File Handles State
  const [localFileHandles, setLocalFileHandles] = useState<Map<string, File>>(new Map());
  const [isIndexing, setIsIndexing] = useState(false);

  // Register real P2P File Provider with SignalingContext
  useEffect(() => {
    registerFileProvider(async (fileName: string) => {
      if (localFileHandles.has(fileName)) {
        return localFileHandles.get(fileName)!;
      }
      if (typeof window !== "undefined" && window.location.port === "8000") {
        try {
          const res = await fetch(`http://localhost:8000/api/stream-file?path=${encodeURIComponent(fileName)}`);
          if (res.ok) return await res.blob();
        } catch {}
      }
      return null;
    });
  }, [localFileHandles, registerFileProvider]);

  // Edit / Delete State
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'update' | 'delete';
    project?: Project | null;
    fileToDelete?: ProjectFile | null;
  }>({ isOpen: false, type: 'update', project: null, fileToDelete: null });

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const panelFolderInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFilesForNewProject, setSelectedFilesForNewProject] = useState<File[]>([]);
  const [isDraggingNewProject, setIsDraggingNewProject] = useState(false);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  const openCreateModal = () => {
    setEditingProjectId(null);
    setName("");
    setCompanyName("");
    setIsCustomCompany(false);
    setFolderPath("");
    setSelectedFilesForNewProject([]);
    setTargetSoftware("ERytmo");
    setProjectType("Détection");
    setDeadline("");
    setTotalTime("");
    setShowModal(true);
  };

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setName(project.name);
    setCompanyName(project.company_name || "");
    
    if (project.company_name) {
      setIsCustomCompany(!realCompanies.some(c => c.name === project.company_name));
    } else {
      setIsCustomCompany(false);
    }

    setFolderPath(project.folder_path || "");
    setTargetSoftware(project.target_software || "ERytmo");
    setProjectType(project.project_type || "Détection");
    setDeadline(project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : "");
    setTotalTime(project.total_time?.toString() || "");
    setShowModal(true);
  };

  const handleBrowseFolder = async () => {
    // 1. If running in desktop app (PyWebView on port 8000)
    if (typeof window !== "undefined" && window.location.port === "8000") {
      try {
        const res = await apiFetch("/api/browse-folder");
        if (res.ok) {
          const data = await res.json();
          if (data.path) {
            setFolderPath(data.path);
            if (!name) {
              const parts = data.path.split(/[/\\]/);
              const folderName = parts[parts.length - 1] || data.path;
              setName(folderName);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Desktop browse folder notice:", err);
      }
    }

    // 2. Open folder explorer
    folderInputRef.current?.click();
  };

  useEffect(() => {
    if (user?.id) {
      fetchProjects();
      fetchCompanies();
    } else {
      setProjects([]);
      setRealCompanies([]);
    }
  }, [user?.id]);

  const fetchCompanies = async () => {
    try {
      const res = await apiFetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setRealCompanies(data);
      } else {
        setRealCompanies([]);
      }
    } catch (err) {
      console.error(err);
      setRealCompanies([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await apiFetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error(err);
      setProjects([]);
    }
  };

  const handleSubmitProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    
    if (editingProjectId && (!confirmModal.isOpen || confirmModal.type !== 'update')) {
      setShowModal(false);
      setConfirmModal({
        isOpen: true,
        type: 'update',
        project: projects.find(p => p.id === editingProjectId) || null
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const url = editingProjectId ? `/api/projects/${editingProjectId}` : "/api/projects";
    const method = editingProjectId ? "PUT" : "POST";

    const params = new URLSearchParams();
    params.append("name", name);
    if (companyName) params.append("company_name", companyName);
    if (folderPath) params.append("folder_path", folderPath);
    if (targetSoftware) params.append("target_software", targetSoftware);
    if (projectType) params.append("project_type", projectType);
    if (totalTime) params.append("total_time", totalTime);
    if (deadline) {
      params.append("deadline", `${deadline}T00:00:00Z`);
    }

    try {
      const res = await apiFetch(`${url}?${params.toString()}`, {
        method: method,
      });

      if (res.ok) {
        const resultProject = await res.json();
        const targetId = resultProject?.id || editingProjectId;
        
        if (selectedFilesForNewProject.length > 0 && targetId) {
          indexProjectFiles(targetId, selectedFilesForNewProject, folderPath);
        }

        setShowModal(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchProjects();
        setName("");
        setCompanyName("");
        setFolderPath("");
        setSelectedFilesForNewProject([]);
        setTargetSoftware("ERytmo");
        setProjectType("Détection");
        setDeadline("");
        setTotalTime("");
        setEditingProjectId(null);

        if (resultProject && !editingProjectId) {
          handleProjectClick(resultProject);
        }
      } else {
        const data = await res.json();
        setError(data.detail || `Failed to ${editingProjectId ? 'update' : 'create'} project`);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteProject = async () => {
    if (!confirmModal.project) return;
    
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/projects/${confirmModal.project.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (selectedProject?.id === confirmModal.project.id) {
          setSelectedProject(null);
          setProjectFiles([]);
          setActiveFile(null);
        }
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmModal.fileToDelete) {
      executeDeleteFile(confirmModal.fileToDelete);
    } else if (confirmModal.type === 'delete') {
      executeDeleteProject();
    } else if (confirmModal.type === 'update') {
      handleSubmitProject();
    }
  };

  const extractFilesFromDrop = async (e: React.DragEvent): Promise<{ files: File[]; folderName: string }> => {
    e.preventDefault();
    e.stopPropagation();
    const items = e.dataTransfer.items;
    const files: File[] = [];
    let detectedFolder = "";

    interface WebkitEntry {
      isFile: boolean;
      isDirectory: boolean;
      name: string;
      file: (successCallback: (file: File) => void) => void;
      createReader: () => {
        readEntries: (successCallback: (entries: WebkitEntry[]) => void) => void;
      };
    }

    const traverse = async (entry: WebkitEntry): Promise<void> => {
      if (entry.isFile) {
        const f: File = await new Promise((res) => entry.file(res));
        files.push(f);
      } else if (entry.isDirectory) {
        if (!detectedFolder) detectedFolder = entry.name;
        const reader = entry.createReader();
        const entries: WebkitEntry[] = await new Promise((res) => reader.readEntries(res));
        for (const child of entries) {
          await traverse(child);
        }
      }
    };

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry ? (item.webkitGetAsEntry() as unknown as WebkitEntry) : null;
        if (entry) {
          await traverse(entry);
        } else {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }
    return { files, folderName: detectedFolder };
  };

  const handleDropNewProject = async (e: React.DragEvent) => {
    setIsDraggingNewProject(false);
    const { files, folderName } = await extractFilesFromDrop(e);
    if (files.length > 0) {
      setSelectedFilesForNewProject(files);
      const nameToSet = folderName || (files[0].webkitRelativePath ? files[0].webkitRelativePath.split("/")[0] : files[0].name.split(".")[0]);
      setFolderPath(nameToSet);
      if (!name) setName(nameToSet);
    }
  };

  const handleDropPanel = async (e: React.DragEvent) => {
    setIsDraggingPanel(false);
    if (!selectedProject) return;
    const { files, folderName } = await extractFilesFromDrop(e);
    if (files.length > 0) {
      indexProjectFiles(selectedProject.id, files, folderName || selectedProject.folder_path);
    }
  };

  const fetchProjectFiles = async (projectId: number) => {
    setLoadingFiles(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/files`);
      if (res.ok) {
        const files = await res.json();
        setProjectFiles(files);
      } else {
        setProjectFiles([]);
      }
    } catch (err) {
      console.error(err);
      setProjectFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    setTransferBanner(null);
    await fetchProjectFiles(project.id);
  };

  const indexProjectFiles = async (projectId: number, files: File[], customFolderPath?: string) => {
    if (!files || files.length === 0) return;
    setIsIndexing(true);

    // Save in-memory handles for zero-lag instant local playback
    setLocalFileHandles(prev => {
      const next = new Map(prev);
      files.forEach(f => next.set(f.name, f));
      return next;
    });

    const filesPayload = files.map(f => ({
      name: f.name,
      path: f.webkitRelativePath || f.name,
      size: f.size
    }));

    try {
      const res = await apiFetch(`/api/projects/${projectId}/index`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filesPayload,
          folder_path: customFolderPath || folderPath || undefined
        })
      });

      if (res.ok) {
        setTransferBanner({
          type: "success",
          message: `Indexed ${files.length} file${files.length > 1 ? 's' : ''} locally! Zero-upload storage active.`
        });
        await fetchProjectFiles(projectId);
      } else {
        const data = await res.json();
        setTransferBanner({
          type: "error",
          message: data.detail || "Failed to index files"
        });
      }
    } catch (err) {
      console.error("Indexing error:", err);
      setTransferBanner({
        type: "error",
        message: "Error indexing local project files."
      });
    } finally {
      setIsIndexing(false);
    }
  };

  const handleOpenFile = async (file: ProjectFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const localFile = localFileHandles.get(file.name);

    let mediaUrl = "";
    if (localFile) {
      mediaUrl = URL.createObjectURL(localFile);
    } else {
      mediaUrl = getApiUrl(`/api/stream-file?path=${encodeURIComponent(file.path || file.name)}`);
    }

    let textContent = "";
    if (file.type === 'script') {
      if (localFile) {
        try {
          textContent = await localFile.text();
        } catch {
          textContent = "Binary or document script. Use native reader.";
        }
      }
    }

    setActiveFile({
      name: file.name,
      path: file.path || file.name,
      type: file.type,
      size: file.size,
      url: mediaUrl,
      content: textContent || undefined
    });
  };

  const promptDeleteFile = (file: ProjectFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      project: null,
      fileToDelete: file
    });
  };

  const executeDeleteFile = async (file: ProjectFile) => {
    if (!selectedProject) return;
    try {
      const res = await apiFetch(`/api/projects/${selectedProject.id}/files?filename=${encodeURIComponent(file.name)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (activeFile?.name === file.name) {
          setActiveFile(null);
        }
        await fetchProjectFiles(selectedProject.id);
      }
    } catch (err) {
      console.error("Delete file error:", err);
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false, fileToDelete: null }));
    }
  };

  const handleInitiateDownload = async (file: ProjectFile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProject) return;

    if (selectedProject.access_level === 'spectator') {
      setTransferBanner({
        type: 'error',
        message: "Spectators are not permitted to download project files."
      });
      return;
    }

    const ownerId = selectedProject.owner_id || (selectedProject.is_owner ? user?.id : undefined);
    if (!ownerId) {
      setTransferBanner({
        type: 'error',
        message: "Unable to find project owner."
      });
      return;
    }

    const isSelfSync = Boolean(user?.id && ownerId === user.id);

    if (isSelfSync) {
      if (otherDevicesCount <= 0) {
        setTransferBanner({
          type: 'error',
          message: "Your other PC (PC 1) is offline. Please make sure the app is open on PC 1 to stream and sync files."
        });
        return;
      }
    } else if (!isUserOnline(ownerId)) {
      setTransferBanner({
        type: 'error',
        message: "Owner is offline. Files can only be downloaded when owner is connected."
      });
      return;
    }

    const sizeStr = formatFileSize(file.size);
    setTransferBanner(null);

    try {
      const result = await requestTransfer(ownerId, file.name, sizeStr, file.name, selectedProject.id);

      if (result.status === 'declined') {
        setTransferBanner({
          type: 'declined',
          message: `Download request for "${file.name}" was declined by owner.`
        });
      } else if (result.status === 'error') {
        setTransferBanner({
          type: 'error',
          message: result.detail || "Download request failed."
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Transfer communication error";
      setTransferBanner({
        type: 'error',
        message: errMsg
      });
    }
  };

  const companies = Array.from(new Set(projects.map(p => p.company_name).filter(Boolean)));

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.company_name && p.company_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSoftware = filterSoftware === "All" || p.target_software === filterSoftware;
    const matchesCompany = filterCompany === "All" || p.company_name === filterCompany;
    return matchesSearch && matchesSoftware && matchesCompany;
  }).sort((a, b) => {
    if (sortBy === "Deadline (Closest)") {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === "Deadline (Farthest)") {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
    }
    if (sortBy === "Name (A-Z)") {
      return a.name.localeCompare(b.name);
    }
    return b.id - a.id;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-slate-50 dark:bg-slate-900 relative p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
            <Briefcase className="mr-3 rtl:mr-0 rtl:ml-3 text-teal-600 dark:text-teal-400 shrink-0" size={28} />
            {t("project.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{t("project.subtitle")}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-xs hover:shadow-md flex items-center justify-center text-sm shrink-0 self-start sm:self-auto transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={18} className="mr-2 rtl:mr-0 rtl:ml-2" />
          {t("project.add")}
        </button>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="flex gap-3 sm:gap-4 mb-5 flex-wrap shrink-0">
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-teal-500 dark:group-focus-within:text-teal-400 transition-colors" size={17} />
          <input 
            type="text" 
            placeholder={t("project.search")}
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
              { value: "Deadline (Closest)", label: "Deadline (Closest)" },
              { value: "Deadline (Farthest)", label: "Deadline (Farthest)" },
            ]}
          />
        </div>

        {/* Company Filter */}
        <div className="shrink-0 w-40 sm:w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xs">
          <CustomSelect
            value={filterCompany}
            onChange={(val) => setFilterCompany(val)}
            options={[
              { value: "All", label: "All Companies" },
              ...companies.map(c => ({ value: c, label: c }))
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
      <div className="flex flex-col lg:flex-row flex-1 gap-5 lg:gap-6 min-h-0 overflow-hidden">
        
        {/* Left Side: Project List OR File Viewer */}
        <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-3.5">
          {activeFile ? (
            <div className="flex flex-col h-full animate-in zoom-in-95 duration-300 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center overflow-hidden">
                  <div className={`p-2 rounded-lg mr-3 rtl:mr-0 rtl:ml-3 shrink-0 ${
                    activeFile.type === 'video' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 
                    activeFile.type === 'audio' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500' :
                    'bg-purple-50 dark:bg-purple-900/30 text-purple-500'
                  }`}>
                    {activeFile.type === 'video' ? <Video size={20} /> : activeFile.type === 'audio' ? <Music size={20} /> : <FileText size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{activeFile.name}</h2>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">
                        {formatFileSize(activeFile.size)}
                      </span>
                      <span>• {activeFile.path}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if (activeFile.url && activeFile.url.startsWith("blob:")) {
                      try { URL.revokeObjectURL(activeFile.url); } catch {}
                    }
                    setActiveFile(null);
                  }}
                  className="flex items-center text-sm font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded-lg transition-colors shrink-0 ml-4 rtl:ml-0 rtl:mr-4 cursor-pointer"
                >
                  <X size={16} className="mr-1.5 rtl:mr-0 rtl:ml-1.5" /> Back to Projects
                </button>
              </div>
              
              <div className={`flex-1 relative flex items-center justify-center min-h-0 overflow-auto ${activeFile.type === 'video' ? 'bg-black' : 'bg-slate-100 dark:bg-slate-900'}`}>
                {activeFile.type === 'video' && activeFile.url ? (
                  <video 
                    src={activeFile.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : activeFile.type === 'audio' && activeFile.url ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mb-4 animate-pulse">
                      <Music size={32} />
                    </div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4">{activeFile.name}</p>
                    <audio 
                      src={activeFile.url}
                      controls
                      autoPlay
                      className="w-72"
                    />
                  </div>
                ) : activeFile.content ? (
                  <pre className="w-full h-full p-4 overflow-auto font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 select-text whitespace-pre-wrap">
                    {activeFile.content}
                  </pre>
                ) : activeFile.url ? (
                  <iframe 
                    src={activeFile.url}
                    className="w-full h-full bg-white dark:bg-slate-800"
                    title={activeFile.name}
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <FileText size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Cannot display preview for this file format.</p>
                  </div>
                )}
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center flex flex-col items-center justify-center h-full">
              <div className="bg-teal-50 dark:bg-teal-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="text-teal-600 dark:text-teal-400" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">{t("project.no_found")}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                {t("project.no_found_desc")}
              </p>
            </div>
          ) : (
            filteredProjects.map((p) => {
              const isOwner = p.is_owner !== false;
              const ownerOnline = p.owner_id ? isUserOnline(p.owner_id) : false;

              return (
                <div 
                  key={p.id}
                  onClick={() => handleProjectClick(p)}
                  className={`group bg-white dark:bg-slate-800 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                    selectedProject?.id === p.id 
                      ? "border-teal-500 dark:border-teal-500 ring-1 ring-teal-500 shadow-md" 
                      : "border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 group-hover:bg-transparent">
                    <div className="min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg truncate">{p.name}</h3>
                        {!isOwner && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            p.access_level === 'full_access'
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}>
                            {p.access_level === 'full_access' ? 'Full Access' : 'Spectator'}
                          </span>
                        )}
                      </div>
                      
                      {!isOwner && (
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 shrink-0 ${
                            ownerOnline 
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse' 
                              : 'bg-slate-300 dark:bg-slate-600'
                          }`} />
                          <span className="font-medium">{ownerOnline ? "Owner Online" : "Owner Offline"}</span>
                          <span className="mx-1.5 opacity-50">•</span>
                          <span>Shared by {p.owner_name || 'Owner'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
                      {p.project_type && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                          {p.project_type}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        p.target_software === 'Mosaic' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      }`}>
                        {p.target_software || "Unknown"}
                      </span>
                      
                      {/* Owner-only project controls */}
                      {isOwner && (
                        <div className="flex space-x-1 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => openEditModal(p, e)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded transition-colors"
                            title={t("project.edit")}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({ isOpen: true, type: 'delete', project: p });
                            }}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            title={t("delete")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400 mt-3">
                    <div className="flex items-center">
                      <Building size={14} className="mr-1.5 rtl:mr-0 rtl:ml-1.5 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{p.company_name || "No Company"}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1.5 rtl:mr-0 rtl:ml-1.5 text-slate-400 dark:text-slate-500" />
                      <span>{p.deadline ? new Date(p.deadline).toLocaleDateString() : "No Deadline"}</span>
                    </div>
                    <div className="flex items-center col-span-2 mt-1">
                      <FolderOpen size={14} className="mr-1.5 rtl:mr-0 rtl:ml-1.5 text-slate-400 dark:text-slate-500" />
                      <span className="truncate font-mono text-xs">{p.folder_path || "No folder assigned"}</span>
                    </div>
                    {p.total_time != null && (
                      <div className="flex items-center col-span-2 mt-1 text-teal-600 dark:text-teal-400 font-medium">
                        <Clock size={14} className="mr-1.5 rtl:mr-0 rtl:ml-1.5" />
                        <span>{p.total_time} {t("project.minutes")}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Project Details Panel */}
        {selectedProject && (
          <div className="w-full lg:w-[400px] xl:w-[440px] shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col h-full animate-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
              <div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-xl truncate">{selectedProject.name}</h2>
                </div>
                <div className="flex items-center mt-1 text-xs text-slate-500 dark:text-slate-400 space-x-2 rtl:space-x-reverse">
                  <span className="flex items-center">
                    <FolderOpen size={13} className="mr-1 rtl:mr-0 rtl:ml-1" /> {t("project.local_files")}
                  </span>
                  {selectedProject.is_owner !== false ? (
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] flex items-center gap-1 ${
                      otherDevicesCount > 0 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {otherDevicesCount > 0 ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{otherDevicesCount} Other PC Online (P2P Ready)</span>
                        </>
                      ) : (
                        <span>This Device</span>
                      )}
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                      selectedProject.access_level === 'full_access' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {selectedProject.access_level === 'full_access' ? 'Full Access' : 'Spectator (Read-Only)'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                {selectedProject.is_owner !== false && (
                  <button
                    onClick={() => panelFolderInputRef.current?.click()}
                    disabled={isIndexing}
                    className="p-1.5 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title={t("project.form.browse")}
                  >
                    <FolderOpen size={15} />
                    <span className="hidden sm:inline">Index Folder</span>
                  </button>
                )}
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-400 dark:text-slate-500 transition-colors ml-1 rtl:ml-0 rtl:mr-1"
                  title={t("cancel")}
                >
                  <ChevronRight size={18} className="rtl:rotate-180" />
                </button>
              </div>
            </div>

            {/* Hidden indexing input for this project */}
            <input
              type="file"
              ref={panelFolderInputRef}
              className="hidden"
              // @ts-expect-error webkitdirectory is standard in browsers
              webkitdirectory=""
              directory=""
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0 && selectedProject) {
                  const files = Array.from(e.target.files);
                  const rootFolder = files[0]?.webkitRelativePath?.split("/")[0] || selectedProject.folder_path;
                  indexProjectFiles(selectedProject.id, files, rootFolder);
                  e.target.value = "";
                }
              }}
            />

            {/* Indexing Status Banner */}
            {isIndexing && (
              <div className="p-3 mx-4 mt-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 flex items-center space-x-2 text-xs animate-in fade-in duration-200">
                <Loader2 size={15} className="animate-spin text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="font-medium">Indexing local folder files directly... Zero server disk upload.</span>
              </div>
            )}

            {/* Notification Banner for Transfer Status */}
            {transferBanner && (
              <div className={`p-3 mx-4 mt-3 rounded-xl border flex items-start justify-between text-xs animate-in fade-in duration-200 ${
                transferBanner.type === 'declined'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
                  : transferBanner.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-300'
              }`}>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {transferBanner.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0" />
                  )}
                  <span className="font-medium">{transferBanner.message}</span>
                </div>
                <button 
                  onClick={() => setTransferBanner(null)} 
                  className="opacity-60 hover:opacity-100 p-0.5 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingPanel(true); }}
              onDragLeave={() => setIsDraggingPanel(false)}
              onDrop={handleDropPanel}
              className={`flex-1 overflow-y-auto p-4 transition-colors ${
                isDraggingPanel 
                  ? 'bg-teal-50/50 dark:bg-teal-950/30 border-2 border-dashed border-teal-500' 
                  : 'bg-slate-50/30 dark:bg-slate-900/30'
              }`}
            >
              {loadingFiles ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <span className="text-sm">{t("project.scanning")}</span>
                </div>
              ) : projectFiles.length === 0 ? (
                selectedProject.is_owner !== false ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white/40 dark:bg-slate-800/40">
                    <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3">
                      <FolderOpen size={22} />
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 font-bold text-sm">No files indexed yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mb-4">
                      Select your project folder or local files to index them and enjoy instant zero-lag playback without cloud uploads.
                    </p>
                    <div className="flex justify-center">
                      <button
                        onClick={() => panelFolderInputRef.current?.click()}
                        disabled={isIndexing}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <FolderOpen size={15} /> Select Folder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <FolderOpen size={48} className="text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{t("project.no_files")}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                      {t("project.no_files_desc")}
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {projectFiles.map((file, idx) => {
                    const isOwner = selectedProject.is_owner !== false;
                    const hasLocal = localFileHandles.has(file.name);
                    const isSpectator = selectedProject.access_level === 'spectator';
                    const isFullAccess = selectedProject.access_level === 'full_access';
                    const ownerOnline = selectedProject.owner_id ? isUserOnline(selectedProject.owner_id) : false;
                    const transfer = fileTransfers[file.name];

                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          if (isOwner) {
                            if (hasLocal) {
                              handleOpenFile(file);
                            } else if (otherDevicesCount > 0) {
                              handleInitiateDownload(file, { stopPropagation: () => {} } as React.MouseEvent);
                            } else {
                              setTransferBanner({
                                type: 'error',
                                message: "This file is on your PC 1. Keep PC 1 open to sync or stream it."
                              });
                            }
                          }
                        }}
                        className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex flex-col shadow-xs hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all ${
                          isOwner ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center min-w-0 flex-1 mr-2 rtl:mr-0 rtl:ml-2">
                            <div className={`p-2 rounded-lg mr-3 rtl:mr-0 rtl:ml-3 shrink-0 ${
                              file.type === 'video' 
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' 
                                : file.type === 'audio'
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500'
                                : 'bg-purple-50 dark:bg-purple-900/30 text-purple-500'
                            }`}>
                              {file.type === 'video' ? <Video size={18} /> : file.type === 'audio' ? <Music size={18} /> : <FileText size={18} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                                {file.name}
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                <span className="font-medium text-slate-600 dark:text-slate-300 font-mono">
                                  {formatFileSize(file.size)}
                                </span>
                                {hasLocal ? (
                                  <span className="inline-flex items-center text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                                    • Local
                                  </span>
                                ) : isOwner ? (
                                  <span className="inline-flex items-center text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                    • On Other PC
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Action Controls */}
                          <div className="shrink-0 flex items-center space-x-1 rtl:space-x-reverse">
                            {isOwner ? (
                              hasLocal ? (
                                <>
                                  <button 
                                    onClick={(e) => handleOpenFile(file, e)}
                                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 hover:bg-teal-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                                    title={file.type === 'video' || file.type === 'audio' ? "Instant Playback" : "View"}
                                  >
                                    {file.type === 'video' || file.type === 'audio' ? (
                                      <>
                                        <Play size={12} className="fill-current" />
                                        <span>Play</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye size={12} />
                                        <span>View</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const local = localFileHandles.get(file.name);
                                      if (local) {
                                        const url = URL.createObjectURL(local);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = file.name;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        setTimeout(() => URL.revokeObjectURL(url), 10000);
                                      } else {
                                        handleOpenFile(file, e);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                                    title="Download Local"
                                  >
                                    <Download size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => promptDeleteFile(file, e)}
                                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete file"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                // Cross-device same-account: PC 2 requesting file from PC 1
                                <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                  {transfer?.status === 'pending' ? (
                                    <div className="flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg">
                                      <Loader2 size={12} className="animate-spin mr-1.5" />
                                      <span>Requesting PC 1...</span>
                                    </div>
                                  ) : transfer?.status === 'transferring' ? (
                                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                                      {transfer.progress}%
                                    </span>
                                  ) : transfer?.status === 'completed' ? (
                                    <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">
                                      <CheckCircle2 size={12} className="mr-1" />
                                      Downloaded
                                    </span>
                                  ) : otherDevicesCount <= 0 ? (
                                    <button
                                      disabled
                                      title="Your other PC (PC 1) is offline. Keep PC 1 online to sync files directly."
                                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed flex items-center space-x-1"
                                    >
                                      <Download size={12} className="mr-1 opacity-50" />
                                      <span>PC 1 Offline</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => handleInitiateDownload(file, e)}
                                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
                                      title="Download directly from PC 1 via P2P"
                                    >
                                      <Download size={12} className="mr-1" />
                                      <span>Sync from PC 1</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => promptDeleteFile(file, e)}
                                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Delete file"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )
                            ) : isSpectator ? (
                              <button
                                disabled
                                title="Spectator Mode — Downloads Disabled"
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500 cursor-not-allowed flex items-center space-x-1"
                              >
                                <Eye size={12} className="mr-1" />
                                <span>Spectator</span>
                              </button>
                            ) : isFullAccess ? (
                              transfer?.status === 'pending' ? (
                                <div className="flex items-center text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg">
                                  <Loader2 size={12} className="animate-spin mr-1.5" />
                                  <span>Waiting approval...</span>
                                </div>
                              ) : transfer?.status === 'transferring' ? (
                                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                                  {transfer.progress}%
                                </span>
                              ) : transfer?.status === 'completed' ? (
                                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg">
                                  <CheckCircle2 size={12} className="mr-1" />
                                  Downloaded
                                </span>
                              ) : !ownerOnline ? (
                                <button
                                  disabled
                                  title="Owner is offline. Files can only be downloaded when owner is connected."
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 cursor-not-allowed flex items-center space-x-1"
                                >
                                  <Download size={12} className="mr-1 opacity-50" />
                                  <span>Owner Offline</span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => handleInitiateDownload(file, e)}
                                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors flex items-center space-x-1"
                                >
                                  <Download size={12} className="mr-1" />
                                  <span>Download</span>
                                </button>
                              )
                            ) : null}
                          </div>
                        </div>

                        {/* Progress Bar when transfer is active */}
                        {transfer?.status === 'transferring' && (
                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between text-[11px] text-teal-600 dark:text-teal-400 font-semibold mb-1">
                              <span>{isOwner && !hasLocal ? "Syncing from PC 1" : "Transferring"}: {transfer.progress}%</span>
                              <span>P2P Data Stream</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${transfer.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {transfer?.status === 'declined' && (
                          <div className="mt-2 text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center">
                            <ShieldAlert size={12} className="mr-1 shrink-0" />
                            <span>Download request declined by owner</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 text-center bg-white dark:bg-slate-800 rounded-b-xl">
              {selectedProject.is_owner !== false ? (
                <>
                  {t("project.files_not_copied")}<br/>
                  <span className="font-mono">{selectedProject.folder_path}</span>
                </>
              ) : (
                <span>
                  Collaborator Project • Managed by {selectedProject.owner_name || "Owner"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200 relative z-10 border border-transparent dark:border-slate-700">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingProjectId ? t("project.edit") : t("project.add_new")}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitProject} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800/50">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("project.form.name")} *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Episode 10 Translation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("project.form.folder")} *
                </label>
                
                <input
                  type="file"
                  ref={folderInputRef}
                  className="hidden"
                  // @ts-expect-error webkitdirectory is standard in browsers
                  webkitdirectory=""
                  directory=""
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const fileArray = Array.from(files);
                      setSelectedFilesForNewProject(fileArray);
                      const firstFile = files[0];
                      const rel = firstFile.webkitRelativePath || "";
                      const rootName = rel.split("/")[0] || firstFile.name;
                      setFolderPath(rootName);
                      if (!name) setName(rootName);
                    }
                  }}
                />

                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingNewProject(true); }}
                  onDragLeave={() => setIsDraggingNewProject(false)}
                  onDrop={handleDropNewProject}
                  className={`flex items-center rounded-xl border transition-all overflow-hidden ${
                    isDraggingNewProject 
                      ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/50 ring-2 ring-teal-500/20' 
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500'
                  }`}
                >
                  <div className="pl-3 pr-2 text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0">
                    <FolderOpen size={18} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. C:/Projects/Episode1 or browse folder..."
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    className="flex-1 bg-transparent py-2 px-1 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                  />
                  <div className="p-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleBrowseFolder}
                      className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen size={14} />
                      <span>{t("project.form.browse")}</span>
                    </button>
                  </div>
                </div>

                {selectedFilesForNewProject.length > 0 && (
                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse mt-2 text-xs text-teal-600 dark:text-teal-400 font-medium animate-in fade-in duration-150">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{selectedFilesForNewProject.length} files detected in folder</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{t("project.form.folder_desc")}</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("project.form.company")}</label>
                  {!isCustomCompany ? (
                    <CustomSelect
                      value={companyName}
                      onChange={(val) => {
                        if (val === "OTHER_CUSTOM_COMPANY") {
                          setIsCustomCompany(true);
                          setCompanyName("");
                        } else {
                          setCompanyName(val);
                          const comp = realCompanies.find(c => c.name === val);
                          if (comp) setTargetSoftware(comp.target_software);
                        }
                      }}
                      options={[
                        ...realCompanies.map(c => ({ value: c.name, label: c.name })),
                        { value: "OTHER_CUSTOM_COMPANY", label: "Other..." }
                      ]}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="e.g. Netflix"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                      />
                      <button 
                        type="button" 
                        onClick={() => { setIsCustomCompany(false); setCompanyName(""); }}
                        className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg px-2 flex items-center justify-center transition-colors"
                        title={t("cancel")}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("project.form.type")}</label>
                  <CustomSelect
                    value={projectType}
                    onChange={(val) => setProjectType(val)}
                    options={[
                      { value: "Détection", label: t("project.type.detection") },
                      { value: "Conformation", label: t("project.type.conformation") },
                      { value: "Pose de texte", label: t("project.type.pose_texte") },
                      { value: "Chantant", label: t("project.type.chantant") }
                    ]}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("project.form.software")}</label>
                  <CustomSelect
                    value={targetSoftware}
                    onChange={(val) => setTargetSoftware(val)}
                    options={[
                      { value: "ERytmo", label: "ERytmo Factory" },
                      { value: "Mosaic", label: "Mosaic Formate" }
                    ]}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("project.form.deadline")}</label>
                  <input 
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("project.form.time")}</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="e.g. 120"
                    value={totalTime}
                    onChange={(e) => setTotalTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-6 border-t border-slate-100 dark:border-slate-700 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors disabled:opacity-50">
                  {t("cancel")}
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center shadow-sm disabled:opacity-50">
                  {isSubmitting && <Loader2 size={16} className="animate-spin mr-2 rtl:mr-0 rtl:ml-2" />}
                  {editingProjectId ? t("update") : t("create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.fileToDelete 
            ? "Remove File" 
            : confirmModal.type === 'delete' 
            ? t("delete") 
            : t("update")
        }
        message={
          confirmModal.fileToDelete
            ? `Are you sure you want to remove "${confirmModal.fileToDelete.name}" from this project?`
            : confirmModal.type === 'delete' 
            ? t("project.delete.confirm")
            : `Are you sure you want to update the project "${confirmModal.project?.name}" with these changes?`
        }
        type={confirmModal.type === 'delete' ? 'danger' : 'info'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setConfirmModal(prev => ({ ...prev, isOpen: false, fileToDelete: null }));
          if (confirmModal.type === 'update') {
            setShowModal(true);
          }
        }}
      />
    </div>
  );
}
