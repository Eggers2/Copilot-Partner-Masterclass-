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
};

export function getTemplateDefinition(key: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY[key];
}

/** Beispielwerte für Vorschau & Test-Mail eines Template-Keys. */
export function sampleVarsFor(key: string): Record<string, string> {
  return TEMPLATE_REGISTRY[key]?.variables ?? {};
}
