"use client";
import { useState, useRef } from "react";
import { UploadCloud, Play, FileDown, CheckCircle2, Loader2, X, RefreshCw, FolderOpen, ExternalLink } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useConverter } from "@/context/ConverterContext";
import { apiFetch } from "@/lib/api";

type Cue = Record<string, string>;

// Helper for XHR with progress
const uploadWithProgress = (url: string, formData: FormData, onProgress: (pct: number) => void): Promise<{ cues?: Cue[], aligned_cues?: Cue[] }> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        onProgress(percentComplete);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        try {
          const errObj = JSON.parse(xhr.responseText);
          reject(new Error(errObj.detail?.message || errObj.detail || "Upload failed"));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    };
    
    xhr.onerror = () => reject(new Error("Network Error"));
    xhr.send(formData);
  });
};

export default function Converter() {
  const { t } = useSettings();
  const {
    rawCues, setRawCues,
    alignedCues, setAlignedCues,
    scriptFileName, setScriptFileName,
    mediaFileName, setMediaFileName,
    mediaFile, setMediaFile,
    startTc, setStartTc,
    clearState
  } = useConverter();
  
  const [isUploadingScript, setIsUploadingScript] = useState(false);
  const [scriptProgress, setScriptProgress] = useState(0);
  
  const [isAligning, setIsAligning] = useState(false);
  const [alignProgress, setAlignProgress] = useState(0);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadResult, setDownloadResult] = useState<{ filename: string; path: string; format: string } | null>(null);
  const [saveAs, setSaveAs] = useState(false);
  
  const scriptInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleScriptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingScript(true);
    setScriptProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    let currentPct = 10;
    setScriptProgress(10);
    const interval = setInterval(() => {
      currentPct = Math.min(95, currentPct + 15);
      setScriptProgress(currentPct);
    }, 150);

    try {
      const data = await uploadWithProgress("/api/convert", formData, (pct) => {
        setScriptProgress(Math.min(90, pct));
      });
      clearInterval(interval);
      setScriptProgress(100);
      setRawCues(data.cues || []);
      setScriptFileName(file.name);
      setAlignedCues([]); // Reset aligned cues when a new script is uploaded
      setMediaFile(null);
      setMediaFileName("");
    } catch (err) {
      clearInterval(interval);
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setTimeout(() => setIsUploadingScript(false), 300);
      if (scriptInputRef.current) scriptInputRef.current.value = "";
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setMediaFile(f);
      setMediaFileName(f.name);
    }
  };

  const handleVerify = async () => {
    if (!mediaFile || rawCues.length === 0) return;
    
    setIsAligning(true);
    setAlignProgress(0);
    setError(null);
    
    const formData = new FormData();
    formData.append("cues", JSON.stringify(rawCues));
    formData.append("media", mediaFile);
    formData.append("start_tc", startTc);
    
    let interval: ReturnType<typeof setInterval> | null = null;

    try {
      const data = await uploadWithProgress("/api/align", formData, (pct) => {
        const mappedProgress = Math.round(pct / 2); // 0 to 50% for upload
        setAlignProgress(mappedProgress);
        
        if (pct === 100 && !interval) {
          interval = setInterval(() => {
            setAlignProgress((prev) => (prev >= 95 ? 95 : prev + 2));
          }, 1000);
        }
      });
      if (interval) clearInterval(interval);
      setAlignProgress(100);
      setAlignedCues(data.aligned_cues || []);
    } catch (err) {
      if (interval) clearInterval(interval);
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setTimeout(() => setIsAligning(false), 500);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      const fd = new FormData();
      fd.append("path", filePath);
      await apiFetch("/api/open-file", { method: "POST", body: fd });
    } catch (e) {
      console.error("Failed to open file", e);
    }
  };

  const handleOpenFolder = async (filePath: string) => {
    try {
      const fd = new FormData();
      fd.append("path", filePath);
      await apiFetch("/api/open-folder", { method: "POST", body: fd });
    } catch (e) {
      console.error("Failed to open folder", e);
    }
  };

  const handleDownload = async (format: string) => {
    const cuesToExport = alignedCues.length > 0 ? alignedCues : rawCues;
    if (cuesToExport.length === 0) return;
    
    setIsDownloading(true);
    setError(null);
    setDownloadResult(null);
    setShowDownloadModal(false);
    
    const formData = new FormData();
    formData.append("cues", JSON.stringify(cuesToExport));
    formData.append("export_mode", format);
    formData.append("save_as", saveAs ? "true" : "false");
    if (scriptFileName) {
      formData.append("filename", scriptFileName);
    }
    
    try {
      const response = await apiFetch("/api/download", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || `Failed to generate ${format} file`);
      }
      
      if (data?.cancelled) {
        return;
      }
      
      if (data?.success && data?.saved_path) {
        setDownloadResult({
          filename: data.filename,
          path: data.saved_path,
          format: data.export_mode || format
        });
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred during download");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderTable = (cues: Cue[], title: string, subtitle: string, color: string) => (
    <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-xs flex flex-col min-h-[320px] lg:min-h-[380px]">
      <div className="bg-slate-50/80 dark:bg-slate-800/60 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-700/80 flex justify-between items-center shrink-0">
        <div>
          <h3 className={`font-bold text-sm sm:text-base ${color}`}>{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-slate-600">
          {cues.length} {t("converter.cues")}
        </span>
      </div>
      <div className="flex-1 p-0 overflow-y-auto">
        {cues.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm p-8 text-center min-h-[200px]">
            {t("converter.no_data")}
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 border-collapse">
            <thead className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold sticky top-0 shadow-xs z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 w-28">IN</th>
                <th className="px-4 py-3 w-28">OUT</th>
                <th className="px-4 py-3 w-36">{t("converter.table.character")}</th>
                <th className="px-4 py-3">{t("converter.table.dialogue")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {cues.map((cue, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs font-mono">{cue.in || "-"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs font-mono">{cue.out || "-"}</td>
                  <td className="px-4 py-2.5 font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap text-xs">{cue.character}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200">{cue.dialogue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{t("converter.title")}</h1>
          {scriptFileName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Active File: <span className="font-semibold text-slate-700 dark:text-slate-200">{scriptFileName}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {rawCues.length > 0 && (
            <button
              onClick={clearState}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-2 px-3.5 rounded-xl flex items-center text-sm transition-colors border border-slate-200 dark:border-slate-700"
              title="Clear loaded script & start new"
            >
              <RefreshCw size={15} className="mr-1.5 rtl:mr-0 rtl:ml-1.5 text-slate-400" />
              Reset / New
            </button>
          )}
          
          <button 
            onClick={() => setShowDownloadModal(true)}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center text-sm shadow-xs hover:shadow-md transition-all disabled:opacity-50"
            disabled={rawCues.length === 0 || isDownloading}
          >
            {isDownloading ? <Loader2 size={16} className="mr-2 rtl:mr-0 rtl:ml-2 animate-spin" /> : <FileDown size={16} className="mr-2 rtl:mr-0 rtl:ml-2" />} 
            {t("converter.download_btn")}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-5 text-sm border border-red-200 dark:border-red-800/50 flex justify-between items-start shrink-0">
          <div><strong>{t("error")}:</strong> {error}</div>
          <button onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Script Upload */}
        <input 
          type="file" 
          ref={scriptInputRef} 
          className="hidden" 
          accept=".docx,.pdf,.txt,.text"
          onChange={handleScriptChange}
        />
        <div 
          onClick={() => scriptInputRef.current?.click()}
          className={`bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center border-dashed border-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer h-48 transition-colors ${isUploadingScript ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isUploadingScript ? (
            <div className="flex flex-col items-center">
              <Loader2 size={40} className="text-teal-500 mb-3 animate-spin" />
              <div className="text-lg font-bold text-teal-600 mb-1">{scriptProgress}%</div>
              <h3 className="font-bold text-slate-700 dark:text-slate-300">{scriptProgress === 100 ? t("converter.parsing_ai") : t("converter.uploading")}</h3>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <UploadCloud size={40} className="text-teal-500 mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">
                {rawCues.length > 0 ? "Replace Script File" : t("converter.upload_script")}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("converter.script_types")}</p>
              {rawCues.length > 0 && (
                <p className="text-xs text-teal-600 dark:text-teal-400 font-bold mt-2 flex items-center gap-1">
                  ✓ {t("converter.script_loaded")} ({scriptFileName || `${rawCues.length} cues`})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Media Alignment */}
        <input 
          type="file" 
          ref={mediaInputRef} 
          className="hidden" 
          accept="video/*,audio/*,.mkv"
          onChange={handleMediaChange}
        />
        <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between h-48 ${rawCues.length === 0 ? 'opacity-50' : ''}`}>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center">
              <Play size={16} className="mr-2 rtl:mr-0 rtl:ml-2 text-purple-500" /> {t("converter.ai_align")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t("converter.ai_align_desc")}</p>
            <div className="flex space-x-3 rtl:space-x-reverse">
              <button 
                disabled={rawCues.length === 0}
                onClick={() => mediaInputRef.current?.click()}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 py-2 rounded-lg text-sm font-semibold transition-colors truncate px-2"
                title={mediaFileName || (mediaFile ? mediaFile.name : t("converter.load_media"))}
              >
                {mediaFileName || (mediaFile ? mediaFile.name : t("converter.load_media"))}
              </button>
              <input 
                disabled={rawCues.length === 0}
                type="text" 
                value={startTc}
                onChange={(e) => setStartTc(e.target.value)}
                className="w-28 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 rounded-lg px-3 text-sm text-center focus:outline-none focus:border-purple-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <button 
            disabled={(!mediaFile && !mediaFileName) || rawCues.length === 0 || isAligning}
            onClick={handleVerify}
            className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center mt-4 transition-colors disabled:opacity-50 relative overflow-hidden"
          >
            {isAligning ? (
              <div className="flex items-center relative z-10">
                <Loader2 size={16} className="mr-2 rtl:mr-0 rtl:ml-2 animate-spin" />
                {alignProgress === 100 ? t("converter.processing") : `${t("converter.uploading_media")} ${alignProgress}%`}
              </div>
            ) : (
              <div className="flex items-center relative z-10">
                <CheckCircle2 size={16} className="mr-2 rtl:mr-0 rtl:ml-2" />
                {t("converter.verify")}
              </div>
            )}
            
            {/* Progress Bar Background */}
            {isAligning && alignProgress < 100 && (
              <div 
                className="absolute left-0 top-0 bottom-0 bg-purple-600 opacity-40 transition-all duration-300"
                style={{ width: `${alignProgress}%` }}
              ></div>
            )}
          </button>
        </div>
      </div>

      {/* Download Success Banner */}
      {downloadResult && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                  {downloadResult.format === "Mosaic" ? "Mosaic Excel (.xlsx)" : "ERytmo Word (.docx)"} saved successfully!
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-100">
                  {downloadResult.filename}
                </span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 break-all">
                {downloadResult.path}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={() => handleOpenFile(downloadResult.path)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ExternalLink size={14} />
              Open File
            </button>
            <button
              onClick={() => handleOpenFolder(downloadResult.path)}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <FolderOpen size={14} />
              Show in Folder
            </button>
            <button
              onClick={() => setDownloadResult(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Tables Preview - Side by Side */}
      <div className="flex flex-col xl:flex-row gap-6 mb-8">
        {renderTable(rawCues, "1. " + t("converter.original"), t("converter.extracted"), "text-slate-700 dark:text-slate-300")}
        {renderTable(alignedCues, "2. " + t("converter.aligned"), t("converter.adjusted"), "text-emerald-700 dark:text-emerald-400")}
      </div>

      {/* Download Modal - Now Fixed Fullscreen */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-96 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("converter.export_format")}</h3>
              <button onClick={() => setShowDownloadModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("converter.export_desc")}</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => handleDownload("ERytmo")}
                className="w-full text-left rtl:text-right bg-slate-50 dark:bg-slate-900/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 p-4 rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-400">ERytmo Factory (Standard)</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">DOCX</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("converter.format.erytmo")}</div>
              </button>
              
              <button 
                onClick={() => handleDownload("Mosaic")}
                className="w-full text-left rtl:text-right bg-slate-50 dark:bg-slate-900/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 p-4 rounded-lg transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-400">Mosaic Format</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Excel (.xlsx)</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("converter.format.mosaic")}</div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 select-none">
                <input 
                  type="checkbox" 
                  checked={saveAs} 
                  onChange={(e) => setSaveAs(e.target.checked)} 
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Choose save location manually (Save As...)</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
