// Standard-Inhalte der Wartelisten-Mails (Bestätigung + vier Follow-ups).
// Die Texte sind unter /admin/emails editierbar; diese Defaults landen nur beim
// ersten Anlegen in der Datenbank (ensureEmailTemplates).
//
// Platzhalter: {{anrede}} ("Hallo Max," bzw. "Hallo,"), {{termin_link}}
// (Bookings-Seite), {{abmelde_link}} (persönlicher Abmelde-Link).

const P = 'style="margin:0 0 14px;color:#1A1A2E;font-size:15px;line-height:1.6;"';

/**
 * Schlichtes, persönlich wirkendes Layout: weißer Hintergrund, kein Banner,
 * Signatur wie in Alex' Outlook. Jede Follow-up-Mail enthält den Bookings-Link
 * als gut sichtbaren Textlink.
 */
function persoenlicheMail(absaetze: string[], terminText: string): string {
  const body = absaetze.map((t) => `<p ${P}>${t}</p>`).join("\n    ");
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#1A1A2E;">
    <p ${P}>{{anrede}}</p>
    ${body}
    <p ${P}><a href="{{termin_link}}" style="color:#00A87E;font-weight:bold;">${terminText}</a></p>
    <p style="margin:24px 0 0;color:#1A1A2E;font-size:15px;line-height:1.6;">Viele Grüße<br>Alex</p>
    <p style="margin:20px 0 0;color:#6B6B8A;font-size:13px;line-height:1.5;">
      Alexander Eggers · Geschäftsführer<br>
      NextSkills GmbH · Ostlandstraße 72 · 31582 Nienburg<br>
      Tel +49 151 18224446 · <a href="https://www.copilotberater.de" style="color:#6B6B8A;">copilotberater.de</a>
    </p>
    <p style="margin:24px 0 0;color:#9999AA;font-size:11px;line-height:1.5;">
      Du bekommst diese Mail, weil du dich auf copilotberater.de für die Warteliste der Copilot Partner Masterclass eingetragen hast.
      <a href="{{abmelde_link}}" style="color:#9999AA;">Keine weiteren Mails dazu</a>
    </p>
  </div>`;
}

export const FOLLOWUP_VORLAGEN: { betreff: string; html: string }[] = [
  {
    betreff: "Kurze Frage zur Masterclass",
    html: persoenlicheMail(
      [
        "du hast dich vor ein paar Tagen auf die Warteliste für die Copilot Partner Masterclass eingetragen. Danke dafür.",
        "Mich interessiert, wo ihr gerade steht. Habt ihr schon ein Copilot-Angebot, das eure Kunden buchen können? Oder steht das noch auf der Liste „müssten wir mal machen“?",
        "Am schnellsten klären wir das in einem kurzen Gespräch. 30 Minuten per Teams, kostenfrei und ohne Verkaufsdruck:",
      ],
      "Hier einen Termin mit mir buchen"
    ),
  },
  {
    betreff: "Das Muster bei über 75 Systemhäusern",
    html: persoenlicheMail(
      [
        "ein Muster sehe ich bei fast allen Partnern, mit denen ich arbeite. An der Copilot-Kompetenz hapert es selten. Es fehlt das buchbare Angebot: kein Paketpreis, kein Workshop-Format, kein klarer Ablauf für den Vertrieb.",
        "Genau das baut ihr in der Masterclass in 90 Tagen auf. Im Gespräch schauen wir gemeinsam, welcher Baustein bei euch noch fehlt.",
      ],
      "Jetzt 30 Minuten mit mir buchen"
    ),
  },
  {
    betreff: "Deine Wettbewerber bauen gerade auf",
    html: persoenlicheMail(
      [
        "Systemhäuser, die vor einem Jahr noch „schauen wir uns mal an“ gesagt haben, bauen jetzt aktiv Copilot-Beratung auf.",
        "Wer in zwölf Monaten kein eigenes Angebot hat, verkauft weiter Lizenzen mit sinkender Marge. Das Zeitfenster, sich als Copilot-Beratungspartner zu positionieren, ist nicht endlos offen.",
        "Wie der Aufbau realistisch neben dem Tagesgeschäft klappt, zeige ich dir gern in 30 Minuten:",
      ],
      "Termin für ein kurzes Gespräch buchen"
    ),
  },
  {
    betreff: "Soll ich mich später wieder melden?",
    html: persoenlicheMail(
      [
        "ich habe dir ein paar Mal geschrieben und nichts von dir gehört. Das ist völlig in Ordnung, vielleicht passt das Timing gerade nicht.",
        "Eine kurze Antwort hilft mir trotzdem: Soll ich mich zur nächsten Klasse wieder melden, oder passt das Thema für euch nicht? Ein „später“ oder „passt nicht“ reicht.",
        "Und wenn es doch jetzt passt, such dir einfach einen Termin aus:",
      ],
      "Termin mit mir buchen"
    ),
  },
];

/**
 * Bestätigung direkt nach dem Eintrag. Übernommen aus dem n8n-Workflow
 * "EMail Masterclass" (Sofort-Bonus + Termin-Button), ergänzt um den
 * Abmelde-Link für die folgende Sequenz. Das Bonus-PDF liegt in
 * public/downloads (früher bei Wix).
 */
export const BESTAETIGUNG_BETREFF =
  "Bestätigt: Du bist auf der Warteliste für die Copilot Masterclass 🚀";

export const BESTAETIGUNG_HTML = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EAF9F4;">
<tr><td align="center" style="padding:20px 12px; font-family:Arial,Helvetica,sans-serif; color:#1A1A2E;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
  <tr><td bgcolor="#00C896" style="background:#00C896; height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>
  <tr><td bgcolor="#1A1A2E" style="background:#1A1A2E; padding:28px 30px 24px;">
    <span style="display:inline-block; background:#252540; border-radius:12px; padding:5px 14px; color:#00C896; font-size:12px; font-weight:bold; letter-spacing:0.5px;">COPILOT PARTNER MASTERCLASS</span>
    <h1 style="color:#ffffff; margin:14px 0 0; font-size:24px;">Du bist auf der Warteliste!</h1>
  </td></tr>
  <tr><td style="padding:36px 30px 20px; font-size:16px; line-height:1.6;">
    <p style="margin-top:0;">Moin!</p>
    <p>Starke Entscheidung. Du stehst ab sofort auf der Warteliste für die <strong>Microsoft Copilot Partner Masterclass</strong>. Damit hast du den wichtigsten Schritt schon gemacht.</p>
    <p>Sobald die Termine für die nächste Klasse feststehen, hörst du als Erstes von mir. Bis dahin musst du aber nicht warten. Im KI-Markt kann es sich niemand leisten, Däumchen zu drehen.</p>
    <p>Deshalb bekommst du heute schon deinen versprochenen <strong>Sofort-Bonus</strong>. Darin erfährst du, welche drei Fehler die meisten Systemhäuser beim KI-Pitch machen und wie du es von Tag eins an besser machst.</p>
    <div style="text-align:center; margin:32px 0;">
      <a href="https://www.copilotberater.de/downloads/Partner-Guide_3_Fehler_Copilot-Pitch.pdf" style="background:#00C896; color:#1A1A2E; text-decoration:none; padding:14px 36px; border-radius:6px; font-weight:bold; display:inline-block; font-size:16px;">Sofort-Bonus herunterladen &darr;</a>
    </div>
  </td></tr>
  <tr><td style="padding:0 30px;"><div style="border-top:2px solid #EAF9F4;"></div></td></tr>
  <tr><td style="padding:24px 30px 36px; font-size:15px; line-height:1.6;">
    <h3 style="font-size:18px; margin:0 0 12px;">Wie geht es weiter?</h3>
    <p style="margin:0 0 10px;"><strong>1. Sofort-Bonus lesen:</strong> Die drei Fehler im KI-Pitch und wie du sie vermeidest.</p>
    <p style="margin:0 0 10px;"><strong>2. Persönliches Gespräch buchen:</strong> Wir sprechen 30 Minuten über deine Situation. Wo stehst du gerade mit Copilot? Welche Ziele hast du? So finden wir gemeinsam heraus, ob die Masterclass der richtige Weg für dich ist.</p>
    <div style="text-align:center; margin:24px 0 8px;">
      <a href="{{termin_link}}" style="background:#1A1A2E; color:#00C896; text-decoration:none; padding:14px 36px; border-radius:6px; font-weight:bold; display:inline-block; font-size:15px; border:2px solid #00C896;">Jetzt Termin mit Alex buchen &rarr;</a>
    </div>
    <p style="text-align:center; font-size:12px; color:#6B6B8A; margin:4px 0 24px;">30 Minuten · per Microsoft Teams · kostenfrei</p>
    <p style="font-size:14px; color:#6B6B8A;">Fragen vorab? Antworte einfach direkt auf diese E-Mail. Die Nachricht landet bei mir persönlich.</p>
    <p style="margin:24px 0 0;">Beste Grüße,</p>
    <p style="margin:6px 0 0;"><strong>Alex Eggers</strong><br><span style="color:#6B6B8A; font-size:13px;">7x Microsoft MVP · Gründer NextSkills GmbH</span></p>
  </td></tr>
  <tr><td bgcolor="#E8E8F0" style="background:#E8E8F0; padding:18px 30px; text-align:center; border-top:1px solid #D5D5E0;">
    <p style="margin:0; font-size:12px; color:#6B6B8A;">NextSkills GmbH · Alex Eggers · Ostlandstraße 72 · 31582 Nienburg<br>
    <a href="https://www.copilotberater.de" style="color:#00A87E; text-decoration:none;">copilotberater.de</a></p>
    <p style="margin:8px 0 0; font-size:11px; color:#9999AA;">Du erhältst diese E-Mail, weil du dich auf copilotberater.de für die Warteliste eingetragen hast.
    <a href="{{abmelde_link}}" style="color:#9999AA;">Keine weiteren Mails dazu</a></p>
  </td></tr>
</table>
</td></tr>
</table>`;
