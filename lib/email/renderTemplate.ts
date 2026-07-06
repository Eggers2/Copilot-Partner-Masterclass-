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

// Eine einzige gebrandete Mail: Anmeldebestätigung UND Rechnung (PDF im
// Anhang) in einem – im Design der Website (dunkler Hero, Grün-Akzent).
const CONNECT_DAY_RECHNUNG_DEFAULT_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
<tr><td align="center" style="padding:24px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0F172A;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
  <tr><td style="background:#1A1A2E; border-radius:16px 16px 0 0; padding:32px; text-align:center;">
    <div style="display:inline-block; padding:6px 16px; border:1px solid rgba(0,200,150,.5); border-radius:999px; color:#00C896; font-size:12px; font-weight:600; margin-bottom:16px;">
      Anmeldung bestätigt
    </div>
    <h1 style="margin:0 0 8px; color:#ffffff; font-size:26px; line-height:1.15;">Copilot <span style="color:#00C896;">Connect Day</span> 2026</h1>
    <p style="margin:0; color:rgba(255,255,255,.7); font-size:14px;">10. &amp; 11. Dezember 2026 · nhow Hotel Frankfurt am Main</p>
  </td></tr>
  <tr><td style="background:#ffffff; padding:32px; border-radius:0 0 16px 16px; border:1px solid #E2E8F0; border-top:none;">
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px;">Hallo {{vorname}},</p>
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px;">eure Anmeldung für <strong>{{firma}}</strong> ist eingegangen – wir freuen uns auf euch! Die Rechnung <strong>{{rechnung_nr}}</strong> findet ihr im Anhang dieser E-Mail.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9; border:1px solid #E2E8F0; border-radius:12px; margin:20px 0;">
      <tr><td style="padding:16px 20px; font-size:15px; line-height:1.7;">
        <p style="margin:0 0 6px;">Angemeldete Teilnehmer ({{personen}}): <strong>{{teilnehmer_liste}}</strong></p>
        <p style="margin:0;">Rechnungsbetrag: <strong>{{preis_brutto}} €</strong> (inkl. USt) · zahlbar innerhalb von <strong>{{zahlungsziel}} Tagen</strong></p>
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; margin:20px 0;">
      <tr><td style="padding:14px 18px; font-size:14px; line-height:1.6; color:#92400E;">
        <strong>Wichtig:</strong> Der Platz ist erst nach Zahlungseingang verbindlich bestätigt. Bitte überweist den Betrag innerhalb der Zahlungsfrist, damit euch niemand den Platz streitig macht.
      </td></tr>
    </table>
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px;">Alle weiteren Informationen (Agenda, Ablauf, Hotel-Check-in) erhaltet ihr rechtzeitig vor dem Termin.</p>
    <p style="font-size:13px; line-height:1.6; color:#64748B; margin:0;">Die Anmeldung ist verbindlich. Eine Absage ist jederzeit möglich, kostet aber 399 Euro, falls wir den Platz nicht nachbesetzen können. Teilnehmer könnt ihr bis zum Event jederzeit im Kundenportal tauschen.</p>
  </td></tr>
  <tr><td style="padding:20px 8px 0; text-align:center; font-size:12px; color:#94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </td></tr>
</table>
</td></tr>
</table>`;

const CONNECT_DAY_EINLADUNG_DEFAULT_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
<tr><td align="center" style="padding:24px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0F172A;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
  <tr><td style="background:#1A1A2E; border-radius:16px 16px 0 0; padding:36px 32px; text-align:center;">
    <div style="display:inline-block; padding:8px 18px; border:1px solid rgba(0,200,150,.5); border-radius:999px; color:#00C896; font-size:13px; font-weight:600; margin-bottom:20px;">
      Exklusiv für Klasse 1 &amp; 2 &nbsp;·&nbsp; nur 100 Plätze
    </div>
    <h1 style="margin:0 0 12px; color:#ffffff; font-size:30px; line-height:1.15; letter-spacing:-0.02em;">
      Copilot <span style="color:#00C896;">Connect Day</span> 2026
    </h1>
    <p style="margin:0; color:rgba(255,255,255,.7); font-size:15px; line-height:1.6;">
      <strong style="color:#ffffff;">10. &amp; 11. Dezember 2026</strong> · nhow Hotel Frankfurt am Main<br>
      Donnerstag 12:00 Uhr bis Freitag 14:00 Uhr
    </p>
  </td></tr>
  <tr><td style="background:#00C896; padding:14px 24px; text-align:center;">
    <span style="color:#1A1A2E; font-size:15px; font-weight:700;">⏳ Anmeldung öffnet am 7. Juli um 0:00 Uhr – First Come, First Serve</span>
  </td></tr>
  <tr><td style="background:#ffffff; padding:32px; border-radius:0 0 16px 16px; border:1px solid #E2E8F0; border-top:none;">
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px;">Hallo {{vorname}},</p>
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px;">
      es ist offiziell: Wir treffen uns <strong>live in Frankfurt</strong>. Zwei Tage persönlicher
      Austausch statt Teams-Kachel – mit den Menschen, mit denen ihr seit Monaten gemeinsam lernt.
      Endlich mal bei einem Kaffee, einem Abendessen und auf 185&nbsp;Metern über der Stadt.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9; border:1px solid #E2E8F0; border-radius:12px; margin:24px 0;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#64748B;">
          4 Microsoft MVPs vor Ort – Vorträge &amp; Workshops
        </p>
        <p style="margin:0; font-size:15px; line-height:1.9;">
          <strong>Tanja Wiehoff</strong> <span style="color:#64748B;">– Copilot Studio / Agenten</span><br>
          <strong>Raphael Köllner</strong> <span style="color:#64748B;">– Compliance / Datenschutz</span><br>
          <strong>Michael Greth</strong> <span style="color:#64748B;">– Copilot / SharePoint</span><br>
          <strong>Alex Eggers</strong> <span style="color:#64748B;">– Copilot / Adoption</span>
        </p>
        <p style="margin:12px 0 0; font-size:13px; color:#64748B;">
          Mit dabei: die <strong>ADN</strong> als Distributor und Sponsor des Events.
        </p>
      </td></tr>
    </table>
    <p style="font-size:15px; font-weight:700; margin:0 0 10px;">Alles drin für 199&nbsp;€ netto pro Person:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:15px; line-height:1.8; margin:0 0 12px;">
      <tr><td style="color:#00C896; padding-right:10px; vertical-align:top;">✔</td><td>Übernachtung im <strong>nhow Hotel Frankfurt</strong></td></tr>
      <tr><td style="color:#00C896; padding-right:10px; vertical-align:top;">✔</td><td>Mittagssnack &amp; Kaffeepausen an beiden Tagen</td></tr>
      <tr><td style="color:#00C896; padding-right:10px; vertical-align:top;">✔</td><td>Gemeinsames Abendessen</td></tr>
      <tr><td style="color:#00C896; padding-right:10px; vertical-align:top;">✔</td><td><strong>2 Stunden in der höchsten Skybar Deutschlands</strong> – Bier, Wein &amp; Softdrinks inklusive</td></tr>
    </table>
    <p style="font-size:13px; color:#64748B; margin:0 0 20px;">
      Lediglich die An- und Abreise nach Frankfurt organisiert jeder Teilnehmer in Eigenregie.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; margin:0 0 24px;">
      <tr><td style="padding:16px 20px; font-size:14px; line-height:1.6; color:#92400E;">
        <strong>Es gibt genau 100 Plätze. Nicht mehr.</strong><br>
        Die Anmeldung öffnet am <strong>Montag, 7. Juli um 0:00 Uhr</strong> im Kundenportal –
        dort seht ihr live, wie viele Plätze noch frei sind. Bis zu <strong>3 Personen pro Firma</strong>,
        Anmeldeschluss 17. Juli.
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:8px 0 20px;">
      <a href="https://www.copilotberater.de/connect-day" style="display:inline-block; padding:14px 32px; background:#00C896; color:#1A1A2E; text-decoration:none; border-radius:12px; font-weight:700; font-size:16px;">
        Alle Infos zum Connect Day&nbsp;&rarr;
      </a>
      <p style="margin:10px 0 0; font-size:13px; color:#64748B;">
        Anmeldung ab 7.7. im <a href="https://www.copilotberater.de/kundenportal" style="color:#030386;">Kundenportal</a> –
        einloggen kann sich, wer die Masterclass für euer Unternehmen gebucht hat.
      </p>
    </td></tr></table>
    <p style="font-size:15px; line-height:1.6; margin:0;">
      Wir freuen uns auf euch!<br><strong>Alex &amp; das Next Skills Team</strong>
    </p>
  </td></tr>
  <tr><td style="padding:20px 8px 0; text-align:center; font-size:12px; color:#94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </td></tr>
</table>
</td></tr>
</table>`;

const CONNECT_DAY_START_DEFAULT_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
<tr><td align="center" style="padding:24px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0F172A;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
  <tr><td style="background:#1A1A2E; border-radius:16px 16px 0 0; padding:36px 32px; text-align:center;">
    <div style="display:inline-block; padding:8px 18px; border:1px solid rgba(0,200,150,.5); border-radius:999px; color:#00C896; font-size:13px; font-weight:600; margin-bottom:20px;">
      ✅ Anmeldung ab sofort geöffnet
    </div>
    <h1 style="margin:0 0 12px; color:#ffffff; font-size:30px; line-height:1.15; letter-spacing:-0.02em;">
      Copilot <span style="color:#00C896;">Connect Day</span> 2026
    </h1>
    <p style="margin:0; color:rgba(255,255,255,.7); font-size:15px; line-height:1.6;">
      <strong style="color:#ffffff;">10. &amp; 11. Dezember 2026</strong> · nhow Hotel Frankfurt am Main
    </p>
  </td></tr>
  <tr><td style="background:#00C896; padding:14px 24px; text-align:center;">
    <span style="color:#1A1A2E; font-size:15px; font-weight:700;">Es ist so weit – die Anmeldung ist jetzt offen! First Come, First Serve.</span>
  </td></tr>
  <tr><td style="background:#ffffff; padding:32px; border-radius:0 0 16px 16px; border:1px solid #E2E8F0; border-top:none;">
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px;">Hallo {{vorname}},</p>
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px;">
      ab jetzt gilt's: Die Anmeldung für den <strong>Copilot Connect Day</strong> ist freigeschaltet.
      Es gibt <strong>nur 100 Plätze</strong>, und sie gehen in der Reihenfolge der Anmeldungen weg –
      wer dabei sein will, sollte jetzt buchen.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9; border:1px solid #E2E8F0; border-radius:12px; margin:20px 0;">
      <tr><td style="padding:20px 24px; font-size:15px; line-height:1.8;">
        Zwei Tage persönlicher Austausch, 4 Microsoft MVPs, die ADN als Sponsor – und ein Abend
        in der höchsten Skybar Deutschlands. Alles drin für <strong>199&nbsp;€ netto pro Person</strong>
        (inkl. Hotel, Verpflegung &amp; Abendessen), bis zu 3 Personen pro Firma.
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:8px 0 20px;">
      <a href="https://www.copilotberater.de/kundenportal" style="display:inline-block; padding:14px 36px; background:#00C896; color:#1A1A2E; text-decoration:none; border-radius:12px; font-weight:700; font-size:16px;">
        Jetzt Platz sichern&nbsp;&rarr;
      </a>
      <p style="margin:10px 0 0; font-size:13px; color:#64748B;">
        Anmeldung im <a href="https://www.copilotberater.de/kundenportal" style="color:#030386;">Kundenportal</a> –
        einloggen kann sich, wer die Masterclass für euer Unternehmen gebucht hat.
      </p>
    </td></tr></table>
    <p style="font-size:14px; line-height:1.6; color:#64748B; margin:0;">
      Anmeldeschluss ist der 17. Juli – aber wartet nicht so lange, die Plätze sind begrenzt.
      Alle Details findet ihr auf der <a href="https://www.copilotberater.de/connect-day" style="color:#030386;">Event-Seite</a>.
    </p>
    <p style="font-size:15px; line-height:1.6; margin:20px 0 0;">
      Wir freuen uns auf euch!<br><strong>Alex &amp; das Next Skills Team</strong>
    </p>
  </td></tr>
  <tr><td style="padding:20px 8px 0; text-align:center; font-size:12px; color:#94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </td></tr>
</table>
</td></tr>
</table>`;

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
  connect_day_rechnung: {
    key: "connect_day_rechnung",
    name: "Connect Day – Bestätigung & Rechnung",
    beschreibung:
      "EINE Mail nach der Connect-Day-Anmeldung: Bestätigung + Rechnung als PDF-Anhang (aus sevDesk), über Resend im Branddesign. Auch bei inaktivem Template wird mit dem Standard-HTML versendet, damit die Bestätigung nicht ausfällt.",
    variables: {
      vorname: "Max",
      firma: "Muster GmbH",
      personen: "2",
      teilnehmer_liste: "Max Mustermann, Erika Musterfrau",
      rechnung_nr: "RE-1064",
      preis_brutto: "473,62",
      zahlungsziel: "14",
    },
    defaultBetreff: "Anmeldung bestätigt + Rechnung – Copilot Connect Day 2026",
    defaultHtml: CONNECT_DAY_RECHNUNG_DEFAULT_HTML,
  },
  connect_day_einladung: {
    key: "connect_day_einladung",
    name: "Connect Day – Einladung (Werbe-Mail)",
    beschreibung:
      "Werbe-/Einladungsmail zum Connect Day, versendet aus dem Admin (/admin/connect-day) an die Besteller/Koordinatoren von Klasse 1 & 2. {{vorname}} wird je Empfänger personalisiert.",
    variables: { vorname: "Max" },
    defaultBetreff:
      "🚀 Copilot Connect Day 2026 – nur 100 Plätze. Anmeldung öffnet am 7. Juli",
    defaultHtml: CONNECT_DAY_EINLADUNG_DEFAULT_HTML,
  },
  connect_day_start: {
    key: "connect_day_start",
    name: "Connect Day – Start (Anmeldung offen)",
    beschreibung:
      "Erinnerungs-/Motivationsmail am Tag der Freischaltung, versendet aus dem Admin (/admin/connect-day) an die Besteller/Koordinatoren von Klasse 1 & 2. {{vorname}} wird je Empfänger personalisiert.",
    variables: { vorname: "Max" },
    defaultBetreff: "✅ Jetzt anmelden – der Copilot Connect Day ist geöffnet",
    defaultHtml: CONNECT_DAY_START_DEFAULT_HTML,
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
