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
