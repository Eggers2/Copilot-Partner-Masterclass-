// HTML-Escaping für eingesetzte Variablenwerte (Muster aus
// lib/newsletter/render.ts). Schützt vor kaputtem Markup, wenn z.B. ein Name
// ein `<` enthält.
function esc(value: string | undefined | null): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Ersetzt `{{key}}`-Platzhalter im HTML/Betreff durch die übergebenen Werte.
 * Whitespace innerhalb der Klammern wird toleriert (`{{ code }}`). Unbekannte
 * Platzhalter bleiben unverändert stehen – so sieht man in der Vorschau sofort,
 * wenn eine Variable nicht befüllt wird.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return esc(vars[key]);
    }
    return match;
  });
}

export interface TemplateDefinition {
  key: string;
  name: string;
  /** Beschreibung der Variablen für die Editor-Hilfe */
  beschreibung: string;
  /** Erlaubte Variablen → Beispielwert (für Vorschau & Test-Mail) */
  variables: Record<string, string>;
  /** Default-Betreff beim ersten Anlegen */
  defaultBetreff: string;
  /** Default-HTML beim ersten Anlegen */
  defaultHtml: string;
}

const OTP_DEFAULT_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0F172A;">
  <div style="padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
    <h1 style="margin: 0; font-size: 20px; color: #030386;">Dein Login-Code</h1>
  </div>
  <div style="padding: 24px 0; line-height: 1.6; font-size: 15px;">
    <p>Hallo,</p>
    <p>du hast einen Login-Code für das <strong>Next Skills Kundenportal</strong> angefordert. Gib diesen Code auf der Login-Seite ein:</p>
    <div style="margin: 32px 0; text-align: center;">
      <div style="display: inline-block; padding: 20px 32px; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 12px; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #030386;">{{code}}</div>
    </div>
    <p style="font-size: 14px; color: #64748B;">Der Code ist <strong>10 Minuten</strong> gültig und funktioniert nur einmal.</p>
    <p style="font-size: 14px; color: #64748B;">Wenn du keinen Login angefordert hast, kannst du diese E-Mail einfach ignorieren.</p>
  </div>
  <div style="padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </div>
</div>`;

const BESTELLUNG_DEFAULT_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0F172A;">
  <div style="padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
    <h1 style="margin: 0; font-size: 20px; color: #030386;">Bestellbestätigung</h1>
  </div>
  <div style="padding: 24px 0; line-height: 1.6; font-size: 15px;">
    <p>Hallo {{vorname}},</p>
    <p>vielen Dank für deine Bestellung <strong>{{bestell_nr}}</strong> ({{paket}}).</p>
    <p>Wir melden uns mit den nächsten Schritten.</p>
  </div>
  <div style="padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </div>
</div>`;

const TEAMS_AUFNAHME_DEFAULT_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0F172A;">
  <div style="padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
    <h1 style="margin: 0; font-size: 20px; color: #030386;">Willkommen im Teams-Team</h1>
  </div>
  <div style="padding: 24px 0; line-height: 1.6; font-size: 15px;">
    <p>Hallo {{vorname}},</p>
    <p>du wurdest dem Microsoft-Teams-Team deiner Klasse <strong>{{klasse}}</strong> hinzugefügt.</p>
    <p>So kommst du hinein:</p>
    <ol style="padding-left: 20px; margin: 12px 0;">
      <li>Öffne Microsoft Teams (App oder Browser).</li>
      <li>Klicke oben rechts auf dein Profil und wähle <strong>Organisation wechseln</strong>.</li>
      <li>Wähle <strong>Next Skills</strong> – dort findest du das Team deiner Klasse.</li>
    </ol>
    <div style="margin: 28px 0; text-align: center;">
      <a href="https://teams.microsoft.com" style="display: inline-block; padding: 12px 24px; background: #030386; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">Teams öffnen</a>
    </div>
    <p style="font-size: 14px; color: #64748B;">Wirst du beim ersten Anmelden nach einem Bestätigungscode gefragt, bekommst du diesen automatisch per E-Mail von Microsoft. Es kann bis zu einen Tag dauern, bis das Team erscheint.</p>
  </div>
  <div style="padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </div>
</div>`;

const CONNECT_DAY_BESTAETIGUNG_DEFAULT_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0F172A;">
  <div style="padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
    <h1 style="margin: 0; font-size: 20px; color: #030386;">Anmeldung bestätigt: Copilot Connect Day 2026</h1>
  </div>
  <div style="padding: 24px 0; line-height: 1.6; font-size: 15px;">
    <p>Hallo {{vorname}},</p>
    <p>eure Anmeldung zum <strong>Copilot Connect Day 2026</strong> ist bestätigt. Wir freuen uns auf euch!</p>
    <div style="margin: 20px 0; padding: 16px 20px; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 12px;">
      <p style="margin: 0 0 8px;"><strong>10. &amp; 11. Dezember 2026</strong> · nhow Hotel Frankfurt am Main<br>Donnerstag 12:00 Uhr bis Freitag 14:00 Uhr</p>
      <p style="margin: 0 0 8px;">Firma: <strong>{{firma}}</strong></p>
      <p style="margin: 0;">Angemeldete Teilnehmer ({{personen}}): <strong>{{teilnehmer_liste}}</strong></p>
    </div>
    <p>Im Eigenanteil enthalten: Hotelübernachtung im nhow Hotel Frankfurt, Mittagssnack und Kaffeepause an beiden Tagen, Abendessen sowie 2 Stunden in der höchsten Skybar Deutschlands mit freiem Bier/Wein/Softdrinks.</p>
    <p><strong>Eigenanteil:</strong> {{preis_netto}} € netto zzgl. {{mwst_betrag}} € USt = <strong>{{preis_brutto}} €</strong> — die Rechnung folgt separat per E-Mail.</p>
    <div style="margin: 20px 0; padding: 14px 18px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; font-size: 14px;">
      <strong>Wichtig:</strong> Der Platz ist erst nach Zahlungseingang verbindlich bestätigt. Bitte begleicht die Rechnung innerhalb der Zahlungsfrist.
    </div>
    <p>Alle weiteren Informationen (Agenda, Ablauf, Hotel-Check-in) erhaltet ihr rechtzeitig vor dem Termin.</p>
    <p style="font-size: 14px; color: #64748B;">Die Anmeldung ist verbindlich. Eine Absage ist jederzeit möglich, kostet aber 399 Euro, falls wir den Platz nicht nachbesetzen können. Teilnehmer könnt ihr bis Eventbeginn jederzeit im Kundenportal tauschen.</p>
  </div>
  <div style="padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </div>
</div>`;

const CONNECT_DAY_RECHNUNG_DEFAULT_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0F172A;">
  <div style="padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
    <h1 style="margin: 0; font-size: 20px; color: #030386;">Deine Rechnung: Copilot Connect Day 2026</h1>
  </div>
  <div style="padding: 24px 0; line-height: 1.6; font-size: 15px;">
    <p>Hallo {{vorname}},</p>
    <p>anbei erhaltet ihr die Rechnung <strong>{{rechnung_nr}}</strong> für eure Anmeldung zum <strong>Copilot Connect Day 2026</strong> (10. &amp; 11. Dezember 2026, nhow Hotel Frankfurt am Main).</p>
    <div style="margin: 20px 0; padding: 16px 20px; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 12px;">
      <p style="margin: 0 0 8px;">Teilnehmer ({{personen}}): <strong>{{teilnehmer_liste}}</strong></p>
      <p style="margin: 0;">Rechnungsbetrag: <strong>{{preis_brutto}} €</strong> (inkl. USt) · zahlbar innerhalb von <strong>{{zahlungsziel}} Tagen</strong></p>
    </div>
    <div style="margin: 20px 0; padding: 14px 18px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; font-size: 14px;">
      <strong>Wichtig:</strong> Der Platz ist erst nach Zahlungseingang verbindlich bestätigt. Bitte überweist den Betrag innerhalb der Zahlungsfrist, damit euch niemand den Platz streitig macht.
    </div>
    <p>Alle weiteren Informationen (Agenda, Ablauf, Hotel-Check-in) erhaltet ihr rechtzeitig vor dem Termin.</p>
    <p>Wir freuen uns auf euch!</p>
  </div>
  <div style="padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </div>
</div>`;

const CONNECT_DAY_STORNO_INTERN_DEFAULT_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0F172A;">
  <div style="padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
    <h1 style="margin: 0; font-size: 20px; color: #B91C1C;">Connect Day: Storno eingegangen</h1>
  </div>
  <div style="padding: 24px 0; line-height: 1.6; font-size: 15px;">
    <p><strong>{{firma}}</strong> (Bestellung {{bestell_nr}}) hat die Anmeldung zum Copilot Connect Day 2026 storniert.</p>
    <ul style="padding-left: 20px; margin: 12px 0;">
      <li>Freigewordene Plätze: <strong>{{personen}}</strong></li>
      <li>Teilnehmer: {{teilnehmer_liste}}</li>
      <li>sevDesk-Rechnung: <strong>{{rechnung_nr}}</strong></li>
    </ul>
    <p>Die Rechnungs-/Stornoabwicklung (ggf. 399 € bei Nichtnachbesetzung) läuft manuell in sevDesk — bitte prüfen.</p>
  </div>
  <div style="padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8;">
    Automatische Benachrichtigung aus dem Kundenportal
  </div>
</div>`;

/**
 * Registry aller konfigurierbaren Templates. Treibt die Editor-Hilfe, die
 * Beispieldaten für Vorschau/Test-Mail und das initiale Seeding.
 */
export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  kundenportal_otp: {
    key: "kundenportal_otp",
    name: "Kundenportal – Login-Code",
    beschreibung: "Wird beim Login ins Kundenportal versendet. Enthält den 6-stelligen Einmalcode.",
    variables: { code: "123456", email: "max@firma.de" },
    defaultBetreff: "Dein Login-Code: {{code}}",
    defaultHtml: OTP_DEFAULT_HTML,
  },
  bestellung_bestaetigung: {
    key: "bestellung_bestaetigung",
    name: "Bestellbestätigung",
    beschreibung: "Bestätigung nach einer Bestellung. (Versand-Aktivierung folgt – Template kann schon befüllt werden.)",
    variables: {
      vorname: "Max",
      nachname: "Mustermann",
      email: "max@firma.de",
      bestell_nr: "NS-2026-0042",
      paket: "Team",
    },
    defaultBetreff: "Deine Bestellung {{bestell_nr}}",
    defaultHtml: BESTELLUNG_DEFAULT_HTML,
  },
  teams_aufgenommen: {
    key: "teams_aufgenommen",
    name: "Teams – Aufnahme ins Klassen-Team",
    beschreibung:
      "Info-Mail an den Teilnehmer, nachdem er ins Teams-Team seiner Klasse aufgenommen wurde (Microsoft selbst verschickt bei der Gruppen-Aufnahme keine Benachrichtigung). Hinweis: Inaktiv = es wird KEINE Mail versendet (für dieses Template gibt es keinen n8n-Fallback).",
    variables: { vorname: "Max", klasse: "Klasse 2" },
    defaultBetreff: "Du bist im Teams-Team deiner Klasse {{klasse}}",
    defaultHtml: TEAMS_AUFNAHME_DEFAULT_HTML,
  },
  connect_day_bestaetigung: {
    key: "connect_day_bestaetigung",
    name: "Connect Day – Anmeldebestätigung",
    beschreibung:
      "Bestätigung nach der Anmeldung zum Connect Day im Kundenportal. Die Rechnung kommt separat aus sevDesk. Hinweis: Ist das Template inaktiv, wird trotzdem mit dem Standard-HTML versendet (die Bestätigung darf nicht ausfallen).",
    variables: {
      vorname: "Max",
      firma: "Muster GmbH",
      personen: "2",
      teilnehmer_liste: "Max Mustermann, Erika Musterfrau",
      preis_netto: "398,00",
      mwst_betrag: "75,62",
      preis_brutto: "473,62",
    },
    defaultBetreff: "Anmeldung bestätigt: Copilot Connect Day 2026",
    defaultHtml: CONNECT_DAY_BESTAETIGUNG_DEFAULT_HTML,
  },
  connect_day_rechnung: {
    key: "connect_day_rechnung",
    name: "Connect Day – Rechnung (mit PDF-Anhang)",
    beschreibung:
      "Rechnungs-Mail zur Connect-Day-Anmeldung. Das Rechnungs-PDF wird aus sevDesk geholt und angehängt; die Mail geht über Resend im Branddesign raus (statt über den sevDesk-Absender). Auch bei inaktivem Template wird mit dem Standard-HTML versendet.",
    variables: {
      vorname: "Max",
      firma: "Muster GmbH",
      personen: "2",
      teilnehmer_liste: "Max Mustermann, Erika Musterfrau",
      rechnung_nr: "RE-1064",
      preis_brutto: "473,62",
      zahlungsziel: "14",
    },
    defaultBetreff: "Deine Rechnung {{rechnung_nr}} – Copilot Connect Day 2026",
    defaultHtml: CONNECT_DAY_RECHNUNG_DEFAULT_HTML,
  },
  connect_day_storno_intern: {
    key: "connect_day_storno_intern",
    name: "Connect Day – Storno (interne Benachrichtigung)",
    beschreibung:
      "Geht an den Betreiber (CONNECT_DAY_NOTIFY_EMAIL, sonst NEWSLETTER_REVIEW_EMAIL), wenn ein Partner seine Connect-Day-Anmeldung storniert. Die Rechnungs-/Stornoabwicklung läuft bewusst manuell in sevDesk. Auch bei inaktivem Template wird mit dem Standard-HTML versendet.",
    variables: {
      firma: "Muster GmbH",
      bestell_nr: "NS-2026-0042",
      personen: "2",
      teilnehmer_liste: "Max Mustermann, Erika Musterfrau",
      rechnung_nr: "RE-1042",
    },
    defaultBetreff: "Connect Day Storno: {{firma}} ({{personen}} Plätze frei)",
    defaultHtml: CONNECT_DAY_STORNO_INTERN_DEFAULT_HTML,
  },
};

export function getTemplateDefinition(key: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY[key];
}

/** Beispielwerte für Vorschau & Test-Mail eines Template-Keys. */
export function sampleVarsFor(key: string): Record<string, string> {
  return TEMPLATE_REGISTRY[key]?.variables ?? {};
}
