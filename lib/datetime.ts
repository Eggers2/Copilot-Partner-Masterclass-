import { DateTime } from "luxon";

/**
 * Zeitzonen-Konvention des Projekts
 * ─────────────────────────────────
 * In der Datenbank steht ausschliesslich echtes UTC. Umgerechnet wird nur an
 * den Raendern:
 *
 *   Eingabe   datetime-local / date  ──berlinInputToUtc()──▶  UTC in die DB
 *   Anzeige   UTC aus der DB  ──formatBerlin*() / utcToBerlinInput()──▶  Berlin
 *
 * Jede Umrechnung laeuft ueber diese Datei. Wer `new Date("2026-09-16T11:30")`
 * oder `toISOString().slice(0, 16)` schreibt, baut den Fehler wieder ein: das
 * erste haengt an der Prozess-Zeitzone (auf Railway UTC), das zweite gibt den
 * rohen UTC-Wert als Ortszeit aus.
 *
 * Sommer- und Winterzeit kommen aus der IANA-Datenbank (luxon), nicht aus
 * einem festen Offset. Ein hartkodiertes +1/+2 waere bei jeder Umstellung
 * wieder falsch.
 *
 * Kalenderdaten (Prisma `@db.Date`, z.B. Task.deadline, FirstCallScore.
 * followUpDate, sowie die Klassen-Laufzeiten) sind KEINE Zeitpunkte, sondern
 * Tage. Sie liegen auf 00:00 UTC und werden mit den `calendar*`-Funktionen
 * behandelt, also ohne Zonenumrechnung. Wer sie wie Zeitstempel verschiebt,
 * verliert einen Tag.
 */

export const BERLIN = "Europe/Berlin";

/** Format eines `<input type="datetime-local">`-Werts. */
const LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

// ─── Eingabe: Berliner Ortszeit → UTC ───────────────────────────────────────

/**
 * "YYYY-MM-DDTHH:mm" als Berliner Ortszeit lesen und als UTC-Zeitpunkt
 * zurueckgeben. Sekunden im Input sind erlaubt und werden uebernommen.
 *
 * An der Fruehjahrsumstellung gibt es Ortszeiten, die nicht existieren
 * (29.03.2026 02:30). Luxon schiebt sie nach vorn, hier also auf 03:30 Berlin.
 * `isBerlinDstGap()` erkennt diesen Fall, wenn ein Aufrufer ihn abweisen will.
 */
export function berlinInputToUtc(local: string): Date {
  const dt = DateTime.fromISO(local, { zone: BERLIN });
  if (!dt.isValid) {
    throw new Error(`Ungueltige Ortszeit: ${local} (${dt.invalidReason})`);
  }
  return dt.toUTC().toJSDate();
}

/**
 * Berliner Kalendertag "YYYY-MM-DD" plus Uhrzeit als UTC-Zeitpunkt.
 * Ohne Uhrzeit wird 12:00 Berlin angenommen, damit der Wert unabhaengig von
 * Sommer- oder Winterzeit sicher auf dem gemeinten Tag liegt.
 */
export function berlinDayToUtc(day: string, time = "12:00"): Date {
  return berlinInputToUtc(`${day}T${time}`);
}

/**
 * Liegt diese Ortszeit in der uebersprungenen Stunde der Fruehjahrsumstellung?
 * Erkennbar daran, dass der Hin- und Rueckweg nicht denselben Wert ergibt.
 */
export function isBerlinDstGap(local: string): boolean {
  const dt = DateTime.fromISO(local, { zone: BERLIN });
  if (!dt.isValid) return false;
  return dt.toUTC().setZone(BERLIN).toFormat(LOCAL_FORMAT) !== local.slice(0, 16);
}

// ─── Ausgabe: UTC → Berliner Ortszeit ───────────────────────────────────────

/**
 * UTC-Zeitpunkt → "YYYY-MM-DDTHH:mm" Berlin, zur Vorbelegung von
 * datetime-local. Leere Werte ergeben einen leeren String, damit
 * Formularfelder direkt damit befuellt werden koennen.
 */
export function utcToBerlinInput(date: Date | string | null | undefined): string {
  const dt = toDateTime(date);
  return dt.isValid ? dt.setZone(BERLIN).toFormat(LOCAL_FORMAT) : "";
}

/** UTC-Zeitpunkt → "YYYY-MM-DD" Berlin, zur Vorbelegung von type="date". */
export function utcToBerlinDayInput(date: Date | string | null | undefined): string {
  const dt = toDateTime(date);
  return dt.isValid ? dt.setZone(BERLIN).toFormat("yyyy-MM-dd") : "";
}

/** "16.09.2026, 11:30" */
export function formatBerlinDateTime(date: Date | string | null | undefined, fallback = "—"): string {
  const dt = toDateTime(date);
  return dt.isValid ? dt.setZone(BERLIN).toFormat("dd.MM.yyyy, HH:mm") : fallback;
}

/** "16.09.2026" – Tag eines Zeitpunkts in Berliner Ortszeit. */
export function formatBerlinDate(date: Date | string | null | undefined, fallback = "—"): string {
  const dt = toDateTime(date);
  return dt.isValid ? dt.setZone(BERLIN).toFormat("dd.MM.yyyy") : fallback;
}

/** "11:30" */
export function formatBerlinTime(date: Date | string | null | undefined, fallback = "—"): string {
  const dt = toDateTime(date);
  return dt.isValid ? dt.setZone(BERLIN).toFormat("HH:mm") : fallback;
}

/**
 * Freie Formatierung in Berliner Ortszeit ueber `Intl`-Optionen, fuer
 * Anzeigen mit Wochentag oder ausgeschriebenem Monat. Die Zeitzone wird hier
 * gesetzt und laesst sich nicht versehentlich weglassen.
 */
export function formatBerlin(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = "—"
): string {
  const dt = toDateTime(date);
  if (!dt.isValid) return fallback;
  return new Intl.DateTimeFormat("de-DE", { ...options, timeZone: BERLIN }).format(dt.toJSDate());
}

// ─── Kalenderdaten (@db.Date) ───────────────────────────────────────────────

/**
 * "YYYY-MM-DD" → Kalenderdatum als 00:00 UTC, passend zu Prisma `@db.Date`.
 * Bewusst OHNE Zonenumrechnung: ein Stichtag ist ein Tag, kein Zeitpunkt.
 */
export function calendarDateToUtc(day: string): Date {
  const dt = DateTime.fromISO(day, { zone: "utc" }).startOf("day");
  if (!dt.isValid) throw new Error(`Ungueltiges Kalenderdatum: ${day}`);
  return dt.toJSDate();
}

/** Kalenderdatum → "16.09.2026", ohne Zonenumrechnung. */
export function formatCalendarDate(date: Date | string | null | undefined, fallback = "—"): string {
  const dt = toDateTime(date);
  return dt.isValid ? dt.setZone("utc").toFormat("dd.MM.yyyy") : fallback;
}

/** Kalenderdatum → "YYYY-MM-DD" fuer type="date", ohne Zonenumrechnung. */
export function calendarDateInput(date: Date | string | null | undefined): string {
  const dt = toDateTime(date);
  return dt.isValid ? dt.setZone("utc").toFormat("yyyy-MM-dd") : "";
}

/** Freie Formatierung eines Kalenderdatums, z.B. mit Wochentag. */
export function formatCalendar(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = "—"
): string {
  const dt = toDateTime(date);
  if (!dt.isValid) return fallback;
  return new Intl.DateTimeFormat("de-DE", { ...options, timeZone: "UTC" }).format(dt.toJSDate());
}

// ─── Migrationshilfen ───────────────────────────────────────────────────────

/**
 * Wie das Admin einen gespeicherten Wert VOR der Umstellung angezeigt hat:
 * die UTC-Bestandteile roh als Ortszeit gelesen. Referenz fuer den
 * Vorher-Nachher-Vergleich.
 */
export function naiveReading(date: Date | string): string {
  const dt = toDateTime(date);
  return dt.isValid ? dt.setZone("utc").toFormat("dd.MM.yyyy, HH:mm") : "";
}

/**
 * Deutet einen naiv gespeicherten Wert als Berliner Wandzeit und gibt den
 * echten UTC-Zeitpunkt zurueck. Kern der Altdaten-Migration.
 *
 * Sekunden und Millisekunden bleiben erhalten, damit programmatisch gesetzte
 * Werte nicht stillschweigend gerundet werden. Die Sommerzeitregel richtet
 * sich nach dem jeweiligen Datum des Werts, nicht nach heute.
 */
export function reinterpretNaiveAsBerlin(stored: Date): Date {
  const naive = DateTime.fromJSDate(stored, { zone: "utc" });
  const dt = DateTime.fromObject(
    {
      year: naive.year,
      month: naive.month,
      day: naive.day,
      hour: naive.hour,
      minute: naive.minute,
      second: naive.second,
      millisecond: naive.millisecond,
    },
    { zone: BERLIN }
  );
  return dt.toUTC().toJSDate();
}

/**
 * Faellt die naive Lesart eines gespeicherten Werts in die uebersprungene
 * Stunde der Fruehjahrsumstellung? Solche Werte lassen sich nicht
 * anzeigeneutral migrieren und werden zur Entscheidung vorgelegt.
 */
export function migrationWouldShiftDisplay(stored: Date): boolean {
  const migrated = reinterpretNaiveAsBerlin(stored);
  return formatBerlinDateTime(migrated) !== naiveReading(stored);
}

// ─── Bestehende API ─────────────────────────────────────────────────────────

/** Kalendertag in Europe/Berlin als "YYYY-MM-DD". */
export function berlinDateString(d: Date): string {
  return DateTime.fromJSDate(d).setZone(BERLIN).toFormat("yyyy-MM-dd");
}

/**
 * Differenz in Berlin-Kalendertagen (b minus a). Zaehlt Datumsgrenzen, nicht
 * 24h-Bloecke: 23:59 → 00:01 am Folgetag ergibt 1.
 */
export function diffBerlinTage(a: Date, b: Date): number {
  const toDay = (d: Date) => DateTime.fromJSDate(d).setZone(BERLIN).startOf("day");
  return Math.round(toDay(b).diff(toDay(a), "days").days);
}

/**
 * @deprecated Nutze `berlinInputToUtc`. Bleibt als Alias, damit keine
 * Aufrufstelle unbemerkt auf der alten, bei Zeitumstellungen ungenauen
 * Eigenimplementierung haengen bleibt.
 */
export const parseBerlinDate = berlinInputToUtc;

// ─── intern ─────────────────────────────────────────────────────────────────

function toDateTime(date: Date | string | null | undefined): DateTime {
  if (date == null) return DateTime.invalid("leer");
  return typeof date === "string"
    ? DateTime.fromISO(date, { zone: "utc" })
    : DateTime.fromJSDate(date, { zone: "utc" });
}
