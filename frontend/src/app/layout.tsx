import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "MysteryOS — AI Investigation Platform",
  description: "Domain-independent AI investigation workspace for multi-dataset anomaly detection, knowledge graphs, chronological timelines, and evidence-grounded hypotheses.",
  keywords: ["AI Investigation", "Anomaly Detection", "Knowledge Graph", "Forensic Analytics", "RAG Copilot"],
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased selection:bg-teal-500/20 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}
