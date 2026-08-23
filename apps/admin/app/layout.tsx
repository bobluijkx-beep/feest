import type { Metadata } from "next";
import { Manrope, Geist_Mono, Anton } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Alleen geladen zodat de hero-blok-preview in /content/pages er hetzelfde uitziet als op
// de publieke site (apps/web/app/layout.tsx) — elders in de admin ongebruikt.
const anton = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Lionsclub Voorschoten — Admin",
  description: "Beheeromgeving voor het ticket- en eventplatform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${manrope.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
