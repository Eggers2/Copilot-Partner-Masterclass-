import { prisma } from "@/lib/prisma";
import { getEmailTemplate } from "@/lib/db/emailTemplates";
import {
  getTemplateDefinition,
  renderTemplate,
} from "@/lib/email/renderTemplate";
import { isResendConfigured, sendBulk, sendEmail } from "@/lib/email/resend";
import { CONNECT_DAY_SLUG } from "@/lib/events/connectDay";

const TEMPLATE_KEY = "connect_day_einladung";

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

function loadTemplate(): { betreff: string; html: string } | null {
  const def = getTemplateDefinition(TEMPLATE_KEY);
  return def ? { betreff: def.defaultBetreff, html: def.defaultHtml } : null;
}

async function resolveTemplate(): Promise<{ betreff: string; html: string } | null> {
  try {
    const t = await getEmailTemplate(TEMPLATE_KEY);
    if (t?.aktiv) return { betreff: t.betreff, html: t.html };
  } catch (err) {
    console.error("[ConnectDay] Einladungs-Template konnte nicht geladen werden:", err);
  }
  return loadTemplate();
}

export interface SendEinladungResult {
  ok: boolean;
  sent: number;
  total: number;
  error?: string;
}

/**
 * Sendet die Einladung. `testTo` gesetzt → einzelne Test-Mail an diese
 * Adresse; sonst Vollversand an alle Koordinatoren (Bulk, je Empfänger eine
 * personalisierte Mail).
 */
export async function sendConnectDayEinladung(opts: {
  testTo?: string;
}): Promise<SendEinladungResult> {
  if (!isResendConfigured()) {
    return { ok: false, sent: 0, total: 0, error: "Resend ist nicht konfiguriert." };
  }
  const template = await resolveTemplate();
  if (!template) {
    return { ok: false, sent: 0, total: 0, error: "Einladungs-Template fehlt." };
  }

  if (opts.testTo) {
    const html = renderTemplate(template.html, { vorname: "Test" });
    const subject = renderTemplate(template.betreff, { vorname: "Test" });
    const res = await sendEmail({
      to: opts.testTo,
      subject,
      html,
      templateKey: TEMPLATE_KEY,
    });
    return {
      ok: res.ok,
      sent: res.ok ? 1 : 0,
      total: 1,
      error: res.error,
    };
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

  const res = await sendBulk(messages, { templateKey: TEMPLATE_KEY });
  return {
    ok: res.ok,
    sent: res.sent,
    total: messages.length,
    error: res.error ?? (res.failed.length > 0 ? `${res.failed.length} fehlgeschlagen` : undefined),
  };
}
