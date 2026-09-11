/**
 * Vergleicht zwei Snapshots aus tz-snapshot.ts und meldet jede Abweichung.
 *
 *   npx tsx scripts/tz-vergleich.ts vorher.json nachher.json
 *
 * Erwartetes Ergebnis fuer Termine und Kalenderdaten: null Abweichungen.
 * Bei auch nur einer Abweichung endet das Skript mit Exit-Code 1, dann sollte
 * das Deployment zurueckgerollt werden.
 *
 * Systemzeitstempel (createdAt und Verwandte) werden getrennt ausgewiesen.
 * Die wurden vorher als UTC angezeigt und zeigen nachher die richtige
 * deutsche Ortszeit; diese Differenz ist gewollt und laesst den Vergleich
 * nicht scheitern.
 */

import { readFileSync } from "fs";

interface Eintrag {
  tabelle: string;
  id: string;
  bezeichnung: string;
  feld: string;
  kategorie: "termin" | "kalender" | "system";
  rohUtc: string;
  anzeige: string;
}

interface Snapshot {
  stand: string;
  erstelltAm: string;
  eintraege: Eintrag[];
}

const [, , vorherPfad, nachherPfad] = process.argv;
if (!vorherPfad || !nachherPfad) {
  console.error("Aufruf: npx tsx scripts/tz-vergleich.ts <vorher.json> <nachher.json>");
  process.exit(1);
}

const vorher: Snapshot = JSON.parse(readFileSync(vorherPfad, "utf8"));
const nachher: Snapshot = JSON.parse(readFileSync(nachherPfad, "utf8"));

const schluessel = (e: Eintrag) => `${e.tabelle}|${e.id}|${e.feld}`;
const nachherMap = new Map(nachher.eintraege.map((e) => [schluessel(e), e]));
const vorherMap = new Map(vorher.eintraege.map((e) => [schluessel(e), e]));

const abweichungen: { e: Eintrag; war: string; ist: string }[] = [];
const systemAbweichungen: { e: Eintrag; war: string; ist: string }[] = [];
const verschwunden: Eintrag[] = [];
const neu: Eintrag[] = [];

for (const e of vorher.eintraege) {
  const n = nachherMap.get(schluessel(e));
  if (!n) {
    verschwunden.push(e);
    continue;
  }
  if (n.anzeige === e.anzeige) continue;
  (e.kategorie === "system" ? systemAbweichungen : abweichungen).push({
    e,
    war: e.anzeige,
    ist: n.anzeige,
  });
}
for (const e of nachher.eintraege) if (!vorherMap.has(schluessel(e))) neu.push(e);

console.log(`vorher : ${vorherPfad}  (${vorher.eintraege.length} Werte, ${vorher.erstelltAm})`);
console.log(`nachher: ${nachherPfad}  (${nachher.eintraege.length} Werte, ${nachher.erstelltAm})\n`);

if (systemAbweichungen.length > 0) {
  console.log(
    `${systemAbweichungen.length} Systemzeitstempel zeigen jetzt deutsche Ortszeit statt UTC. ` +
      `Das ist gewollt.`
  );
  for (const { e, war, ist } of systemAbweichungen.slice(0, 3)) {
    console.log(`  ${e.tabelle}.${e.feld}  ${e.bezeichnung}:  ${war}  →  ${ist}`);
  }
  if (systemAbweichungen.length > 3) console.log(`  … und ${systemAbweichungen.length - 3} weitere`);
  console.log();
}

if (verschwunden.length > 0 || neu.length > 0) {
  console.log(
    `Hinweis: ${verschwunden.length} Werte fehlen im zweiten Snapshot, ${neu.length} sind neu ` +
      `hinzugekommen. Zwischen den beiden Laeufen wurde im Portal gearbeitet.`
  );
  for (const e of [...verschwunden.slice(0, 5)]) {
    console.log(`  fehlt: ${e.tabelle}.${e.feld}  ${e.bezeichnung}  (${e.anzeige})`);
  }
  console.log();
}

if (abweichungen.length === 0) {
  console.log("Null Abweichungen bei Terminen und Kalenderdaten. Die Umstellung ist sauber.");
  process.exit(0);
}

console.log(`${abweichungen.length} ABWEICHUNG(EN) bei Terminen oder Kalenderdaten:\n`);
for (const { e, war, ist } of abweichungen) {
  console.log(`  ${e.tabelle}.${e.feld}  ${e.bezeichnung}`);
  console.log(`    vorher  ${war}`);
  console.log(`    nachher ${ist}`);
  console.log(`    id ${e.id}`);
}
console.log("\nDeployment zuruecknehmen und den Stand melden, nicht nachbessern.");
process.exit(1);
