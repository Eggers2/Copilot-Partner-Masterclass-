// Cloudflare Turnstile: serverseitige Prüfung des Tokens aus dem Formular.
// Aktiv nur, wenn TURNSTILE_SITE_KEY und TURNSTILE_SECRET_KEY gesetzt sind.
// Fehlt einer davon, zeigt das Formular kein Widget und der Server prüft
// nicht, damit ein halb eingerichtetes Turnstile keine Anmeldung blockiert.

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Fehlercodes, die auf eine falsche Einrichtung bei uns hinweisen, nicht auf einen Bot. */
const KONFIG_FEHLER = new Set(["missing-input-secret", "invalid-input-secret", "internal-error"]);

export function turnstileSiteKey(): string | null {
  const site = process.env.TURNSTILE_SITE_KEY?.trim();
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  return site && secret ? site : null;
}

export function turnstileSecret(): string | null {
  const site = process.env.TURNSTILE_SITE_KEY?.trim();
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  return site && secret ? secret : null;
}

export type TurnstileErgebnis =
  /** Token gültig */
  | { status: "ok" }
  /** Turnstile nicht eingerichtet, Prüfung übersprungen */
  | { status: "aus" }
  /** Token fehlt oder ist ungültig: Anmeldung abweisen */
  | { status: "fehlgeschlagen"; codes: string[] }
  /** Problem auf unserer oder Cloudflares Seite: Anmeldung durchlassen, laut loggen */
  | { status: "stoerung"; codes: string[] };

export async function pruefeTurnstile(
  token: unknown,
  ip: string | null,
  secret: string | null,
  fetchImpl: typeof fetch = fetch
): Promise<TurnstileErgebnis> {
  if (!secret) return { status: "aus" };
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    return { status: "fehlgeschlagen", codes: ["missing-input-response"] };
  }

  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);

  let daten: { success?: boolean; "error-codes"?: string[] };
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { status: "stoerung", codes: [`http-${res.status}`] };
    daten = await res.json();
  } catch (err) {
    return { status: "stoerung", codes: [err instanceof Error ? err.name : "fetch-fehler"] };
  }

  if (daten.success === true) return { status: "ok" };
  const codes = Array.isArray(daten["error-codes"]) ? daten["error-codes"] : [];
  if (codes.some((c) => KONFIG_FEHLER.has(c))) return { status: "stoerung", codes };
  return { status: "fehlgeschlagen", codes };
}
