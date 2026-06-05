"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  getEmailTemplate,
  setEmailTemplateAktiv,
  updateEmailTemplate,
} from "@/lib/db/emailTemplates";
import { renderTemplate, sampleVarsFor } from "@/lib/email/renderTemplate";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";

export async function saveTemplateAction(
  key: string,
  patch: { name: string; betreff: string; html: string }
) {
  await requireAuth();
  await updateEmailTemplate(key, {
    name: patch.name,
    betreff: patch.betreff,
    html: patch.html,
  });
  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${key}`);
  return { ok: true };
}

export async function toggleAktivAction(key: string, aktiv: boolean) {
  await requireAuth();
  if (aktiv && !isResendConfigured()) {
    return {
      ok: false,
      error:
        "Resend ist nicht konfiguriert (RESEND_API_KEY / RESEND_FROM_EMAIL fehlt). Aktivierung nicht möglich.",
    };
  }
  await setEmailTemplateAktiv(key, aktiv);
  revalidatePath("/admin/emails");
  revalidatePath(`/admin/emails/${key}`);
  return { ok: true };
}

export async function sendTestEmailAction(key: string, toEmail: string) {
  await requireAuth();

  const email = toEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }
  if (!isResendConfigured()) {
    return {
      ok: false,
      error: "Resend ist nicht konfiguriert – Test-Mail kann nicht versendet werden.",
    };
  }

  const template = await getEmailTemplate(key);
  if (!template) return { ok: false, error: "Template nicht gefunden." };

  const vars = sampleVarsFor(key);
  const result = await sendEmail({
    to: email,
    subject: `[TEST] ${renderTemplate(template.betreff, vars)}`,
    html: renderTemplate(template.html, vars),
    templateKey: key,
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Versand fehlgeschlagen." };
  return { ok: true };
}
