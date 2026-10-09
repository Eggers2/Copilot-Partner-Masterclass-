import type { Metadata, Viewport } from "next";
import LinkedInLanding from "./LinkedInLanding";
import { getLandingKlassenRows } from "@/lib/klassen";
import { buildLandingKlassen } from "@/lib/landing/klassen";

// Landingpage nur für den LinkedIn-Boost (Kurzlink /li). Kleiner erster
// Schritt statt Bewerbung: E-Mail eintragen, One-Pager kommt per Mail.
// Nicht in Suchmaschinen, nicht in der Sitemap.

// Offene Klasse und Startmonat kommen live aus der DB, wie auf der Startseite.
export const dynamic = "force-dynamic";

// viewport-fit=cover, damit env(safe-area-inset-bottom) am iPhone greift
// (mobiler Sticky-Button über dem Home-Indikator).
export const viewport: Viewport = { viewportFit: "cover" };

export const metadata: Metadata = {
  title: "One-Pager zur Copilot Partner Masterclass | NextSkills",
  description:
    "Programm, Pakete und Preise der Copilot Partner Masterclass auf einer Seite. Der One-Pager kommt sofort per E-Mail.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const rows = await getLandingKlassenRows();
  const { offen } = buildLandingKlassen(rows ?? [], new Date());
  return <LinkedInLanding klasseName={offen.name} startMonat={offen.startMonat} />;
}
