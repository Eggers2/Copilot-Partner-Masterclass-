import { getEmailTemplate } from "@/lib/db/emailTemplates";
import { renderTemplate } from "@/lib/email/renderTemplate";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";
import { sendOtpCodeViaWebhook } from "@/lib/webhooks/otpCode";

export interface OtpCodeInput {
  email: string;
  code: string;
}

/**
 * Versendet den OTP-Login-Code – über Resend, wenn das Template `kundenportal_otp`
 * aktiv und Resend konfiguriert ist, andernfalls (oder bei Resend-Fehler) über
 * den bestehenden n8n-Webhook als Fallback. Gibt – wie der bisherige Webhook –
 * einen Boolean zurück, damit der Login-Flow auf Zustellfehler reagieren kann.
 */
export async function dispatchOtpCode(data: OtpCodeInput): Promise<boolean> {
  if (isResendConfigured()) {
    try {
      const template = await getEmailTemplate("kundenportal_otp");
      if (template?.aktiv) {
        const vars = { code: data.code, email: data.email };
        const result = await sendEmail({
          to: data.email,
          subject: renderTemplate(template.betreff, vars),
          html: renderTemplate(template.html, vars),
          templateKey: "kundenportal_otp",
        });
        if (result.ok) return true;
        console.error("[OTP] Resend-Versand fehlgeschlagen, Fallback auf n8n:", result.error);
      }
    } catch (err) {
      console.error("[OTP] Fehler beim Resend-Versand, Fallback auf n8n:", err);
    }
  }

  // Fallback: bestehender n8n-Webhook (Outlook).
  return sendOtpCodeViaWebhook({ email: data.email, code: data.code });
}
