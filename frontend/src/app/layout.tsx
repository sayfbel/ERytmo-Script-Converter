import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";
import { ConverterProvider } from "@/context/ConverterContext";
import { AuthProvider } from "@/context/AuthContext";
import { SignalingProvider } from "@/context/SignalingContext";
import AppShell from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DubFlow Studio* — Écosystème de Post-Synchronisation & Scripts",
  description:
    "L'écosystème nouvelle génération pour la post-synchronisation et l'adaptation de scripts. Convertissez instantanément vos bandes rythmo multi-formats, gérez vos productions et collaborez en toute sécurité grâce à une architecture locale à zéro stockage cloud.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.className} bg-slate-50 text-slate-900 overflow-hidden flex h-screen dark:bg-slate-900 dark:text-slate-100`}>
        <SettingsProvider>
          <AuthProvider>
            <SignalingProvider>
              <ConverterProvider>
                <AppShell>
                  {children}
                </AppShell>
              </ConverterProvider>
            </SignalingProvider>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
