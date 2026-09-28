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

interface SignalingContextType {
  isConnected: boolean;
  onlineUserIds: number[];
  incomingRequest: IncomingTransferRequest | null;
  respondTransfer: (requestId: string, status: "accepted" | "declined", rememberPreference: boolean) => void;
  requestTransfer: (toUserId: number, fileName: string, fileSize: string, targetFileId?: string, projectId?: number) => Promise<TransferResult>;
  isUserOnline: (userId?: number | null) => boolean;
  refreshOnlineStatus: () => Promise<void>;
}

const SignalingContext = createContext<SignalingContextType | undefined>(undefined);

export function SignalingProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);
  const [incomingRequest, setIncomingRequest] = useState<IncomingTransferRequest | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRequestsRef = useRef<Map<string, { resolve: (res: TransferResult) => void; timeout: NodeJS.Timeout }>>(new Map());

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

  const connectWebSocket = useCallback(() => {
    if (typeof window === "undefined" || !isAuthenticated || !user) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let wsUrl = "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      try {
        const parsed = new URL(apiUrl);
        const wsProto = parsed.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${wsProto}//${parsed.host}/ws/signaling`;
      } catch {
        // Fallback
      }
    }

    if (!wsUrl) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.port === "3000" ? "localhost:8000" : window.location.host;
      wsUrl = `${protocol}//${host}/ws/signaling`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        refreshOnlineStatus();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          if (type === "INIT_STATE") {
            if (Array.isArray(data.online_user_ids)) {
              setOnlineUserIds(data.online_user_ids);
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
            if (reqId && pendingRequestsRef.current.has(reqId)) {
              const pending = pendingRequestsRef.current.get(reqId);
              if (pending) {
                clearTimeout(pending.timeout);
                pending.resolve({
                  status: data.status === "accepted" ? "accepted" : "declined",
                  auto_approved: !!data.auto_approved,
                });
                pendingRequestsRef.current.delete(reqId);
              }
            } else {
              // Direct broadcast match
              const entries = Array.from(pendingRequestsRef.current.entries());
              if (entries.length > 0) {
                const [id, pending] = entries[0];
                clearTimeout(pending.timeout);
                pending.resolve({
                  status: data.status === "accepted" ? "accepted" : "declined",
                  auto_approved: !!data.auto_approved,
                });
                pendingRequestsRef.current.delete(id);
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
          }
        } catch {
          // JSON parse err
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Exponential backoff reconnect
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WS constructor error
    }
  }, [isAuthenticated, user, refreshOnlineStatus]);

  useEffect(() => {
    if (isAuthenticated && user) {
      connectWebSocket();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      setOnlineUserIds([]);
      setIncomingRequest(null);
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, user, connectWebSocket]);

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

  // Collaborator initiates a transfer request
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
            resolve({ status: "error", detail: "Transfer request timed out without owner response." });
          }
        }, 45000); // 45 seconds timeout for modal decision

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
        incomingRequest,
        respondTransfer,
        requestTransfer,
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
