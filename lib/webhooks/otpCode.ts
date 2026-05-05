export interface OtpCodeWebhookInput {
  email: string;
  code: string;
}

/**
 * Sendet den 6-stelligen OTP-Code per n8n-Webhook (Outlook-Mail).
 * Im Gegensatz zum alten Magic-Link ist dieser Aufruf await-bar — der
 * Aufrufer kann auf einen Zustellfehler reagieren und dem Partner eine
 * echte Fehlermeldung zeigen, statt ihn ins Leere laufen zu lassen.
 */
export async function sendOtpCodeViaWebhook(
  data: OtpCodeWebhookInput
): Promise<boolean> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_otp_code;
  if (!webhookUrl) {
    console.error("[Kundenportal-OTP] N8N_WEBHOOK_URL_otp_code nicht gesetzt");
    return false;
  }

  const payload = {
    typ: "kundenportal_otp",
    email: data.email,
    code: data.code,
    gesendet_am: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[Kundenportal-OTP] Webhook returned ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Kundenportal-OTP] Webhook delivery failed:", err);
    return false;
  }
}
