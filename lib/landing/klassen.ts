import type { KlasseStatus } from "@prisma/client";
import { formatCalendar } from "@/lib/datetime";

/**
 * Aufbereitung der Klassen für die Startseite. Reine Funktionen ohne DB, damit
 * die Regeln (welche Klasse ist offen, was steht auf der Karte) testbar sind.
 */

export interface KlasseRow {
  id: string;
  name: string;
  kickoffDate: Date;
  status: KlasseStatus;
  capacity: number | null;
  belegt: number;
}

export type KlassenPhase =
  | "offen"
  | "ausgebucht"
  | "gestartet"
  | "laeuft"
  | "abgeschlossen";

export interface LandingKlasse {
  id: string;
  name: string;
  /** Nur Monat und Jahr, z.B. "Januar 2027". Genaue Termine stehen bewusst nicht auf der Seite. */
  startMonat: string;
  /** ISO-Monat "YYYY-MM" für strukturierte Daten. */
  startMonatIso: string;
  capacity: number | null;
  belegt: number;
  phase: KlassenPhase;
  /** Platz-Zähler anzeigen? Erst ab ZAEHLER_AB Belegungen, ein "0 / 20" wirkt leer. */
  zeigeZaehler: boolean;
}

export interface LandingKlassen {
  /** Die Klasse, für die man sich bewerben kann. */
  offen: LandingKlasse;
  /** Zeitleiste, älteste zuerst, höchstens MAX_ZEITLEISTE Einträge inklusive der offenen Klasse. */
  zeitleiste: LandingKlasse[];
  /** Klassen, die bereits gestartet sind (Kick-off in der Vergangenheit). */
  gestartet: number;
  /** Name der zuletzt gestarteten Klasse, wenn ihr Kick-off höchstens FRISCH_TAGE zurückliegt. */
  geradeGestartet: string | null;
}

export const MAX_ZEITLEISTE = 4;
/** Gestartete Klassen, falls die DB nichts liefert (Stand Klasse 3). */
export const FALLBACK_GESTARTET = 3;
/** Bis so viele Tage nach dem Kick-off gilt eine Klasse als "gerade gestartet". */
export const FRISCH_TAGE = 14;
/** Der Platz-Zähler erscheint erst ab dieser Belegung. Ein "0 / 20" wirkt leer. */
export const ZAEHLER_AB = 5;

/**
 * Gilt, wenn keine Klasse offen ist oder die DB nicht antwortet. Die Startseite
 * ist der Railway-Healthcheck und darf daran nie scheitern.
 */
export const FALLBACK_OFFEN: LandingKlasse = {
  id: "fallback",
  name: "Klasse 4",
  startMonat: "Januar 2027",
  startMonatIso: "2027-01",
  capacity: 20,
  belegt: 0,
  phase: "offen",
  zeigeZaehler: false,
};

const TAG_MS = 24 * 60 * 60 * 1000;

// Kick-off-Daten sind Kalendertage auf 00:00 UTC, also ohne Zonenumrechnung formatieren.
function startMonat(d: Date): string {
  return formatCalendar(d, { month: "long", year: "numeric" });
}

function startMonatIso(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function hatPlatz(k: KlasseRow): boolean {
  return k.capacity == null || k.belegt < k.capacity;
}

/**
 * Offen ist die erste Klasse mit Status OPEN und freier Kapazität, nach
 * Kick-off sortiert, also dieselbe Klasse, in die getNextOpenKlasse() neue
 * Bestellungen legt. Klassen im Status PLANNED erscheinen nicht.
 */
export function buildLandingKlassen(rows: KlasseRow[], now: Date): LandingKlassen {
  const sichtbar = rows
    .filter((k) => k.status !== "PLANNED")
    .sort((a, b) => a.kickoffDate.getTime() - b.kickoffDate.getTime());

  const offenRow = sichtbar.find((k) => k.status === "OPEN" && hatPlatz(k));

  const toView = (k: KlasseRow): LandingKlasse => {
    let phase: KlassenPhase;
    if (k === offenRow) phase = "offen";
    else if (k.status === "COMPLETED") phase = "abgeschlossen";
    else if (k.kickoffDate.getTime() > now.getTime()) phase = "ausgebucht";
    else if (now.getTime() - k.kickoffDate.getTime() <= FRISCH_TAGE * TAG_MS) phase = "gestartet";
    else phase = "laeuft";
    return {
      id: k.id,
      name: k.name,
      startMonat: startMonat(k.kickoffDate),
      startMonatIso: startMonatIso(k.kickoffDate),
      capacity: k.capacity,
      belegt: k.belegt,
      phase,
      zeigeZaehler: k.capacity != null && k.belegt >= ZAEHLER_AB,
    };
  };

  const views = sichtbar.map(toView);
  const offen = views.find((k) => k.phase === "offen") ?? FALLBACK_OFFEN;
  const zeitleiste = views.some((k) => k.phase === "offen") ? views : [...views, offen];

  const vergangen = sichtbar.filter((k) => k.kickoffDate.getTime() <= now.getTime());
  const letzte = vergangen[vergangen.length - 1];
  const geradeGestartet =
    letzte && now.getTime() - letzte.kickoffDate.getTime() <= FRISCH_TAGE * TAG_MS
      ? letzte.name
      : null;

  return {
    offen,
    zeitleiste: zeitleiste.slice(-MAX_ZEITLEISTE),
    gestartet: sichtbar.length === 0 ? FALLBACK_GESTARTET : vergangen.length,
    geradeGestartet,
  };
}
