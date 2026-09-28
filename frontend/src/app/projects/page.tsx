"use client";

import { useState, useEffect } from "react";
import { Briefcase, Search, Plus, FolderOpen, Video, FileText, Calendar, Building, X, Loader2, ChevronRight, Edit2, Trash2, Clock } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import CustomSelect from "@/components/CustomSelect";
import { useSettings } from "@/context/SettingsContext";
import { apiFetch } from "@/lib/api";

export interface Project {
  id: number;
  name: string;
  company_name: string;
  folder_path: string;
  target_software: string;
  project_type?: string;
  deadline: string;
  total_time?: number;
}

export interface ProjectFile {
  name: string;
  path: string;
  type: 'video' | 'script';
  size: number;
}

export interface CompanyData {
  id: number;
  name: string;
  target_software: string;
}

export default function ProjectsPage() {
  const { t } = useSettings();
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
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);

  // Edit / Delete State
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'update' | 'delete';
    project: Project | null;
  }>({ isOpen: false, type: 'update', project: null });

  const openCreateModal = () => {
    setEditingProjectId(null);
    setName("");
    setCompanyName("");
    setIsCustomCompany(false);
    setFolderPath("");
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
    
    // Check if the project's company exists in our realCompanies list
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

  useEffect(() => {
    fetchProjects();
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await apiFetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setRealCompanies(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await apiFetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    
    // For updating, show confirmation modal first
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
      // Append time so it's a valid ISO string for backend
      params.append("deadline", `${deadline}T00:00:00Z`);
    }

    try {
      const res = await apiFetch(`${url}?${params.toString()}`, {
        method: method,
      });

      if (res.ok) {
        setShowModal(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchProjects();
        // Clear form
        setName("");
        setCompanyName("");
        setFolderPath("");
        setTargetSoftware("ERytmo");
        setProjectType("Détection");
        setDeadline("");
        setTotalTime("");
        setEditingProjectId(null);
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
    if (confirmModal.type === 'delete') {
      executeDeleteProject();
    } else if (confirmModal.type === 'update') {
      handleSubmitProject();
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const res = await apiFetch("/api/browse-folder");
      if (res.ok) {
        const data = await res.json();
        if (data.path) {
          setFolderPath(data.path);
        }
      }
    } catch (err) {
      console.error("Failed to browse folder", err);
    }
  };

  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    setLoadingFiles(true);
    try {
      const res = await apiFetch(`/api/projects/${project.id}/files`);
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
    // Newest
    return b.id - a.id;
  });

  // The activeFile rendering is moved down.

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
                  <div className={`p-2 rounded-lg mr-3 rtl:mr-0 rtl:ml-3 shrink-0 ${activeFile.type === 'video' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-500'}`}>
                    {activeFile.type === 'video' ? <Video size={20} /> : <FileText size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{activeFile.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">{activeFile.path}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveFile(null)}
                  className="flex items-center text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 py-1.5 px-3 rounded-lg transition-colors shrink-0 ml-4 rtl:ml-0 rtl:mr-4"
                >
                  <X size={16} className="mr-1 rtl:mr-0 rtl:ml-1" /> {t("cancel")}
                </button>
              </div>
              
              <div className={`flex-1 relative flex items-center justify-center min-h-0 ${activeFile.type === 'video' ? 'bg-black' : 'bg-slate-100 dark:bg-slate-900'}`}>
                {activeFile.type === 'video' ? (
                  <video 
                    src={`/api/stream-file?path=${encodeURIComponent(activeFile.path)}`}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <iframe 
                    src={`/api/stream-file?path=${encodeURIComponent(activeFile.path)}`}
                    className="w-full h-full bg-white dark:bg-slate-800"
                    title={activeFile.name}
                  />
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
            filteredProjects.map((p) => (
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
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg truncate pr-2 rtl:pr-0 rtl:pl-2">{p.name}</h3>
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
            ))
          )}
        </div>

        {/* Project Details Panel */}
        {selectedProject && (
          <div className="w-full lg:w-[380px] xl:w-[420px] 2xl:w-[460px] shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col h-full animate-in slide-in-from-right-4 duration-300 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 text-xl">{selectedProject.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center mt-1">
                  <FolderOpen size={14} className="mr-1 rtl:mr-0 rtl:ml-1" /> {t("project.local_files")}
                </p>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-400 dark:text-slate-500 transition-colors"
                title={t("cancel")}
              >
                <ChevronRight size={18} className="rtl:rotate-180" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 dark:bg-slate-900/30">
              {loadingFiles ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                  <Loader2 size={24} className="animate-spin mb-2" />
                  <span className="text-sm">{t("project.scanning")}</span>
                </div>
              ) : projectFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FolderOpen size={48} className="text-slate-200 dark:text-slate-700 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">{t("project.no_files")}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                    {t("project.no_files_desc")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setActiveFile(file)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-start shadow-sm hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className={`p-2 rounded-lg mr-3 rtl:mr-0 rtl:ml-3 transition-colors ${file.type === 'video' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-500 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50'}`}>
                        {file.type === 'video' ? <Video size={18} /> : <FileText size={18} />}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 text-center bg-white dark:bg-slate-800 rounded-b-xl">
              {t("project.files_not_copied")}<br/>
              <span className="font-mono">{selectedProject.folder_path}</span>
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t("project.form.folder")} *</label>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <input 
                    type="text"
                    required
                    readOnly
                    placeholder="Click Browse to select folder..."
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-not-allowed text-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleBrowseFolder}
                    className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    {t("project.form.browse")}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{t("project.form.folder_desc")}</p>
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
        title={confirmModal.type === 'delete' ? t("delete") : t("update")}
        message={
          confirmModal.type === 'delete' 
            ? t("project.delete.confirm")
            : `Are you sure you want to update the project "${confirmModal.project?.name}" with these changes?`
        }
        type={confirmModal.type === 'delete' ? 'danger' : 'info'}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          if (confirmModal.type === 'update') {
            setShowModal(true); // Re-open the edit modal if they cancel the update confirmation
          }
        }}
      />
    </div>
  );
}
