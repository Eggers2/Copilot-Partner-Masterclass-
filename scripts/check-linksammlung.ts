/**
 * Smoke-Test für die Linksammlung-API-Anbindung.
 *
 * Prüft isoliert (ohne Claude, ohne eigene DB), ob die Linksammlung-API mit
 * dem hinterlegten Token erreichbar ist und Links liefert.
 *
 * Aufruf – Token muss in der Umgebung liegen, z.B.:
 *   LINKSAMMLUNG_API_TOKEN=dein-token npx tsx scripts/check-linksammlung.ts
 * oder mit einer .env.local (Node >= 20):
 *   node --env-file=.env.local --import tsx scripts/check-linksammlung.ts
 */
import { fetchLinks } from "../lib/newsletter/linksammlung";

async function main() {
  const links = await fetchLinks({ limit: 5 });
  console.log(`OK – ${links.length} Link(s) von der Linksammlung erhalten:\n`);
  for (const l of links) {
    console.log(`• [${l.category ?? "ohne Kategorie"}] ${l.titleDe ?? l.title ?? "(kein Titel)"}`);
    console.log(`  ${l.siteName ?? ""}  ${l.url}`);
  }
  if (links.length === 0) {
    console.log("(Keine Links – ggf. Filter/Token prüfen.)");
  }
}

main().catch((err) => {
  console.error("Fehler:", err instanceof Error ? err.message : err);
  process.exit(1);
});
