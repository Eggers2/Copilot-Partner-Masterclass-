import { readFile, readdir } from "fs/promises";
import path from "path";
import { sendEmail, type SendEmailResult } from "@/lib/email/resend";

// One-Pager-Mail der LinkedIn-Landingpage (/linkedin).
//
// Anhang ist ausschließlich public/dokumente/onepager.pdf (Groß-/Klein-
// schreibung egal). Anders als die First-Call-Mail gibt es hier bewusst
// keinen Fallback auf "irgendeine PDF" und keinen Versand ohne Anhang:
// die Mail verspricht den One-Pager, also geht sie nur mit ihm raus.

const ANHANG_DATEINAME = "Copilot-Masterclass-One-Pager.pdf";

export const ONEPAGER_BETREFF = "Ihr One-Pager zur Copilot Partner Masterclass";

async function loadOnePager(): Promise<{ filename: string; content: Buffer } | null> {
  const dir = path.join(process.cwd(), "public", "dokumente");
  try {
    const files = await readdir(dir);
    const datei = files.find((f) => f.toLowerCase() === "onepager.pdf");
    if (!datei) return null;
    return { filename: ANHANG_DATEINAME, content: await readFile(path.join(dir, datei)) };
  } catch {
    return null;
  }
}

function buildHtml(): string {
  const p = 'style="margin:0 0 12px;color:#1A1A2E;font-size:16px;line-height:1.6"';
  return `<!doctype html>
<html lang="de"><body style="margin:0;background:#E8E8F0;font-family:Figtree,system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#FFFFFF;border-radius:12px;padding:28px 24px">
      <p style="margin:0 0 16px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#00C896;font-weight:700">Copilot Partner Masterclass</p>
      <p ${p}>Guten Tag,</p>
      <p ${p}>anbei der One-Pager zur Copilot Partner Masterclass mit Programm, Paketen und Preisen.</p>
      <p style="margin:0 0 20px;color:#1A1A2E;font-size:16px;line-height:1.6">Wenn Sie nach dem Lesen Fragen haben oder prüfen möchten, ob das Programm zu Ihrem Systemhaus passt, antworten Sie einfach auf diese E-Mail. Die Antwort landet direkt bei mir.</p>
      <p style="margin:0;color:#1A1A2E;font-size:16px;line-height:1.6">Viele Grüße<br>Alexander Eggers<br><span style="color:#6B6B8A">NextSkills GmbH</span></p>
    </div>
    <p style="margin:12px 0 0;font-size:12px;color:#6B6B8A">Sie bekommen diese E-Mail, weil Sie auf copilotberater.de den One-Pager angefordert haben. NextSkills GmbH &middot; <a href="https://www.copilotberater.de" style="color:#00a87e;text-decoration:none">copilotberater.de</a></p>
  </div>
</body></html>`;
}

/** Versendet den One-Pager als PDF-Anhang über Resend. Wirft nicht. */
export async function sendOnePagerEmail(to: string): Promise<SendEmailResult> {
  const anhang = await loadOnePager();
  if (!anhang) {
    return { ok: false, error: "One-Pager fehlt (public/dokumente/onepager.pdf)." };
  }
  return sendEmail({
    to,
    subject: ONEPAGER_BETREFF,
    html: buildHtml(),
    replyTo: process.env.FIRST_CALL_REPLY_TO || undefined,
    templateKey: "linkedin_onepager",
    attachments: [anhang],
  });
}
