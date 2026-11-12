import { EMAIL_REGEX, pruefeEmail } from "./email";
import { pruefeTurnstile } from "./turnstile";
import { pruefeFormularToken } from "./zeitfalle";
import type { SchutzGrund } from "./log";

// Entscheidung über eine Anmeldung aus dem Wartelisten-Formular, ohne
// Datenbank. Die Route (app/api/waitlist) setzt das Ergebnis um: still
// bestätigen, mit Fehlermeldung abweisen oder den Lead anlegen, bei Verdacht
// in der Prüfquarantäne (Lead ohne Mails, Freigabe im Admin).

/** Name des unsichtbaren Honeypot-Felds im Formular. */
export const HONEYPOT_FELD = "firmenwebseite";

export const MELDUNG = {
  pflichtfelder: "Bitte geben Sie Name, Firma und E-Mail-Adresse an.",
  emailUngueltig: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
  wegwerf:
    "Bitte verwenden Sie Ihre geschäftliche E-Mail-Adresse. Wegwerf-Adressen können wir nicht annehmen.",
  turnstile:
    "Die Sicherheitsprüfung hat nicht geklappt. Bitte laden Sie die Seite neu und versuchen Sie es noch einmal.",
  abgelaufen:
    "Das Formular ist abgelaufen. Bitte laden Sie die Seite neu und versuchen Sie es noch einmal.",
} as const;

interface Protokoll {
  grund: SchutzGrund;
  details?: string;
}

export type Entscheidung =
  /** Bot erkannt: mit Erfolg antworten, aber nichts anlegen. */
  | ({ aktion: "still"; emailDomain: string | null } & Protokoll)
  /** Abweisen mit Meldung für den Nutzer. */
  | ({ aktion: "abweisen"; meldung: string; emailDomain: string | null } & Protokoll)
  | {
      aktion: "anlegen";
      email: string;
      name: string;
      company: string;
      emailDomain: string;
      /** Gründe für die Prüfquarantäne, leer = unauffällig. */
      verdacht: string[];
      /** Hinweise für die Notiz am Lead (z. B. Privatmail). */
      hinweise: string[];
      /** Zusätzlich zu protokollierende Auffälligkeiten (z. B. Turnstile-Störung). */
      protokoll: Protokoll[];
    };

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

const ENTHAELT_LINK = /https?:|:\/\/|www\.|<|>/i;

export async function pruefeAnmeldung(
  body: Record<string, unknown>,
  ctx: {
    ip: string | null;
    jetzt?: Date;
    turnstileSecret: string | null;
    fetchImpl?: typeof fetch;
  }
): Promise<Entscheidung> {
  const rohEmail = (text(body.email, 254) ?? "").toLowerCase();
  const domainOderNull = rohEmail.includes("@") ? rohEmail.slice(rohEmail.lastIndexOf("@") + 1) : null;

  // 1. Honeypot: Menschen sehen das Feld nicht.
  const honeypot = body[HONEYPOT_FELD];
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return { aktion: "still", grund: "honeypot", emailDomain: domainOderNull };
  }

  // 2. Zeitfalle
  const zeit = pruefeFormularToken(body.formular_token, ctx.jetzt);
  if (zeit.status === "ungueltig") {
    return { aktion: "still", grund: "zeitfalle_ungueltig", emailDomain: domainOderNull };
  }
  if (zeit.status === "zu_schnell") {
    return {
      aktion: "still",
      grund: "zu_schnell",
      emailDomain: domainOderNull,
      details: `${zeit.dauerMs} ms`,
    };
  }
  if (zeit.status === "abgelaufen") {
    return {
      aktion: "abweisen",
      grund: "formular_abgelaufen",
      meldung: MELDUNG.abgelaufen,
      emailDomain: domainOderNull,
    };
  }

  // 3. Pflichtfelder
  const name = text(body.name, 200);
  const company = text(body.company, 200);
  if (!rohEmail || !name || !company || name.length < 2 || company.length < 2) {
    const fehlt = [!name || name.length < 2 ? "name" : null, !company || company.length < 2 ? "firma" : null, !rohEmail ? "email" : null]
      .filter(Boolean)
      .join(",");
    return {
      aktion: "abweisen",
      grund: "pflichtfelder",
      meldung: MELDUNG.pflichtfelder,
      emailDomain: domainOderNull,
      details: `fehlt: ${fehlt}`,
    };
  }
  if (!EMAIL_REGEX.test(rohEmail)) {
    return {
      aktion: "abweisen",
      grund: "email_ungueltig",
      meldung: MELDUNG.emailUngueltig,
      emailDomain: domainOderNull,
    };
  }

  // 4. Wegwerf-Domain
  const befund = pruefeEmail(rohEmail);
  if (befund.wegwerf) {
    return {
      aktion: "abweisen",
      grund: "wegwerf_domain",
      meldung: MELDUNG.wegwerf,
      emailDomain: befund.domain,
    };
  }

  // 5. Turnstile (Netzwerkaufruf, daher nach den billigen Prüfungen)
  const protokoll: Protokoll[] = [];
  const turnstile = await pruefeTurnstile(body.turnstile_token, ctx.ip, ctx.turnstileSecret, ctx.fetchImpl);
  if (turnstile.status === "fehlgeschlagen") {
    return {
      aktion: "abweisen",
      grund: "turnstile",
      meldung: MELDUNG.turnstile,
      emailDomain: befund.domain,
      details: turnstile.codes.join(",") || undefined,
    };
  }
  if (turnstile.status === "stoerung") {
    protokoll.push({ grund: "turnstile_stoerung", details: turnstile.codes.join(",") || undefined });
  }

  // 6. Verdacht und Hinweise
  const verdacht: string[] = [];
  if (befund.gmailPunkte !== null) {
    verdacht.push(`Gmail-Adresse mit ${befund.gmailPunkte} Punkten im Namen`);
  }
  if (ENTHAELT_LINK.test(name) || ENTHAELT_LINK.test(company)) {
    verdacht.push("Link oder HTML im Namen oder Firmenfeld");
  }

  const hinweise: string[] = [];
  if (befund.privatmail) hinweise.push(`Privatmail-Adresse (${befund.privatmail})`);

  return {
    aktion: "anlegen",
    email: rohEmail,
    name,
    company,
    emailDomain: befund.domain,
    verdacht,
    hinweise,
    protokoll,
  };
}
