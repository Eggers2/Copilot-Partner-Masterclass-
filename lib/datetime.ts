/**
 * Parses a datetime-local string (e.g. "2026-03-31T17:00") as Europe/Berlin time.
 * datetime-local inputs have no timezone – new Date() on a UTC server would treat
 * it as UTC, causing a 1–2h offset. This tries both CET (+01:00) and CEST (+02:00)
 * and returns the one that round-trips correctly to the intended Berlin hour.
 */
export function parseBerlinDate(dateTimeLocal: string): Date {
  const hour = parseInt(dateTimeLocal.split("T")[1]?.split(":")[0] ?? "0", 10);

  const cest = new Date(dateTimeLocal + ":00+02:00"); // summer
  const cet = new Date(dateTimeLocal + ":00+01:00"); // winter

  const berlinHour = (d: Date) =>
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Berlin",
        hour: "numeric",
        hour12: false,
      }).format(d)
    );

  if (berlinHour(cest) === hour) return cest;
  if (berlinHour(cet) === hour) return cet;
  return cest; // fallback to summer time
}

/** Kalenderdatum in Europe/Berlin als "YYYY-MM-DD" (en-CA liefert ISO-Format). */
export function berlinDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Differenz in Berlin-Kalendertagen (b minus a). Zählt Datumsgrenzen, nicht
 * 24h-Blöcke: 23:59 → 00:01 am Folgetag ergibt 1.
 */
export function diffBerlinTage(a: Date, b: Date): number {
  const toUtcMidnight = (d: Date) => {
    const [y, m, day] = berlinDateString(d).split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtcMidnight(b) - toUtcMidnight(a)) / 86_400_000);
}
