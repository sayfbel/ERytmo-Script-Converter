import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SettingsProvider } from "@/context/SettingsContext";
import { ConverterProvider } from "@/context/ConverterContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ERytmo Script Converter v2",
  description: "Next-gen script conversion tool",
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
          <ConverterProvider>
            {/* Sidebar */}
            <div className="shrink-0 h-full">
              <Sidebar />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 h-full min-w-0 overflow-hidden relative border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
              <div className="h-full w-full overflow-hidden flex flex-col">
                {children}
              </div>
            </main>
          </ConverterProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
