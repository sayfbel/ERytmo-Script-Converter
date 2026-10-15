"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  X, Download, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, 
  RotateCw, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Image as ImageIcon, Video as VideoIcon, Headphones, 
  FileText, FileCode, Check, Copy, Search, ChevronLeft, 
  ChevronRight, Sparkles, Loader2, ArrowLeft
} from "lucide-react";
import { apiFetch, getApiUrl } from "@/lib/api";

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

  // Category Icon & Badge Styling
  const categoryBadge = {
    image: { label: "IMAGE", icon: ImageIcon, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    video: { label: "VIDEO", icon: VideoIcon, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
    audio: { label: "AUDIO", icon: Headphones, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    pdf: { label: "PDF", icon: FileText, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
    docx: { label: "DOCX", icon: FileText, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    script: { label: "SCRIPT", icon: FileCode, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    other: { label: "FILE", icon: FileText, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  }[category];

  const CategoryIcon = categoryBadge.icon;

  const content = (
    <div 
      className={`flex flex-col bg-white dark:bg-[#0c0c0f] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden transition-all duration-300 w-full h-full min-h-0 text-slate-800 dark:text-[#f4efe6] ${
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
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 bg-slate-50/80 dark:bg-[#121216] border-b border-slate-200/80 dark:border-white/[0.08] select-none shrink-0 z-20">
        
        {/* File Meta */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-3 rtl:mr-0 rtl:ml-3">
          {inline && (
            <button
              onClick={onBackToProjects || onClose}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
              title="Back to Project List"
            >
              <ArrowLeft size={15} className="rtl:rotate-180" />
              <span className="hidden sm:inline">Projects</span>
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
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
                  title="Copy file name"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold tracking-wider border ${categoryBadge.color}`}>
                  {categoryBadge.label}
                </span>
                <span>•</span>
                <span className="font-mono text-slate-300 font-medium">{formatBytes(file.size)}</span>
                {localFile ? (
                  <>
                    <span>•</span>
                    <span className="text-teal-400 font-medium">Local Cache</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Prev / Next file navigation buttons */}
            {allFiles.length > 1 && (
              <div className="hidden sm:flex items-center bg-white/[0.04] border border-white/[0.06] rounded-xl p-0.5 mr-2 rtl:mr-0 rtl:ml-2">
                <button
                  disabled={!hasPrev}
                  onClick={handlePrev}
                  className={`p-1.5 rounded-lg transition-colors ${
                    hasPrev 
                      ? "text-slate-300 hover:text-white hover:bg-white/10" 
                      : "text-slate-600 cursor-not-allowed"
                  }`}
                  title="Previous file (Left Arrow)"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[11px] font-mono text-slate-400 px-2 select-none">
                  {currentIndex + 1} / {allFiles.length}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={handleNext}
                  className={`p-1.5 rounded-lg transition-colors ${
                    hasNext 
                      ? "text-slate-300 hover:text-white hover:bg-white/10" 
                      : "text-slate-600 cursor-not-allowed"
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
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                title="Open raw file in new tab"
              >
                <ExternalLink size={17} />
              </a>
            )}

            {/* Download */}
            {!isSpectator && (
              <button
                onClick={handleDownload}
                className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-xl transition-colors cursor-pointer"
                title="Download file"
              >
                <Download size={17} />
              </button>
            )}

            {/* Maximize / Restore */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              title={isMaximized ? "Restore view" : "Maximize theater mode"}
            >
              {isMaximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors ml-1 rtl:ml-0 rtl:mr-1 cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Media Player / Reader Body */}
        <div className="flex-1 relative overflow-hidden bg-[#070709] flex items-center justify-center min-h-0">
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
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {content}
    </div>
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
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 px-3 py-2 bg-[#16161b]/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl z-30">
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Zoom Out (-)"
        >
          <ZoomOut size={16} />
        </button>

        <button
          onClick={resetTransform}
          className="px-2 py-1 text-xs font-mono font-medium text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
          title="Reset Zoom & Pan (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Zoom In (+)"
        >
          <ZoomIn size={16} />
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        <button
          onClick={handleRotate}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Rotate 90° Clockwise"
        >
          <RotateCw size={16} />
        </button>

        <button
          onClick={() => setShowCheckerboard(!showCheckerboard)}
          className={`p-1.5 rounded-lg transition-colors ${
            showCheckerboard ? "text-cyan-400 bg-cyan-500/10" : "text-slate-300 hover:text-white hover:bg-white/10"
          }`}
          title="Toggle Transparent Checkerboard"
        >
          <Sparkles size={16} />
        </button>

        {dimensions && (
          <span className="hidden md:inline-block text-[11px] font-mono text-slate-400 px-2">
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
      className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group select-none"
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
          className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 backdrop-blur-md flex items-center justify-center text-amber-400 transition-all transform hover:scale-110 shadow-[0_0_30px_rgba(245,158,11,0.3)] z-10 cursor-pointer"
        >
          <Play size={36} className="ml-1 fill-amber-400" />
        </button>
      )}

      {/* Top Video Title bar */}
      <div 
        className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 z-20 flex items-center justify-between text-white text-xs ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="font-semibold truncate max-w-md drop-shadow text-slate-200">{fileName}</span>
      </div>

      {/* Sleek Custom Studio Controls Bar */}
      <div 
        className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Interactive Scrub Bar */}
        <div 
          onClick={handleSeek}
          onMouseMove={handleMouseMoveProgress}
          onMouseLeave={() => setHoverTime(null)}
          className="relative h-2 hover:h-3 bg-white/20 hover:bg-white/30 rounded-full cursor-pointer transition-all mb-3 group/track"
        >
          {/* Progress Fill */}
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />

          {/* Scrubber Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 bg-amber-400 rounded-full shadow-lg opacity-0 group-hover/track:opacity-100 transition-opacity"
            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div 
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-[#18181b] border border-white/10 text-[11px] font-mono text-white pointer-events-none shadow-lg"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatDuration(hoverTime)}
            </div>
          )}
        </div>

        {/* Buttons and Volume */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-amber-400"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Skip back 10s"
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Skip forward 10s"
            >
              <SkipForward size={18} />
            </button>

            {/* Time Stamp */}
            <span className="font-mono text-xs text-slate-300 ml-1 select-none">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    playbackRate === rate 
                      ? "bg-amber-500 text-slate-950 font-bold" 
                      : "text-slate-400 hover:text-white"
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
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 accent-amber-400 bg-white/20 rounded cursor-pointer"
              />
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. STUDIO AUDIO DAW / SOUND DECK PLAYER
// ==========================================
function AudioStudioPlayer({ url, fileName, size }: { url: string; fileName: string; size: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * duration;
  };

  // Generate 32 faux equalizer bars
  const bars = useMemo(() => {
    return Array.from({ length: 32 }, (_, i) => ({
      id: i,
      baseHeight: Math.sin(i / 3) * 30 + 40,
      animDelay: `${(i % 8) * 0.1}s`
    }));
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden select-none">
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

      {/* Decorative Radial Backdrop Glow */}
      <div className="absolute w-[450px] h-[450px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

      {/* Studio Sound Card Deck */}
      <div className="relative z-10 w-full max-w-xl bg-[#121216] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col items-center">
        
        {/* Animated Turntable / Vinyl Badge */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-[#1a1a22] to-[#262633] p-2 border border-white/10 shadow-2xl flex items-center justify-center mb-6">
          <div 
            className={`w-full h-full rounded-full border-4 border-dashed border-amber-500/30 flex items-center justify-center ${
              isPlaying ? "animate-spin" : ""
            }`}
            style={{ animationDuration: "12s" }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Headphones size={28} className="text-slate-950" />
            </div>
          </div>

          {/* Playing Pulse Dot */}
          {isPlaying && (
            <span className="absolute top-2 right-2 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
            </span>
          )}
        </div>

        {/* File Meta Info */}
        <h4 className="font-bold text-lg text-white text-center truncate max-w-md mb-1" title={fileName}>
          {fileName}
        </h4>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 font-mono">
          <span className="text-amber-400 font-semibold">{fileName.split('.').pop()?.toUpperCase() || 'AUDIO'}</span>
          <span>•</span>
          <span>{formatBytes(size)}</span>
          <span>•</span>
          <span>{duration > 0 ? formatDuration(duration) : "Loading..."}</span>
        </div>

        {/* Frequency Spectrum Bars Visualizer */}
        <div className="w-full flex items-end justify-between gap-1 h-16 px-4 mb-6 bg-black/40 rounded-2xl border border-white/[0.04] p-2">
          {bars.map((bar) => (
            <div
              key={bar.id}
              className={`w-full rounded-t-sm transition-all duration-150 ${
                isPlaying 
                  ? "bg-gradient-to-t from-amber-600 to-amber-300" 
                  : "bg-white/10"
              }`}
              style={{
                height: isPlaying 
                  ? `${Math.max(15, (bar.baseHeight + Math.random() * 45))}%` 
                  : "20%",
                transitionDelay: bar.animDelay
              }}
            />
          ))}
        </div>

        {/* Timeline Scrub Track */}
        <div 
          onClick={handleSeek}
          className="w-full relative h-2.5 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer transition-all mb-2 group/track"
        >
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-amber-500"
            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Timestamps */}
        <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-6">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Deck Controls */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isLooping 
                ? "text-amber-400 bg-amber-500/10 border-amber-500/20" 
                : "text-slate-400 hover:text-white border-transparent hover:bg-white/5"
            }`}
            title={isLooping ? "Repeat On" : "Repeat Off"}
          >
            <Repeat size={18} />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSkip(-10)}
              className="p-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Skip -10s"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-amber-500/20 transform hover:scale-105 transition-all cursor-pointer"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              title="Skip +10s"
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (!audioRef.current) return;
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
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
              className="w-14 sm:w-20 h-1 accent-amber-400 bg-white/20 rounded cursor-pointer"
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
    <div className="w-full h-full flex flex-col bg-[#141418] relative">
      {/* PDF Sub-Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a20] border-b border-white/[0.06] text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-rose-400" />
          <span className="font-medium text-white truncate max-w-sm">{fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink size={13} />
            <span>Open in Native Viewer</span>
          </a>
          <button
            onClick={onDownload}
            className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 size={32} className="animate-spin text-rose-400" />
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
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
            <FileText size={48} className="text-rose-400 mb-3 opacity-80" />
            <h4 className="text-white font-semibold text-base mb-1">Embedded preview unavailable</h4>
            <p className="text-sm max-w-md text-slate-400 mb-4">
              Your browser does not support embedded PDF viewing, or the document requires direct download.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl transition-colors"
            >
              Open PDF Document
            </a>
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
    <div className="w-full h-full flex flex-col bg-[#0d0d11]">
      {/* Doc Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#15151a] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs font-mono">
            DOCX
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm truncate max-w-sm">{file.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
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
                className="pl-8 pr-3 py-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 w-36 sm:w-48"
              />
            </div>
          )}

          {paragraphs.length > 0 && (
            <button
              onClick={handleCopyText}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              title="Copy all extracted text"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          )}

          <button
            onClick={onDownload}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download size={14} />
            <span>Download DOCX</span>
          </button>
        </div>
      </div>

      {/* Content View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 size={32} className="animate-spin text-blue-400" />
            <p className="text-sm">Extracting document structure & paragraphs...</p>
          </div>
        ) : paragraphs.length > 0 ? (
          /* High-end Manuscript Paper View */
          <div className="w-full max-w-3xl bg-[#141419] border border-white/[0.08] rounded-2xl p-6 sm:p-12 shadow-2xl space-y-5 text-slate-200 leading-relaxed font-serif text-sm sm:text-base select-text">
            {filteredParagraphs.map((para, idx) => (
              <p key={idx} className="leading-7 font-normal">
                {para}
              </p>
            ))}
          </div>
        ) : (
          /* Document Overview Card fallback */
          <div className="flex flex-col items-center justify-center max-w-md text-center p-8 bg-[#141419] border border-white/[0.08] rounded-2xl shadow-xl my-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
              <FileText size={32} />
            </div>
            <h4 className="text-white font-bold text-lg mb-2">{file.name}</h4>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              This Microsoft Word document is ready to download or view with your native office software suite.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={onDownload}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={16} />
                <span>Download File</span>
              </button>
              {url && !url.startsWith("blob:") && (
                <a
                  href={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl text-sm transition-colors flex items-center gap-1.5"
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
    <div className="w-full h-full flex flex-col bg-[#0b0b0e] font-mono">
      {/* Sub-Header Studio Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#131318] border-b border-white/[0.08] text-xs text-slate-300 shrink-0">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase text-[10px]">
            {ext || 'SCRIPT'}
          </span>
          <span className="text-slate-400">{lines.length} lines</span>
          <span>•</span>
          <span className="text-slate-400">{content.split(/\s+/).filter(Boolean).length} words</span>

          {isSubtitle && subtitleCues.length > 0 && (
            <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 ml-2">
              <button
                onClick={() => setViewMode("formatted")}
                className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors ${
                  viewMode === "formatted" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                Cues View
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors ${
                  viewMode === "raw" ? "bg-purple-600 text-white font-bold" : "text-slate-400 hover:text-white"
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
              className="pl-8 pr-3 py-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 w-32 sm:w-44"
            />
          </div>

          {/* Font Size Selector */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-[10px]">
            <button
              onClick={() => setFontSize("sm")}
              className={`px-1.5 py-0.5 rounded ${fontSize === "sm" ? "bg-white/20 text-white" : "text-slate-400"}`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize("base")}
              className={`px-1.5 py-0.5 rounded ${fontSize === "base" ? "bg-white/20 text-white" : "text-slate-400"}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize("lg")}
              className={`px-1.5 py-0.5 rounded ${fontSize === "lg" ? "bg-white/20 text-white" : "text-slate-400"}`}
            >
              A+
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            title="Copy all text"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 select-text">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 space-x-2">
            <Loader2 size={24} className="animate-spin text-purple-400" />
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
                  className="p-3.5 bg-[#141419] border border-white/[0.06] hover:border-purple-500/40 rounded-xl transition-colors shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    {cue.index && (
                      <span className="text-[11px] font-mono text-slate-500 w-8">
                        #{cue.index}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono text-[11px]">
                      {cue.timing}
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm leading-relaxed flex-1 sm:text-right rtl:sm:text-left font-medium">
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
                  className={`table-row hover:bg-white/[0.03] transition-colors ${
                    matchesSearch ? "bg-amber-400/20" : ""
                  }`}
                >
                  <div className="table-cell pr-4 py-0.5 text-slate-600 text-right select-none w-12 font-mono text-xs border-r border-white/[0.06]">
                    {lineNum}
                  </div>
                  <div className="table-cell pl-4 py-0.5 text-slate-200 whitespace-pre-wrap font-mono">
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
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mb-4">
        <FileText size={32} />
      </div>
      <h4 className="text-white font-bold text-lg mb-2">{file.name}</h4>
      <p className="text-sm text-slate-400 mb-6">
        This file format does not have an inline viewer. You can download it directly to view with your desktop applications.
      </p>
      <button
        onClick={onDownload}
        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
      >
        <Download size={16} />
        <span>Download File</span>
      </button>
    </div>
  );
}
