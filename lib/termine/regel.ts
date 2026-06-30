import { parseBerlinDate } from "@/lib/datetime";

/**
 * Ein Muster der Termin-Regel: n-ter Wochentag im Monat zu einer Uhrzeit.
 * - week: 1–4 = erster…vierter, -1 = letzter Wochentag im Monat
 * - weekday: ISO 1–7 (1 = Montag … 7 = Sonntag)
 * - time: "HH:mm" (Europe/Berlin)
 */
export interface TerminRegelMuster {
  week: number;
  weekday: number;
  time: string;
}

export type TerminRegel = TerminRegelMuster[];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidMuster(m: unknown): m is TerminRegelMuster {
  if (!m || typeof m !== "object") return false;
  const o = m as Record<string, unknown>;
  const week = o.week;
  const weekday = o.weekday;
  const time = o.time;
  const weekOk = week === 1 || week === 2 || week === 3 || week === 4 || week === -1;
  const weekdayOk =
    typeof weekday === "number" && Number.isInteger(weekday) && weekday >= 1 && weekday <= 7;
  const timeOk = typeof time === "string" && TIME_RE.test(time);
  return weekOk && weekdayOk && timeOk;
}

/** Validiert/normalisiert eine aus DB oder Formular gelesene Regel. */
export function parseTerminRegel(json: unknown): TerminRegel {
  if (!Array.isArray(json)) return [];
  return json.filter(isValidMuster).map((m) => ({
    week: m.week,
    weekday: m.weekday,
    time: m.time,
  }));
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO-Wochentag (1=Mo … 7=So) eines Kalenderdatums – zeitzonenunabhängig. */
function isoWeekday(year: number, month0: number, day: number): number {
  const dow = new Date(Date.UTC(year, month0, day)).getUTCDay(); // 0=So … 6=Sa
  return ((dow + 6) % 7) + 1;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

/** Tag-im-Monat für ein Muster; null wenn es im Monat nicht existiert (z.B. 5. Montag). */
function dayForMuster(year: number, month0: number, m: TerminRegelMuster): number | null {
  const total = daysInMonth(year, month0);
  if (m.week === -1) {
    const lastWd = isoWeekday(year, month0, total);
    const offset = (lastWd - m.weekday + 7) % 7;
    return total - offset;
  }
  const firstWd = isoWeekday(year, month0, 1);
  const offset = (m.weekday - firstWd + 7) % 7;
  const day = 1 + offset + (m.week - 1) * 7;
  return day > total ? null : day;
}

/** Berlin-Jahr/Monat (0-basiert) eines Zeitpunkts. */
function berlinYearMonth(d: Date): { year: number; month0: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { year: get("year"), month0: get("month") - 1 };
}

/**
 * Berechnet die nächsten `count` künftigen Termine gemäß Regel ab `from`.
 * Überspringt Zeitpunkte, die bereits in `existing` enthalten sind (gleiche
 * Millisekunde) und dedupliziert identische Muster-Treffer.
 */
export function computeNextTermine(
  regel: TerminRegel,
  count: number,
  from: Date,
  existing: Date[] = []
): Date[] {
  if (regel.length === 0 || count <= 0) return [];

  const existingTimes = new Set(existing.map((d) => d.getTime()));
  const fromTime = from.getTime();
  const start = berlinYearMonth(from);

  const candidates: Date[] = [];
  const MAX_MONTHS = 18;
  for (let i = 0; i < MAX_MONTHS; i++) {
    const month0Abs = start.month0 + i;
    const year = start.year + Math.floor(month0Abs / 12);
    const month0 = ((month0Abs % 12) + 12) % 12;

    for (const m of regel) {
      const day = dayForMuster(year, month0, m);
      if (day == null) continue;
      const local = `${year}-${pad(month0 + 1)}-${pad(day)}T${m.time}`;
      const dt = parseBerlinDate(local);
      if (dt.getTime() > fromTime && !existingTimes.has(dt.getTime())) {
        candidates.push(dt);
      }
    }
  }

  // sortieren, identische Zeitpunkte zusammenfassen, die ersten `count` nehmen
  candidates.sort((a, b) => a.getTime() - b.getTime());
  const result: Date[] = [];
  const seen = new Set<number>();
  for (const c of candidates) {
    if (seen.has(c.getTime())) continue;
    seen.add(c.getTime());
    result.push(c);
    if (result.length >= count) break;
  }
  return result;
}
