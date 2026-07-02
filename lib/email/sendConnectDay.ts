import { getEmailTemplate } from "@/lib/db/emailTemplates";
import {
  getTemplateDefinition,
  renderTemplate,
} from "@/lib/email/renderTemplate";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";

function formatEuro(value: number | string): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

/**
 * Lädt Betreff/HTML eines Templates. Abweichung vom teams_aufgenommen-Muster:
 * Ist das DB-Template inaktiv, fallen wir auf die Registry-Defaults zurück,
 * statt still nicht zu versenden – Bestätigung und Storno-Info dürfen nicht
 * von einem vergessenen Aktiv-Schalter abhängen.
 */
async function loadTemplate(
  key: string
): Promise<{ betreff: string; html: string } | null> {
  const definition = getTemplateDefinition(key);
  try {
    const template = await getEmailTemplate(key);
    if (template?.aktiv) return { betreff: template.betreff, html: template.html };
  } catch (err) {
    console.error(`[ConnectDay] Template ${key} konnte nicht geladen werden:`, err);
  }
  if (!definition) return null;
  return { betreff: definition.defaultBetreff, html: definition.defaultHtml };
}

export interface ConnectDayConfirmationInput {
  email: string;
  vorname: string;
  firma: string;
  personen: number;
  teilnehmerListe: string;
  preisNetto: number;
  mwstBetrag: number;
  preisBrutto: number;
}

/**
 * Anmeldebestätigung an den Partner (die Rechnung kommt separat aus sevDesk).
 * Best-effort: Fehler werden geloggt, blockieren die Anmeldung aber nie.
 */
export async function sendConnectDayConfirmation(
  input: ConnectDayConfirmationInput
): Promise<void> {
  if (!isResendConfigured()) return;
  try {
    const template = await loadTemplate("connect_day_bestaetigung");
    if (!template) return;

    const vars = {
      vorname: input.vorname,
      firma: input.firma,
      personen: String(input.personen),
      teilnehmer_liste: input.teilnehmerListe,
      preis_netto: formatEuro(input.preisNetto),
      mwst_betrag: formatEuro(input.mwstBetrag),
      preis_brutto: formatEuro(input.preisBrutto),
    };
    const result = await sendEmail({
      to: input.email,
      subject: renderTemplate(template.betreff, vars),
      html: renderTemplate(template.html, vars),
      templateKey: "connect_day_bestaetigung",
    });
    if (!result.ok) {
      console.error(
        `[ConnectDay] Bestätigung an ${input.email} fehlgeschlagen:`,
        result.error
      );
    }
  } catch (err) {
    console.error("[ConnectDay] Bestätigungs-Mail fehlgeschlagen:", err);
  }
}

export interface ConnectDayStornoInternInput {
  firma: string;
  bestellNr: string;
  personen: number;
  teilnehmerListe: string;
  rechnungNr: string | null;
}

/**
 * Interne Benachrichtigung an den Betreiber nach einem Storno – damit die
 * manuelle Rechnungs-/Stornoabwicklung in sevDesk nicht untergeht.
 * Empfänger: CONNECT_DAY_NOTIFY_EMAIL, sonst NEWSLETTER_REVIEW_EMAIL.
 */
export async function sendConnectDayStornoIntern(
  input: ConnectDayStornoInternInput
): Promise<void> {
  const to =
    process.env.CONNECT_DAY_NOTIFY_EMAIL?.trim() ||
    process.env.NEWSLETTER_REVIEW_EMAIL?.trim();
  if (!to || !isResendConfigured()) {
    if (!to) {
      console.error(
        "[ConnectDay] Kein Empfänger für Storno-Benachrichtigung (CONNECT_DAY_NOTIFY_EMAIL setzen)."
      );
    }
    return;
  }
  try {
    const template = await loadTemplate("connect_day_storno_intern");
    if (!template) return;

    const vars = {
      firma: input.firma,
      bestell_nr: input.bestellNr,
      personen: String(input.personen),
      teilnehmer_liste: input.teilnehmerListe,
      rechnung_nr: input.rechnungNr ?? "noch keine Rechnung erstellt",
    };
    const result = await sendEmail({
      to,
      subject: renderTemplate(template.betreff, vars),
      html: renderTemplate(template.html, vars),
      templateKey: "connect_day_storno_intern",
    });
    if (!result.ok) {
      console.error(
        `[ConnectDay] Storno-Benachrichtigung an ${to} fehlgeschlagen:`,
        result.error
      );
    }
  } catch (err) {
    console.error("[ConnectDay] Storno-Benachrichtigung fehlgeschlagen:", err);
  }
}
