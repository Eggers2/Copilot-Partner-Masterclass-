import { prisma } from "@/lib/prisma";
import { berlinDateString, diffBerlinTage } from "@/lib/datetime";
import { ROTIERENDE_INHALTE } from "./fragen";
import type { Jahreszeit } from "@prisma/client";

/**
 * Runden der Stand-Abfrage. Runden werden MANUELL im Admin gestartet
 * (Klassenseite, Sektion "Stand-Abfrage"): erst Runde anlegen, dann bei
 * Bedarf die rotierende Frage anpassen, dann Einladungen senden. Der Cron
 * übernimmt nur noch die Erinnerung nach 4 Tagen und die Lieferrisiko-Mail.
 */

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

export type RundeStartErgebnis =
  | { ok: true; nummer: number; rundeId: string }
  | { ok: false; error: string; brauchtBestaetigung?: boolean };

/**
 * Startet manuell eine neue Runde für eine Klasse. Die Vorgänger-Runde wird in
 * derselben Transaktion geschlossen (alte Tokens verfallen damit).
 *
 * Zwei Wächter:
 * - Eine offene, noch NICHT versendete Runde blockiert den Start (erst senden
 *   oder löschen), damit keine Runde versehentlich ungenutzt verfällt.
 * - Ohne durchgeführten Termin seit der letzten Runde kommt eine Rückfrage
 *   (kein leerer Fragebogen bei verschobenen Sessions); mit `erzwingen`
 *   startet die Runde trotzdem.
 */
export async function starteRunde(
  klasseId: string,
  opts?: { erzwingen?: boolean }
): Promise<RundeStartErgebnis> {
  const jetzt = new Date();
  const klasse = await prisma.klasse.findUnique({
    where: { id: klasseId },
    select: { id: true, name: true, startDate: true },
  });
  if (!klasse) return { ok: false, error: "Klasse nicht gefunden." };

  const letzteRunde = await prisma.umfrageRunde.findFirst({
    where: { klasseId },
    orderBy: { nummer: "desc" },
  });

  if (letzteRunde && letzteRunde.status === "OFFEN" && !letzteRunde.versandAm) {
    return {
      ok: false,
      error: `Runde ${letzteRunde.nummer} ist angelegt, aber noch nicht versendet. Bitte erst die Einladungen senden oder die Runde löschen.`,
    };
  }

  if (!opts?.erzwingen) {
    const cutoff = letzteRunde ? letzteRunde.stichtag : klasse.startDate;
    const ausloeser = await prisma.klasseTermin.findFirst({
      where: {
        klasseId,
        status: "DURCHGEFUEHRT",
        datum: letzteRunde ? { gt: cutoff, lte: jetzt } : { gte: cutoff, lte: jetzt },
      },
      select: { id: true },
    });
    if (!ausloeser) {
      return {
        ok: false,
        brauchtBestaetigung: true,
        error: letzteRunde
          ? "Seit der letzten Runde wurde kein Termin durchgeführt. Trotzdem eine neue Runde starten?"
          : "Es wurde noch kein Termin dieser Klasse durchgeführt. Trotzdem die erste Runde starten?",
      };
    }
  }

  const nummer = (letzteRunde?.nummer ?? 0) + 1;
  const jahreszeit = await berechneJahreszeit(klasseId, jetzt);

  const [, runde] = await prisma.$transaction([
    prisma.umfrageRunde.updateMany({
      where: { klasseId, status: "OFFEN" },
      data: { status: "ABGESCHLOSSEN", abgeschlossenAm: jetzt },
    }),
    prisma.umfrageRunde.create({
      data: {
        klasseId,
        nummer,
        stichtag: jetzt,
        programmtag: berechneProgrammtag(klasse.startDate, jetzt),
        jahreszeit,
        rotierenderInhalt: ROTIERENDE_INHALTE[(nummer - 1) % ROTIERENDE_INHALTE.length],
      },
    }),
  ]);

  return { ok: true, nummer, rundeId: runde.id };
}

/** Runden einer Klasse für die Admin-Sektion, neueste zuerst. */
export async function getRundenFuerKlasse(klasseId: string) {
  return prisma.umfrageRunde.findMany({
    where: { klasseId },
    orderBy: { nummer: "desc" },
    include: { _count: { select: { antworten: true } } },
  });
}
