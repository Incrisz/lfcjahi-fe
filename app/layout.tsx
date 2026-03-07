import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LFC Jahi Admin",
  description: "Administrative dashboard for LFC Jahi",
  keywords: ["LFC Jahi", "Admin", "Dashboard"],
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
