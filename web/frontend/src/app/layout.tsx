import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";
import { ConverterProvider } from "@/context/ConverterContext";
import { AuthProvider } from "@/context/AuthContext";
import { SignalingProvider } from "@/context/SignalingContext";
import { ToastProvider } from "@/context/ToastContext";
import AppShell from "@/components/AppShell";


export const metadata: Metadata = {
  title: "DubFlow Studio* — Écosystème de Post-Synchronisation & Scripts",
  description:
    "L'écosystème nouvelle génération pour la post-synchronisation et l'adaptation de scripts. Convertissez instantanément vos bandes rythmo multi-formats, gérez vos productions et collaborez en toute sécurité grâce à une architecture locale à zéro stockage cloud.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans-display bg-[#F7F4EB] text-[#111111] overflow-hidden flex h-screen selection:bg-amber-400 selection:text-black">
        <SettingsProvider>
          <AuthProvider>
            <SignalingProvider>
              <ConverterProvider>
                <ToastProvider>
                  <AppShell>
                    {children}
                  </AppShell>
                </ToastProvider>
              </ConverterProvider>
            </SignalingProvider>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
