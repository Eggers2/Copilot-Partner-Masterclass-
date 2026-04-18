export interface TeamsGuestWebhookInput {
  teilnehmerId: number;
  bestellNr: string;
  vorname: string;
  nachname: string;
  email: string;
}

/**
 * Feuert den n8n-Webhook zur Einladung eines Teilnehmers als Gast in das
 * konfigurierte Microsoft-Teams-Team (fire-and-forget).
 *
 * n8n ruft die Microsoft-Graph-API auf (Invitations + Team-Member) und meldet
 * den Erfolg via Callback an `/api/webhooks/n8n` (event: "teams_guest_invited")
 * zurück, woraufhin `teams_eingeladen_am` in der DB gesetzt wird.
 */
export function fireTeamsGuestWebhook(data: TeamsGuestWebhookInput): void {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_teams_guest;
  if (!webhookUrl) return;

  const displayName = `${data.vorname} ${data.nachname}`.trim() || data.email;
  const inviteRedirectUrl =
    process.env.APP_BASE_URL ?? "https://www.copilotberater.de";

  const payload = {
    typ: "teams_guest_invite",
    teilnehmer_id: data.teilnehmerId,
    bestell_nr: data.bestellNr,
    vorname: data.vorname,
    nachname: data.nachname,
    email: data.email,
    display_name: displayName,
    invite_redirect_url: inviteRedirectUrl,
    ausgeloest_am: new Date().toISOString(),
  };

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) console.error(`N8N Teams-Guest-Webhook returned ${res.status}`);
    })
    .catch((err) =>
      console.error("N8N Teams-Guest-Webhook delivery failed:", err)
    );
}
