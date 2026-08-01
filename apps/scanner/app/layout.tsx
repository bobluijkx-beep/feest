import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lionsclub Voorschoten — Scanner",
  description: "Check-in-app voor toegangscontrole",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a7a2f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
