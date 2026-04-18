export interface MagicLinkWebhookInput {
  email: string;
  linkUrl: string;
}

/**
 * Feuert den n8n-Webhook für einen Kundenportal-Magic-Link (fire-and-forget).
 * n8n verschickt die eigentliche Login-E-Mail (Outlook-Draft oder direkt).
 */
export function fireMagicLinkWebhook(data: MagicLinkWebhookInput): void {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_magic_link;
  console.log("N8N Magic-Link-Webhook URL configured:", !!webhookUrl);
  if (!webhookUrl) return;

  const payload = {
    typ: "kundenportal_login",
    email: data.email,
    link_url: data.linkUrl,
    gesendet_am: new Date().toISOString(),
  };

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      console.log(`N8N Magic-Link-Webhook response: ${res.status}`);
      if (!res.ok) console.error(`N8N Magic-Link-Webhook returned ${res.status}`);
    })
    .catch((err) =>
      console.error("N8N Magic-Link-Webhook delivery failed:", err)
    );
}
