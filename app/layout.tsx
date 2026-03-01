import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = "https://copilot.next-skills.de";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Microsoft Copilot Partner Masterclass | Next Skills",
  description:
    "Die Microsoft Copilot Partner Masterclass von Next Skills. Deine Blaupause für Consulting, Strategie und Adoption. Vom Lizenz-Schieber zum KI-Strategen.",
  keywords:
    "Microsoft Copilot, Partner Masterclass, KI-Strategie, Consulting, Next Skills, B2B, AI Adoption, Microsoft Partner, Copilot Adoption",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "Microsoft Copilot Partner Masterclass | Next Skills",
    description:
      "Vom Lizenz-Schieber zum KI-Strategen. Die Blaupause für Microsoft Partner.",
    type: "website",
    url: BASE_URL,
    siteName: "Next Skills",
    locale: "de_DE",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Microsoft Copilot Partner Masterclass – Next Skills",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Microsoft Copilot Partner Masterclass | Next Skills",
    description:
      "Vom Lizenz-Schieber zum KI-Strategen. Die Blaupause für Microsoft Partner.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
