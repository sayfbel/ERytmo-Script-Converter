"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { AlertCircle, ExternalLink, X } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback?: (response: { credential: string }) => void;
            ux_mode?: "popup" | "redirect";
            login_uri?: string;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

interface GoogleAuthButtonProps {
  mode?: "login" | "register";
  onError?: (err: string) => void;
  onSuccess?: () => void;
}

export default function GoogleAuthButton({ mode = "login", onError, onSuccess }: GoogleAuthButtonProps) {
  const { googleClientId, loginWithGoogle, refreshSession } = useAuth();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [browserWaiting, setBrowserWaiting] = useState(false);
  const [showConfigNotice, setShowConfigNotice] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsDesktop(
        window.location.port === "8000" ||
        typeof (window as unknown as { pywebview?: unknown }).pywebview !== "undefined"
      );
    }
  }, []);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Launch Small Native Google Popup Window
  const handleDesktopPopupLogin = async () => {
    if (!googleClientId) {
      setShowConfigNotice(true);
      if (onError) onError("Google Client ID is not configured yet in .env file.");
      return;
    }

    setBrowserWaiting(true);
    setBtnLoading(true);

    try {
      const res = await apiFetch("/api/auth/google/popup-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remember_me: true }),
      });
      const data = await res.json();

      if (!res.ok || !data.session_id) {
        throw new Error(data.detail || "Failed to start Google sign-in.");
      }

      const sessionId = data.session_id;

      // Start polling for authentication completion
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      const startTime = Date.now();
      pollIntervalRef.current = setInterval(async () => {
        // Timeout after 3 minutes
        if (Date.now() - startTime > 180000) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setBrowserWaiting(false);
          setBtnLoading(false);
          if (onError) onError("Google sign-in timed out. Please try again.");
          return;
        }

        try {
          const statusRes = await apiFetch(`/api/auth/google/browser-status?session_id=${encodeURIComponent(sessionId)}`);
          const statusData = await statusRes.json();

          if (statusData.status === "completed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            // Claim the authenticated session and set HttpOnly cookie
            const claimRes = await apiFetch("/api/auth/google/desktop-claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: sessionId }),
            });
            const claimData = await claimRes.json();

            setBrowserWaiting(false);
            setBtnLoading(false);

            if (claimRes.ok && claimData.success) {
              if (claimData.token && typeof window !== "undefined") {
                localStorage.setItem("erytmo_token", claimData.token);
              }
              try {
                await refreshSession();
              } catch {}
              window.location.href = "/";
            } else {
              if (onError) onError(claimData.detail || "Failed to claim desktop session.");
            }
          } else if (statusData.status === "expired") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setBrowserWaiting(false);
            setBtnLoading(false);
            if (onError) onError("Authentication session expired.");
          }
        } catch {
          // Keep polling on transient network glitches
        }
      }, 700);

    } catch (err: unknown) {
      setBrowserWaiting(false);
      setBtnLoading(false);
      const errMsg = err instanceof Error ? err.message : "Failed to open Google window.";
      if (onError) onError(errMsg);
    }
  };

  const handleCancelBrowserLogin = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setBrowserWaiting(false);
    setBtnLoading(false);
  };

  const handleReopenBrowser = () => {
    handleDesktopPopupLogin();
  };

  // For non-desktop web browser mode (e.g. Next.js on port 3000), render Google GIS button
  useEffect(() => {
    if (isDesktop || !scriptLoaded || !googleClientId || !buttonContainerRef.current) return;

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (response.credential) {
              setBtnLoading(true);
              const result = await loginWithGoogle(response.credential);
              setBtnLoading(false);
              if (result.success) {
                if (onSuccess) onSuccess();
                else window.location.href = "/";
              } else if (result.error && onError) {
                onError(result.error);
              }
            }
          },
        });

        buttonContainerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          text: mode === "register" ? "signup_with" : "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: 360,
          locale: "en",
        });
      } catch (err) {
        console.error("Google button initialization error:", err);
      }
    }
  }, [isDesktop, scriptLoaded, googleClientId, loginWithGoogle, onError, onSuccess, mode]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Load Google Script only when in standard web mode */}
      {mounted && !isDesktop && (
        <Script
          src="https://accounts.google.com/gsi/client?hl=en"
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
        />
      )}

      {/* DESKTOP APP MODE: Small Google Popup Flow */}
      {mounted && isDesktop ? (
        <div className="w-full">
          {browserWaiting ? (
            /* Active Waiting State while user chooses account in small window */
            <div className="w-full p-3.5 bg-blue-50/90 border border-blue-200 rounded-2xl flex flex-col items-center text-center space-y-2">
              <div className="flex items-center space-x-2 text-blue-700 text-xs font-semibold">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Choose your account in Google Chrome...</span>
              </div>
              <div className="flex items-center space-x-3 pt-0.5">
                <button
                  type="button"
                  onClick={handleReopenBrowser}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Re-open</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelBrowserLogin}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-transparent hover:bg-slate-200/50 text-slate-500 text-xs font-medium rounded-lg transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            /* Normal Desktop Google Sign-In Button */
            <button
              type="button"
              onClick={handleDesktopPopupLogin}
              disabled={btnLoading}
              className="w-full h-11 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-medium transition-all shadow-xs flex items-center justify-center space-x-3 group disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{mode === "register" ? "Sign up with Google" : "Continue with Google"}</span>
            </button>
          )}
        </div>
      ) : (
        /* WEB BROWSER MODE: Native GIS Button */
        <div className="w-full flex justify-center min-h-[44px]">
          <div ref={buttonContainerRef} className="w-full flex justify-center [&>div]:!w-full" />
        </div>
      )}

      {showConfigNotice && (
        <div className="mt-2.5 p-2.5 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-start space-x-2 w-full">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>Google Client ID is not configured yet in .env file.</span>
        </div>
      )}
    </div>
  );
}

