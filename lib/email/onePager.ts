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

export type OnePagerAnlass = "onepager" | "bewerbung";

const VARIANTEN: Record<OnePagerAnlass, { betreff: string; absaetze: string[]; grund: string; templateKey: string }> = {
  onepager: {
    betreff: "Ihr One-Pager zur Copilot Partner Masterclass",
    absaetze: [
      "anbei der One-Pager zur Copilot Partner Masterclass mit Programm, Paketen und Preisen.",
      "Wenn Sie nach dem Lesen Fragen haben oder prüfen möchten, ob das Programm zu Ihrem Systemhaus passt, antworten Sie einfach auf diese E-Mail. Die Antwort landet direkt bei mir.",
    ],
    grund: "den One-Pager angefordert",
    templateKey: "linkedin_onepager",
  },
  // Bestätigung für Bewerbungen über /linkedin. Ersetzt die Bestätigung, die
  // sonst aus der Wartelisten-Sequenz kommt (die hier bewusst nicht läuft).
  bewerbung: {
    betreff: "Ihre Bewerbung für die Copilot Partner Masterclass",
    absaetze: [
      "vielen Dank für Ihre Bewerbung für die Copilot Partner Masterclass. Ich melde mich innerhalb von 48 Stunden persönlich bei Ihnen.",
      "Anbei finden Sie schon einmal den One-Pager mit Programm, Paketen und Preisen.",
      "Wenn Sie vorher Fragen haben, antworten Sie einfach auf diese E-Mail. Die Antwort landet direkt bei mir.",
    ],
    grund: "sich für die Copilot Partner Masterclass beworben",
    templateKey: "linkedin_bewerbung",
  },
};

export function onePagerBetreff(anlass: OnePagerAnlass): string {
  return VARIANTEN[anlass].betreff;
}

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

function buildHtml(anlass: OnePagerAnlass): string {
  const v = VARIANTEN[anlass];
  const p = 'style="margin:0 0 12px;color:#1A1A2E;font-size:16px;line-height:1.6"';
  const absaetze = v.absaetze.map((t) => `<p ${p}>${t}</p>`).join("\n      ");
  return `<!doctype html>
<html lang="de"><body style="margin:0;background:#E8E8F0;font-family:Figtree,system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#FFFFFF;border-radius:12px;padding:28px 24px">
      <p style="margin:0 0 16px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#00C896;font-weight:700">Copilot Partner Masterclass</p>
      <p ${p}>Guten Tag,</p>
      ${absaetze}
      <p style="margin:8px 0 0;color:#1A1A2E;font-size:16px;line-height:1.6">Viele Grüße<br>Alexander Eggers<br><span style="color:#6B6B8A">NextSkills GmbH</span></p>
    </div>
    <p style="margin:12px 0 0;font-size:12px;color:#6B6B8A">Sie bekommen diese E-Mail, weil Sie auf copilotberater.de ${v.grund} haben. NextSkills GmbH &middot; <a href="https://www.copilotberater.de" style="color:#00a87e;text-decoration:none">copilotberater.de</a></p>
  </div>
</body></html>`;
}

/** Versendet den One-Pager als PDF-Anhang über Resend. Wirft nicht. */
export async function sendOnePagerEmail(to: string, anlass: OnePagerAnlass = "onepager"): Promise<SendEmailResult> {
  const anhang = await loadOnePager();
  if (!anhang) {
    return { ok: false, error: "One-Pager fehlt (public/dokumente/onepager.pdf)." };
  }
  return sendEmail({
    to,
    subject: VARIANTEN[anlass].betreff,
    html: buildHtml(anlass),
    replyTo: process.env.FIRST_CALL_REPLY_TO || undefined,
    templateKey: VARIANTEN[anlass].templateKey,
    attachments: [anhang],
  });
}
