import { getLandingKlassenRows } from "@/lib/klassen";
import { buildLandingKlassen } from "@/lib/landing/klassen";
import {
  buildFaqs,
  MITARBEITER_COUNT,
  PARTNER_COUNT,
  PARTNER_VIDEOS,
  PROGRAMM_DEFINITION,
  PROGRAMM_INHALT,
} from "@/lib/landing/inhalte";
import { SITE_URL } from "@/lib/site";

// /llms.txt: Kurzfassung der Webseite für Sprachmodelle (llmstxt.org).
// Liest dieselben Texte und Klassendaten wie die Startseite, damit beide
// dieselben Angaben machen.
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getLandingKlassenRows();
  const { offen } = buildLandingKlassen(rows ?? [], new Date());
  const faqs = buildFaqs(offen);

  const body = `# Copilot Partner Masterclass

> ${PROGRAMM_DEFINITION}

${PROGRAMM_INHALT}

## Eckdaten

- Anbieter: NextSkills GmbH
- Zielgruppe: Geschäftsführung, Vertrieb und Consultants von Microsoft-Partnern und IT-Systemhäusern
- Region: Deutschland, Österreich, Schweiz
- Laufzeit: 12 Monate
- Format: On-Demand-Videos plus Live-Sessions und Community in Microsoft Teams
- Live-Termine: 2x pro Monat
- Nächster Start: ${offen.name}, ${offen.startMonat}${offen.capacity != null ? ` (${offen.capacity} Plätze)` : ""}
- Pakete: für 3, 6 oder 15 Mitarbeitende, Konditionen im persönlichen Gespräch
- Teilnehmende bisher: ${PARTNER_COUNT} Systemhäuser, ${MITARBEITER_COUNT} Mitarbeitende
- Trainer: Alexander Eggers (Microsoft MVP für M365 und M365 Copilot), Michael Greth (Microsoft MVP)

## Partner im Interview

${PARTNER_VIDEOS.map((v) => `### ${v.name}, ${v.firma} (${v.klasse}): ${v.titel}\n\nVideo: ${SITE_URL}/videos/${v.slug}.mp4\n\n${v.abschrift}`).join("\n\n")}

## Häufige Fragen

${faqs.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## Seiten

- [Startseite und Bewerbung](${SITE_URL}/): Programm, Stimmen aus den Klassen, Ablauf, Bewerbung
- [Copilot-Partner finden](${SITE_URL}/suche): Karte aller zertifizierten Partner
- [Copilot Connect Day](${SITE_URL}/connect-day): Präsenz-Event der Community

## Kontakt

- E-Mail: info@next-skills.de
- Unternehmen: https://next-skills.de
- LinkedIn: https://www.linkedin.com/in/teams-pro/
- YouTube: https://www.youtube.com/@alexandereggers
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
