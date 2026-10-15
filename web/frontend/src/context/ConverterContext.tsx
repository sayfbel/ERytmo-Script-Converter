"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Cue = Record<string, string>;

interface ConverterContextType {
  rawCues: Cue[];
  setRawCues: (cues: Cue[]) => void;
  alignedCues: Cue[];
  setAlignedCues: (cues: Cue[]) => void;
  scriptFileName: string;
  setScriptFileName: (name: string) => void;
  mediaFileName: string;
  setMediaFileName: (name: string) => void;
  mediaFile: File | null;
  setMediaFile: (file: File | null) => void;
  startTc: string;
  setStartTc: (tc: string) => void;
  clearState: () => void;
}

const ConverterContext = createContext<ConverterContextType | undefined>(undefined);

export const ConverterProvider = ({ children }: { children: React.ReactNode }) => {
  const [rawCues, setRawCuesState] = useState<Cue[]>([]);
  const [alignedCues, setAlignedCuesState] = useState<Cue[]>([]);
  const [scriptFileName, setScriptFileNameState] = useState<string>("");
  const [mediaFileName, setMediaFileNameState] = useState<string>("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [startTc, setStartTcState] = useState<string>("00:00:00:00");

  // Load state from sessionStorage on mount for tab refresh persistence
  useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem("converter_rawCues");
      if (savedRaw) setRawCuesState(JSON.parse(savedRaw));

      const savedAligned = sessionStorage.getItem("converter_alignedCues");
      if (savedAligned) setAlignedCuesState(JSON.parse(savedAligned));

      const savedScriptFile = sessionStorage.getItem("converter_scriptFileName");
      if (savedScriptFile) setScriptFileNameState(savedScriptFile);

      const savedMediaFile = sessionStorage.getItem("converter_mediaFileName");
      if (savedMediaFile) setMediaFileNameState(savedMediaFile);

      const savedTc = sessionStorage.getItem("converter_startTc");
      if (savedTc) setStartTcState(savedTc);
    } catch {
      console.error("Failed to load converter state from sessionStorage");
    }
  }, []);

  const setRawCues = (cues: Cue[]) => {
    setRawCuesState(cues);
    try {
      sessionStorage.setItem("converter_rawCues", JSON.stringify(cues));
    } catch {}
  };

  const setAlignedCues = (cues: Cue[]) => {
    setAlignedCuesState(cues);
    try {
      sessionStorage.setItem("converter_alignedCues", JSON.stringify(cues));
    } catch {}
  };

  const setScriptFileName = (name: string) => {
    setScriptFileNameState(name);
    try {
      sessionStorage.setItem("converter_scriptFileName", name);
    } catch {}
  };

  const setMediaFileName = (name: string) => {
    setMediaFileNameState(name);
    try {
      sessionStorage.setItem("converter_mediaFileName", name);
    } catch {}
  };

  const setStartTc = (tc: string) => {
    setStartTcState(tc);
    try {
      sessionStorage.setItem("converter_startTc", tc);
    } catch {}
  };

  const clearState = () => {
    setRawCuesState([]);
    setAlignedCuesState([]);
    setScriptFileNameState("");
    setMediaFileNameState("");
    setMediaFile(null);
    setStartTcState("00:00:00:00");
    try {
      sessionStorage.removeItem("converter_rawCues");
      sessionStorage.removeItem("converter_alignedCues");
      sessionStorage.removeItem("converter_scriptFileName");
      sessionStorage.removeItem("converter_mediaFileName");
      sessionStorage.removeItem("converter_startTc");
    } catch {}
  };

  return (
    <ConverterContext.Provider
      value={{
        rawCues,
        setRawCues,
        alignedCues,
        setAlignedCues,
        scriptFileName,
        setScriptFileName,
        mediaFileName,
        setMediaFileName,
        mediaFile,
        setMediaFile,
        startTc,
        setStartTc,
        clearState,
      }}
    >
      {children}
    </ConverterContext.Provider>
  );
};

export const useConverter = () => {
  const context = useContext(ConverterContext);
  if (!context) {
    throw new Error("useConverter must be used within a ConverterProvider");
  }
  return context;
};
