// Herkunfts-Kennung der SYNAXON-Landingpage (/synaxon?src=postkarte).
//
// Der Query-Parameter wird sowohl beim Rendern der Seite als auch beim
// Absenden des Formulars serverseitig gegen dieselbe Whitelist geprüft:
// nur Buchstaben, Ziffern und Bindestrich, maximal 30 Zeichen. Alles andere
// wird verworfen, damit über den Parameter nichts in die Datenbank oder in
// die Benachrichtigungsmail gelangt.

const SRC_PATTERN = /^[a-z0-9-]{1,30}$/;

export const SYNAXON_QUELLE_BASIS = "synaxon";

/** Gibt die bereinigte Kennung zurück oder null, wenn sie nicht erlaubt ist. */
export function parseSynaxonSrc(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  if (!SRC_PATTERN.test(normalized)) return null;
  return normalized;
}

/** "synaxon-postkarte" bei gesetzter Kennung, sonst schlicht "synaxon". */
export function buildSynaxonQuelle(src: string | null): string {
  return src ? `${SYNAXON_QUELLE_BASIS}-${src}` : SYNAXON_QUELLE_BASIS;
}
