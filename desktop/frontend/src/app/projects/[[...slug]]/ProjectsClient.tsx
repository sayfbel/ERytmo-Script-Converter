"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Briefcase, Search, Plus, FolderOpen, Video, FileText, Calendar, Building, X,
  Loader2, ChevronRight, ChevronLeft, Edit2, Trash2, Clock, CheckCircle2,
  Play, Headphones, Image as ImageIcon, FileCode, UploadCloud, ShieldCheck, Star, Check
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import DateSelect from "@/components/DateSelect";
import DateRangeSelect from "@/components/DateRangeSelect";
import MediaViewerModal, { detectFileCategory, ProjectViewerFile } from "@/components/MediaViewerModal";
import LargeFileRequirementModal from "@/components/LargeFileRequirementModal";
import PageHeader from "@/components/PageHeader";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useSignaling } from "@/context/SignalingContext";
import { useToast } from "@/context/ToastContext";
import { apiFetch, getApiUrl } from "@/lib/api";

export interface ProjectCollaborator {
  staff_id?: number;
  staff_name: string;
  staff_email?: string | null;
  staff_user_id?: number | null;
  task?: string;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  can_update_project_file?: boolean;
  comment?: string;
}

export const TASK_PRESETS = [
  { label: "Pose de texte", value: "pose le text" },
  { label: "Détection", value: "detection" },
  { label: "Les appuis", value: "les apois" },
  { label: "Vérification / QA", value: "verification" },
  { label: "Adaptation", value: "adaptation" },
  { label: "Traduction", value: "traduction" },
  { label: "Comédien Voix", value: "comedien" },
  { label: "Mixage / Son", value: "mixage" },
  { label: "Complet", value: "complet" }
];

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
  type?: string;
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

export default function ProjectsClient() {
  const { t } = useSettings();
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    isUserOnline,
    requestTransfer,
    downloadedBlobs,
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
  const [editingCollabIndex, setEditingCollabIndex] = useState<number | null>(null); // null: list view, -1: adding new, >=0: editing existing
  const [collabFormData, setCollabFormData] = useState<ProjectCollaborator>({
    staff_name: "",
    task: "pose le text",
    start_date: "",
    end_date: "",
    can_update_project_file: false,
    comment: ""
  });
  const [showMasterFileModal, setShowMasterFileModal] = useState(false);
  const [isUpdatingMasterFile, setIsUpdatingMasterFile] = useState(false);
  const masterFileInputRef = useRef<HTMLInputElement | null>(null);

  // Project Details State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeFile, setActiveFile] = useState<ProjectViewerFile | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [fileCategoryFilter, setFileCategoryFilter] = useState("all");

  // URL Slug & Route State
  const params = useParams();
  const slug = (params?.slug as string[]) || [];
  const initialHandledRef = useRef(false);

  const updateUrl = (project: Project | null, file: ProjectFile | ProjectViewerFile | null) => {
    if (typeof window === "undefined") return;
    let newUrl = "/projects";
    if (project) {
      newUrl += `/${encodeURIComponent(project.name)}`;
      if (file) {
        newUrl += `/${encodeURIComponent(file.name)}`;
      }
    }
    if (window.location.pathname !== newUrl) {
      window.history.pushState({ projectId: project?.id, fileName: file?.name }, "", newUrl);
    }
  };

  const handleCloseActiveFile = () => {
    if (activeFile?.url && activeFile.url.startsWith("blob:")) {
      try { URL.revokeObjectURL(activeFile.url); } catch { }
    }
    setActiveFile(null);
    if (selectedProject) {
      updateUrl(selectedProject, null);
    } else {
      updateUrl(null, null);
    }
  };

  const handleCloseProject = () => {
    if (activeFile?.url && activeFile.url.startsWith("blob:")) {
      try { URL.revokeObjectURL(activeFile.url); } catch { }
    }
    setSelectedProject(null);
    setActiveFile(null);
    updateUrl(null, null);
  };

  // Local File Handles State
  const [localFileHandles, setLocalFileHandles] = useState<Map<string, File>>(new Map());
  const [isIndexing, setIsIndexing] = useState(false);

  // Register real P2P File Provider with SignalingContext
  useEffect(() => {
    registerFileProvider(async (fileName: string) => {
      if (localFileHandles.has(fileName)) {
        return localFileHandles.get(fileName)!;
      }
      try {
        const res = await fetch(`http://localhost:8000/api/stream-file?path=${encodeURIComponent(fileName)}`);
        if (res.ok) return await res.blob();
      } catch { }
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
    candidateMasterFile?: { name: string; path?: string; size?: number; type?: string } | null;
  }>({ isOpen: false, type: 'update', project: null, fileToDelete: null, candidateMasterFile: undefined });

  // Master Film Selection Mode
  const [isSelectingFilm, setIsSelectingFilm] = useState(false);
  const [selectedCandidateFile, setSelectedCandidateFile] = useState<{ name: string; path?: string; size?: number; type?: string } | null>(null);

  useEffect(() => {
    setIsSelectingFilm(false);
    setSelectedCandidateFile(null);
  }, [selectedProject?.id]);

  // Large File Safeguard Modal (> 1GB Web Download restriction)
  const [largeFileModal, setLargeFileModal] = useState<{
    isOpen: boolean;
    fileName?: string;
    fileSize?: number;
  }>({ isOpen: false });

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

  const handleStartAddCollab = () => {
    const existingStaffIds = new Set(projectCollaborators.map(c => c.staff_id).filter(Boolean));
    const availableStaff = staffList.find(s => !existingStaffIds.has(s.id)) || staffList[0];
    
    setCollabFormData({
      staff_id: availableStaff?.id,
      staff_name: availableStaff ? availableStaff.name : "",
      staff_email: availableStaff?.email || null,
      staff_user_id: availableStaff?.staff_user_id || null,
      task: availableStaff?.task || "pose le text",
      start_date: "",
      end_date: "",
      can_update_project_file: false,
      comment: ""
    });
    setEditingCollabIndex(-1);
  };

  const handleStartEditCollab = (idx: number) => {
    const target = projectCollaborators[idx];
    if (!target) return;
    setCollabFormData({ ...target });
    setEditingCollabIndex(idx);
  };

  const handleCancelCollabForm = () => {
    setEditingCollabIndex(null);
  };

  const handleSaveCollabForm = () => {
    let name = (collabFormData.staff_name || "").trim();
    if (staffList.length > 0 && collabFormData.staff_id) {
      const found = staffList.find(s => s.id === collabFormData.staff_id);
      if (found) {
        name = found.name;
      }
    }
    if (!name) return;

    const finalItem: ProjectCollaborator = {
      ...collabFormData,
      staff_name: name,
      task: collabFormData.task || "pose le text"
    };

    if (editingCollabIndex === -1) {
      setProjectCollaborators(prev => [...prev, finalItem]);
    } else if (editingCollabIndex !== null && editingCollabIndex >= 0) {
      setProjectCollaborators(prev => {
        const next = [...prev];
        next[editingCollabIndex] = finalItem;
        return next;
      });
    }
    setEditingCollabIndex(null);
  };

  const handleRemoveCollab = (index: number) => {
    setProjectCollaborators(prev => prev.filter((_, i) => i !== index));
    if (editingCollabIndex === index) {
      setEditingCollabIndex(null);
    }
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
        showToast(
          "Fichier du film",
          `Fichier du film défini avec succès : "${saved.name}"`,
          "success"
        );
      } else {
        const data = await res.json();
        showToast(
          "Fichier du film",
          data.detail || "Échec de la sélection du fichier du film",
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      showToast(
        "Fichier du film",
        "Erreur lors de la sélection du fichier du film",
        "error"
      );
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
        showToast(
          "Fichier du film",
          "Fichier du film retiré.",
          "info"
        );
      } else {
        const data = await res.json();
        showToast(
          "Fichier du film",
          data.detail || "Échec du retrait du fichier du film",
          "error"
        );
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
    setEditingCollabIndex(null);
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
      try { collabs = JSON.parse(project.collaborators); } catch { }
    }
    setProjectCollaborators(collabs);
    setEditingCollabIndex(null);
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

  const fetchProjects = async (): Promise<Project[]> => {
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
        return data;
      } else {
        setProjects([]);
        return [];
      }
    } catch (err) {
      console.error(err);
      setProjects([]);
      return [];
    }
  };

  // Synchronize initial URL slug (e.g. /projects/ProjectName/FileName.pdf)
  useEffect(() => {
    if (!projects.length || initialHandledRef.current) return;
    if (slug.length > 0) {
      const projSlug = decodeURIComponent(slug[0]);
      const foundProject = projects.find(p =>
        p.name.toLowerCase() === projSlug.toLowerCase() ||
        String(p.id) === projSlug
      );

      if (foundProject) {
        setSelectedProject(foundProject);
        initialHandledRef.current = true;

        fetchProjectFiles(foundProject.id).then((files) => {
          if (slug.length > 1 && Array.isArray(files) && files.length > 0) {
            const fileSlug = decodeURIComponent(slug.slice(1).join("/"));
            const foundFile = files.find(f =>
              f.name.toLowerCase() === fileSlug.toLowerCase() ||
              (f.path && f.path.toLowerCase().endsWith(fileSlug.toLowerCase()))
            );
            if (foundFile) {
              handleOpenFile(foundFile);
            }
          }
        });
      }
    }
  }, [projects, slug]);

  // Handle browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const pathParts = window.location.pathname.replace(/^\/projects\/?/, "").split("/").filter(Boolean);
      if (pathParts.length === 0) {
        setSelectedProject(null);
        setActiveFile(null);
      } else {
        const projName = decodeURIComponent(pathParts[0]);
        const fileName = pathParts.length > 1 ? decodeURIComponent(pathParts.slice(1).join("/")) : null;
        const matched = projects.find(p => p.name.toLowerCase() === projName.toLowerCase() || String(p.id) === projName);
        if (matched) {
          setSelectedProject(matched);
          if (!fileName) {
            setActiveFile(null);
          } else {
            const f = projectFiles.find(pf => pf.name.toLowerCase() === fileName.toLowerCase() || (pf.path && pf.path.toLowerCase().endsWith(fileName.toLowerCase())));
            if (f) {
              handleOpenFile(f);
            }
          }
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [projects, projectFiles]);

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
    if (confirmModal.candidateMasterFile !== undefined) {
      if (confirmModal.candidateMasterFile) {
        handleSetMasterFile(confirmModal.candidateMasterFile);
      } else {
        handleRemoveMasterFile();
      }
      setIsSelectingFilm(false);
      setSelectedCandidateFile(null);
      setConfirmModal(prev => ({ ...prev, isOpen: false, candidateMasterFile: undefined }));
    } else if (confirmModal.fileToDelete) {
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

  const fetchProjectFiles = async (projectId: number): Promise<ProjectFile[]> => {
    setLoadingFiles(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/files`);
      if (res.ok) {
        const files = await res.json();
        setProjectFiles(files);
        return files;
      } else {
        setProjectFiles([]);
        return [];
      }
    } catch (err) {
      console.error(err);
      setProjectFiles([]);
      return [];
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    setActiveFile(null);
    setTransferBanner(null);
    updateUrl(project, null);
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

  // Watch for completed P2P downloads to immediately display in the media viewer
  useEffect(() => {
    if (activeFile && downloadedBlobs[activeFile.name] && (!activeFile.url || activeFile.url.includes('/api/stream-file'))) {
      const blob = downloadedBlobs[activeFile.name];
      const url = URL.createObjectURL(blob);
      setActiveFile(prev => prev ? { ...prev, url } : null);
    }
  }, [downloadedBlobs, activeFile]);

  const handleOpenFile = async (file: ProjectFile | ProjectViewerFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const localFile = localFileHandles.get(file.name);
    const downloadedBlob = downloadedBlobs[file.name];

    const isDesktopEnv = typeof window !== "undefined" && (
      window.location.port === "8000" ||
      typeof (window as unknown as { pywebview?: unknown }).pywebview !== "undefined"
    );

    // Safeguard: Files >= 1GB require DubFlow Desktop to prevent browser RAM crashes
    if (!isDesktopEnv && (file.size || 0) >= 1024 * 1024 * 1024 && selectedProject?.is_owner === false && !localFile && !downloadedBlob) {
      setLargeFileModal({
        isOpen: true,
        fileName: file.name,
        fileSize: file.size
      });
      return;
    }

    let mediaUrl = "";
    if (localFile) {
      mediaUrl = URL.createObjectURL(localFile);
    } else if (downloadedBlob) {
      mediaUrl = URL.createObjectURL(downloadedBlob);
    } else if (selectedProject?.is_owner === false) {
      // Collaborator file not yet downloaded: trigger P2P sync so file streams to browser
      mediaUrl = "";
      handleInitiateDownload(file as ProjectFile, e || ({ stopPropagation: () => { } } as React.MouseEvent));
    } else {
      mediaUrl = getApiUrl(`/api/stream-file?path=${encodeURIComponent(file.path || file.name)}`);
    }

    let textContent = "";
    const cat = detectFileCategory(file.name, file.type);
    if (cat === 'script') {
      try {
        if (localFile) {
          textContent = await localFile.text();
        } else if (downloadedBlob) {
          textContent = await downloadedBlob.text();
        }
      } catch {
        textContent = "";
      }
    }

    const newActiveFile: ProjectViewerFile = {
      name: file.name,
      path: file.path || file.name,
      type: file.type,
      size: file.size,
      url: mediaUrl,
      content: textContent || undefined,
      is_owner: file.is_owner,
      access_level: file.access_level,
      owner_id: file.owner_id
    };

    setActiveFile(newActiveFile);
    if (selectedProject) {
      updateUrl(selectedProject, newActiveFile);
    }
  };

  const promptDeleteFile = (file: ProjectFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      project: null,
      fileToDelete: file,
      candidateMasterFile: undefined
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

    const isDesktopEnv = typeof window !== "undefined" && (
      window.location.port === "8000" ||
      typeof (window as unknown as { pywebview?: unknown }).pywebview !== "undefined"
    );

    // Safeguard: Files >= 1GB require DubFlow Desktop to prevent browser RAM crashes
    if (!isDesktopEnv && (file.size || 0) >= 1024 * 1024 * 1024) {
      setLargeFileModal({
        isOpen: true,
        fileName: file.name,
        fileSize: file.size
      });
      return;
    }

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
    <div className="flex flex-col h-full animate-in fade-in duration-300 text-[#111111] relative p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Header with Title, Icon, Subtitle, and Top-Right Action Pills */}
      <PageHeader
        title={t("project.title")}
        subtitle={t("project.subtitle") || "Manage your projects, assign companies, and track deadlines seamlessly."}
        icon={<Briefcase size={28} />}
        actionButton={
          <button
            onClick={openCreateModal}
            className="bg-[#111111] hover:bg-black text-white font-bold py-2.5 px-5 rounded-full shadow-xs flex items-center justify-center text-sm shrink-0 cursor-pointer transition-transform active:scale-95"
          >
            <Plus size={16} className="mr-2 rtl:mr-0 rtl:ml-2" />
            {t("project.add")}
          </button>
        }
      />

      {/* Toolbar: Search and Filter */}
      <div className="flex gap-3 sm:gap-4 mb-5 flex-wrap shrink-0">
        <div className="flex-1 relative group min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 transform -translate-y-1/2 text-[#FF7597] group-focus-within:text-[#FF7597] transition-colors" size={17} />
          <input
            type="text"
            placeholder={t("project.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 bg-[#F7F4EB] border border-[#D9D3C2] hover:border-[#111111] focus:border-[#111111] rounded-full shadow-xs focus:outline-none transition-all text-sm font-medium text-[#111111] placeholder-[#8c887b]"
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

        {/* Left Side: Inline Studio Media Viewer OR Project List */}
        {activeFile ? (
          <div className="flex-1 h-full min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-200">
            <MediaViewerModal
              isOpen={true}
              inline={true}
              file={activeFile}
              projectName={selectedProject?.name}
              localFile={localFileHandles.get(activeFile.name) || null}
              allFiles={projectFiles}
              onSelectFile={(nextFile) => handleOpenFile(nextFile)}
              onClose={handleCloseActiveFile}
              onBackToProjects={handleCloseActiveFile}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 pb-4 space-y-3.5">
            {filteredProjects.length === 0 ? (
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
                    className={`group bg-[#ECE8DD] hover:bg-[#E4DFC0] rounded-[20px] border p-4 sm:p-5 cursor-pointer transition-all duration-200 text-[#111111] ${selectedProject?.id === p.id
                      ? "border-2 border-[#111111] shadow-xs"
                      : "border-[#DDD7C5] shadow-none"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2 group-hover:bg-transparent">
                      <div className="min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse mb-1">
                          <h3 className="font-bold text-slate-900 dark:text-[#f4efe6] text-lg truncate">{p.name}</h3>
                          {!isOwner && (
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${p.access_level === 'full_access'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                              : 'bg-amber-400/10 text-amber-600 dark:text-amber-300 border-amber-400/20'
                              }`}>
                              {p.access_level === 'full_access' ? 'Full Access' : 'Spectator'}
                            </span>
                          )}
                        </div>

                        {!isOwner && (
                          <div className="flex items-center text-xs text-slate-500 dark:text-[#9f988b] mb-1">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 shrink-0 ${ownerOnline
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
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${p.target_software === 'Mosaic' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40' : 'bg-amber-400/10 text-amber-700 dark:text-amber-300 border-amber-400/20'
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
        )}

        {/* Project Details Panel */}
        {selectedProject && (
          <div className="w-full lg:w-[430px] xl:w-[470px] shrink-0 bg-[#ECE8DD] rounded-[24px] border border-[#DDD7C5] shadow-xs flex flex-col h-full animate-in slide-in-from-right-4 duration-300 overflow-hidden text-[#111111]">
            <div className="p-4 border-b border-[#DDD7C5] flex justify-between items-start gap-3 bg-[#E4DFC0]/40 rounded-t-[24px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                  <h2 className="font-bold text-[#111111] text-xl truncate" title={selectedProject.name}>
                    {selectedProject.name}
                  </h2>
                </div>
                <div className="flex items-center mt-1 text-xs text-slate-500 dark:text-[#9f988b] space-x-2 rtl:space-x-reverse min-w-0">
                  <span className="flex items-center shrink-0">
                    <FolderOpen size={13} className="mr-1 rtl:mr-0 rtl:ml-1" /> {t("project.local_files")}
                  </span>
                  {selectedProject.is_owner !== false ? (
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] flex items-center gap-1 shrink-0 ${otherDevicesCount > 0
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
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] shrink-0 ${selectedProject.access_level === 'full_access'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                      {selectedProject.access_level === 'full_access' ? 'Full Access' : 'Spectator (Read-Only)'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1 rtl:space-x-reverse shrink-0">
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
                  onClick={() => {
                    if (activeFile) {
                      handleCloseActiveFile();
                    } else {
                      handleCloseProject();
                    }
                  }}
                  className={`p-1.5 rounded-md transition-colors ml-1 rtl:ml-0 rtl:mr-1 cursor-pointer ${activeFile
                    ? "hover:bg-amber-500/10 text-amber-500 dark:text-amber-400"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500"
                    }`}
                  title={activeFile ? "Back to Project List" : t("cancel")}
                >
                  {activeFile ? (
                    <ChevronLeft size={18} className="rtl:rotate-180" />
                  ) : (
                    <ChevronRight size={18} className="rtl:rotate-180" />
                  )}
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
              <div className="p-3 mx-4 mt-3 rounded-xl border border-amber-400/30 dark:border-amber-400/20 bg-amber-500/10 dark:bg-amber-400/5 text-amber-800 dark:text-amber-300 flex items-center space-x-2 text-xs animate-in fade-in duration-200">
                <Loader2 size={15} className="animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-medium">Indexing local folder files directly... Zero server disk upload.</span>
              </div>
            )}

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingPanel(true); }}
              onDragLeave={() => setIsDraggingPanel(false)}
              onDrop={handleDropPanel}
              className={`flex-1 overflow-y-auto p-4 transition-colors ${isDraggingPanel
                ? 'bg-amber-500/10 border-2 border-dashed border-amber-500'
                : 'bg-[#ECE8DD]'
                }`}
            >
              {/* Active Collaborator Role Indicator (Clean, Minimal, No Loud Box) */}
              {selectedProject.my_collaboration && (
                <div className="mb-4 pb-3 border-b border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-400 dark:text-[#a1a1aa]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-[#f4efe6]">
                      {selectedProject.my_collaboration.task || "Collaborateur"}
                    </span>
                    {(selectedProject.my_collaboration.start_date || selectedProject.my_collaboration.end_date) && (
                      <span className="text-[11px] text-slate-500 dark:text-[#71717a]">
                        • {selectedProject.my_collaboration.start_date || "Début"} → {selectedProject.my_collaboration.end_date || "Fin"}
                      </span>
                    )}
                  </div>
                  {selectedProject.my_collaboration.can_update_project_file && (
                    <span className="text-[11px] text-emerald-500 font-medium">
                      Édition master autorisée
                    </span>
                  )}
                </div>
              )}

              {/* Clean Controllers Toolbar: Star (Film), Add (+), Folder & Confirm in Star mode */}
              {(() => {
                const canUpdateMaster = selectedProject.is_owner !== false || Boolean(selectedProject.can_update_project_file);

                return (
                  <div className="mb-3 p-2 px-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-[#f4efe6]">
                        Fichiers ({projectFiles.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelectingFilm ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1 duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              setIsSelectingFilm(false);
                              setSelectedCandidateFile(null);
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1"
                            title="Annuler"
                          >
                            <X size={12} />
                            <span>Annuler</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdatingMasterFile || !selectedCandidateFile}
                            onClick={() => {
                              if (!selectedCandidateFile) return;
                              setConfirmModal({
                                isOpen: true,
                                type: 'update',
                                project: null,
                                fileToDelete: null,
                                candidateMasterFile: selectedCandidateFile
                              });
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${selectedCandidateFile
                              ? "bg-amber-400 hover:bg-amber-300 text-black"
                              : "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed"
                              }`}
                            title="Confirmer le fichier du film"
                          >
                            <Check size={12} />
                            <span>Confirmer</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* 1st button: Star icon */}
                          {canUpdateMaster && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsSelectingFilm(true);
                                setSelectedCandidateFile(selectedProject.project_file || null);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title={selectedProject.project_file ? `Film actuel : ${selectedProject.project_file.name} (cliquer pour changer)` : "Définir le film principal"}
                            >
                              <Star
                                size={14}
                                className={selectedProject.project_file ? "fill-amber-400 text-amber-500" : ""}
                              />
                            </button>
                          )}

                          {/* 2nd button: + (Ajouter) */}
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
                                className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                title="Indexer un dossier complet"
                              >
                                <Plus size={13} />
                              </button>

                              {/* 3rd button: Folder */}
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
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Search & Category Filter Bar */}
              {projectFiles.length > 0 && (() => {
                const videoCount = projectFiles.filter(f => detectFileCategory(f.name, f.type) === 'video').length;
                const audioCount = projectFiles.filter(f => detectFileCategory(f.name, f.type) === 'audio').length;
                const scriptCount = projectFiles.filter(f => detectFileCategory(f.name, f.type) === 'script').length;
                const docCount = projectFiles.filter(f => ['pdf', 'docx', 'image', 'other'].includes(detectFileCategory(f.name, f.type))).length;

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
                        className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${fileCategoryFilter === "all"
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
                          className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${fileCategoryFilter === "video"
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
                          className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${fileCategoryFilter === "audio"
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
                          className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${fileCategoryFilter === "script"
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
                          className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 ${fileCategoryFilter === "doc"
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

                      const isFilmFile = selectedProject.project_file?.name === file.name;
                      const isCandidateSelected = isSelectingFilm && (selectedCandidateFile?.name === file.name);

                      const fileCat = detectFileCategory(file.name, file.type);
                      const isMedia = fileCat === 'video' || fileCat === 'audio';

                      const catConfig = {
                        image: { icon: ImageIcon, color: "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-white/10", label: "IMAGE" },
                        video: { icon: Video, color: "bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border-amber-500/25", label: "VIDEO" },
                        audio: { icon: Headphones, color: "bg-teal-500/10 dark:bg-teal-400/10 text-teal-700 dark:text-teal-400 border-teal-500/25", label: "AUDIO" },
                        pdf: { icon: FileText, color: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-500/20", label: "PDF" },
                        docx: { icon: FileText, color: "bg-blue-50 dark:blue-950/40 text-blue-700 dark:text-blue-400 border-blue-500/20", label: "DOCX" },
                        script: { icon: FileCode, color: "bg-amber-500/10 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 border-amber-500/25", label: "SCRIPT" },
                        other: { icon: FileText, color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10", label: "FILE" },
                      }[fileCat];
                      const CatIcon = catConfig.icon;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isSelectingFilm) {
                              setSelectedCandidateFile(prev => prev?.name === file.name ? null : {
                                name: file.name,
                                path: file.path || file.name,
                                size: file.size,
                                type: file.type
                              });
                            } else {
                              handleOpenFile(file);
                            }
                          }}
                          className={`rounded-xl p-2.5 px-3 flex items-center justify-between gap-3 shadow-2xs transition-all cursor-pointer group border ${isSelectingFilm
                            ? isCandidateSelected
                              ? 'border-amber-500 dark:border-amber-400 bg-amber-500/[0.08] dark:bg-amber-400/[0.06] ring-1 ring-amber-500/40'
                              : 'bg-white dark:bg-[#161619] border-slate-200/80 dark:border-white/[0.08] hover:border-amber-400/60 dark:hover:border-amber-400/40'
                            : isFilmFile
                              ? 'border-amber-500/70 dark:border-amber-400/60 bg-amber-500/[0.04] dark:bg-amber-400/[0.03] ring-1 ring-amber-500/30'
                              : activeFile?.name === file.name
                                ? 'border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/[0.03]'
                                : 'bg-white dark:bg-[#161619] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
                            }`}
                        >
                          {/* Left: Radio for film selection (ONLY when isSelectingFilm is true) + Category Icon + File Name & Metadata */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Radio: mutually exclusive single film file selection (shown ONLY when Star mode is clicked) */}
                            {isSelectingFilm && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCandidateFile(prev => prev?.name === file.name ? null : {
                                    name: file.name,
                                    path: file.path || file.name,
                                    size: file.size,
                                    type: file.type
                                  });
                                }}
                                className="shrink-0 p-0.5 cursor-pointer"
                                title={isCandidateSelected ? "Désélectionner" : "Choisir comme film"}
                              >
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isCandidateSelected
                                  ? "border-amber-500 bg-amber-500/10"
                                  : "border-slate-300 dark:border-white/20 hover:border-amber-400"
                                  }`}>
                                  {isCandidateSelected && <div className="w-2 h-2 rounded-full bg-amber-500" />}
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
                                <p className={`font-semibold text-xs sm:text-sm truncate ${(isSelectingFilm ? isCandidateSelected : isFilmFile) ? "text-amber-900 dark:text-amber-200" : "text-slate-900 dark:text-[#f4efe6]"
                                  }`} title={file.name}>
                                  {file.name}
                                </p>
                                {isFilmFile && (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono shrink-0 flex items-center gap-0.5">
                                    <Star size={10} className="fill-amber-400 text-amber-500 shrink-0" />
                                    <span>• Film</span>
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
                            {!isSelectingFilm && isMedia && (
                              <button
                                onClick={(e) => handleOpenFile(file, e)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Lire dans le Studio"
                              >
                                <Play size={10} className="fill-black" />
                                <span>Lire</span>
                              </button>
                            )}

                            {!isSelectingFilm && isOwner && (
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#F7F4EB] rounded-[28px] shadow-2xl border border-[#DDD7C5] w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col animate-in zoom-in-95 duration-200 relative z-10 text-[#111111] overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#DDD7C5] bg-[#ECE8DD] shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-[#111111]">{editingProjectId ? t("project.edit") : t("project.add_new")}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#777265] hover:text-[#111111] hover:bg-[#DDD7C5] p-2 rounded-full transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProject} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 min-h-0 bg-[#F7F4EB]">
                {error && (
                  <div className="bg-rose-50 text-rose-600 text-sm p-3.5 rounded-xl border border-rose-200">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1.5">{t("project.form.name")} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Episode 10 Translation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/90 border border-[#DDD7C5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-[#111111] placeholder-[#888375]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#111111]">Description <span className="font-normal text-[#777265]">(optional)</span></label>
                    <span className={`text-[11px] font-mono ${description.length > 700 ? "text-rose-500" : "text-[#777265]"}`}>{description.length}/750</span>
                  </div>
                  <textarea
                    maxLength={750}
                    rows={2}
                    placeholder="Describe the project scope, notes, or any relevant information..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-white/90 border border-[#DDD7C5] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-[#111111] placeholder-[#888375] resize-none leading-relaxed"
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
                    className={`flex items-center rounded-xl border transition-all overflow-hidden ${isDraggingNewProject
                      ? 'border-amber-400 bg-amber-400/20 ring-2 ring-amber-400/30'
                      : 'border-[#DDD7C5] bg-white/90 hover:border-amber-400/60 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30'
                      }`}
                  >
                    <div className="pl-3.5 pr-2 text-amber-600 flex items-center justify-center shrink-0">
                      <FolderOpen size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. C:/Projects/Episode1 or browse folder..."
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      className="flex-1 bg-transparent py-2.5 px-1 text-xs font-mono text-[#111111] placeholder-[#888375] focus:outline-none"
                    />
                    <div className="p-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleBrowseFolder}
                        className="px-3.5 py-1.5 bg-[#ECE8DD] hover:bg-[#DDD7C5] text-[#111111] rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FolderOpen size={14} />
                        <span>{t("project.form.browse")}</span>
                      </button>
                    </div>
                  </div>

                  {selectedFilesForNewProject.length > 0 && (
                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse mt-2 text-xs text-amber-700 font-medium animate-in fade-in duration-150">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{selectedFilesForNewProject.length} files detected in folder</span>
                    </div>
                  )}
                  <p className="text-[11px] text-[#777265] mt-1">{t("project.form.folder_desc")}</p>
                </div>

                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-[#111111] mb-1.5">{t("project.form.company")}</label>
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
                          className="w-full bg-white/90 border border-[#DDD7C5] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-[#111111] placeholder-[#888375]"
                        />
                        <button
                          type="button"
                          onClick={() => { setIsCustomCompany(false); setCompanyName(""); }}
                          className="bg-[#ECE8DD] hover:bg-[#DDD7C5] text-[#111111] rounded-full px-3 flex items-center justify-center transition-colors cursor-pointer"
                          title={t("cancel")}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-[#111111] mb-1.5">{t("project.form.type")}</label>
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

                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-[#111111] mb-1.5">{t("project.form.software")}</label>
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
                    <label className="block text-xs font-bold text-[#111111] mb-1.5">{t("project.form.time")}</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 120"
                      value={totalTime}
                      onChange={(e) => setTotalTime(e.target.value)}
                      className="w-full bg-white/90 border border-[#DDD7C5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-[#111111] placeholder-[#888375]"
                    />
                  </div>
                </div>

                {/* Collaboration & Staff Assignment Section */}
                <div className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-[#f4efe6]">
                        Collaboration & Rôles
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#8e887e]">
                        Assignez des membres d&apos;équipe à des tâches précises avec dates de début et fin.
                      </p>
                    </div>
                    {editingCollabIndex === null && (
                      <button
                        type="button"
                        onClick={handleStartAddCollab}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111] bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer py-1.5 px-3 rounded-full shadow-xs"
                      >
                        <Plus size={13} />
                        <span>Ajouter un membre</span>
                      </button>
                    )}
                  </div>

                  {/* Form when adding or editing a collaborator */}
                  {editingCollabIndex !== null && (
                    <div className="p-4 rounded-2xl border border-[#DDD7C5] bg-[#ECE8DD] space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-[#DDD7C5]">
                        <span className="text-xs font-bold text-[#111111]">
                          {editingCollabIndex === -1 ? "Nouveau membre de l'équipe" : "Modifier l'affectation"}
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelCollabForm}
                          className="p-1 rounded-full text-stone-400 hover:text-[#111111] hover:bg-black/5 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Select Staff & Select Role */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-[#a1a1aa] mb-1">
                            Membre de l&apos;équipe
                          </label>
                          {staffList.length > 0 ? (
                            <CustomSelect
                              value={
                                staffList.find(s => 
                                  (collabFormData.staff_id && s.id === collabFormData.staff_id) ||
                                  (collabFormData.staff_email && s.email && s.email.toLowerCase() === (collabFormData.staff_email || "").toLowerCase()) ||
                                  (collabFormData.staff_name && s.name.toLowerCase() === (collabFormData.staff_name || "").toLowerCase())
                                ) 
                                  ? String(staffList.find(s => 
                                      (collabFormData.staff_id && s.id === collabFormData.staff_id) ||
                                      (collabFormData.staff_email && s.email && s.email.toLowerCase() === (collabFormData.staff_email || "").toLowerCase()) ||
                                      (collabFormData.staff_name && s.name.toLowerCase() === (collabFormData.staff_name || "").toLowerCase())
                                    )!.id)
                                  : (staffList[0] ? String(staffList[0].id) : "")
                              }
                              onChange={(val) => {
                                const s = staffList.find(st => st.id === Number(val));
                                if (s) {
                                  setCollabFormData(prev => ({
                                    ...prev,
                                    staff_id: s.id,
                                    staff_name: s.name,
                                    staff_email: s.email,
                                    staff_user_id: s.staff_user_id,
                                    task: s.task || prev.task || "pose le text"
                                  }));
                                }
                              }}
                              options={staffList.map(s => ({
                                value: String(s.id),
                                label: s.name + (s.email ? ` (${s.email})` : "")
                              }))}
                            />
                          ) : (
                            <input
                              type="text"
                              placeholder="Nom ou email du membre..."
                              value={collabFormData.staff_name}
                              onChange={(e) => setCollabFormData(prev => ({ ...prev, staff_name: e.target.value, staff_email: e.target.value }))}
                              className="w-full bg-white dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-500"
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 dark:text-[#a1a1aa] mb-1">
                            Rôle / Tâche
                          </label>
                          <CustomSelect
                            value={
                              TASK_PRESETS.some(p => p.value === collabFormData.task || p.label.toLowerCase() === (collabFormData.task || "").toLowerCase())
                                ? (TASK_PRESETS.find(p => p.value === collabFormData.task || p.label.toLowerCase() === (collabFormData.task || "").toLowerCase())?.value || "pose le text")
                                : (collabFormData.task ? "CUSTOM_TASK" : "pose le text")
                            }
                            onChange={(val) => {
                              if (val === "CUSTOM_TASK") {
                                setCollabFormData(prev => ({ ...prev, task: "" }));
                              } else {
                                setCollabFormData(prev => ({ ...prev, task: val }));
                              }
                            }}
                            options={[
                              ...TASK_PRESETS,
                              { label: "Rôle personnalisé...", value: "CUSTOM_TASK" }
                            ]}
                          />
                        </div>
                      </div>

                      {/* Custom task input if custom selected */}
                      {(!TASK_PRESETS.some(p => p.value === collabFormData.task || p.label.toLowerCase() === (collabFormData.task || "").toLowerCase()) || collabFormData.task === "") && (
                        <div>
                          <input
                            type="text"
                            placeholder="Précisez le rôle (ex: Lip-sync, Calligraphie...)"
                            value={collabFormData.task || ""}
                            onChange={(e) => setCollabFormData(prev => ({ ...prev, task: e.target.value }))}
                            className="w-full bg-white dark:bg-[#161619] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-500"
                          />
                        </div>
                      )}

                      {/* Date Range Select */}
                      <div>
                        <DateRangeSelect
                          label="Période de la tâche (Début → Fin)"
                          startDate={collabFormData.start_date || ""}
                          endDate={collabFormData.end_date || ""}
                          onChange={(start, end) => setCollabFormData(prev => ({ ...prev, start_date: start, end_date: end }))}
                          placeholder="Sélectionner la période (Début → Fin)"
                        />
                      </div>

                      {/* Master File Checkbox */}
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
                          <input
                            type="checkbox"
                            checked={Boolean(collabFormData.can_update_project_file)}
                            onChange={(e) => setCollabFormData(prev => ({ ...prev, can_update_project_file: e.target.checked }))}
                            className="rounded border-slate-300 dark:border-white/20 text-amber-500 focus:ring-0 bg-transparent w-3.5 h-3.5"
                          />
                          <span>Autoriser à modifier le fichier master du projet</span>
                        </label>
                      </div>

                      {/* Form action buttons */}
                      <div className="flex justify-end items-center gap-2 pt-2 border-t border-[#DDD7C5]">
                        <button
                          type="button"
                          onClick={handleCancelCollabForm}
                          className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-[#111111] rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCollabForm}
                          className="px-4 py-1.5 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full transition-colors cursor-pointer shadow-xs"
                        >
                          {editingCollabIndex === -1 ? "Confirmer l'ajout" : "Enregistrer"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirmed Collaborators List */}
                  {projectCollaborators.length === 0 && editingCollabIndex === null ? (
                    <p className="text-[11px] text-slate-400 dark:text-[#71717a] py-2">
                      Projet solo (aucun collaborateur assigné).
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/[0.05] pt-0.5">
                      {projectCollaborators.map((collab, idx) => {
                        const matchingStaff = staffList.find(s => 
                          (collab.staff_id && s.id === collab.staff_id) ||
                          (collab.staff_email && s.email && s.email.toLowerCase() === (collab.staff_email || "").toLowerCase()) ||
                          (collab.staff_name && s.name.toLowerCase() === (collab.staff_name || "").toLowerCase())
                        );
                        const displayName = matchingStaff?.name || collab.staff_name || "Collaborateur";
                        const displayEmail = matchingStaff?.email || collab.staff_email;
                        const rawTask = collab.task || collab.role || "pose le text";
                        const matchedPreset = TASK_PRESETS.find(p => p.value.toLowerCase() === rawTask.toLowerCase() || p.label.toLowerCase() === rawTask.toLowerCase());
                        const displayTask = matchedPreset?.label || rawTask;
                        const hasDates = Boolean(collab.start_date || collab.end_date);
                        const dateText = collab.start_date && collab.end_date
                          ? `${collab.start_date} → ${collab.end_date}`
                          : (collab.start_date ? `Depuis ${collab.start_date}` : "");

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs shrink-0">
                                {displayName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-slate-800 dark:text-[#f4efe6] truncate">
                                    {displayName}
                                  </span>
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 shrink-0">
                                    {displayTask}
                                  </span>
                                  {collab.can_update_project_file && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium shrink-0" title="Autorisé à modifier le fichier master">
                                      <ShieldCheck size={12} />
                                      <span>Master</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 dark:text-[#71717a]">
                                  {displayEmail && <span className="truncate">{displayEmail}</span>}
                                  {hasDates && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-300">
                                        <Calendar size={11} className="text-amber-500" />
                                        {dateText}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions: Edit and Delete */}
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => handleStartEditCollab(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                title="Modifier"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCollab(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className="flex justify-end space-x-3 rtl:space-x-reverse px-5 py-3.5 sm:px-6 sm:py-4 border-t border-[#DDD7C5] bg-[#ECE8DD] shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-[#111111] bg-[#F7F4EB] hover:bg-white border border-[#DDD7C5] rounded-full transition-all cursor-pointer shadow-xs"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 text-xs sm:text-sm font-bold text-black bg-amber-400 hover:bg-amber-300 rounded-full transition-all shadow-md flex items-center disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin mr-2 rtl:mr-0 rtl:ml-2" />}
                  {editingProjectId ? t("update") : t("create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Update Film Project File Modal */}
      {showMasterFileModal && selectedProject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#F7F4EB] rounded-[28px] shadow-2xl border border-[#DDD7C5] w-full max-w-md overflow-hidden text-[#111111] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDD7C5] bg-[#ECE8DD]">
              <div className="min-w-0 pr-2">
                <h3 className="font-bold text-base text-[#111111] truncate">
                  Fichier du film
                </h3>
                <p className="text-xs text-stone-600 truncate mt-0.5">
                  Sélectionnez le média principal pour {selectedProject.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMasterFileModal(false)}
                className="text-stone-400 hover:text-[#111111] p-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3 bg-[#F7F4EB]">
              {projectFiles.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
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
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${isCurrent
                          ? "bg-amber-400/20 text-[#111111] border border-amber-400 font-semibold"
                          : "bg-[#ECE8DD] hover:bg-white/90 text-[#111111] border border-[#DDD7C5]"
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <Icon size={16} className={isCurrent ? "text-amber-600 shrink-0" : "text-stone-500 shrink-0"} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate" title={f.name}>
                              {f.name}
                            </p>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {formatFileSize(f.size || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                          {isCurrent ? (
                            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1 bg-amber-400/30 px-2.5 py-1 rounded-full">
                              <CheckCircle2 size={13} />
                              <span>Actuel</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#111111] bg-white border border-[#DDD7C5] font-semibold px-2.5 py-1 rounded-full hover:bg-stone-100 transition-colors">
                              Choisir
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-xs text-stone-400 py-4">
                  Aucun fichier dans le projet
                </p>
              )}

              {/* Import from disk */}
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
                className="w-full py-2.5 px-4 rounded-full border border-dashed border-[#DDD7C5] hover:border-amber-400 bg-[#ECE8DD] hover:bg-white text-xs text-[#111111] transition-all flex items-center justify-center gap-2 cursor-pointer font-semibold shadow-xs"
              >
                <UploadCloud size={15} />
                <span>Importer un autre fichier depuis l&apos;ordinateur</span>
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-3.5 border-t border-[#DDD7C5] bg-[#ECE8DD]">
              <button
                type="button"
                onClick={() => setShowMasterFileModal(false)}
                className="px-5 py-2 text-xs font-bold text-stone-700 hover:text-[#111111] rounded-full hover:bg-black/5 transition-colors cursor-pointer"
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
          confirmModal.candidateMasterFile !== undefined
            ? "Définir le film"
            : confirmModal.fileToDelete
              ? "Remove File"
              : confirmModal.type === 'delete'
                ? t("delete")
                : t("update")
        }
        message={
          confirmModal.candidateMasterFile !== undefined
            ? confirmModal.candidateMasterFile
              ? `Are you sure you want to set "${confirmModal.candidateMasterFile.name}" as the master film for this project?`
              : "Are you sure you want to remove the master film for this project?"
            : confirmModal.fileToDelete
              ? `Are you sure you want to remove "${confirmModal.fileToDelete.name}" from this project?`
              : confirmModal.type === 'delete'
                ? t("project.delete.confirm")
                : `Are you sure you want to update the project "${confirmModal.project?.name}" with these changes?`
        }
        type={confirmModal.type === 'delete' ? 'danger' : 'warning'}
        confirmText={
          confirmModal.candidateMasterFile !== undefined
            ? "Confirmer"
            : confirmModal.fileToDelete || confirmModal.type === 'delete'
              ? t("delete")
              : t("update")
        }
        cancelText={t("cancel")}
        icon={
          confirmModal.candidateMasterFile !== undefined ? (
            <Star size={22} className="text-amber-500 dark:text-amber-400 fill-amber-400/30" />
          ) : undefined
        }
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setConfirmModal(prev => ({ ...prev, isOpen: false, fileToDelete: null, candidateMasterFile: undefined }));
          if (confirmModal.type === 'update' && confirmModal.candidateMasterFile === undefined) {
            setShowModal(true);
          }
        }}
      />

      {/* Large File Safeguard (> 1GB Web Download) Modal */}
      <LargeFileRequirementModal
        isOpen={largeFileModal.isOpen}
        onClose={() => setLargeFileModal({ isOpen: false })}
        fileName={largeFileModal.fileName}
        fileSize={largeFileModal.fileSize}
      />
    </div>
  );
}
