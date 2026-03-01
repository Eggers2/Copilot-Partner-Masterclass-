import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Microsoft Copilot Partner Masterclass | Next Skills",
  description:
    "Die Microsoft Copilot Partner Masterclass von Next Skills. Deine Blaupause für Consulting, Strategie und Adoption. Vom Lizenz-Schieber zum KI-Strategen.",
  keywords:
    "Microsoft Copilot, Partner Masterclass, KI-Strategie, Consulting, Next Skills, B2B, AI Adoption",
  openGraph: {
    title: "Microsoft Copilot Partner Masterclass | Next Skills",
    description:
      "Vom Lizenz-Schieber zum KI-Strategen. Die Blaupause für Microsoft Partner.",
    type: "website",
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
