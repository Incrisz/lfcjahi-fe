import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LFC-JAHI MEDIA",
  description: "LFC-JAHI MEDIA audio message library",
  keywords: ["LFC-JAHI MEDIA", "Audio Messages", "Sermons"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="shortcut icon" href="/assets/images/favicon.png" />
        <link rel="stylesheet" href="/assets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/css/style.css" />
        <link rel="stylesheet" href="/assets/css/responsive.css" />
        <link rel="stylesheet" href="/assets/css/lfc-jahi-media.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
