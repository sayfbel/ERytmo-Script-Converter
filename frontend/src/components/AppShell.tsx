"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import IncomingTransferModal from "@/components/IncomingTransferModal";

const PUBLIC_AUTH_PATHS = ["/login", "/register", "/verify-email", "/complete-profile"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const isLandingPage = pathname === "/" || pathname === "/welcome";
  const isAuthPage = PUBLIC_AUTH_PATHS.some((path) => pathname.startsWith(path));
  const isStandalone = isLandingPage || isAuthPage;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && !isStandalone) {
      // 1. Strictly redirect unauthenticated user to login
      router.replace("/login");
      return;
    }

    if (isAuthenticated) {
      // 2. Unskippable onboarding check: must have job_type
      if (!user?.job_type && pathname !== "/complete-profile") {
        router.replace("/complete-profile");
        return;
      }

      // 3. If profile is complete and on login/register/complete-profile, send to workspace
      if (user?.job_type && (isAuthPage || pathname === "/complete-profile") && !pathname.startsWith("/verify-email")) {
        router.replace("/projects");
        return;
      }
    }
  }, [isAuthenticated, isLoading, isAuthPage, isStandalone, pathname, router, user]);

  // Loading screen prevents flashing protected content while verifying session
  if (isLoading && !isStandalone) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d16] text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 p-1 border border-teal-500/30 shadow-[0_0_30px_rgba(20,184,166,0.3)] flex items-center justify-center">
              <Image
                src="/app_logo.png"
                alt="ERytmo"
                width={48}
                height={48}
                priority
                className="rounded-xl object-contain animate-pulse"
              />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-teal-500/20 blur-md -z-10" />
          </div>
          <div className="flex items-center space-x-2 text-teal-400 text-sm font-semibold">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading ERytmo...</span>
          </div>
        </div>
      </div>
    );
  }

  // If on standalone page (landing / welcome / login / register), render full screen
  if (isStandalone) {
    return (
      <div className="h-full w-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {children}
      </div>
    );
  }

  // If unauthenticated and on a protected route, prevent rendering protected components while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated: Render full application with Sidebar
  return (
    <>
      <div className="shrink-0 h-full">
        <Sidebar />
      </div>

      <main className="flex-1 h-full min-w-0 overflow-hidden relative border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
        <div className="h-full w-full overflow-hidden flex flex-col">
          {children}
        </div>
      </main>

      <IncomingTransferModal />
    </>
  );
}
