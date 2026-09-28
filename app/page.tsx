import type { Metadata } from "next";
import LandingPage from "./LandingPage";
import { getLandingKlassenRows } from "@/lib/klassen";
import { buildLandingKlassen } from "@/lib/landing/klassen";
import { buildFaqs, PARTNER_COUNT, MITARBEITER_COUNT } from "@/lib/landing/inhalte";
import { buildLandingJsonLd } from "@/lib/landing/schema";

// Klassen und Belegung kommen live aus der DB → kein Static Render.
// Welche Klasse als offen gilt, steuert der Admin unter Klassen (Status OPEN).
export const dynamic = "force-dynamic";

async function loadKlassen() {
  const rows = await getLandingKlassenRows();
  return buildLandingKlassen(rows ?? [], new Date());
}

const TITLE = "Copilot Partner Masterclass für Systemhäuser | NextSkills";

export async function generateMetadata(): Promise<Metadata> {
  const { offen } = await loadKlassen();
  const description = `Das 12-monatige Microsoft 365 Copilot Programm für Microsoft-Partner und Systemhäuser im DACH-Raum. Über ${PARTNER_COUNT.replace("+", "")} Systemhäuser sind dabei, ${offen.name} startet im ${offen.startMonat}.`;
  return {
    title: TITLE,
    description,
    // Canonical nur hier, nicht im Root-Layout: dort würde es jede Unterseite
    // erben und alle auf die Startseite zeigen lassen.
    alternates: { canonical: "/" },
    openGraph: { title: TITLE, description, url: "/" },
    twitter: { title: TITLE, description },
  };
}

export default async function Page() {
  const klassen = await loadKlassen();
  const faqs = buildFaqs(klassen.offen);
  const jsonLd = buildLandingJsonLd(klassen.offen, faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <LandingPage
        partnerCount={PARTNER_COUNT}
        mitarbeiterCount={MITARBEITER_COUNT}
        klassen={klassen}
        faqs={faqs}
      />
    </>
  );
}
