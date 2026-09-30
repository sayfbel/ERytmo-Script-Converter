"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import IncomingTransferModal from "@/components/IncomingTransferModal";

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/complete-profile",
  "/forgot-password",
  "/reset-password",
];

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
      // 2. Unskippable onboarding check: must have job_type to access protected workspace
      // Landing page (welcome) is accessible; workspace routes force complete-profile
      if (!user?.job_type && !isLandingPage && pathname !== "/complete-profile" && pathname !== "/login") {
        router.replace("/complete-profile");
        return;
      }

      // 3. If profile is complete and on login/register/complete-profile, send to workspace
      if (
        user?.job_type &&
        (pathname === "/login" || pathname === "/register" || pathname === "/complete-profile")
      ) {
        router.replace("/projects");
        return;
      }
    }
  }, [isAuthenticated, isLoading, isAuthPage, isStandalone, isLandingPage, pathname, router, user]);

  // Prevent flashing protected content while verifying session
  if (isLoading && !isStandalone) {
    return null;
  }

  // If on standalone page (landing / welcome / login / register), render full screen
  if (isStandalone) {
    return (
      <div className="h-full w-full overflow-y-auto scroll-smooth bg-[#070707] text-[#f4efe6]">
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

      <main className="flex-1 h-full min-w-0 overflow-hidden relative border-l border-slate-200/80 dark:border-white/[0.08] bg-[#f8fafc] dark:bg-[#09090b] text-slate-800 dark:text-[#f4efe6] shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.7)]">
        <div className="h-full w-full overflow-hidden flex flex-col">
          {children}
        </div>
      </main>

      <IncomingTransferModal />
    </>
  );
}
