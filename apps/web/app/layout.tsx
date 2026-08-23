import type { Metadata } from "next";
import { Manrope, Geist_Mono, Anton } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Fors/grotesk kopletterype, alleen voor hero-titels/sectiekoppen op de publieke site —
// Manrope blijft voor lopende tekst. Anton heeft maar één gewicht (400).
const anton = Anton({ variable: "--font-display", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Lionsclub Voorschoten — Feest",
  description: "Goededoelenfeest van Lionsclub Voorschoten",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${manrope.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
