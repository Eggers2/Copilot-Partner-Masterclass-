import type { Metadata } from "next";
import "./globals.css";

import { SITE_URL } from "@/lib/site";

const TITLE = "Copilot Partner Masterclass für Systemhäuser | NextSkills";
const DESCRIPTION =
  "Das 12-monatige Microsoft 365 Copilot Programm für Microsoft-Partner und Systemhäuser im DACH-Raum. Vom Lizenz-Reseller zum strategischen KI-Berater.";

// Kein canonical hier: Unterseiten würden es erben und alle auf die
// Startseite zeigen. Canonical setzt jede Seite selbst (siehe app/page.tsx).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Copilot Partner Masterclass",
    locale: "de_DE",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Copilot Partner Masterclass von NextSkills",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Figtree:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
