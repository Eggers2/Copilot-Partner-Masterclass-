// Reine Hilfsfunktionen für den Folien-Download (lib/event-download),
// damit Route und Tests dieselbe Logik nutzen.

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmWerte = Partial<Record<UtmKey, string>>;

// Gleiche Grenze wie die VarChar(100)-Spalten am Lead.
const UTM_MAX = 100;

/**
 * Liest die UTM-Werte aus einem Query- oder Body-Objekt. Leere und nicht
 * textuelle Werte fallen weg, bei Mehrfachwerten (?utm_source=a&utm_source=b)
 * gilt der erste.
 */
export function parseUtm(source: Record<string, unknown>): UtmWerte {
  const result: UtmWerte = {};
  for (const key of UTM_KEYS) {
    const raw = source[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    result[key] = trimmed.slice(0, UTM_MAX);
  }
  return result;
}

/** Notiz für Lead und Aktivität. Enthält immer Titel, UTM-Werte und Einwilligung. */
export function buildEventNotiz(
  notizTitel: string,
  utm: UtmWerte,
  marketingConsent: boolean
): string {
  const utmZeile = UTM_KEYS.filter((key) => utm[key])
    .map((key) => `${key}=${utm[key]}`)
    .join(", ");

  return [
    notizTitel,
    `UTM: ${utmZeile || "keine"}`,
    `Marketing-Einwilligung: ${marketingConsent ? "ja" : "nein"}`,
  ].join("\n");
}
