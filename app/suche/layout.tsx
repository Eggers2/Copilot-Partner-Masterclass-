import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Copilot-Berater finden | copilotberater.de",
  description:
    "Finden Sie zertifizierte Microsoft Copilot Partner und Berater in Ihrer Nähe – in Deutschland, Österreich und der Schweiz. Einfach PLZ oder Ort eingeben.",
  alternates: { canonical: "/suche" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Copilot-Berater in Ihrer Nähe finden",
    description:
      "Zertifizierte Microsoft Copilot Partner im DACH-Raum – per PLZ oder Ort den passenden Berater finden.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function SucheLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
