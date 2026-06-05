import { prisma } from "@/lib/prisma";
import { TEMPLATE_REGISTRY } from "@/lib/email/renderTemplate";
import type { EmailTemplate } from "@prisma/client";

/**
 * Stellt sicher, dass für jeden in der Registry definierten Template-Key ein
 * DB-Eintrag existiert. Vorhandene Einträge (inkl. vom Nutzer editiertes HTML)
 * werden NICHT überschrieben – wir legen nur fehlende mit den Defaults an.
 */
export async function ensureEmailTemplates(): Promise<void> {
  const existing = await prisma.emailTemplate.findMany({ select: { key: true } });
  const have = new Set(existing.map((t) => t.key));

  const missing = Object.values(TEMPLATE_REGISTRY).filter((def) => !have.has(def.key));
  if (missing.length === 0) return;

  await prisma.emailTemplate.createMany({
    data: missing.map((def) => ({
      key: def.key,
      name: def.name,
      betreff: def.defaultBetreff,
      html: def.defaultHtml,
      beschreibung: def.beschreibung,
      aktiv: false,
    })),
    skipDuplicates: true,
  });
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  await ensureEmailTemplates();
  return prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
}

export async function getEmailTemplate(key: string): Promise<EmailTemplate | null> {
  await ensureEmailTemplates();
  return prisma.emailTemplate.findUnique({ where: { key } });
}

export async function updateEmailTemplate(
  key: string,
  patch: { name?: string; betreff?: string; html?: string }
): Promise<EmailTemplate> {
  return prisma.emailTemplate.update({ where: { key }, data: patch });
}

export async function setEmailTemplateAktiv(
  key: string,
  aktiv: boolean
): Promise<EmailTemplate> {
  return prisma.emailTemplate.update({ where: { key }, data: { aktiv } });
}
