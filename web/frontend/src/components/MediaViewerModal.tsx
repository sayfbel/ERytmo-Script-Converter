"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  X, Download, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, 
  RotateCw, RotateCcw, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Image as ImageIcon, Video as VideoIcon, Headphones, 
  FileText, FileCode, Check, Copy, Search, ChevronLeft, 
  ChevronRight, Sparkles, Loader2, ArrowLeft
} from "lucide-react";
import { apiFetch, getApiUrl } from "@/lib/api";
import LargeFileRequirementModal from "@/components/LargeFileRequirementModal";

export type MediaCategory = 'image' | 'video' | 'audio' | 'pdf' | 'docx' | 'script' | 'other';

export interface ProjectViewerFile {
  name: string;
  path: string;
  type?: string;
  size: number;
  url?: string;
  content?: string;
  is_owner?: boolean;
  access_level?: "full_access" | "spectator";
  owner_id?: number;
}

export function detectFileCategory(fileName: string, serverType?: string): MediaCategory {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif', 'ico'].includes(ext)) {
    return 'image';
  }
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'm4v'].includes(ext)) {
    return 'video';
  }
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma', 'aiff', 'alac'].includes(ext)) {
    return 'audio';
  }
  if (ext === 'pdf') {
    return 'pdf';
  }
  if (['docx', 'doc', 'odt', 'rtf'].includes(ext)) {
    return 'docx';
  }
  if (['txt', 'srt', 'vtt', 'sub', 'ass', 'ssa', 'json', 'csv', 'xml', 'mos', 'awf', 'md', 'js', 'ts', 'py'].includes(ext)) {
    return 'script';
  }
  if (serverType === 'video') return 'video';
  if (serverType === 'audio') return 'audio';
  if (serverType === 'image') return 'image';
  if (serverType === 'pdf') return 'pdf';
  if (serverType === 'docx') return 'docx';
  if (serverType === 'script') return 'script';
  return 'other';
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface MediaViewerModalProps {
  isOpen: boolean;
  file: ProjectViewerFile | null;
  allFiles?: ProjectViewerFile[];
  localFile?: File | null;
  onClose: () => void;
  onSelectFile?: (file: ProjectViewerFile) => void;
  inline?: boolean;
  projectName?: string;
  onBackToProjects?: () => void;
}

export default function MediaViewerModal({
  isOpen,
  file,
  allFiles = [],
  localFile,
  onClose,
  onSelectFile,
  inline = false,
  projectName,
  onBackToProjects
}: MediaViewerModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLargeFileModal, setShowLargeFileModal] = useState(false);

  // Keyboard navigation (ESC to close, Left/Right for prev/next)
  const currentIndex = useMemo(() => {
    if (!file || !allFiles.length) return -1;
    return allFiles.findIndex(f => f.name === file.name);
  }, [file, allFiles]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allFiles.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectFile) {
      onSelectFile(allFiles[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, allFiles, onSelectFile]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectFile) {
      onSelectFile(allFiles[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, allFiles, onSelectFile]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        handlePrev();
      } else if (e.key === "ArrowRight" && hasNext && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasPrev, hasNext, handlePrev, handleNext, onClose]);

  if (!isOpen || !file) return null;

  const category = detectFileCategory(file.name, file.type);
  const isSpectator = file.access_level === 'spectator';

  // Determine media URL
  let resolvedUrl = file.url;
  if (!resolvedUrl) {
    if (localFile) {
      resolvedUrl = URL.createObjectURL(localFile);
    } else {
      resolvedUrl = getApiUrl(`/api/stream-file?path=${encodeURIComponent(file.path || file.name)}`);
    }
  }

  const handleCopyName = () => {
    navigator.clipboard.writeText(file.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (isSpectator) return;

    const isDesktopEnv = typeof window !== "undefined" && (
      window.location.port === "8000" ||
      typeof (window as unknown as { pywebview?: unknown }).pywebview !== "undefined"
    );

    if (!isDesktopEnv && (file.size || 0) >= 1024 * 1024 * 1024) {
      setShowLargeFileModal(true);
      return;
    }

    if (localFile) {
      const url = URL.createObjectURL(localFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } else if (resolvedUrl) {
      const a = document.createElement("a");
      a.href = resolvedUrl;
      a.download = file.name;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Category Icon & Badge Styling (Unified Studio Palette)
  const categoryBadge = {
    image: { label: "IMAGE", icon: ImageIcon, color: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-300/70 dark:border-white/10" },
    video: { label: "VIDEO", icon: VideoIcon, color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/25" },
    audio: { label: "AUDIO", icon: Headphones, color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/25" },
    pdf: { label: "PDF", icon: FileText, color: "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/25" },
    docx: { label: "DOCX", icon: FileText, color: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-300/70 dark:border-white/10" },
    script: { label: "SCRIPT", icon: FileCode, color: "text-amber-800 dark:text-amber-300 bg-amber-500/10 border-amber-500/25" },
    other: { label: "FILE", icon: FileText, color: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10" },
  }[category];

  const CategoryIcon = categoryBadge.icon;

  const content = (
    <div 
      className={`flex flex-col bg-white dark:bg-[#0c0c0f] border border-slate-200/90 dark:border-white/[0.08] overflow-hidden transition-all duration-300 w-full h-full min-h-0 text-slate-800 dark:text-[#f4efe6] ${
        inline 
          ? isMaximized 
            ? "fixed inset-0 z-50 rounded-none border-none shadow-none" 
            : "rounded-2xl shadow-xl dark:shadow-[0_15px_40px_rgba(0,0,0,0.7)]"
          : isMaximized 
            ? "w-full h-full fixed inset-0 rounded-none border-none" 
            : "w-full max-w-6xl h-[88vh] max-h-[920px] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-white dark:bg-[#121216] border-b border-slate-200/90 dark:border-white/[0.08] select-none shrink-0 z-20">
        
        {/* File Meta */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-3 rtl:mr-0 rtl:ml-3">
          {inline && (
            <button
              onClick={onBackToProjects || onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors shrink-0 cursor-pointer"
              title="Back to Projects"
            >
              <ArrowLeft size={18} className="rtl:rotate-180" />
            </button>
          )}

          <div className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${categoryBadge.color}`}>
            <CategoryIcon size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {projectName && (
                <span className="text-slate-400 dark:text-slate-500 text-xs hidden md:inline truncate max-w-[140px]">
                  {projectName} /
                </span>
              )}
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate" title={file.name}>
                {file.name}
              </h3>
              <button
                onClick={handleCopyName}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                title="Copy file name"
              >
                {copied ? <Check size={13} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={13} />}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold tracking-wider border uppercase font-mono ${categoryBadge.color}`}>
                {categoryBadge.label}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">{formatBytes(file.size)}</span>
              {localFile ? (
                <>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Local Cache</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Prev / Next file navigation buttons */}
          {allFiles.length > 1 && (
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-xl p-0.5 mr-2 rtl:mr-0 rtl:ml-2">
              <button
                disabled={!hasPrev}
                onClick={handlePrev}
                className={`p-1.5 rounded-lg transition-colors ${
                  hasPrev 
                    ? "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/10" 
                    : "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                }`}
                title="Previous file (Left Arrow)"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 px-2 select-none">
                {currentIndex + 1} / {allFiles.length}
              </span>
              <button
                disabled={!hasNext}
                onClick={handleNext}
                className={`p-1.5 rounded-lg transition-colors ${
                  hasNext 
                    ? "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/10" 
                    : "text-slate-400 dark:text-slate-600 cursor-not-allowed"
                }`}
                title="Next file (Right Arrow)"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Open in new tab */}
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              title="Open raw file in new tab"
            >
              <ExternalLink size={17} />
            </a>
          )}

          {/* Download */}
          {!isSpectator && (
            <button
              onClick={handleDownload}
              className="p-2 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors cursor-pointer"
              title="Download file"
            >
              <Download size={17} />
            </button>
          )}

          {/* Maximize / Restore */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            title={isMaximized ? "Restore view" : "Maximize theater mode"}
          >
            {isMaximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors ml-1 rtl:ml-0 rtl:mr-1 cursor-pointer"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Media Player / Reader Body */}
      <div className={`flex-1 relative overflow-hidden min-h-0 ${
        category === 'video'
          ? 'bg-slate-100/70 dark:bg-[#070709] flex items-center justify-center'
          : category === 'audio'
          ? 'bg-white dark:bg-[#0c0d12] flex flex-col'
          : 'bg-slate-100/70 dark:bg-[#070709] flex items-center justify-center'
      }`}>
          {category === 'image' && (
            <ImageViewer url={resolvedUrl || ""} fileName={file.name} />
          )}

          {category === 'video' && (
            <VideoStudioPlayer url={resolvedUrl || ""} fileName={file.name} />
          )}

          {category === 'audio' && (
            <AudioStudioPlayer url={resolvedUrl || ""} fileName={file.name} size={file.size} />
          )}

          {category === 'pdf' && (
            <PdfViewer url={resolvedUrl || ""} fileName={file.name} onDownload={handleDownload} />
          )}

          {category === 'docx' && (
            <DocxViewer 
              file={file} 
              localFile={localFile} 
              url={resolvedUrl || ""} 
              onDownload={handleDownload} 
            />
          )}

          {category === 'script' && (
            <ScriptViewer 
              file={file} 
              localFile={localFile} 
              url={resolvedUrl || ""} 
            />
          )}

          {category === 'other' && (
            <GenericFileFallback file={file} onDownload={handleDownload} />
          )}
        </div>
      </div>
  );

  if (inline && !isMaximized) {
    return (
      <>
        {content}
        <LargeFileRequirementModal
          isOpen={showLargeFileModal}
          onClose={() => setShowLargeFileModal(false)}
          fileName={file.name}
          fileSize={file.size}
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        {content}
      </div>
      <LargeFileRequirementModal
        isOpen={showLargeFileModal}
        onClose={() => setShowLargeFileModal(false)}
        fileName={file.name}
        fileSize={file.size}
      />
    </>
  );
}

// ==========================================
// 1. IMAGE VIEWER (Pan, Zoom, Rotate, 1:1, Grid)
// ==========================================
function ImageViewer({ url, fileName }: { url: string; fileName: string }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showCheckerboard, setShowCheckerboard] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>(url.startsWith("blob:") ? url : "");

  useEffect(() => {
    if (url.startsWith("blob:")) {
      setBlobUrl(url);
      return;
    }

    let isCancelled = false;
    const loadImageBlob = async () => {
      try {
        const res = await apiFetch(url);
        if (res.ok && !isCancelled) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setBlobUrl(objUrl);
          return;
        }
      } catch {
        // fallback
      }
      if (!isCancelled) setBlobUrl(url);
    };

    loadImageBlob();
    return () => { isCancelled = true; };
  }, [url]);

  const activeUrl = blobUrl || url;

  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom(prev => Math.min(prev + 0.1, 4));
      } else {
        setZoom(prev => Math.max(prev - 0.1, 0.25));
      }
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative flex items-center justify-center overflow-hidden select-none cursor-${zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        backgroundImage: showCheckerboard 
          ? "linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)"
          : "none",
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
      }}
    >
      {/* Image Element */}
      <div 
        className="transition-transform duration-75 flex items-center justify-center max-w-full max-h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: "center center"
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeUrl}
          alt={fileName}
          onLoad={(e) => {
            const target = e.currentTarget;
            setDimensions({ width: target.naturalWidth, height: target.naturalHeight });
          }}
          className="max-w-[85vw] max-h-[75vh] object-contain rounded shadow-2xl pointer-events-none"
        />
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 px-3 py-2 bg-white/95 dark:bg-[#16161b]/90 backdrop-blur-md border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-xl z-30">
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut size={16} />
        </button>

        <button
          onClick={resetTransform}
          className="px-2 py-1 text-xs font-mono font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
          title="Reset Zoom & Pan (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn size={16} />
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />

        <button
          onClick={handleRotate}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title="Rotate 90° Clockwise"
        >
          <RotateCw size={16} />
        </button>

        <button
          onClick={() => setShowCheckerboard(!showCheckerboard)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            showCheckerboard ? "text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25" : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
          }`}
          title="Toggle Transparent Checkerboard"
        >
          <Sparkles size={16} />
        </button>

        {dimensions && (
          <span className="hidden md:inline-block text-[11px] font-mono text-slate-500 dark:text-slate-400 px-2">
            {dimensions.width} × {dimensions.height} px
          </span>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 2. STUDIO VIDEO PLAYER
// ==========================================
function VideoStudioPlayer({ url, fileName }: { url: string; fileName: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const handleMouseMoveProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    setHoverPosition(e.clientX - rect.left);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  const handleRateChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Auto-hide controls during playback
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      className="relative w-full h-full flex items-center justify-center bg-slate-100/70 dark:bg-black overflow-hidden group select-none"
    >
      <video
        ref={videoRef}
        src={url}
        crossOrigin="use-credentials"
        autoPlay
        playsInline
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Center Play/Pause Pulsing Overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 hover:bg-white dark:bg-black/75 dark:hover:bg-black/90 border border-slate-200/90 dark:border-white/20 backdrop-blur-md flex items-center justify-center text-amber-500 dark:text-amber-400 transition-all transform hover:scale-110 shadow-xl dark:shadow-[0_0_30px_rgba(245,158,11,0.3)] z-10 cursor-pointer"
        >
          <Play size={32} className="ml-1 fill-amber-500 dark:fill-amber-400" />
        </button>
      )}

      {/* Top Video Title bar */}
      <div 
        className={`absolute top-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-b from-white/90 via-white/40 to-transparent dark:from-black/80 dark:via-black/40 dark:to-transparent transition-opacity duration-300 z-20 flex items-center justify-between text-xs ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="font-semibold truncate max-w-md text-slate-800 dark:text-slate-200 drop-shadow-xs">{fileName}</span>
      </div>

      {/* Sleek Custom Studio Controls Floating Dock */}
      <div 
        className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-slate-200/80 via-slate-100/40 to-transparent dark:from-black/90 dark:via-black/60 dark:to-transparent transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-white/95 dark:bg-[#121216]/95 backdrop-blur-md border border-slate-200/90 dark:border-white/10 rounded-2xl p-2.5 sm:p-3 shadow-lg dark:shadow-2xl">
          {/* Interactive Scrub Bar */}
          <div 
            onClick={handleSeek}
            onMouseMove={handleMouseMoveProgress}
            onMouseLeave={() => setHoverTime(null)}
            className="relative h-2 hover:h-2.5 bg-slate-200 dark:bg-white/20 hover:bg-slate-300 dark:hover:bg-white/30 rounded-full cursor-pointer transition-all mb-2.5 group/track"
          >
            {/* Progress Fill */}
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />

            {/* Scrubber Thumb */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -ml-2 w-3.5 h-3.5 bg-amber-500 dark:bg-amber-400 border-2 border-white dark:border-slate-900 rounded-full shadow-md opacity-0 group-hover/track:opacity-100 transition-opacity"
              style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />

            {/* Hover Time Tooltip */}
            {hoverTime !== null && (
              <div 
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-900 border border-amber-400/40 text-[10px] font-mono text-amber-300 pointer-events-none shadow-lg"
                style={{ left: `${hoverPosition}px` }}
              >
                {formatDuration(hoverTime)}
              </div>
            )}
          </div>

          {/* Buttons and Volume */}
          <div className="flex items-center justify-between text-slate-700 dark:text-white text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 sm:p-2 text-slate-800 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause size={19} className="fill-current" /> : <Play size={19} className="fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => handleSkip(-10)}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Skip back 10s"
              >
                <SkipBack size={16} />
              </button>

              <button
                onClick={() => handleSkip(10)}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Skip forward 10s"
              >
                <SkipForward size={16} />
              </button>

              {/* Time Stamp */}
              <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 ml-1 select-none">
                {formatDuration(currentTime)} <span className="text-slate-400 dark:text-slate-500 font-normal">/</span> {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Speed Selector */}
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 rounded-lg p-0.5">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                      playbackRate === rate 
                        ? "bg-amber-500 text-slate-950 font-bold shadow-xs" 
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-14 sm:w-18 h-1 accent-amber-500 bg-slate-200 dark:bg-white/20 rounded cursor-pointer"
                />
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper for SMPTE Studio Broadcast Timecode
function formatTimecode(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00:00.00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(ms)}`;
}

// ==========================================
// 3. STUDIO AUDIO DAW / SOUND DECK WORKSTATION
// ==========================================
function AudioStudioPlayer({ url, fileName, size }: { url: string; fileName: string; size: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  // Generate deterministic seeded waveform peaks based on filename & size
  const defaultPeaks = useMemo(() => {
    let seed = size || 0;
    for (let i = 0; i < fileName.length; i++) {
      seed = (seed * 31 + fileName.charCodeAt(i)) & 0xffffffff;
    }
    const count = 120;
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const x = i / count;
      const envelope = Math.sin(x * Math.PI) * 0.7 + 0.3;
      const noise = ((Math.sin(i * 12.9898 + seed) * 43758.5453) % 1 + 1) / 2;
      const harmonic = Math.sin(i * 0.25) * 0.2 + Math.cos(i * 0.5) * 0.15;
      const val = Math.max(14, Math.min(95, (noise * 0.5 + harmonic + 0.4) * envelope * 90));
      result.push(val);
    }
    return result;
  }, [fileName, size]);

  // Decode real audio peaks if audio file can be fetched via blob / credentials
  useEffect(() => {
    if (!url) return;
    let isCancelled = false;

    const decodeRealAudio = async () => {
      try {
        const res = await apiFetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const arrayBuf = await res.arrayBuffer();
        if (isCancelled) return;

        // Limit decoding to reasonable size to prevent lag on huge files
        if (arrayBuf.byteLength > 80 * 1024 * 1024) return;

        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
        if (isCancelled) {
          audioCtx.close();
          return;
        }

        const raw = audioBuffer.getChannelData(0);
        const count = 120;
        const blockSize = Math.floor(raw.length / count);
        const peaks: number[] = [];

        for (let i = 0; i < count; i++) {
          const start = i * blockSize;
          let sum = 0;
          const step = Math.max(1, Math.floor(blockSize / 20));
          let sampled = 0;
          for (let j = 0; j < blockSize; j += step) {
            sum += Math.abs(raw[start + j] || 0);
            sampled++;
          }
          const avg = sampled > 0 ? sum / sampled : 0;
          peaks.push(Math.max(12, Math.min(96, avg * 280)));
        }

        if (!isCancelled) {
          setWaveformPeaks(peaks);
        }
        audioCtx.close();
      } catch {
        // Fallback to default deterministic peaks gracefully
      }
    };

    decodeRealAudio();
    return () => { isCancelled = true; };
  }, [url]);

  const activePeaks = waveformPeaks.length > 0 ? waveformPeaks : defaultPeaks;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
  };

  const handleRateChange = (rate: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleSeekWaveform = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pos * duration;
  };

  const handleWaveformMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  const handleWaveformMouseLeave = () => {
    setHoverPosition(null);
    setHoverTime(null);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentBarIndex = Math.floor((progressPercent / 100) * activePeaks.length);
  const ext = fileName.split('.').pop()?.toUpperCase() || 'AUDIO';

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 sm:p-4 select-none overflow-hidden bg-slate-50/50 dark:bg-[#0c0d12] relative min-h-0">
      <audio
        ref={audioRef}
        src={url}
        crossOrigin="use-credentials"
        loop={isLooping}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
      />

      {/* Ambient Accent Light */}
      <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-[80px] pointer-events-none" />

      {/* 1. TOP BAR: Track Info & Digital Timecode */}
      <div className="flex items-center justify-between gap-3 shrink-0 pb-2 border-b border-slate-200/80 dark:border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Headphones size={15} />
          </div>
          <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono text-[9px] font-extrabold uppercase shrink-0">
            {ext}
          </span>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px] sm:max-w-xs md:max-w-md" title={fileName}>
            {fileName}
          </h4>
        </div>

        {/* Digital Timecode Display */}
        <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold shrink-0 bg-slate-100/90 dark:bg-black/50 border border-slate-200/90 dark:border-white/[0.08] px-2.5 py-1 rounded-xl">
          <span className="text-amber-600 dark:text-amber-400">
            {formatTimecode(currentTime)}
          </span>
          <span className="text-slate-400 dark:text-slate-500 font-normal">/</span>
          <span className="text-slate-500 dark:text-slate-400 font-normal">
            {formatTimecode(duration)}
          </span>
        </div>
      </div>

      {/* 2. WAVEFORM STAGE: Auto-flexing canvas with zero scroll */}
      <div className="flex-1 flex flex-col justify-center min-h-[70px] my-2 relative z-10">
        <div className="w-full bg-white/90 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between h-full max-h-[180px]">
          {/* Waveform Track */}
          <div 
            ref={waveformRef}
            onClick={handleSeekWaveform}
            onMouseMove={handleWaveformMouseMove}
            onMouseLeave={handleWaveformMouseLeave}
            className="relative w-full flex-1 min-h-[48px] flex items-center cursor-pointer group/wave select-none"
          >
            {/* Center Axis */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-slate-200 dark:bg-white/[0.08]" />

            {/* Waveform Bars */}
            <div className="w-full h-full flex items-center justify-between gap-[1.5px] sm:gap-[2px]">
              {activePeaks.map((peak, idx) => {
                const isPlayed = idx <= currentBarIndex;
                return (
                  <div key={idx} className="flex-1 h-full flex items-center justify-center">
                    <div 
                      className={`w-full rounded-full transition-all duration-75 ${
                        isPlayed 
                          ? "bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.35)]" 
                          : "bg-slate-300 hover:bg-slate-400 dark:bg-slate-700/60 dark:hover:bg-slate-500/80"
                      }`}
                      style={{ height: `${peak}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Playhead Needle Cursor */}
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] pointer-events-none transition-all duration-75 z-20"
              style={{ left: `${progressPercent}%` }}
            >
              <div className="w-2.5 h-2.5 bg-amber-500 dark:bg-amber-400 rounded-full -ml-[4px] -top-1 absolute shadow-[0_0_6px_rgba(245,158,11,1)]" />
            </div>

            {/* Hover Tooltip */}
            {hoverPosition !== null && hoverTime !== null && (
              <div 
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-900 border border-amber-400/40 text-[10px] font-mono text-amber-300 pointer-events-none shadow-xl z-30"
                style={{ left: `${hoverPosition}px` }}
              >
                {formatDuration(hoverTime)}
              </div>
            )}
          </div>

          {/* Timeline Ticks */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-white/[0.04] select-none shrink-0">
            <span>00:00</span>
            <span className="hidden sm:inline">25%</span>
            <span className="hidden sm:inline">50%</span>
            <span className="hidden sm:inline">75%</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM TRANSPORT: Single clean row, no wrap, zero scroll */}
      <div className="flex items-center justify-between gap-2 shrink-0 pt-1.5 border-t border-slate-200/80 dark:border-white/[0.08] relative z-10">
        
        {/* Left: Restart & Skip -10s */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.currentTime = 0;
            }}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="Return to start (00:00)"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={() => handleSkip(-10)}
            className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 rounded-lg text-xs font-mono font-semibold flex items-center gap-0.5 cursor-pointer"
            title="Rewind 10s"
          >
            <SkipBack size={13} />
            <span>10s</span>
          </button>
        </div>

        {/* Center: Play/Pause Button + Skip +10s + Loop */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={togglePlay}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-slate-950 font-black flex items-center justify-center shadow-[0_3px_12px_rgba(245,158,11,0.35)] dark:shadow-[0_0_18px_rgba(245,158,11,0.4)] transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => handleSkip(10)}
            className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 rounded-lg text-xs font-mono font-semibold flex items-center gap-0.5 cursor-pointer"
            title="Forward 10s"
          >
            <span>10s</span>
            <SkipForward size={13} />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
              isLooping 
                ? "text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/40" 
                : "text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
            title={isLooping ? "Loop On" : "Loop Off"}
          >
            <Repeat size={15} />
          </button>
        </div>

        {/* Right: Cycle Speed Pill + Volume Slider */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Speed Toggle Pill */}
          <button
            onClick={() => {
              const speeds = [1, 1.25, 1.5, 2, 0.5];
              const idx = speeds.indexOf(playbackRate);
              const next = speeds[(idx + 1) % speeds.length];
              handleRateChange(next);
            }}
            className="px-2 py-1 bg-slate-100 dark:bg-black/40 border border-slate-200/90 dark:border-white/[0.08] hover:border-amber-400/50 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
            title="Playback speed (Click to cycle: 1x, 1.25x, 1.5x, 2x, 0.5x)"
          >
            {playbackRate}x
          </button>

          {/* Volume Slider */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-black/40 border border-slate-200/90 dark:border-white/[0.08] px-2 py-1 rounded-xl">
            <button
              onClick={() => {
                if (!audioRef.current) return;
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }}
              className="text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (audioRef.current) audioRef.current.volume = val;
                setVolume(val);
                setIsMuted(val === 0);
              }}
              className="w-12 sm:w-16 h-1 accent-amber-500 bg-slate-300 dark:bg-white/20 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. MODERN PDF VIEWER
// ==========================================
function PdfViewer({ url, fileName, onDownload }: { url: string; fileName: string; onDownload: () => void }) {
  const [loadError, setLoadError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>(url.startsWith("blob:") ? url : "");
  const [loading, setLoading] = useState<boolean>(!url.startsWith("blob:"));

  useEffect(() => {
    if (url.startsWith("blob:")) {
      setBlobUrl(url);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    const loadPdfBlob = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(url);
        if (res.ok && !isCancelled) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setBlobUrl(objUrl);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Direct blob load fallback:", err);
      }
      if (!isCancelled) {
        setBlobUrl(url);
        setLoading(false);
      }
    };

    loadPdfBlob();
    return () => {
      isCancelled = true;
    };
  }, [url]);

  const activeUrl = blobUrl || url;

  return (
    <div className="w-full h-full flex flex-col bg-slate-100 dark:bg-[#141418] relative">
      {/* PDF Sub-Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#1a1a20] border-b border-slate-200/90 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-rose-600 dark:text-rose-400" />
          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-sm">{fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/5 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink size={13} />
            <span>Open in Native Viewer</span>
          </a>
          <button
            onClick={onDownload}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
            <Loader2 size={32} className="animate-spin text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-mono">Loading PDF Document...</span>
          </div>
        ) : !loadError && activeUrl ? (
          <object
            data={`${activeUrl}#toolbar=1&navpanes=0`}
            type="application/pdf"
            className="w-full h-full"
            onError={() => setLoadError(true)}
          >
            <iframe
              src={activeUrl}
              className="w-full h-full bg-white"
              title={fileName}
            />
          </object>
        ) : (
          <div className="flex flex-col items-center justify-center max-w-md p-8 text-center bg-white dark:bg-[#141419] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl shadow-xl my-auto">
            <FileText size={48} className="text-rose-500 mb-3 opacity-90" />
            <h4 className="text-slate-900 dark:text-white font-bold text-base mb-1">Embedded preview unavailable</h4>
            <p className="text-sm max-w-md text-slate-500 dark:text-slate-400 mb-4">
              Your browser does not support embedded PDF viewing, or the document requires direct download.
            </p>
            <button
              onClick={onDownload}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-xs"
            >
              Download PDF Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 5. DOCX & DOCUMENT READER (Word Studio)
// ==========================================
function DocxViewer({ 
  file, 
  localFile, 
  url, 
  onDownload 
}: { 
  file: ProjectViewerFile; 
  localFile?: File | null; 
  url: string; 
  onDownload: () => void 
}) {
  const [loading, setLoading] = useState(false);
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadDocText = async () => {
      setLoading(true);
      try {
        if (localFile) {
          const formData = new FormData();
          formData.append("file", localFile);
          const res = await apiFetch("/api/parse-doc-upload", {
            method: "POST",
            body: formData
          });
          if (res.ok && !isCancelled) {
            const data = await res.json();
            if (data.success && data.paragraphs?.length > 0) {
              setParagraphs(data.paragraphs);
              setWordCount(data.word_count || 0);
              return;
            }
          }
        } else if (file.path || file.name) {
          const res = await apiFetch(`/api/parse-doc?path=${encodeURIComponent(file.path || file.name)}`);
          if (res.ok && !isCancelled) {
            const data = await res.json();
            if (data.success && data.paragraphs?.length > 0) {
              setParagraphs(data.paragraphs);
              setWordCount(data.word_count || 0);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Doc parse error:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadDocText();
    return () => { isCancelled = true; };
  }, [file, localFile]);

  const filteredParagraphs = useMemo(() => {
    if (!searchQuery.trim()) return paragraphs;
    const q = searchQuery.toLowerCase();
    return paragraphs.filter(p => p.toLowerCase().includes(q));
  }, [paragraphs, searchQuery]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(paragraphs.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-100/70 dark:bg-[#0d0d11]">
      {/* Doc Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-white dark:bg-[#15151a] border-b border-slate-200/90 dark:border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs font-mono">
            DOCX
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-semibold text-sm truncate max-w-sm">{file.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{formatBytes(file.size)}</span>
              {wordCount > 0 && (
                <>
                  <span>•</span>
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>•</span>
                  <span>~{Math.ceil(wordCount / 220)} min read</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {paragraphs.length > 0 && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search in doc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 w-36 sm:w-48"
              />
            </div>
          )}

          {paragraphs.length > 0 && (
            <button
              onClick={handleCopyText}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Copy all extracted text"
            >
              {copied ? <Check size={16} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={16} />}
            </button>
          )}

          <button
            onClick={onDownload}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download size={14} />
            <span>Download DOCX</span>
          </button>
        </div>
      </div>

      {/* Content View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3">
            <Loader2 size={32} className="animate-spin text-amber-500 dark:text-amber-400" />
            <p className="text-sm">Extracting document structure & paragraphs...</p>
          </div>
        ) : paragraphs.length > 0 ? (
          /* High-end Manuscript Paper View */
          <div className="w-full max-w-3xl bg-white dark:bg-[#141419] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl p-6 sm:p-12 shadow-lg dark:shadow-2xl space-y-5 text-slate-800 dark:text-slate-200 leading-relaxed font-serif text-sm sm:text-base select-text">
            {filteredParagraphs.map((para, idx) => (
              <p key={idx} className="leading-7 font-normal">
                {para}
              </p>
            ))}
          </div>
        ) : (
          /* Document Overview Card fallback */
          <div className="flex flex-col items-center justify-center max-w-md text-center p-8 bg-white dark:bg-[#141419] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl shadow-xl my-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
              <FileText size={32} />
            </div>
            <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">{file.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              This Microsoft Word document is ready to download or view with your native office software suite.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={onDownload}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={16} />
                <span>Download File</span>
              </button>
              {url && !url.startsWith("blob:") && (
                <a
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-white/5"
                >
                  <ExternalLink size={16} />
                  <span>Docs Web</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 6. SCRIPT & SUBTITLE READER (Studio Terminal)
// ==========================================
function ScriptViewer({ 
  file, 
  localFile, 
  url 
}: { 
  file: ProjectViewerFile; 
  localFile?: File | null; 
  url: string; 
}) {
  const [content, setContent] = useState<string>(file.content || "");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  const ext = file.name.toLowerCase().split('.').pop() || '';
  const isSubtitle = ['srt', 'vtt', 'sub', 'ass'].includes(ext);

  useEffect(() => {
    if (file.content) {
      setContent(file.content);
      return;
    }

    let isCancelled = false;
    const fetchContent = async () => {
      setLoading(true);
      try {
        if (localFile) {
          const txt = await localFile.text();
          if (!isCancelled) setContent(txt);
        } else if (url) {
          const res = await apiFetch(url);
          if (res.ok && !isCancelled) {
            const txt = await res.text();
            setContent(txt);
          }
        }
      } catch (err) {
        console.error("Failed to load script content:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchContent();
    return () => { isCancelled = true; };
  }, [file, localFile, url]);

  // Parse SRT / VTT subtitle cues
  const subtitleCues = useMemo(() => {
    if (!isSubtitle || !content) return [];
    const blocks = content.replace(/\r\n/g, '\n').split('\n\n');
    const cues: { index: string; timing: string; dialog: string }[] = [];

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 2) {
        let index = "";
        let timing = "";
        let dialogLines: string[] = [];

        if (lines[0].includes('-->')) {
          timing = lines[0];
          dialogLines = lines.slice(1);
        } else if (lines.length >= 3 && lines[1].includes('-->')) {
          index = lines[0];
          timing = lines[1];
          dialogLines = lines.slice(2);
        }

        if (timing) {
          cues.push({
            index,
            timing,
            dialog: dialogLines.join(' ')
          });
        }
      }
    }
    return cues;
  }, [content, isSubtitle]);

  const lines = useMemo(() => {
    return content ? content.split('\n') : [];
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-[#0b0b0e] font-mono">
      {/* Sub-Header Studio Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-white dark:bg-[#131318] border-b border-slate-200/90 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 font-bold uppercase text-[10px]">
            {ext || 'SCRIPT'}
          </span>
          <span className="text-slate-500 dark:text-slate-400">{lines.length} lines</span>
          <span>•</span>
          <span className="text-slate-500 dark:text-slate-400">{content.split(/\s+/).filter(Boolean).length} words</span>

          {isSubtitle && subtitleCues.length > 0 && (
            <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setViewMode("formatted")}
                className={`px-2.5 py-0.5 rounded text-[11px] font-sans font-medium transition-colors ${
                  viewMode === "formatted" ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Cues View
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2.5 py-0.5 rounded text-[11px] font-sans font-medium transition-colors ${
                  viewMode === "raw" ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Raw View
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 font-sans">
          {/* Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 w-32 sm:w-44"
            />
          </div>

          {/* Font Size Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-0.5 text-[10px]">
            <button
              onClick={() => setFontSize("sm")}
              className={`px-1.5 py-0.5 rounded ${fontSize === "sm" ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white font-bold shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize("base")}
              className={`px-1.5 py-0.5 rounded ${fontSize === "base" ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white font-bold shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize("lg")}
              className={`px-1.5 py-0.5 rounded ${fontSize === "lg" ? "bg-white dark:bg-white/20 text-slate-900 dark:text-white font-bold shadow-xs" : "text-slate-500 dark:text-slate-400"}`}
            >
              A+
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            title="Copy all text"
          >
            {copied ? <Check size={16} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 select-text">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 space-x-2">
            <Loader2 size={24} className="animate-spin text-amber-500 dark:text-amber-400" />
            <span className="text-sm font-sans">Loading script lines...</span>
          </div>
        ) : isSubtitle && viewMode === "formatted" && subtitleCues.length > 0 ? (
          /* Formatted Subtitle Cues Timeline */
          <div className="max-w-4xl mx-auto space-y-3 font-sans">
            {subtitleCues
              .filter(cue => !searchQuery.trim() || cue.dialog.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((cue, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 bg-white dark:bg-[#141419] border border-slate-200/90 dark:border-white/[0.06] hover:border-amber-400/50 rounded-xl transition-colors shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    {cue.index && (
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 w-8">
                        #{cue.index}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25 rounded font-mono text-[11px]">
                      {cue.timing}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed flex-1 sm:text-right rtl:sm:text-left font-medium">
                    {cue.dialog}
                  </p>
                </div>
              ))}
          </div>
        ) : (
          /* Monospace Line Numbered Terminal */
          <div className={`table w-full border-collapse leading-relaxed ${
            fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'
          }`}>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const matchesSearch = searchQuery.trim() && line.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <div 
                  key={idx}
                  className={`table-row hover:bg-slate-200/40 dark:hover:bg-white/[0.03] transition-colors ${
                    matchesSearch ? "bg-amber-400/20" : ""
                  }`}
                >
                  <div className="table-cell pr-4 py-0.5 text-slate-400 dark:text-slate-600 text-right select-none w-12 font-mono text-xs border-r border-slate-200/80 dark:border-white/[0.06]">
                    {lineNum}
                  </div>
                  <div className="table-cell pl-4 py-0.5 text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">
                    {line}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 7. GENERIC FALLBACK
// ==========================================
function GenericFileFallback({ file, onDownload }: { file: ProjectViewerFile; onDownload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-white dark:bg-[#141419] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl shadow-xl my-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
        <FileText size={32} />
      </div>
      <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">{file.name}</h4>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        This file format does not have an inline viewer. You can download it directly to view with your desktop applications.
      </p>
      <button
        onClick={onDownload}
        className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
      >
        <Download size={16} />
        <span>Download File</span>
      </button>
    </div>
  );
}
