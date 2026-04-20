export interface NewsletterWebhookInput {
  newsletterId: string;
  ausgabeNr: number;
  kw: number;
  jahr: number;
  subject: string;
  html: string;
  bcc: string[];
  absender?: string;
  testMail?: boolean;
}

export interface NewsletterWebhookResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Ruft den n8n-Webhook für den Newsletter-Versand auf. Im Gegensatz zu den
 * anderen Webhooks wird hier auf die Response gewartet, damit der Admin
 * unmittelbar Feedback bekommt, ob der Draft erzeugt werden konnte.
 */
export async function fireNewsletterWebhook(
  data: NewsletterWebhookInput
): Promise<NewsletterWebhookResult> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_newsletter;
  if (!webhookUrl) {
    return {
      ok: false,
      error:
        "N8N_WEBHOOK_URL_newsletter ist nicht gesetzt. Bitte in den Environment-Variablen hinterlegen.",
    };
  }

  const payload = {
    typ: "newsletter",
    newsletter_id: data.newsletterId,
    ausgabe_nr: data.ausgabeNr,
    kw: data.kw,
    jahr: data.jahr,
    subject: data.subject,
    html: data.html,
    bcc: data.bcc,
    absender: data.absender ?? process.env.NEWSLETTER_SENDER_EMAIL ?? "",
    test_mail: !!data.testMail,
    gesendet_am: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: `n8n antwortete mit ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unbekannter Fehler beim Webhook-Aufruf",
    };
  }
}
