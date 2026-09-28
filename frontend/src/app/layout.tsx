import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/context/SettingsContext";
import { ConverterProvider } from "@/context/ConverterContext";
import { AuthProvider } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERytmo Script Converter v2",
  description: "Next-gen script conversion tool",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 overflow-hidden flex h-screen dark:bg-slate-900 dark:text-slate-100`}>
        <SettingsProvider>
          <AuthProvider>
            <ConverterProvider>
              <AppShell>
                {children}
              </AppShell>
            </ConverterProvider>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
