import { signToken, verifyToken } from "@/lib/newsletter/tokens";

// Zeitfalle: Die Startseite rendert einen signierten Zeitstempel (Serverzeit)
// ins Formular. Absendungen unter MIN_DAUER_MS nach dem Rendern stammen von
// Bots. Weil Ausstellen und Prüfen beide die Serveruhr nutzen, spielt eine
// falsch gehende Uhr beim Besucher keine Rolle, und ohne das Secret lässt sich
// der Zeitstempel nicht fälschen.

export const MIN_DAUER_MS = 3000;
/** Danach muss die Seite neu geladen werden, damit ein Token nicht ewig nutzbar ist. */
export const MAX_ALTER_MS = 24 * 60 * 60 * 1000;

function secretVorhanden(): boolean {
  const s = process.env.CUSTOMER_SESSION_SECRET;
  return !!s && s.length >= 16;
}

/** Token für das Formular, null ohne Secret (dann ist die Zeitfalle aus). */
export function erzeugeFormularToken(jetzt: Date = new Date()): string | null {
  if (!secretVorhanden()) return null;
  return signToken("warteliste-formular", String(jetzt.getTime()));
}

export type ZeitfallenErgebnis =
  | { status: "ok"; dauerMs: number }
  | { status: "aus" }
  | { status: "ungueltig" }
  | { status: "zu_schnell"; dauerMs: number }
  | { status: "abgelaufen"; dauerMs: number };

export function pruefeFormularToken(raw: unknown, jetzt: Date = new Date()): ZeitfallenErgebnis {
  if (!secretVorhanden()) return { status: "aus" };
  const wert = verifyToken("warteliste-formular", typeof raw === "string" ? raw : null);
  const gerendert = wert && /^\d{10,}$/.test(wert) ? Number(wert) : NaN;
  if (!Number.isFinite(gerendert)) return { status: "ungueltig" };
  const dauerMs = jetzt.getTime() - gerendert;
  if (dauerMs < MIN_DAUER_MS) return { status: "zu_schnell", dauerMs };
  if (dauerMs > MAX_ALTER_MS) return { status: "abgelaufen", dauerMs };
  return { status: "ok", dauerMs };
}
