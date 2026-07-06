import { prisma } from "@/lib/prisma";
import { getEmailTemplate } from "@/lib/db/emailTemplates";
import {
  getTemplateDefinition,
  renderTemplate,
} from "@/lib/email/renderTemplate";
import { isResendConfigured, sendBulk, sendEmail } from "@/lib/email/resend";
import { CONNECT_DAY_SLUG } from "@/lib/events/connectDay";

// Versendbare Kampagnen-Mails (Einladung/Teaser und Start-Erinnerung).
export const EINLADUNG_TEMPLATE_KEYS = [
  "connect_day_einladung",
  "connect_day_start",
] as const;
export type EinladungTemplateKey = (typeof EINLADUNG_TEMPLATE_KEYS)[number];

export interface EinladungEmpfaenger {
  email: string;
  vorname: string;
}

/**
 * Empfänger der Connect-Day-Einladung: die Besteller/Koordinatoren (nur sie
 * können sich im Kundenportal anmelden) der berechtigten Klassen, dedupliziert
 * nach E-Mail.
 */
export async function getEinladungEmpfaenger(): Promise<EinladungEmpfaenger[]> {
  const event = await prisma.event.findUnique({
    where: { slug: CONNECT_DAY_SLUG },
    select: { erlaubteKlassenSlugs: true },
  });
  if (!event) return [];

  const bestellungen = await prisma.bestellung.findMany({
    where: { klasse: { slug: { in: event.erlaubteKlassenSlugs } } },
    select: { email: true, vorname: true },
    orderBy: { erstelltAm: "asc" },
  });

  const byEmail = new Map<string, EinladungEmpfaenger>();
  for (const b of bestellungen) {
    const email = b.email.trim().toLowerCase();
    if (!email.includes("@") || byEmail.has(email)) continue;
    byEmail.set(email, { email, vorname: b.vorname.trim() || "zusammen" });
  }
  return [...byEmail.values()];
}

async function resolveTemplate(
  key: EinladungTemplateKey
): Promise<{ betreff: string; html: string } | null> {
  try {
    const t = await getEmailTemplate(key);
    if (t?.aktiv) return { betreff: t.betreff, html: t.html };
  } catch (err) {
    console.error(`[ConnectDay] Template ${key} konnte nicht geladen werden:`, err);
  }
  const def = getTemplateDefinition(key);
  return def ? { betreff: def.defaultBetreff, html: def.defaultHtml } : null;
}

export interface SendEinladungResult {
  ok: boolean;
  sent: number;
  total: number;
  error?: string;
}

/**
 * Sendet eine Kampagnen-Mail (Einladung oder Start-Erinnerung). `testTo`
 * gesetzt → einzelne Test-Mail an diese Adresse; sonst Vollversand an alle
 * Koordinatoren (Bulk, je Empfänger eine personalisierte Mail).
 */
export async function sendConnectDayEinladung(opts: {
  templateKey: EinladungTemplateKey;
  testTo?: string;
}): Promise<SendEinladungResult> {
  if (!isResendConfigured()) {
    return { ok: false, sent: 0, total: 0, error: "Resend ist nicht konfiguriert." };
  }
  if (!EINLADUNG_TEMPLATE_KEYS.includes(opts.templateKey)) {
    return { ok: false, sent: 0, total: 0, error: "Unbekanntes Template." };
  }
  const template = await resolveTemplate(opts.templateKey);
  if (!template) {
    return { ok: false, sent: 0, total: 0, error: "Template fehlt." };
  }

  if (opts.testTo) {
    const vars = { vorname: "Test" };
    const res = await sendEmail({
      to: opts.testTo,
      subject: renderTemplate(template.betreff, vars),
      html: renderTemplate(template.html, vars),
      templateKey: opts.templateKey,
    });
    return { ok: res.ok, sent: res.ok ? 1 : 0, total: 1, error: res.error };
  }

  const empfaenger = await getEinladungEmpfaenger();
  if (empfaenger.length === 0) {
    return { ok: false, sent: 0, total: 0, error: "Keine Empfänger gefunden." };
  }

  const messages = empfaenger.map((e) => {
    const vars = { vorname: e.vorname };
    return {
      to: e.email,
      subject: renderTemplate(template.betreff, vars),
      html: renderTemplate(template.html, vars),
    };
  });

  const res = await sendBulk(messages, { templateKey: opts.templateKey });
  return {
    ok: res.ok,
    sent: res.sent,
    total: messages.length,
    error: res.error ?? (res.failed.length > 0 ? `${res.failed.length} fehlgeschlagen` : undefined),
  };
}
