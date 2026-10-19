import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interface Doctor AI — Team DebugMD",
  description:
    "Upload a screenshot of your website or app and get an AI-powered diagnosis of interface problems, with prioritized findings and suggested fixes.",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
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
      <body className="min-h-screen bg-ink-100 font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
