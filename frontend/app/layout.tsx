import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Schedule Optimizer",
  description: "Optimal assignment scheduling using DP algorithms",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <nav className="bg-[#0055A2] px-6 py-4 flex items-center gap-8">
          <span className="font-bold text-lg text-[#E5A823] tracking-tight">Schedule Optimizer</span>
          <Link href="/" className="text-sm text-white/80 hover:text-[#E5A823] font-medium transition-colors">
            My Schedule
          </Link>
          <Link href="/results" className="text-sm text-white/80 hover:text-[#E5A823] font-medium transition-colors">
            Optimizer
          </Link>
          <Link href="/add" className="ml-auto text-sm bg-[#E5A823] text-[#0055A2] px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors font-semibold">
            + Add Assignment
          </Link>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8 w-full">{children}</main>
      </body>
    </html>
  );
}
