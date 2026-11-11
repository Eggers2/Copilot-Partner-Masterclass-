/**
 * Öffentliche Basis-URL der Webseite, ohne abschließenden Slash.
 *
 * Canonical, Open Graph, JSON-LD, robots.txt, Sitemap und llms.txt müssen
 * alle dieselbe Domain nennen. Zeigen sie auf unterschiedliche Domains, wertet
 * Google die Startseite als Duplikat einer fremden Seite.
 */
export const SITE_URL = (
  process.env.APP_BASE_URL?.trim() || "https://www.copilotberater.de"
).replace(/\/+$/, "");

/**
 * Vorschaubild für LinkedIn, Teams & Co. (1200×630, unter 5 MB, sonst zeigt
 * LinkedIn nur ein Platzhalter-Symbol). Nach einem neuen Motiv den Dateinamen
 * hochzählen, LinkedIn cacht das Bild pro URL.
 */
export const OG_IMAGE = {
  url: "/og-image-v2.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "Copilot Partner Masterclass von NextSkills",
} as const;
