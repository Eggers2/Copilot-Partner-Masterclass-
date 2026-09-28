import { SITE_URL } from "@/lib/site";
import { PROGRAMM_DEFINITION, type Faq } from "@/lib/landing/inhalte";
import type { LandingKlasse } from "@/lib/landing/klassen";

/**
 * Strukturierte Daten der Startseite (schema.org). Preise bleiben bewusst
 * draußen, Termine nur als Monat.
 */
export function buildLandingJsonLd(offen: LandingKlasse, faqs: Faq[]) {
  const org = `${SITE_URL}/#organization`;
  const course = `${SITE_URL}/#course`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: "NextSkills GmbH",
        url: SITE_URL,
        logo: `${SITE_URL}/og-image.png`,
        email: "info@next-skills.de",
        description:
          "NextSkills ist auf Microsoft 365 Copilot Adoption und das Enablement von Microsoft-Partnern im DACH-Raum spezialisiert.",
        sameAs: [
          "https://next-skills.de",
          "https://www.linkedin.com/in/teams-pro/",
          "https://www.youtube.com/@alexandereggers",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Copilot Partner Masterclass",
        inLanguage: "de",
        publisher: { "@id": org },
      },
      {
        "@type": "Course",
        "@id": course,
        name: "Copilot Partner Masterclass",
        description: PROGRAMM_DEFINITION,
        url: SITE_URL,
        provider: { "@id": org },
        inLanguage: "de",
        educationalLevel: "Professional",
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Microsoft-Partner und IT-Systemhäuser in Deutschland, Österreich und der Schweiz",
        },
        about: ["Microsoft 365 Copilot", "Copilot-Beratung", "KI-Adoption"],
        instructor: [
          {
            "@type": "Person",
            name: "Alexander Eggers",
            jobTitle: "Microsoft MVP für M365 und M365 Copilot",
            image: `${SITE_URL}/trainer-alexander-eggers.png`,
          },
          {
            "@type": "Person",
            name: "Michael Greth",
            jobTitle: "Microsoft MVP",
            image: `${SITE_URL}/trainer-michael-greth.png`,
          },
        ],
        hasCourseInstance: {
          "@type": "CourseInstance",
          name: `Copilot Partner Masterclass, ${offen.name}`,
          courseMode: "online",
          location: { "@type": "VirtualLocation", name: "Microsoft Teams" },
          startDate: offen.startMonatIso,
          courseWorkload: "P12M",
          inLanguage: "de",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}
