import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lionsclub Voorschoten — Scanner",
  description: "Check-in-app voor toegangscontrole",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
