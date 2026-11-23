import type { Metadata, Viewport } from "next";
import { Inter_Tight, Saira_Condensed } from "next/font/google";
import "./globals.css";

const text = Inter_Tight({ subsets: ["latin"], variable: "--font-text", display: "swap" });
const display = Saira_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "blitz.",
  description: "Call the quarter. A live NFL prediction game for friends.",
  appleWebApp: { capable: true, title: "blitz.", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#070708",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${text.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
