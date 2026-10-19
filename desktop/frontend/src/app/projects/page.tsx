"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Briefcase, Search, Plus, FolderOpen, Video, FileText, Calendar, Building, X, 
  Loader2, ChevronRight, Edit2, Trash2, Clock, Download, CheckCircle2, AlertCircle, Eye, ShieldAlert,
  Play, Music, Users, Lock, Unlock, UploadCloud, ShieldCheck, Star, FileCode, Film, Headphones, Image as ImageIcon
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import DateSelect from "@/components/DateSelect";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useSignaling } from "@/context/SignalingContext";
import { apiFetch, getApiUrl } from "@/lib/api";

export interface ProjectCollaborator {
  staff_id?: number;
  staff_name: string;
  staff_email?: string | null;
  staff_user_id?: number | null;
  task?: string;
  start_date?: string | null;
  end_date?: string | null;
  can_update_project_file?: boolean;
  comment?: string;
}

export interface ProjectMasterFile {
  name: string;
  path?: string;
  size?: number;
  type?: string;
  updated_at?: string;
  updated_by_id?: number;
  updated_by_name?: string;
}

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
  description?: string;
  collaborators?: ProjectCollaborator[];
  project_file?: ProjectMasterFile | null;
  can_update_project_file?: boolean;
  my_collaboration?: ProjectCollaborator | null;
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

function detectFileCategory(fileName: string, serverType?: string): 'image' | 'video' | 'audio' | 'pdf' | 'docx' | 'script' | 'other' {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif', 'ico'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'aiff', 'alac'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['docx', 'doc', 'odt', 'rtf'].includes(ext)) return 'docx';
  if (['txt', 'srt', 'vtt', 'sub', 'ass', 'ssa', 'json', 'csv', 'xml', 'mos', 'awf', 'md', 'js', 'ts', 'py'].includes(ext)) return 'script';
  if (serverType === 'video') return 'video';
  if (serverType === 'audio') return 'audio';
  return 'other';
}

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
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [realCompanies, setRealCompanies] = useState<CompanyData[]>([]);
  const [folderPath, setFolderPath] = useState("");
  const [targetSoftware, setTargetSoftware] = useState("ERytmo");
  const [projectType, setProjectType] = useState("Détection");
  const [deadline, setDeadline] = useState("");
  const [totalTime, setTotalTime] = useState("");

  // Collaboration & Team Assignment State
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [projectCollaborators, setProjectCollaborators] = useState<ProjectCollaborator[]>([]);
  const [showMasterFileModal, setShowMasterFileModal] = useState(false);
  const [isUpdatingMasterFile, setIsUpdatingMasterFile] = useState(false);
  const masterFileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [fileCategoryFilter, setFileCategoryFilter] = useState("all");

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
  const panelFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFilesForNewProject, setSelectedFilesForNewProject] = useState<File[]>([]);
  const [isDraggingNewProject, setIsDraggingNewProject] = useState(false);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await apiFetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
        return data;
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
    return [];
  };

  const handleAddCollaborator = (currentStaffList: Staff[] = staffList) => {
    const list = currentStaffList.length > 0 ? currentStaffList : staffList;
    if (list.length === 0) {
      setProjectCollaborators(prev => [
        ...prev,
        {
          staff_name: "",
          task: "pose le text",
          start_date: "",
          end_date: "",
          can_update_project_file: false,
          comment: ""
        }
      ]);
      return;
    }

    const existingStaffIds = new Set(projectCollaborators.map(c => c.staff_id).filter(Boolean));
    const availableStaff = list.find(s => !existingStaffIds.has(s.id)) || list[0];

    setProjectCollaborators(prev => [
      ...prev,
      {
        staff_id: availableStaff.id,
        staff_name: availableStaff.name,
        staff_email: availableStaff.email,
        staff_user_id: availableStaff.staff_user_id,
        // Default to staff's already assigned task
        task: availableStaff.task || "pose le text",
        start_date: "",
        end_date: "",
        can_update_project_file: false,
        comment: ""
      }
    ]);
  };

  const handleSelectStaffForCollab = (index: number, staffId: number) => {
    const selectedStaff = staffList.find(s => s.id === staffId);
    if (!selectedStaff) return;
    setProjectCollaborators(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        staff_id: selectedStaff.id,
        staff_name: selectedStaff.name,
        staff_email: selectedStaff.email,
        staff_user_id: selectedStaff.staff_user_id,
        task: selectedStaff.task || "pose le text"
      };
      return next;
    });
  };

  const handleUpdateCollabField = <K extends keyof ProjectCollaborator>(
    index: number,
    field: K,
    val: ProjectCollaborator[K]
  ) => {
    setProjectCollaborators(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveCollab = (index: number) => {
    setProjectCollaborators(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetMasterFile = async (fileObj: { name: string; path?: string; size?: number; type?: string }) => {
    if (!selectedProject) return;
    setIsUpdatingMasterFile(true);
    try {
      const res = await apiFetch(`/api/projects/${selectedProject.id}/project-file`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileObj)
      });
      if (res.ok) {
        const saved = await res.json();
        setSelectedProject(prev => prev ? { ...prev, project_file: saved } : null);
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, project_file: saved } : p));
        setShowMasterFileModal(false);
        setTransferBanner({
          type: "success",
          message: `Fichier du film défini avec succès : "${saved.name}"`
        });
      } else {
        const data = await res.json();
        setTransferBanner({
          type: "declined",
          message: data.detail || "Échec de la sélection du fichier du film"
        });
      }
    } catch (err) {
      console.error(err);
      setTransferBanner({
        type: "declined",
        message: "Erreur lors de la sélection du fichier du film"
      });
    } finally {
      setIsUpdatingMasterFile(false);
    }
  };

  const handleRemoveMasterFile = async () => {
    if (!selectedProject) return;
    setIsUpdatingMasterFile(true);
    try {
      const res = await apiFetch(`/api/projects/${selectedProject.id}/project-file`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSelectedProject(prev => prev ? { ...prev, project_file: null } : null);
        setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, project_file: null } : p));
        setTransferBanner({
          type: "success",
          message: "Fichier du film retiré."
        });
      } else {
        const data = await res.json();
        setTransferBanner({
          type: "declined",
          message: data.detail || "Échec du retrait du fichier du film"
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingMasterFile(false);
    }
  };

  const handleMasterFileSelectFromDisk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    setLocalFileHandles(prev => {
      const next = new Map(prev);
      next.set(file.name, file);
      return next;
    });
    await handleSetMasterFile({
      name: file.name,
      path: file.name,
      size: file.size,
      type: file.type || undefined
    });
    e.target.value = "";
  };

  const openCreateModal = () => {
    setEditingProjectId(null);
    setName("");
    setDescription("");
    setCompanyName("");
    setIsCustomCompany(false);
    setFolderPath("");
    setSelectedFilesForNewProject([]);
    setTargetSoftware("ERytmo");
    setProjectType("Détection");
    setDeadline("");
    setTotalTime("");
    setProjectCollaborators([]);
    fetchStaff();
    setShowModal(true);
  };

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setName(project.name);
    setDescription(project.description || "");
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

    let collabs: ProjectCollaborator[] = [];
    if (Array.isArray(project.collaborators)) {
      collabs = project.collaborators;
    } else if (typeof project.collaborators === "string") {
      try { collabs = JSON.parse(project.collaborators); } catch {}
    }
    setProjectCollaborators(collabs);
    fetchStaff();
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
      fetchStaff();
    } else {
      setProjects([]);
      setRealCompanies([]);
      setStaffList([]);
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
        setSelectedProject(prev => {
          if (!prev) return null;
          const fresh = data.find((p: Project) => p.id === prev.id);
          return fresh ? { ...prev, ...fresh } : prev;
        });
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
    if (description) params.append("description", description);
    if (companyName) params.append("company_name", companyName);
    if (folderPath) params.append("folder_path", folderPath);
    if (targetSoftware) params.append("target_software", targetSoftware);
    if (projectType) params.append("project_type", projectType);
    if (totalTime) params.append("total_time", totalTime);
    if (deadline) {
      params.append("deadline", `${deadline}T00:00:00Z`);
    }
    if (projectCollaborators.length > 0) {
      params.append("collaborators", JSON.stringify(projectCollaborators));
    } else {
      params.append("collaborators", "[]");
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
        setDescription("");
        setCompanyName("");
        setFolderPath("");
        setSelectedFilesForNewProject([]);
        setTargetSoftware("ERytmo");
        setProjectType("Détection");
        setDeadline("");
        setTotalTime("");
        setProjectCollaborators([]);
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
    <div className="flex flex-col h-full animate-in fade-in duration-300 bg-[#f8fafc] dark:bg-[#09090b] text-slate-800 dark:text-[#f4efe6] relative p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#f4efe6] flex items-center tracking-tight">
            <Briefcase className="mr-3 rtl:mr-0 rtl:ml-3 text-amber-500 dark:text-amber-400 shrink-0" size={28} />
            {t("project.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9f988b] mt-1">{t("project.subtitle")}</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold py-2.5 px-5 rounded-xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.4)] flex items-center justify-center text-sm shrink-0 self-start sm:self-auto transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <Plus size={18} className="mr-2 rtl:mr-0 rtl:ml-2" />
          {t("project.add")}
        </button>
      </div>

      {/* Toolbar: Search and Filter */}
      <div className="flex gap-3 sm:gap-4 mb-5 flex-wrap shrink-0">
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-[#71717a] group-focus-within:text-amber-500 dark:group-focus-within:text-amber-400 transition-colors" size={17} />
          <input 
            type="text" 
            placeholder={t("project.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2.5 bg-white dark:bg-[#131316] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-xl shadow-xs dark:shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)] focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all text-sm font-medium text-slate-900 dark:text-[#f4efe6] placeholder-slate-400 dark:placeholder-[#71717a]"
          />
        </div>
        
        {/* Sort Filter */}
        <div className="shrink-0 w-40 sm:w-48">
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
        <div className="shrink-0 w-40 sm:w-48">
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
        <div className="shrink-0 w-36 sm:w-40">
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
            <div className="bg-white dark:bg-[#121215] rounded-2xl shadow-xs dark:shadow-[0_10px_30px_rgba(0,0,0,0.6)] border border-slate-200/80 dark:border-white/[0.08] p-8 text-center flex flex-col items-center justify-center h-full">
              <div className="bg-amber-400/10 border border-amber-400/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                <Briefcase className="text-amber-500 dark:text-amber-400" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#f4efe6] mb-2">{t("project.no_found")}</h3>
              <p className="text-slate-500 dark:text-[#9f988b] text-sm max-w-sm">
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
                  className={`group bg-white dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-[#16161a] rounded-2xl border p-4 sm:p-5 cursor-pointer transition-all duration-200 ${
                    selectedProject?.id === p.id 
                      ? "border-amber-500/80 dark:border-amber-400/80 ring-1 ring-amber-500/50 dark:ring-amber-400/50 shadow-md dark:shadow-[0_0_25px_rgba(245,158,11,0.15)]" 
                      : "border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/40 shadow-xs dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 group-hover:bg-transparent">
                    <div className="min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-[#f4efe6] text-lg truncate">{p.name}</h3>
                        {!isOwner && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            p.access_level === 'full_access'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : 'bg-amber-400/10 text-amber-600 dark:text-amber-300 border-amber-400/20'
                          }`}>
                            {p.access_level === 'full_access' ? 'Full Access' : 'Spectator'}
                          </span>
                        )}
                      </div>
                      
                      {!isOwner && (
                        <div className="flex items-center text-xs text-slate-500 dark:text-[#9f988b] mb-1">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 shrink-0 ${
                            ownerOnline 
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse' 
                              : 'bg-slate-400 dark:bg-zinc-600'
                          }`} />
                          <span className="font-medium">{ownerOnline ? "Owner Online" : "Owner Offline"}</span>
                          <span className="mx-1.5 opacity-50">•</span>
                          <span>Shared by {p.owner_name || 'Owner'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
                      {p.project_type && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-[#c2bcaf] border border-slate-200 dark:border-white/10">
                          {p.project_type}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                        p.target_software === 'Mosaic' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40' : 'bg-amber-400/10 text-amber-700 dark:text-amber-300 border-amber-400/20'
                      }`}>
                        {p.target_software || "Unknown"}
                      </span>
                      
                      {/* Owner-only project controls */}
                      {isOwner && (
                        <div className="flex space-x-1 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => openEditModal(p, e)}
                            className="p-1 text-slate-400 dark:text-[#71717a] hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
                            title={t("project.edit")}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModal({ isOpen: true, type: 'delete', project: p });
                            }}
                            className="p-1 text-slate-400 dark:text-[#71717a] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            title={t("delete")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-[#9f988b] mt-3">
                    <div className="flex items-center">
                      <Building size={14} className="mr-1.5 rtl:mr-0 rtl:ml-1.5 text-slate-400 dark:text-[#71717a]" />
                      <span className="truncate">{p.company_name || "No Company"}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-1.5 rtl:mr-0 rtl:ml-1.5 text-slate-400 dark:text-[#71717a]" />
                      <span>{p.deadline ? new Date(p.deadline).toLocaleDateString() : "No Deadline"}</span>
                    </div>
                    <div className="flex items-center col-span-2 mt-1">
                      <FolderOpen size={14} className="mr-1.5 rtl:mr-0 rtl:ml-1.5 text-slate-400 dark:text-[#71717a]" />
                      <span className="truncate font-mono text-xs">{p.folder_path || "No folder assigned"}</span>
                    </div>
                    {p.total_time != null && (
                      <div className="flex items-center col-span-2 mt-1 text-amber-600 dark:text-amber-400 font-semibold">
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
          <div className="w-full lg:w-[400px] xl:w-[440px] shrink-0 bg-white dark:bg-[#121215] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xl dark:shadow-[0_15px_40px_rgba(0,0,0,0.7)] flex flex-col h-full animate-in slide-in-from-right-4 duration-300 overflow-hidden text-slate-800 dark:text-[#f4efe6]">
            <div className="p-4 border-b border-slate-200/80 dark:border-white/[0.08] flex justify-between items-start bg-slate-50/70 dark:bg-white/[0.02] rounded-t-2xl">
              <div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <h2 className="font-bold text-slate-900 dark:text-[#f4efe6] text-xl truncate">{selectedProject.name}</h2>
                </div>
                <div className="flex items-center mt-1 text-xs text-slate-500 dark:text-[#9f988b] space-x-2 rtl:space-x-reverse">
                  <span className="flex items-center">
                    <FolderOpen size={13} className="mr-1 rtl:mr-0 rtl:ml-1" /> {t("project.local_files")}
                  </span>
                  {selectedProject.is_owner !== false ? (
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] flex items-center gap-1 ${
                      otherDevicesCount > 0 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
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
                    className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    title={t("project.form.browse")}
                  >
                    <FolderOpen size={15} />
                    <span className="hidden sm:inline">Index Folder</span>
                  </button>
                )}
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 dark:text-slate-500 transition-colors ml-1 rtl:ml-0 rtl:mr-1 cursor-pointer"
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
                  ? 'bg-amber-500/10 border-2 border-dashed border-amber-500' 
                  : 'bg-slate-50/50 dark:bg-black/20'
              }`}
            >
              {/* Active Collaborator Role Banner */}
              {selectedProject.my_collaboration && (
                <div className="mb-4 rounded-xl border border-blue-500/25 bg-blue-500/10 dark:bg-blue-500/[0.08] p-3 text-xs shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between font-bold text-blue-800 dark:text-blue-300">
                    <div className="flex items-center gap-1.5">
                      <Users size={15} />
                      <span>Your Role: {selectedProject.my_collaboration.task || "Collaborator"}</span>
                    </div>
                    {selectedProject.my_collaboration.can_update_project_file ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Unlock size={10} /> File Update Authorized
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Lock size={10} /> View-Only Master File
                      </span>
                    )}
                  </div>
                  {(selectedProject.my_collaboration.start_date || selectedProject.my_collaboration.end_date) && (
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-600 dark:text-[#c2bcaf] font-mono">
                      <Calendar size={12} className="text-blue-500 shrink-0" />
                      <span>
                        {selectedProject.my_collaboration.start_date || "Start"} → {selectedProject.my_collaboration.end_date || "Deadline"}
                      </span>
                    </div>
                  )}
                  {selectedProject.my_collaboration.comment && (
                    <p className="mt-1.5 text-[11px] text-slate-600 dark:text-[#9f988b] italic border-t border-blue-500/15 pt-1.5">
                      &quot;{selectedProject.my_collaboration.comment}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Clean Controllers Toolbar: Add File (+) & Delete (Trash) */}
              <div className="mb-3 p-2 px-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-[#f4efe6]">
                    Fichiers ({projectFiles.length})
                  </span>
                  {selectedProject.project_file && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate hidden sm:inline" title={selectedProject.project_file.name}>
                      • Film : {selectedProject.project_file.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedProject.is_owner !== false && (
                    <>
                      <input
                        type="file"
                        ref={panelFileInputRef}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0 && selectedProject) {
                            const files = Array.from(e.target.files);
                            indexProjectFiles(selectedProject.id, files);
                            e.target.value = "";
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => panelFileInputRef.current?.click()}
                        disabled={isIndexing}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Ajouter des fichiers au projet"
                      >
                        <Plus size={13} />
                        <span>Ajouter</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => panelFolderInputRef.current?.click()}
                        disabled={isIndexing}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Indexer un dossier complet"
                      >
                        <FolderOpen size={14} />
                      </button>
                    </>
                  )}

                  {selectedProject.is_owner !== false && activeFile && (
                    <button
                      type="button"
                      onClick={(e) => {
                        const match = projectFiles.find(f => f.name === activeFile.name);
                        if (match) promptDeleteFile(match, e);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                      title={`Supprimer "${activeFile.name}"`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Category Filter Pills */}
              {projectFiles.length > 0 && (() => {
                const videoCount = projectFiles.filter(f => detectFileCategory(f.name, f.type) === 'video').length;
                const audioCount = projectFiles.filter(f => detectFileCategory(f.name, f.type) === 'audio').length;
                const scriptCount = projectFiles.filter(f => detectFileCategory(f.name, f.type) === 'script').length;
                const docCount = projectFiles.filter(f => {
                  const cat = detectFileCategory(f.name, f.type);
                  return cat === 'pdf' || cat === 'docx' || cat === 'image' || cat === 'other';
                }).length;

                return (
                  <div className="mb-3 space-y-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Rechercher parmi les fichiers..."
                        value={fileSearchQuery}
                        onChange={(e) => setFileSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#161619] text-xs text-slate-900 dark:text-[#f4efe6] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                      />
                      {fileSearchQuery && (
                        <button
                          onClick={() => setFileSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setFileCategoryFilter("all")}
                        className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                          fileCategoryFilter === "all"
                            ? "bg-amber-400 text-black font-bold shadow-2xs"
                            : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#9f988b] hover:bg-slate-200 dark:hover:bg-white/10"
                        }`}
                      >
                        Tous ({projectFiles.length})
                      </button>

                      {videoCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFileCategoryFilter("video")}
                          className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                            fileCategoryFilter === "video"
                              ? "bg-amber-400 text-black font-bold shadow-2xs"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#9f988b] hover:bg-slate-200 dark:hover:bg-white/10"
                          }`}
                        >
                          <Video size={11} />
                          <span>Vidéos ({videoCount})</span>
                        </button>
                      )}

                      {audioCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFileCategoryFilter("audio")}
                          className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                            fileCategoryFilter === "audio"
                              ? "bg-amber-400 text-black font-bold shadow-2xs"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#9f988b] hover:bg-slate-200 dark:hover:bg-white/10"
                          }`}
                        >
                          <Headphones size={11} />
                          <span>Audio ({audioCount})</span>
                        </button>
                      )}

                      {scriptCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFileCategoryFilter("script")}
                          className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                            fileCategoryFilter === "script"
                              ? "bg-amber-400 text-black font-bold shadow-2xs"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#9f988b] hover:bg-slate-200 dark:hover:bg-white/10"
                          }`}
                        >
                          <FileCode size={11} />
                          <span>Scripts ({scriptCount})</span>
                        </button>
                      )}

                      {docCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFileCategoryFilter("doc")}
                          className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                            fileCategoryFilter === "doc"
                              ? "bg-amber-400 text-black font-bold shadow-2xs"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#9f988b] hover:bg-slate-200 dark:hover:bg-white/10"
                          }`}
                        >
                          <FileText size={11} />
                          <span>Docs ({docCount})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {loadingFiles ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-12">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <span className="text-sm">{t("project.scanning")}</span>
                </div>
              ) : projectFiles.length === 0 ? (
                selectedProject.is_owner !== false ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-white/[0.02]">
                    <div className="w-12 h-12 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-3">
                      <FolderOpen size={22} />
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 font-bold text-sm">No files indexed yet</p>
                    <p className="text-xs text-slate-500 dark:text-[#9f988b] mt-1 max-w-xs mb-4">
                      Select your project folder or local files to index them and enjoy instant zero-lag playback without cloud uploads.
                    </p>
                    <div className="flex justify-center">
                      <button
                        onClick={() => panelFolderInputRef.current?.click()}
                        disabled={isIndexing}
                        className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <FolderOpen size={15} /> Select Folder
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <FolderOpen size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400 font-medium">{t("project.no_files")}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                      {t("project.no_files_desc")}
                    </p>
                  </div>
                )
              ) : (() => {
                const filteredFiles = projectFiles.filter((file) => {
                  if (fileSearchQuery.trim()) {
                    const q = fileSearchQuery.toLowerCase();
                    if (!file.name.toLowerCase().includes(q)) return false;
                  }
                  if (fileCategoryFilter !== "all") {
                    const cat = detectFileCategory(file.name, file.type);
                    if (fileCategoryFilter === "video") return cat === "video";
                    if (fileCategoryFilter === "audio") return cat === "audio";
                    if (fileCategoryFilter === "script") return cat === "script";
                    if (fileCategoryFilter === "doc") return cat === "pdf" || cat === "docx" || cat === "image" || cat === "other";
                  }
                  return true;
                });

                if (filteredFiles.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Aucun fichier trouvé pour cette recherche.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {filteredFiles.map((file, idx) => {
                      const isOwner = selectedProject.is_owner !== false;
                      const hasLocal = localFileHandles.has(file.name);
                      const isSpectator = selectedProject.access_level === 'spectator';
                      const isFullAccess = selectedProject.access_level === 'full_access';
                      const ownerOnline = selectedProject.owner_id ? isUserOnline(selectedProject.owner_id) : false;
                      const transfer = fileTransfers[file.name];

                      const canUpdateMasterFile = selectedProject.is_owner !== false || Boolean(selectedProject.can_update_project_file);
                      const isFilmFile = selectedProject.project_file?.name === file.name;

                      const fileCat = detectFileCategory(file.name, file.type);
                      const isMedia = fileCat === 'video' || fileCat === 'audio';

                      const catConfig = {
                        image: { icon: ImageIcon, color: "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-white/10", label: "IMAGE" },
                        video: { icon: Video, color: "bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border-amber-500/25", label: "VIDEO" },
                        audio: { icon: Headphones, color: "bg-teal-500/10 dark:bg-teal-400/10 text-teal-700 dark:text-teal-400 border-teal-500/25", label: "AUDIO" },
                        pdf: { icon: FileText, color: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-500/20", label: "PDF" },
                        docx: { icon: FileText, color: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-500/20", label: "DOCX" },
                        script: { icon: FileCode, color: "bg-amber-500/10 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 border-amber-500/25", label: "SCRIPT" },
                        other: { icon: FileText, color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10", label: "FILE" },
                      }[fileCat];
                      const CatIcon = catConfig.icon;

                      return (
                        <div 
                          key={idx} 
                          onClick={() => handleOpenFile(file)}
                          className={`rounded-xl p-2.5 px-3 flex items-center justify-between gap-3 shadow-2xs transition-all cursor-pointer group border ${
                            isFilmFile
                              ? 'border-amber-500/70 dark:border-amber-400/60 bg-amber-500/[0.04] dark:bg-amber-400/[0.03] ring-1 ring-amber-500/30'
                              : activeFile?.name === file.name
                              ? 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/[0.03]'
                              : 'bg-white dark:bg-[#161619] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
                          }`}
                        >
                          {/* Left: Radio for film selection + Category Icon + File Name & Metadata */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Radio: mutually exclusive single film file selection */}
                            {canUpdateMasterFile && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isFilmFile) {
                                    handleRemoveMasterFile();
                                  } else {
                                    handleSetMasterFile({
                                      name: file.name,
                                      path: file.path || file.name,
                                      size: file.size,
                                      type: file.type
                                    });
                                  }
                                }}
                                disabled={isUpdatingMasterFile}
                                className="shrink-0 p-0.5 cursor-pointer"
                                title={isFilmFile ? "Fichier du film actif (cliquer pour retirer)" : "Définir comme fichier du film"}
                              >
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                  isFilmFile
                                    ? "border-amber-500 bg-amber-500/10"
                                    : "border-slate-300 dark:border-white/20 hover:border-amber-400"
                                }`}>
                                  {isFilmFile && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                                </div>
                              </button>
                            )}

                            {/* Category Icon */}
                            <div className={`p-1.5 rounded-lg shrink-0 border ${catConfig.color}`}>
                              <CatIcon size={15} />
                            </div>

                            {/* Name & size info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className={`font-semibold text-xs sm:text-sm truncate ${
                                  isFilmFile ? "text-amber-900 dark:text-amber-200" : "text-slate-900 dark:text-[#f4efe6]"
                                }`} title={file.name}>
                                  {file.name}
                                </p>
                                {isFilmFile && (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono shrink-0">
                                    • Film
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                <span>{formatFileSize(file.size)}</span>
                                <span>•</span>
                                <span>{catConfig.label}</span>
                                {hasLocal ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">• Local</span>
                                ) : isOwner ? (
                                  <span>• Cloud</span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick actions (Lire button only for video/audio, and delete trash icon) */}
                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {isMedia && (
                              <button 
                                onClick={(e) => handleOpenFile(file, e)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Lire dans le Studio"
                              >
                                <Play size={10} className="fill-black" />
                                <span>Lire</span>
                              </button>
                            )}

                            {isOwner && (
                              <button
                                onClick={(e) => promptDeleteFile(file, e)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors cursor-pointer"
                                title="Supprimer le fichier"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            
            {/* Clean, informative footer */}
            <div className="px-4 py-3 border-t border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-500 dark:text-[#71717a] flex items-center justify-between bg-slate-50/70 dark:bg-black/20 rounded-b-2xl">
              <div className="flex items-center gap-1.5 truncate mr-2" title={selectedProject.folder_path}>
                <FolderOpen size={13} className="text-amber-500 shrink-0" />
                <span className="truncate font-mono text-[11px] text-slate-600 dark:text-[#9f988b]">
                  {selectedProject.folder_path || "Dossier local"}
                </span>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                {projectFiles.length} fichier{projectFiles.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-[#141417] rounded-2xl shadow-2xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.95)] w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col animate-in zoom-in-95 duration-200 relative z-10 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-[#f4efe6] overflow-hidden my-auto">
            <div className="flex justify-between items-center px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#f4efe6]">{editingProjectId ? t("project.edit") : t("project.add_new")}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 dark:text-[#71717a] hover:text-slate-700 dark:hover:text-[#f4efe6] hover:bg-slate-100 dark:hover:bg-white/5 p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProject} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4 min-h-0">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800/50">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">{t("project.form.name")} *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Episode 10 Translation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder-[#71717a]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf]">Description <span className="font-normal text-slate-400 dark:text-[#71717a]">(optional)</span></label>
                  <span className={`text-[11px] font-mono ${description.length > 700 ? "text-rose-500" : "text-slate-400 dark:text-[#71717a]"}`}>{description.length}/750</span>
                </div>
                <textarea
                  maxLength={750}
                  rows={3}
                  placeholder="Describe the project scope, notes, or any relevant information..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder-[#71717a] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">
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
                      ? 'border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/20' 
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161619] hover:border-slate-300 dark:hover:border-white/20 focus-within:border-amber-500 dark:focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-500/20 dark:focus-within:ring-amber-400/20'
                  }`}
                >
                  <div className="pl-3.5 pr-2 text-slate-400 dark:text-[#71717a] flex items-center justify-center shrink-0">
                    <FolderOpen size={18} className="text-amber-500 dark:text-amber-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. C:/Projects/Episode1 or browse folder..."
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    className="flex-1 bg-transparent py-2.5 px-1 text-xs font-mono text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder:text-[#71717a] focus:outline-none"
                  />
                  <div className="p-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleBrowseFolder}
                      className="px-3.5 py-1.5 bg-slate-200/70 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-[#f4efe6] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen size={14} />
                      <span>{t("project.form.browse")}</span>
                    </button>
                  </div>
                </div>

                {selectedFilesForNewProject.length > 0 && (
                  <div className="flex items-center space-x-1.5 rtl:space-x-reverse mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium animate-in fade-in duration-150">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{selectedFilesForNewProject.length} files detected in folder</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 dark:text-[#71717a] mt-1">{t("project.form.folder_desc")}</p>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">{t("project.form.company")}</label>
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
                        className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder-[#71717a]"
                      />
                      <button 
                        type="button" 
                        onClick={() => { setIsCustomCompany(false); setCompanyName(""); }}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-[#f4efe6] rounded-xl px-3 flex items-center justify-center transition-colors cursor-pointer"
                        title={t("cancel")}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">{t("project.form.type")}</label>
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">{t("project.form.software")}</label>
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
                  <DateSelect
                    label={t("project.form.deadline")}
                    value={deadline}
                    onChange={(val) => setDeadline(val)}
                    placeholder="Select deadline"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#c2bcaf] mb-1.5">{t("project.form.time")}</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="e.g. 120"
                    value={totalTime}
                    onChange={(e) => setTotalTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-1 focus:ring-amber-500/20 dark:focus:ring-amber-400/20 text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder-[#71717a]"
                  />
                </div>
              </div>

              {/* Collaboration & Staff Assignment Section (Optional) */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 shrink-0">
                      <Users size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-[#f4efe6] flex items-center gap-1.5">
                        <span>Team Collaboration & Staff Assignment</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-[#9f988b]">
                          Optional
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-[#71717a]">
                        Assign roles, specific tasks, date ranges, and master file permissions.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddCollaborator()}
                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>Add Staff</span>
                  </button>
                </div>

                {projectCollaborators.length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-center">
                    <p className="text-xs text-slate-600 dark:text-[#c2bcaf] font-medium">
                      Solo Project (No staff assigned)
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-[#71717a] mt-0.5">
                      Leave this section empty to work alone, or click &quot;Add Staff&quot; above to collaborate with your team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectCollaborators.map((collab, idx) => {
                      const staffObj = staffList.find(s => s.id === collab.staff_id);
                      const taskPresets = [
                        { label: "pose de text (Pose le texte)", value: "pose le text" },
                        { label: "les apois (Les appuis)", value: "les apois" },
                        { label: "verification (Vérification / QA)", value: "verification" },
                        { label: "complet (Complet)", value: "complet" },
                        { label: "partner (Partenaire)", value: "partner" },
                        { label: "traduction (Traduction)", value: "traduction" },
                        { label: "mixage (Mixage / Sound)", value: "mixage" },
                        { label: "adaptation (Adaptation)", value: "adaptation" }
                      ];

                      return (
                        <div 
                          key={idx} 
                          className="p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] space-y-3 relative group"
                        >
                          {/* Header: Staff Selector + Remove */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-[#c2bcaf] mb-1">
                                Team Member {idx + 1} *
                              </label>
                              {staffList.length > 0 ? (
                                <CustomSelect
                                  value={String(collab.staff_id || staffList[0].id)}
                                  onChange={(val) => handleSelectStaffForCollab(idx, Number(val))}
                                  options={staffList.map(s => ({
                                    value: String(s.id),
                                    label: `${s.name} ${s.task ? `(${s.task})` : ''} - ${s.email || 'No email'}`
                                  }))}
                                />
                              ) : (
                                <input
                                  type="text"
                                  required
                                  placeholder="Staff name or email..."
                                  value={collab.staff_name}
                                  onChange={(e) => {
                                    handleUpdateCollabField(idx, "staff_name", e.target.value);
                                    handleUpdateCollabField(idx, "staff_email", e.target.value);
                                  }}
                                  className="w-full bg-white dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-slate-900 dark:text-[#f4efe6]"
                                />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveCollab(idx)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer mt-5"
                              title="Remove collaborator"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Role / Task Assignment */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-[#c2bcaf]">
                                Collaboration Task / Role *
                              </label>
                              {staffObj?.task && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400/90 font-medium">
                                  Default: {staffObj.task}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1">
                                <CustomSelect
                                  value={taskPresets.some(p => p.value === collab.task) ? (collab.task || "pose le text") : "CUSTOM_TASK"}
                                  onChange={(val) => {
                                    if (val === "CUSTOM_TASK") {
                                      handleUpdateCollabField(idx, "task", "");
                                    } else {
                                      handleUpdateCollabField(idx, "task", val);
                                    }
                                  }}
                                  options={[
                                    ...taskPresets,
                                    { label: "Other / Custom Role...", value: "CUSTOM_TASK" }
                                  ]}
                                />
                              </div>
                              {(!taskPresets.some(p => p.value === collab.task) || collab.task === "") && (
                                <input
                                  type="text"
                                  placeholder="e.g. Pose de texte, Lip-sync, Verification..."
                                  value={collab.task || ""}
                                  onChange={(e) => handleUpdateCollabField(idx, "task", e.target.value)}
                                  className="flex-1 bg-white dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder-[#71717a]"
                                />
                              )}
                            </div>
                          </div>

                          {/* Timeline: Start Date & End Date using DateSelect */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <DateSelect
                              label="Start Date"
                              value={collab.start_date || ""}
                              onChange={(val) => handleUpdateCollabField(idx, "start_date", val)}
                              placeholder="Assign start date"
                            />
                            <DateSelect
                              label="End Date (Deadline)"
                              value={collab.end_date || ""}
                              onChange={(val) => handleUpdateCollabField(idx, "end_date", val)}
                              placeholder="Assign end date"
                            />
                          </div>

                          {/* Master File Authorization Toggle */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#161619] border border-slate-200/80 dark:border-white/10">
                            <div className="pr-3">
                              <p className="text-xs font-semibold text-slate-800 dark:text-[#f4efe6] flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-amber-500" />
                                <span>Authorize Project Master File Updates</span>
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-[#71717a] mt-0.5">
                                Allows this staff member to upload or replace the project master file
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={Boolean(collab.can_update_project_file)}
                                onChange={(e) => handleUpdateCollabField(idx, "can_update_project_file", e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                          </div>

                          {/* Comment / Instruction */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-[#c2bcaf] mb-1">
                              Notes & Instructions <span className="font-normal text-slate-400 dark:text-[#71717a]">(optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Specific instructions or scene references for this member..."
                              value={collab.comment || ""}
                              onChange={(e) => handleUpdateCollabField(idx, "comment", e.target.value)}
                              className="w-full bg-white dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 text-slate-900 dark:text-[#f4efe6] placeholder:text-slate-400 dark:placeholder-[#71717a]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 rtl:space-x-reverse px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02] shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#f4efe6] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                {t("cancel")}
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-black text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-[0_4px_15px_rgba(245,158,11,0.25)] flex items-center disabled:opacity-50 cursor-pointer">
                {isSubmitting && <Loader2 size={16} className="animate-spin mr-2 rtl:mr-0 rtl:ml-2" />}
                {editingProjectId ? t("update") : t("create")}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Assign / Update Project Master File Modal */}
    {showMasterFileModal && selectedProject && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white dark:bg-[#161619] rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 w-full max-w-md overflow-hidden text-slate-800 dark:text-[#f4efe6] animate-in zoom-in-95 duration-150">
          {/* Minimal Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="min-w-0 pr-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#f4efe6] truncate">
                Fichier du film
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9f988b] truncate mt-0.5">
                Sélectionnez le média principal pour {selectedProject.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMasterFileModal(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-[#f4efe6] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {projectFiles.length > 0 ? (
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {projectFiles.map((f, i) => {
                  const isCurrent = selectedProject.project_file?.name === f.name;
                  const cat = detectFileCategory(f.name, f.type);
                  const Icon = cat === 'video' ? Video : cat === 'audio' ? Headphones : cat === 'script' ? FileCode : FileText;

                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (isCurrent) {
                          handleRemoveMasterFile();
                        } else {
                          handleSetMasterFile({
                            name: f.name,
                            path: f.path || f.name,
                            size: f.size,
                            type: f.type
                          });
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                        isCurrent
                          ? "bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/30"
                          : "hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-800 dark:text-[#f4efe6] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <Icon size={15} className={isCurrent ? "text-amber-500 shrink-0" : "text-slate-400 shrink-0"} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" title={f.name}>
                            {f.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatFileSize(f.size || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isCurrent ? (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <CheckCircle2 size={14} />
                            <span>Actuel</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium px-2 py-0.5 rounded-md hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors">
                            Choisir
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-4">
                Aucun fichier dans le projet
              </p>
            )}

            {/* Import from disk (clean minimal button) */}
            <input
              type="file"
              ref={masterFileInputRef}
              className="hidden"
              onChange={handleMasterFileSelectFromDisk}
            />
            <button
              type="button"
              onClick={() => masterFileInputRef.current?.click()}
              disabled={isUpdatingMasterFile}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-white/10 hover:border-amber-400/60 dark:hover:border-amber-400/60 text-xs text-slate-500 dark:text-[#9f988b] hover:text-slate-800 dark:hover:text-[#f4efe6] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium"
            >
              <UploadCloud size={14} />
              <span>Importer un autre fichier depuis l&apos;ordinateur</span>
            </button>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-5 py-3 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setShowMasterFileModal(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
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
