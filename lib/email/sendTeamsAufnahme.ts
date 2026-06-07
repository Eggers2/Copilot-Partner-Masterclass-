import { getEmailTemplate } from "@/lib/db/emailTemplates";
import { renderTemplate } from "@/lib/email/renderTemplate";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";

export interface TeamsAufnahmeEmailInput {
  email: string;
  vorname: string;
  klasseName: string;
}

/**
 * Benachrichtigt einen Teilnehmer, dass er ins Teams-Team seiner Klasse
 * aufgenommen wurde. Microsoft verschickt bei der Aufnahme über die
 * M365-Gruppe bewusst KEINE Mail – diese Info schließt die Lücke.
 *
 * Gesteuert über das Template `teams_aufgenommen` (/admin/emails): nur wenn das
 * Template aktiv UND Resend konfiguriert ist, wird versendet. Best-effort –
 * Fehler werden geloggt, blockieren die Aufnahme aber nie.
 */
export async function sendTeamsAufnahmeEmail(
  data: TeamsAufnahmeEmailInput
): Promise<void> {
  if (!isResendConfigured()) return;
  try {
    const template = await getEmailTemplate("teams_aufgenommen");
    if (!template?.aktiv) return;

    const vars = { vorname: data.vorname, klasse: data.klasseName };
    const result = await sendEmail({
      to: data.email,
      subject: renderTemplate(template.betreff, vars),
      html: renderTemplate(template.html, vars),
      templateKey: "teams_aufgenommen",
    });
    if (!result.ok) {
      console.error(
        `[Teams] Aufnahme-Benachrichtigung an ${data.email} fehlgeschlagen:`,
        result.error
      );
    }
  } catch (err) {
    console.error("[Teams] Aufnahme-Benachrichtigung fehlgeschlagen:", err);
  }
}
