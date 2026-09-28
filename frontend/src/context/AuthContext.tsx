"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string | null;
  google_id?: string | null;
  email_verified: boolean;
  created_at?: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone_number?: string;
}

export interface LoginData {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  email?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  isLoading: boolean;
  googleClientId: string | null;
  login: (data: LoginData) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  loginWithGoogle: (credential: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<AuthResponse>;
  resendVerificationCode: (email: string) => Promise<AuthResponse>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getApiBase = () => {
  if (typeof window !== "undefined") {
    if (window.location.port === "8000" || window.location.hostname === "localhost") {
      return `${window.location.origin}/api`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
};

const API_BASE = getApiBase();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);

  // Fetch current user from server session (HttpOnly cookie)
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        const userData: User = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn("Failed to check auth session:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Google Client ID from backend
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
      }
    } catch {
      // Ignore config fetch error
    }
  }, []);

  useEffect(() => {
    refreshSession();
    fetchConfig();
  }, [refreshSession, fetchConfig]);

  // Register
  const register = async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: typeof json.detail === "string" ? json.detail : "Registration failed. Please check your details.",
        };
      }

      return {
        success: true,
        email: json.email || data.email,
        message: json.message,
      };
    } catch {
      return {
        success: false,
        error: "Unable to connect to server. Please ensure the backend is running.",
      };
    }
  };

  // Verify email (Server sets HttpOnly cookie on success)
  const verifyEmail = async (email: string, code: string): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: typeof json.detail === "string" ? json.detail : "Verification failed. Invalid or expired code.",
        };
      }

      if (json.user) {
        setUser(json.user);
      } else {
        await refreshSession();
      }

      return {
        success: true,
        message: json.message,
      };
    } catch {
      return {
        success: false,
        error: "Unable to connect to server.",
      };
    }
  };

  // Resend verification code
  const resendVerificationCode = async (email: string): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: typeof json.detail === "string" ? json.detail : "Failed to resend code.",
        };
      }

      return {
        success: true,
        message: json.message || "Verification code sent.",
      };
    } catch {
      return {
        success: false,
        error: "Unable to connect to server.",
      };
    }
  };

  // Login (Server sets HttpOnly cookie)
  const login = async (data: LoginData): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 403 && json.detail && json.detail.code === "EMAIL_NOT_VERIFIED") {
          return {
            success: false,
            requiresVerification: true,
            email: json.detail.email || data.email,
            error: json.detail.message || "Email not verified.",
          };
        }
        return {
          success: false,
          error: typeof json.detail === "string" ? json.detail : "Login failed.",
        };
      }

      if (json.user) {
        setUser(json.user);
      } else {
        await refreshSession();
      }

      return {
        success: true,
      };
    } catch {
      return {
        success: false,
        error: "Unable to connect to server.",
      };
    }
  };

  // Google Login (Server sets HttpOnly cookie)
  const loginWithGoogle = async (credential: string): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });

      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: typeof json.detail === "string" ? json.detail : "Google authentication failed.",
        };
      }

      if (json.user) {
        setUser(json.user);
      } else {
        await refreshSession();
      }

      return {
        success: true,
      };
    } catch {
      return {
        success: false,
        error: "Unable to connect to server for Google authentication.",
      };
    }
  };

  // Logout (Calls server to revoke session and delete HttpOnly cookie)
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user,
        isAuthenticated: !!user,
        loading,
        isLoading: loading,
        googleClientId,
        login,
        register,
        loginWithGoogle,
        logout,
        verifyEmail,
        resendVerificationCode,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
