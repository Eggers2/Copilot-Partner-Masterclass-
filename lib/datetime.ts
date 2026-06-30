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
