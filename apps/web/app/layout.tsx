import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lionsclub Voorschoten — Feest",
  description: "Goededoelenfeest van Lionsclub Voorschoten",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
