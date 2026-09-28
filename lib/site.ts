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
