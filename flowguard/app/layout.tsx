import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowGuard — Release Intelligence",
  description: "We detect hidden delays before your product misses deadline.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "#0A0C10",
          color: "#E5E7EB",
          minHeight: "100vh",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}