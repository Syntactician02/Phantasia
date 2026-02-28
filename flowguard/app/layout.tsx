import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowGuard — Release Intelligence",
  description: "We detect hidden delays before your product misses deadline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen relative z-10">{children}</body>
    </html>
  );
}