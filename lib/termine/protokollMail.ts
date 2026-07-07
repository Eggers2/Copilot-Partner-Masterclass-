// Gebrandete Protokoll-Mail für Klassen-Termine im Design der Website
// (Outlook-sicheres 600px-Tabellenlayout, dunkler Hero, Grün-Akzent – wie die
// Connect-Day-Mails). Enthält die kompakte Zusammenfassung, den Link zur
// Aufzeichnung und den Folgetermin; das ausführliche Protokoll geht als
// PDF-Anhang mit.

export interface ProtokollMailTermin {
  datum: Date;
  thema: string | null;
  zusammenfassung: string | null;
  videoUrl: string | null;
}

export interface ProtokollMailNextTermin {
  datum: Date;
  thema: string | null;
  teamsLink: string | null;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Formatiert ein Datum als deutsches Datum+Uhrzeit in Europe/Berlin. */
export function formatTerminDatum(d: Date): string {
  return d.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function terminProtokollSubject(
  klasseName: string,
  thema: string | null
): string {
  const themaTeil = thema ? `: ${thema}` : "";
  return `Zusammenfassung & Protokoll${themaTeil} – ${klasseName}`;
}

/** Kompakte Zusammenfassung (Spiegelstrich-Zeilen) → Tabellen-Bullets mit Grün-Akzent. */
function zusammenfassungRows(zusammenfassung: string): string {
  return zusammenfassung
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^[-•*]\s+(.*)$/);
      const text = esc(m ? m[1] : line);
      return (
        `<tr><td style="color:#00C896; font-weight:700; padding:0 10px 8px 0; vertical-align:top;">•</td>` +
        `<td style="padding:0 0 8px; font-size:15px; line-height:1.6; color:#0F172A;">${text}</td></tr>`
      );
    })
    .join("\n");
}

export function buildTerminProtokollHtml(
  klasseName: string,
  termin: ProtokollMailTermin,
  next: ProtokollMailNextTermin | null
): string {
  const datumStr = esc(formatTerminDatum(termin.datum));

  const zusammenfassungBlock = termin.zusammenfassung?.trim()
    ? `
    <p style="margin:0 0 10px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#64748B;">
      Das Wichtigste in Kürze
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
${zusammenfassungRows(termin.zusammenfassung)}
    </table>`
    : "";

  const videoBlock = termin.videoUrl
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:8px 0 4px;">
      <a href="${esc(termin.videoUrl)}" style="display:inline-block; padding:14px 32px; background:#00C896; color:#1A1A2E; text-decoration:none; border-radius:12px; font-weight:700; font-size:16px;">
        &#9654;&nbsp; Aufzeichnung ansehen
      </a>
    </td></tr></table>`
    : "";

  const nextBlock = next
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9; border:1px solid #E2E8F0; border-radius:12px; margin:24px 0 0;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 10px; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#64748B;">
          &#128197;&nbsp; Nächster Termin
        </p>
        <p style="margin:0 0 4px; font-size:16px; font-weight:700; color:#0F172A;">${esc(formatTerminDatum(next.datum))} Uhr</p>
        ${next.thema ? `<p style="margin:0 0 12px; font-size:15px; line-height:1.6; color:#0F172A;">Thema: ${esc(next.thema)}</p>` : `<p style="margin:0 0 12px;"></p>`}
        ${
          next.teamsLink
            ? `<a href="${esc(next.teamsLink)}" style="display:inline-block; padding:10px 22px; background:#1A1A2E; color:#ffffff; text-decoration:none; border-radius:10px; font-weight:600; font-size:14px;">An Teams-Meeting teilnehmen&nbsp;&rarr;</a>`
            : ""
        }
      </td></tr>
    </table>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;">
<tr><td align="center" style="padding:24px 12px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#0F172A;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
  <tr><td style="background:#1A1A2E; border-radius:16px 16px 0 0; padding:32px; text-align:center;">
    <div style="display:inline-block; padding:6px 16px; border:1px solid rgba(0,200,150,.5); border-radius:999px; color:#00C896; font-size:12px; font-weight:600; margin-bottom:16px;">
      Session-Protokoll
    </div>
    <h1 style="margin:0 0 8px; color:#ffffff; font-size:24px; line-height:1.2;">${esc(termin.thema || klasseName)}</h1>
    <p style="margin:0; color:rgba(255,255,255,.7); font-size:14px;">${termin.thema ? `${esc(klasseName)} · ` : ""}${datumStr} Uhr</p>
  </td></tr>
  <tr><td style="background:#ffffff; padding:32px; border-radius:0 0 16px 16px; border:1px solid #E2E8F0; border-top:none;">
    <p style="font-size:15px; line-height:1.6; margin:0 0 16px;">Hallo zusammen,</p>
    <p style="font-size:15px; line-height:1.6; margin:0 0 20px;">
      schön, dass so viele dabei waren! Und falls du diesmal nicht dabei sein konntest:
      kein Problem – hier bekommst du das Wichtigste auf einen Blick${
        termin.videoUrl ? ", dazu die Aufzeichnung zum Nachschauen" : ""
      }.
    </p>
${zusammenfassungBlock}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EAF9F4; border:1px solid #00C896; border-radius:12px; margin:20px 0;">
      <tr><td style="padding:14px 18px; font-size:14px; line-height:1.6; color:#0F172A;">
        &#128206;&nbsp; Das <strong>ausführliche Protokoll</strong> der Session findest du als PDF im Anhang dieser E-Mail.
      </td></tr>
    </table>
${videoBlock}
${nextBlock}
    <p style="font-size:15px; line-height:1.6; margin:24px 0 0;">
      Bis zum nächsten Mal!<br><strong>Alex &amp; das Next Skills Team</strong>
    </p>
  </td></tr>
  <tr><td style="padding:20px 8px 0; text-align:center; font-size:12px; color:#94A3B8;">
    Next Skills · Copilot Partner Masterclass
  </td></tr>
</table>
</td></tr>
</table>`;
}
