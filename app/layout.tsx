import type { Metadata } from "next";
import "./globals.css";

/* ── Bundled CSS (Next.js inlines these into _next/static/css) ── */
import "./styles/css/bootstrap.min.css";
import "./styles/css/slick.min.css";
import "./styles/css/owl.carousel.min.css";
import "./styles/css/magnific-popup.min.css";
import "./styles/css/style.css";
import "./styles/css/responsive.css";
import "./styles/css/lfc-jahi-media.css";

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
        {/* Font Awesome & Ionicons served from CDN (font-face files need CDN hosting) */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
