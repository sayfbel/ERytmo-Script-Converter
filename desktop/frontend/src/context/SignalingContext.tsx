"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { apiFetch } from "@/lib/api";

export interface IncomingTransferRequest {
  request_id: string;
  from_user_id: number;
  requester_name: string;
  requester_email: string;
  file_name: string;
  file_size: string;
  target_file_id?: string;
}

export interface TransferResult {
  status: "accepted" | "declined" | "error";
  detail?: string;
  auto_approved?: boolean;
}

export interface TransferState {
  status: 'idle' | 'pending' | 'transferring' | 'completed' | 'declined' | 'error';
  progress: number;
  message?: string;
}

interface SignalingContextType {
  isConnected: boolean;
  onlineUserIds: number[];
  otherDevicesCount: number;
  incomingRequest: IncomingTransferRequest | null;
  fileTransfers: Record<string, TransferState>;
  transferBanner: { type: 'declined' | 'error' | 'success'; message: string } | null;
  setTransferBanner: React.Dispatch<React.SetStateAction<{ type: 'declined' | 'error' | 'success'; message: string } | null>>;
  respondTransfer: (requestId: string, status: "accepted" | "declined", rememberPreference: boolean) => void;
  requestTransfer: (toUserId: number, fileName: string, fileSize: string, targetFileId?: string, projectId?: number) => Promise<TransferResult>;
  registerFileProvider: (provider: (fileName: string) => Promise<Blob | File | null> | Blob | File | null) => void;
  isUserOnline: (userId?: number | null) => boolean;
  refreshOnlineStatus: () => Promise<void>;
}

const SignalingContext = createContext<SignalingContextType | undefined>(undefined);

const getClientId = (): string => {
  if (typeof window === "undefined") return "";
  let cid = sessionStorage.getItem("erytmo_client_id");
  if (!cid) {
    cid = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("erytmo_client_id", cid);
  }
  return cid;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export function SignalingProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const [otherDevicesCount, setOtherDevicesCount] = useState<number>(0);
  const [incomingRequest, setIncomingRequest] = useState<IncomingTransferRequest | null>(null);
  const [fileTransfers, setFileTransfers] = useState<Record<string, TransferState>>({});
  const [transferBanner, setTransferBanner] = useState<{
    type: 'declined' | 'error' | 'success';
    message: string;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);
  const pendingRequestsRef = useRef<Map<string, { resolve: (res: TransferResult) => void; timeout: NodeJS.Timeout }>>(new Map());
  const fileProviderRef = useRef<((fileName: string) => Promise<Blob | File | null> | Blob | File | null) | null>(null);
  const incomingChunksRef = useRef<Map<string, { chunks: Uint8Array[]; totalChunks: number; mimeType?: string }>>(new Map());

  const registerFileProvider = useCallback((provider: (fileName: string) => Promise<Blob | File | null> | Blob | File | null) => {
    fileProviderRef.current = provider;
  }, []);

  const refreshOnlineStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/api/staff/online-status");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.online_user_ids)) {
          setOnlineUserIds(data.online_user_ids);
        }
      }
    } catch {
      // Ignore background sync errors
    }
  }, []);

  const streamFileToPeer = useCallback(async (toUserId: number, fileName: string, fileOrBlob: Blob | File, toClientId?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk
    const totalChunks = Math.ceil(fileOrBlob.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) break;
      const slice = fileOrBlob.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);

      wsRef.current.send(JSON.stringify({
        type: "FILE_CHUNK",
        to_user_id: toUserId,
        to_client_id: toClientId,
        file_name: fileName,
        chunk_index: i,
        total_chunks: totalChunks,
        mime_type: fileOrBlob.type,
        data: base64
      }));

      // Yield event loop every few chunks
      if (i % 8 === 0) {
        await new Promise(r => setTimeout(r, 10));
      }
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "FILE_COMPLETE",
        to_user_id: toUserId,
        to_client_id: toClientId,
        file_name: fileName,
        mime_type: fileOrBlob.type
      }));
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined" || !isAuthenticated || !user?.id || !isMountedRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const clientId = getClientId();
    let wsUrl = "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      try {
        const parsed = new URL(apiUrl);
        const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${wsProto}//${parsed.host}/ws/signaling?client_id=${encodeURIComponent(clientId)}`;
      } catch {
        // Fallback
      }
    }

    if (!wsUrl) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.port === "3000" ? "localhost:8000" : window.location.host;
      wsUrl = `${protocol}//${host}/ws/signaling?client_id=${encodeURIComponent(clientId)}`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        refreshOnlineStatus();
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          if (type === "INIT_STATE") {
            if (Array.isArray(data.online_user_ids)) {
              setOnlineUserIds(data.online_user_ids);
            }
            if (typeof data.devices_count === "number") {
              setOtherDevicesCount(Math.max(0, data.devices_count - 1));
            }
          } else if (type === "PRESENCE_UPDATE") {
            const uid = data.user_id;
            const status = data.status;
            setOnlineUserIds((prev) => {
              if (status === "online") {
                return prev.includes(uid) ? prev : [...prev, uid];
              } else {
                return prev.filter((id) => id !== uid);
              }
            });
            if (user && uid === user.id && typeof data.devices_count === "number") {
              setOtherDevicesCount(Math.max(0, data.devices_count - 1));
            }
          } else if (type === "INCOMING_TRANSFER_REQUEST") {
            setIncomingRequest({
              request_id: data.request_id,
              from_user_id: data.from_user_id,
              requester_name: data.requester_name || "A collaborator",
              requester_email: data.requester_email || "",
              file_name: data.file_name || "Project File",
              file_size: data.file_size || "Unknown size",
              target_file_id: data.target_file_id,
            });
          } else if (type === "TRANSFER_RESPONSE") {
            const reqId = data.request_id;
            const isAccepted = data.status === "accepted";
            const fileName = data.file_name;

            if (reqId && pendingRequestsRef.current.has(reqId)) {
              const pending = pendingRequestsRef.current.get(reqId);
              if (pending) {
                clearTimeout(pending.timeout);
                pending.resolve({
                  status: isAccepted ? "accepted" : "declined",
                  auto_approved: !!data.auto_approved,
                });
                pendingRequestsRef.current.delete(reqId);
              }
            } else {
              const entries = Array.from(pendingRequestsRef.current.entries());
              if (entries.length > 0) {
                const [id, pending] = entries[0];
                clearTimeout(pending.timeout);
                pending.resolve({
                  status: isAccepted ? "accepted" : "declined",
                  auto_approved: !!data.auto_approved,
                });
                pendingRequestsRef.current.delete(id);
              }
            }

            if (fileName) {
              if (isAccepted) {
                setFileTransfers(prev => ({
                  ...prev,
                  [fileName]: { status: 'transferring', progress: 5, message: data.is_self_sync ? "Syncing from your other PC..." : "Connected to owner. Streaming..." }
                }));
              } else {
                setFileTransfers(prev => ({
                  ...prev,
                  [fileName]: { status: 'declined', progress: 0, message: "Download request declined" }
                }));
                setTransferBanner({
                  type: 'declined',
                  message: `Download request for "${fileName}" was declined.`
                });
              }
            }
          } else if (type === "TRANSFER_ERROR") {
            const entries = Array.from(pendingRequestsRef.current.entries());
            if (entries.length > 0) {
              const [id, pending] = entries[0];
              clearTimeout(pending.timeout);
              pending.resolve({
                status: "error",
                detail: data.detail || "Transfer request rejected.",
              });
              pendingRequestsRef.current.delete(id);
            }
            if (data.file_name) {
              setFileTransfers(prev => ({
                ...prev,
                [data.file_name]: { status: 'error', progress: 0, message: data.detail || "Transfer request failed." }
              }));
            }
            setTransferBanner({
              type: 'error',
              message: data.detail || "Transfer request failed."
            });
          } else if (type === "SEND_FILE_DATA") {
            // Source device (e.g. PC 1): stream file chunks to requester (collaborator or PC 2)
            const { to_user_id, to_client_id, file_name } = data;
            if (fileProviderRef.current) {
              try {
                const fileOrBlob = await fileProviderRef.current(file_name);
                if (fileOrBlob) {
                  await streamFileToPeer(to_user_id, file_name, fileOrBlob, to_client_id);
                  return;
                }
              } catch (err) {
                console.error("Error reading file to stream:", err);
              }
            }

            // File not found on this device
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: "FILE_UNAVAILABLE",
                to_user_id: to_user_id,
                to_client_id: to_client_id,
                file_name: file_name,
                detail: data.is_self_sync 
                  ? `File "${file_name}" is not loaded on your other PC. Please open/select the project folder on that PC.`
                  : `File "${file_name}" is not loaded in owner's active browser session.`
              }));
            }
          } else if (type === "FILE_CHUNK") {
            // Target device (collaborator or PC 2): receive binary chunk
            const { file_name, chunk_index, total_chunks, mime_type, data: base64 } = data;
            if (!incomingChunksRef.current.has(file_name)) {
              incomingChunksRef.current.set(file_name, { chunks: [], totalChunks: total_chunks, mimeType: mime_type });
            }
            const record = incomingChunksRef.current.get(file_name)!;
            const bytes = base64ToUint8Array(base64);
            record.chunks[chunk_index] = bytes;

            const progress = Math.min(99, Math.round(((chunk_index + 1) / total_chunks) * 100));
            setFileTransfers(prev => ({
              ...prev,
              [file_name]: { status: 'transferring', progress, message: `Syncing: ${progress}%` }
            }));
          } else if (type === "FILE_COMPLETE") {
            // Target device: assemble blob & download locally
            const { file_name, mime_type } = data;
            const record = incomingChunksRef.current.get(file_name);
            if (record && record.chunks.length > 0) {
              const blob = new Blob(record.chunks as BlobPart[], { type: mime_type || record.mimeType || "application/octet-stream" });
              incomingChunksRef.current.delete(file_name);

              // Native browser download directly to PC (zero server upload / zero server route)
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = file_name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(url), 30000);

              setFileTransfers(prev => ({
                ...prev,
                [file_name]: { status: 'completed', progress: 100, message: "Sync Complete" }
              }));
              setTransferBanner({
                type: 'success',
                message: `Transfer complete! "${file_name}" downloaded directly to your PC.`
              });
            }
          } else if (type === "FILE_UNAVAILABLE") {
            const fileName = data.file_name || "File";
            setFileTransfers(prev => ({
              ...prev,
              [fileName]: { status: 'error', progress: 0, message: data.detail || "File unavailable on remote PC." }
            }));
            setTransferBanner({
              type: 'error',
              message: data.detail || `"${fileName}" is currently unavailable from remote PC.`
            });
          }
        } catch {
          // JSON parse err
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connectWebSocket();
            }
          }, 3000);
        }
      };

      ws.onerror = () => {
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.close(); } catch {}
        }
      };
    } catch {
      // WS constructor error
    }
  }, [isAuthenticated, user?.id, refreshOnlineStatus, streamFileToPeer]);

  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated && user?.id) {
      connectWebSocket();
    } else {
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.close(); } catch {}
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try { ws.close(); } catch {}
          };
        }
      }
      setIsConnected(false);
      setOnlineUserIds([]);
      setOtherDevicesCount(0);
      setIncomingRequest(null);
    }

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.close(); } catch {}
        } else if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => {
            try { ws.close(); } catch {}
          };
        }
      }
    };
  }, [isAuthenticated, user?.id, connectWebSocket]);

  // Keep-alive ping every 25 seconds
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "PING" }));
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Owner responds to an incoming transfer prompt
  const respondTransfer = useCallback((requestId: string, status: "accepted" | "declined", rememberPreference: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "TRANSFER_RESPONSE",
          request_id: requestId,
          status: status,
          remember_preference: rememberPreference,
        })
      );
    }
    setIncomingRequest(null);
  }, []);

  // Initiates a transfer request (collaborator -> owner OR same-user PC 2 -> PC 1)
  const requestTransfer = useCallback(
    async (toUserId: number, fileName: string, fileSize: string, targetFileId?: string, projectId?: number): Promise<TransferResult> => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return { status: "error", detail: "Signaling connection is offline. Please try again." };
      }

      return new Promise<TransferResult>((resolve) => {
        const tempId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const timeout = setTimeout(() => {
          if (pendingRequestsRef.current.has(tempId)) {
            pendingRequestsRef.current.delete(tempId);
            resolve({ status: "error", detail: "Transfer request timed out without response from device." });
          }
        }, 45000);

        pendingRequestsRef.current.set(tempId, { resolve, timeout });

        wsRef.current?.send(
          JSON.stringify({
            type: "TRANSFER_REQUEST",
            request_id: tempId,
            to_user_id: toUserId,
            file_name: fileName,
            file_size: fileSize,
            target_file_id: targetFileId || fileName,
            project_id: projectId,
          })
        );
      });
    },
    []
  );

  const isUserOnline = useCallback(
    (userId?: number | null): boolean => {
      if (!userId) return false;
      return onlineUserIds.includes(userId);
    },
    [onlineUserIds]
  );

  return (
    <SignalingContext.Provider
      value={{
        isConnected,
        onlineUserIds,
        otherDevicesCount,
        incomingRequest,
        fileTransfers,
        transferBanner,
        setTransferBanner,
        respondTransfer,
        requestTransfer,
        registerFileProvider,
        isUserOnline,
        refreshOnlineStatus,
      }}
    >
      {children}
    </SignalingContext.Provider>
  );
}

export function useSignaling() {
  const context = useContext(SignalingContext);
  if (!context) {
    throw new Error("useSignaling must be used within a SignalingProvider");
  }
  return context;
}
