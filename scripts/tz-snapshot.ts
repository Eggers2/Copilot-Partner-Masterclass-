/**
 * Snapshot aller Datumsfelder, so wie das Portal sie anzeigt.
 *
 * Zweck: nachweisen, dass die Zeitzonen-Umstellung keine einzige angezeigte
 * Uhrzeit verschiebt. Einmal vor dem Deployment laufen lassen, einmal danach,
 * dann `tz-vergleich.ts` ueber beide Dateien.
 *
 *   npx tsx scripts/tz-snapshot.ts --stand=vorher  --out=vorher.json
 *   npx tsx scripts/tz-snapshot.ts --stand=nachher --out=nachher.json
 *
 * `--stand` sagt, welcher Code gerade laeuft, nicht was in der DB steht:
 *
 *   vorher   altes Verhalten – der gespeicherte Wert wurde roh als Ortszeit
 *            ausgegeben (`toISOString().slice(0,16)` bzw. `toLocaleString`
 *            ohne timeZone auf einem UTC-Server).
 *   nachher  neues Verhalten – der gespeicherte UTC-Wert wird nach
 *            Europe/Berlin umgerechnet.
 *
 * Kategorien:
 *   termin      vom Nutzer gesetzte Termine. Muessen vorher und nachher exakt
 *               gleich sein, sonst ist die Umstellung fehlgeschlagen.
 *   kalender    reine Kalenderdaten (@db.Date, Klassen-Laufzeiten). Werden nie
 *               umgerechnet, muessen ebenfalls gleich bleiben.
 *   system      automatisch gesetzte Zeitstempel. Die wurden bisher als UTC
 *               angezeigt und zeigen danach die richtige Ortszeit. Hier sind
 *               Abweichungen erwartet und werden getrennt ausgewiesen.
 */

import { writeFileSync } from "fs";
import { prisma } from "../lib/prisma";
import { formatBerlinDateTime, formatCalendarDate, naiveReading } from "../lib/datetime";

type Stand = "vorher" | "nachher";
type Kategorie = "termin" | "kalender" | "system";

/**
 * Wie der ALTE Code dieses Feld angezeigt hat. Entscheidend, weil die
 * Umstellung nicht alle Felder gleich getroffen hat:
 *
 *   naiv    Anzeige ohne timeZone auf einem UTC-Server, der gespeicherte Wert
 *           wurde also roh als Ortszeit ausgegeben. Betrifft Lead.followUpAt
 *           (LeadsTable, LeadDetailPanel, FollowUpWidget) und die
 *           System-Zeitstempel in den Admin-Tabellen.
 *   berlin  Anzeige hatte bereits timeZone: "Europe/Berlin". Betrifft
 *           Webinar.scheduledAt (WebinarCard, Detailansicht, oeffentliche
 *           Webinarseite), KlasseTermin.datum (KlasseTermine.formatDatum) und
 *           die Connect-Day-Felder (toBerlinLocalInput). Diese Felder wurden
 *           schon vorher korrekt angezeigt und duerfen sich nicht bewegen.
 */
type AltAnzeige = "naiv" | "berlin";

interface Eintrag {
  tabelle: string;
  id: string;
  bezeichnung: string;
  feld: string;
  kategorie: Kategorie;
  rohUtc: string;
  anzeige: string;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split("=").slice(1).join("=");
}

/** Wie der jeweilige Stand des Codes einen Zeitstempel darstellt. */
function anzeige(wert: Date, kategorie: Kategorie, alt: AltAnzeige, stand: Stand): string {
  if (kategorie === "kalender") return formatCalendarDate(wert);
  if (stand === "nachher") return formatBerlinDateTime(wert);
  return alt === "naiv" ? naiveReading(wert) : formatBerlinDateTime(wert);
}

async function main() {
  const stand = (arg("stand") ?? "") as Stand;
  if (stand !== "vorher" && stand !== "nachher") {
    console.error("Bitte --stand=vorher oder --stand=nachher angeben.");
    process.exit(1);
  }
  const out = arg("out") ?? `tz-snapshot-${stand}.json`;

  const eintraege: Eintrag[] = [];
  const add = (
    tabelle: string,
    id: string | number,
    bezeichnung: string,
    feld: string,
    kategorie: Kategorie,
    alt: AltAnzeige,
    wert: Date | null | undefined
  ) => {
    if (!wert) return;
    eintraege.push({
      tabelle,
      id: String(id),
      bezeichnung,
      feld,
      kategorie,
      rohUtc: wert.toISOString(),
      anzeige: anzeige(wert, kategorie, alt, stand),
    });
  };

  // ── Termine: vom Nutzer eingegeben ────────────────────────────────────────
  const leads = await prisma.lead.findMany({
    where: { followUpAt: { not: null } },
    select: { id: true, email: true, followUpAt: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  for (const l of leads) {
    add("Lead", l.id, l.email, "followUpAt", "termin", "naiv", l.followUpAt);
    add("Lead", l.id, l.email, "createdAt", "system", "naiv", l.createdAt);
  }

  const webinare = await prisma.webinar.findMany({
    select: { id: true, title: true, scheduledAt: true },
    orderBy: { id: "asc" },
  });
  for (const w of webinare) add("Webinar", w.id, w.title, "scheduledAt", "termin", "berlin", w.scheduledAt);

  const termine = await prisma.klasseTermin.findMany({
    select: { id: true, datum: true, thema: true, klasse: { select: { name: true } } },
    orderBy: { id: "asc" },
  });
  for (const t of termine)
    add("KlasseTermin", t.id, `${t.klasse.name} – ${t.thema ?? "ohne Thema"}`, "datum", "termin", "berlin", t.datum);

  const events = await prisma.event.findMany({
    select: {
      id: true,
      name: true,
      startAt: true,
      endAt: true,
      anmeldestart: true,
      anmeldeschluss: true,
    },
    orderBy: { id: "asc" },
  });
  for (const e of events) {
    add("Event", e.id, e.name, "startAt", "termin", "berlin", e.startAt);
    add("Event", e.id, e.name, "endAt", "termin", "berlin", e.endAt);
    add("Event", e.id, e.name, "anmeldestart", "termin", "berlin", e.anmeldestart);
    add("Event", e.id, e.name, "anmeldeschluss", "termin", "berlin", e.anmeldeschluss);
  }

  // ── Kalenderdaten: Tage, keine Zeitpunkte ─────────────────────────────────
  const klassen = await prisma.klasse.findMany({
    select: { id: true, name: true, kickoffDate: true, startDate: true, endDate: true },
    orderBy: { id: "asc" },
  });
  for (const k of klassen) {
    add("Klasse", k.id, k.name, "kickoffDate", "kalender", "berlin", k.kickoffDate);
    add("Klasse", k.id, k.name, "startDate", "kalender", "berlin", k.startDate);
    add("Klasse", k.id, k.name, "endDate", "kalender", "berlin", k.endDate);
  }

  const scores = await prisma.firstCallScore.findMany({
    where: { followUpDate: { not: null } },
    select: { id: true, followUpDate: true, lead: { select: { email: true } } },
    orderBy: { id: "asc" },
  });
  for (const s of scores)
    add("FirstCallScore", s.id, s.lead.email, "followUpDate", "kalender", "berlin", s.followUpDate);

  const tasks = await prisma.task.findMany({
    where: { deadline: { not: null } },
    select: { id: true, title: true, deadline: true },
    orderBy: { id: "asc" },
  });
  for (const t of tasks) add("Task", t.id, t.title, "deadline", "kalender", "berlin", t.deadline);

  const zaehler = eintraege.reduce<Record<string, number>>((acc, e) => {
    acc[e.kategorie] = (acc[e.kategorie] ?? 0) + 1;
    return acc;
  }, {});

  writeFileSync(
    out,
    JSON.stringify({ stand, erstelltAm: new Date().toISOString(), zaehler, eintraege }, null, 2)
  );

  console.log(`Snapshot "${stand}" geschrieben nach ${out}`);
  console.log(
    `  ${eintraege.length} Werte  (Termine: ${zaehler.termin ?? 0}, ` +
      `Kalender: ${zaehler.kalender ?? 0}, System: ${zaehler.system ?? 0})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
