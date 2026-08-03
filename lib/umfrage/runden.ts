import { prisma } from "@/lib/prisma";
import { berlinDateString, diffBerlinTage } from "@/lib/datetime";
import { ROTIERENDE_INHALTE, UMFRAGE_STICHTAG } from "./fragen";
import type { Jahreszeit } from "@prisma/client";

/**
 * Runden-Erzeugung der Stand-Abfrage. Eine Runde je Klasse entsteht am ersten
 * Werktag des Monats (Cron-Scan, kein Event-Hook), sofern die Klasse seit der
 * letzten Runde mindestens einen durchgeführten Termin hatte. Der Scan liest
 * nur den Ist-Zustand und ist dadurch idempotent: Termin-Statuswechsel in
 * beide Richtungen zwischen zwei Läufen sind folgenlos.
 */

// Bundesweite Feiertage mit festem Datum ("MM-DD"). Bewegliche Feiertage
// (Karfreitag usw.) sind bewusst ignoriert: schlimmstenfalls geht eine Mail
// an einem Feiertag raus.
const FESTE_FEIERTAGE = ["01-01", "05-01", "10-03", "12-25", "12-26"];

/** Erster Tag des Monats (Mo bis Fr, kein fester Feiertag) als "YYYY-MM-DD". */
export function ersterWerktagDesMonats(jahr: number, monat: number): string {
  for (let tag = 1; tag <= 7; tag++) {
    const wochentag = new Date(Date.UTC(jahr, monat - 1, tag)).getUTCDay(); // 0=So
    const mmdd = `${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
    if (wochentag >= 1 && wochentag <= 5 && !FESTE_FEIERTAGE.includes(mmdd)) {
      return `${jahr}-${mmdd}`;
    }
  }
  // Nach spätestens 7 Tagen ist immer ein Werktag gefunden.
  return `${jahr}-${String(monat).padStart(2, "0")}-01`;
}

function tageZwischenDatumStrings(a: string, b: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

/** Kalendertage seit Programmstart der Klasse am Stichtag (Europe/Berlin). */
export function berechneProgrammtag(startDate: Date, stichtag: Date): number {
  return diffBerlinTage(startDate, stichtag);
}

/**
 * Jahreszeit der Runde (Störgröße für den Kohortenvergleich, steuert die
 * Erinnerung): 15.12. bis 07.01. ist JAHRESWECHSEL; liegt ein ferien-markierter
 * Termin der Klasse im Fenster Stichtag ±14 Tage, ist es FERIENFENSTER.
 */
export async function berechneJahreszeit(
  klasseId: string,
  stichtag: Date
): Promise<Jahreszeit> {
  const mmdd = berlinDateString(stichtag).slice(5);
  if (mmdd >= "12-15" || mmdd <= "01-07") return "JAHRESWECHSEL";

  const fenster = 14 * 86_400_000;
  const ferienTermin = await prisma.klasseTermin.findFirst({
    where: {
      klasseId,
      ferien: true,
      datum: {
        gte: new Date(stichtag.getTime() - fenster),
        lte: new Date(stichtag.getTime() + fenster),
      },
    },
    select: { id: true },
  });
  return ferienTermin ? "FERIENFENSTER" : "NORMAL";
}

export interface RundenSyncErgebnis {
  imFenster: boolean;
  ergebnisse: {
    klasse: string;
    aktion: "angelegt" | "uebersprungen";
    grund?: string;
    nummer?: number;
  }[];
}

/**
 * Legt fällige Runden an. Feuert nur im Monats-Fenster: ab dem ersten Werktag
 * bis 6 Tage danach (Nachholfenster, falls der Cron am ersten Werktag
 * ausfällt). Pro Klasse und Monat entsteht höchstens eine Runde; die
 * Vorgänger-Runde wird in derselben Transaktion geschlossen.
 *
 * `erzwingen` überspringt nur die Fenster-Prüfung (Admin-Button "Runden jetzt
 * prüfen"); Monats-Idempotenz und Termin-Schutz gelten weiterhin.
 */
export async function syncUmfrageRunden(
  jetzt: Date = new Date(),
  erzwingen = false
): Promise<RundenSyncErgebnis> {
  const heute = berlinDateString(jetzt);
  const [jahr, monat] = heute.split("-").map(Number);
  const ersterWerktag = ersterWerktagDesMonats(jahr, monat);
  const imFenster =
    heute >= ersterWerktag && tageZwischenDatumStrings(ersterWerktag, heute) <= 6;
  if (!imFenster && !erzwingen) return { imFenster: false, ergebnisse: [] };

  const klassen = await prisma.klasse.findMany({
    where: { status: { notIn: ["PLANNED", "COMPLETED"] } },
    orderBy: { startDate: "asc" },
  });

  const ergebnisse: RundenSyncErgebnis["ergebnisse"] = [];
  const monatsPrefix = heute.slice(0, 7); // "YYYY-MM"

  for (const klasse of klassen) {
    const letzteRunde = await prisma.umfrageRunde.findFirst({
      where: { klasseId: klasse.id },
      orderBy: { nummer: "desc" },
    });

    // Monats-Idempotenz: höchstens eine Runde pro Klasse und Kalendermonat.
    if (letzteRunde && berlinDateString(letzteRunde.stichtag).startsWith(monatsPrefix)) {
      ergebnisse.push({
        klasse: klasse.name,
        aktion: "uebersprungen",
        grund: `Runde ${letzteRunde.nummer} existiert in diesem Monat bereits.`,
      });
      continue;
    }

    // Schutz gegen leere Runden: ohne durchgeführten Termin seit der letzten
    // Runde (bzw. seit Programmstart/Rollout-Stichtag) wird der Monat
    // übersprungen, damit bei verschobenen Sessions kein leerer Fragebogen
    // rausgeht.
    const cutoff = letzteRunde
      ? letzteRunde.stichtag
      : new Date(
          Math.max(klasse.startDate.getTime(), new Date(UMFRAGE_STICHTAG).getTime())
        );
    const ausloeser = await prisma.klasseTermin.findFirst({
      where: {
        klasseId: klasse.id,
        status: "DURCHGEFUEHRT",
        datum: letzteRunde ? { gt: cutoff, lte: jetzt } : { gte: cutoff, lte: jetzt },
      },
      select: { id: true },
    });
    if (!ausloeser) {
      ergebnisse.push({
        klasse: klasse.name,
        aktion: "uebersprungen",
        grund: "Kein durchgeführter Termin seit der letzten Runde.",
      });
      continue;
    }

    const nummer = (letzteRunde?.nummer ?? 0) + 1;
    const jahreszeit = await berechneJahreszeit(klasse.id, jetzt);

    await prisma.$transaction([
      prisma.umfrageRunde.updateMany({
        where: { klasseId: klasse.id, status: "OFFEN" },
        data: { status: "ABGESCHLOSSEN", abgeschlossenAm: jetzt },
      }),
      prisma.umfrageRunde.create({
        data: {
          klasseId: klasse.id,
          nummer,
          stichtag: jetzt,
          programmtag: berechneProgrammtag(klasse.startDate, jetzt),
          jahreszeit,
          rotierenderInhalt:
            ROTIERENDE_INHALTE[(nummer - 1) % ROTIERENDE_INHALTE.length],
        },
      }),
    ]);

    ergebnisse.push({ klasse: klasse.name, aktion: "angelegt", nummer });
  }

  return { imFenster: true, ergebnisse };
}

/** Runden einer Klasse für die Admin-Sektion, neueste zuerst. */
export async function getRundenFuerKlasse(klasseId: string) {
  return prisma.umfrageRunde.findMany({
    where: { klasseId },
    orderBy: { nummer: "desc" },
    include: { _count: { select: { antworten: true } } },
  });
}
