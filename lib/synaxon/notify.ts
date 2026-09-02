import { isResendConfigured, sendEmail } from "@/lib/email/resend";

// Benachrichtigung über eine neue Unterlagen-Anfrage von /synaxon.
// Reihenfolge wie beim Connect Day: zuerst Resend direkt aus der App, fällt
// Resend aus oder ist nicht konfiguriert, geht der bestehende n8n-Webhook der
// Warteliste (N8N_WEBHOOK_URL) mit erweiterter Payload raus.

const DEFAULT_NOTIFY_EMAIL = "info@next-skills.de";

export interface SynaxonLeadNotification {
  leadId: string;
  name: string;
  firma: string;
  email: string;
  telefon: string;
  nachricht: string;
  quelle: string;
  /** true, wenn die E-Mail bereits als Lead existierte und nur ergänzt wurde */
  bestehenderLead: boolean;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#6B6B8A;font-size:14px;vertical-align:top;white-space:nowrap">${label}</td>
    <td style="padding:6px 0;color:#1A1A2E;font-size:14px;vertical-align:top">${value || "&ndash;"}</td>
  </tr>`;
}

function buildHtml(input: SynaxonLeadNotification, adminUrl: string): string {
  const hinweis = input.bestehenderLead
    ? `<p style="margin:0 0 16px;padding:10px 12px;background:#EAF9F4;border-radius:8px;color:#1A1A2E;font-size:14px">
         Diese E-Mail-Adresse war bereits als Lead vorhanden. Der bestehende Eintrag wurde ergänzt, Status und ursprüngliche Quelle bleiben unverändert.
       </p>`
    : "";
  return `<!doctype html>
<html lang="de"><body style="margin:0;background:#E8E8F0;font-family:Figtree,system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#FFFFFF;border-radius:12px;padding:24px">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#00C896;font-weight:700">Neue Anfrage über /synaxon</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E">${esc(input.name)}, ${esc(input.firma)}</h1>
      ${hinweis}
      <table style="border-collapse:collapse;width:100%">
        ${row("Name", esc(input.name))}
        ${row("Firma", esc(input.firma))}
        ${row("E-Mail", `<a href="mailto:${esc(input.email)}" style="color:#00a87e">${esc(input.email)}</a>`)}
        ${row("Telefon", esc(input.telefon))}
        ${row("Quelle", esc(input.quelle))}
        ${row("Worum geht es?", esc(input.nachricht).replace(/\n/g, "<br>"))}
      </table>
      <p style="margin:20px 0 0">
        <a href="${esc(adminUrl)}" style="display:inline-block;background:#00C896;color:#1A1A2E;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px">Lead im CRM öffnen</a>
      </p>
    </div>
    <p style="margin:12px 0 0;font-size:12px;color:#6B6B8A">Die Person hat Unterlagen angefordert und die Datenschutzhinweise bestätigt. Antworten auf diese Mail gehen direkt an den Lead.</p>
  </div>
</body></html>`;
}

// Kontakt, der in der Bestätigung an den Absender genannt wird und zugleich
// als Antwortadresse dient.
const KONTAKT_EMAIL = "ae@next-skills.de";

function vorname(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

function buildConfirmationHtml(input: SynaxonLeadNotification): string {
  return `<!doctype html>
<html lang="de"><body style="margin:0;background:#E8E8F0;font-family:Figtree,system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#FFFFFF;border-radius:12px;padding:28px 24px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#00C896;font-weight:700">Copilot Partner Masterclass</p>
      <h1 style="margin:0 0 16px;font-size:22px;color:#1A1A2E">Deine Anfrage ist eingegangen.</h1>
      <p style="margin:0 0 12px;color:#1A1A2E;font-size:16px;line-height:1.6">Hallo ${esc(vorname(input.name))},</p>
      <p style="margin:0 0 12px;color:#1A1A2E;font-size:16px;line-height:1.6">
        danke für dein Interesse an der Copilot Partner Masterclass. Deine Anfrage ist bei uns angekommen, wir melden uns in den nächsten Tagen persönlich bei dir.
      </p>
      <p style="margin:0 0 20px;color:#1A1A2E;font-size:16px;line-height:1.6">
        Wenn du vorher Fragen hast, melde dich bei Alex unter
        <a href="mailto:${KONTAKT_EMAIL}" style="color:#00a87e;font-weight:600">${KONTAKT_EMAIL}</a>.
      </p>
      <p style="margin:0;color:#1A1A2E;font-size:16px;line-height:1.6">Viele Grüße<br>Alexander Eggers<br><span style="color:#6B6B8A">NextSkills GmbH</span></p>
    </div>
    <p style="margin:12px 0 0;font-size:12px;color:#6B6B8A">Du bekommst diese Mail, weil du über copilotberater.de/synaxon Unterlagen angefordert hast.</p>
  </div>
</body></html>`;
}

/**
 * Bestätigung an den Absender: "Deine Anfrage ist eingegangen." Nur über
 * Resend, ohne n8n-Fallback. Wirft nicht.
 */
export async function sendSynaxonConfirmation(input: SynaxonLeadNotification): Promise<void> {
  if (!isResendConfigured()) {
    console.warn("[synaxon] Keine Bestätigung an den Absender möglich: Resend ist nicht konfiguriert.");
    return;
  }
  const result = await sendEmail({
    to: input.email,
    subject: "Deine Anfrage ist eingegangen",
    html: buildConfirmationHtml(input),
    replyTo: KONTAKT_EMAIL,
    templateKey: "synaxon_bestaetigung",
  });
  if (!result.ok) {
    console.error("[synaxon] Bestätigung an den Absender fehlgeschlagen:", result.error);
  }
}

export async function notifySynaxonLead(input: SynaxonLeadNotification): Promise<void> {
  const to = process.env.SYNAXON_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_EMAIL;
  const baseUrl = process.env.APP_BASE_URL ?? "https://www.copilotberater.de";
  const adminUrl = `${baseUrl}/admin/leads/${input.leadId}`;

  if (isResendConfigured()) {
    const result = await sendEmail({
      to,
      subject: `SYNAXON-Anfrage: ${input.firma} (${input.quelle})`,
      html: buildHtml(input, adminUrl),
      replyTo: input.email,
      templateKey: "synaxon_lead",
    });
    if (result.ok) return;
    console.error("[synaxon] Resend-Versand fehlgeschlagen, Fallback n8n:", result.error);
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[synaxon] Keine Benachrichtigung möglich: weder Resend noch N8N_WEBHOOK_URL konfiguriert.");
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        timestamp: new Date().toISOString(),
        entryId: input.leadId,
        source: "synaxon",
        name: input.name,
        firma: input.firma,
        telefon: input.telefon,
        nachricht: input.nachricht,
        quelle: input.quelle,
        bestehender_lead: input.bestehenderLead,
        admin_url: adminUrl,
      }),
    });
    if (!res.ok) console.error(`[synaxon] N8N webhook returned ${res.status}`);
  } catch (err) {
    console.error("[synaxon] N8N webhook delivery failed:", err);
  }
}
