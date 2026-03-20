import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = "https://copilot.next-skills.de";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Copilot Partner Masterclass | NextSkills",
  description:
    "Vom Lizenz-Reseller zum strategischen KI-Berater. Das erste spezialisierte Copilot-Programm für Microsoft-Partner im DACH-Raum.",
  keywords:
    "Microsoft Copilot, Partner Masterclass, KI-Berater, Consulting, NextSkills, Systemhaus, AI Adoption, Microsoft Partner, Copilot Adoption, DACH",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "Copilot Partner Masterclass | NextSkills",
    description:
      "Vom Lizenz-Reseller zum strategischen KI-Berater. Das erste spezialisierte Copilot-Programm für Microsoft-Partner im DACH-Raum.",
    type: "website",
    url: BASE_URL,
    siteName: "NextSkills",
    locale: "de_DE",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Copilot Partner Masterclass – NextSkills",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Copilot Partner Masterclass | NextSkills",
    description:
      "Vom Lizenz-Reseller zum strategischen KI-Berater. Das erste spezialisierte Copilot-Programm für Microsoft-Partner im DACH-Raum.",
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
