/**
 * Vertragsregeln einer Bestellung: Kündigung und automatische Verlängerung.
 *
 * Laut AGB § 3 läuft der Vertrag mindestens 12 Monate ab Zugangsbereitstellung
 * und verlängert sich danach automatisch, sofern er nicht gekündigt wird. Eine
 * vermerkte Kündigung (gekuendigtAm) schließt die automatische Verlängerung
 * aus. Jede künftige Verlängerungslogik muss über verlaengertSichAutomatisch()
 * gehen, damit gekündigte Verträge nie verlängert werden.
 *
 * Alle Daten sind Kalendertage (@db.Date, 00:00 UTC), siehe ZEITZONEN.md.
 */
import { DateTime } from "luxon";

export const MINDESTLAUFZEIT_MONATE = 12;

export interface VertragsStand {
  gekuendigtAm: Date | null;
  kuendigungZum: Date | null;
}

export function istGekuendigt(b: Pick<VertragsStand, "gekuendigtAm">): boolean {
  return b.gekuendigtAm != null;
}

/** false, sobald eine Kündigung vermerkt ist. */
export function verlaengertSichAutomatisch(b: Pick<VertragsStand, "gekuendigtAm">): boolean {
  return !istGekuendigt(b);
}

/**
 * Letzter Tag der Mindestlaufzeit, gerechnet ab einem Starttag (z.B. Kickoff
 * der Klasse): Start 15.01.2026 → Ende 14.01.2027.
 */
export function endeMindestlaufzeit(start: Date): Date {
  return DateTime.fromJSDate(start, { zone: "utc" })
    .startOf("day")
    .plus({ months: MINDESTLAUFZEIT_MONATE })
    .minus({ days: 1 })
    .toJSDate();
}

/** Ist der Vertrag zum Stichtag (Kalendertag) bereits beendet? */
export function vertragBeendet(b: VertragsStand, stichtag: Date): boolean {
  if (!istGekuendigt(b) || !b.kuendigungZum) return false;
  const tag = DateTime.fromJSDate(stichtag, { zone: "utc" }).startOf("day");
  const ende = DateTime.fromJSDate(b.kuendigungZum, { zone: "utc" }).startOf("day");
  return tag > ende;
}
