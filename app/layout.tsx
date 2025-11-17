import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Task Manager",
  description: "Intelligent task management with workload balancing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
