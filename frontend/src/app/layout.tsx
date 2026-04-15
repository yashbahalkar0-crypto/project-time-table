import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChronoTable — Intelligent College Timetable Generator",
  description:
    "AI-powered timetable generation system for colleges and universities. Automatically create conflict-free schedules with constraint optimization.",
  keywords: "timetable, scheduling, college, university, AI, optimization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
