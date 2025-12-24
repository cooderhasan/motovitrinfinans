import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finans ERP",
  description: "Finansal Yonetim Sistemi",
};

import Providers from "./providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { DynamicHead } from "@/components/DynamicHead";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex bg-slate-50`}
      >
        <Providers>
          <DynamicHead />
          <Sidebar />
          <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto min-h-screen pt-16 md:pt-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

