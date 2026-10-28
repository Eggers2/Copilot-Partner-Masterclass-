import { prisma } from "@/lib/prisma";
import { addActivity } from "@/lib/db/leads";

// Feld "Keine E-Mails" am Lead (keineMailsAm, keineMailsGrund). Gesetzt, wenn
// jemand sich abmeldet, keine Einwilligung gegeben hat oder Alex es im Admin
// setzt. Automatische Mails (Wartelisten-Bestätigung, Follow-up-Sequenz)
// gehen dann nie raus, im Admin und im CRM-Werkzeug ist es deutlich markiert.

export const KEINE_MAILS_GRUND = {
  abmeldelinkWarteliste: "Abmeldelink Wartelisten-Mails",
  newsletterAbmeldung: "Newsletter-Abmeldung",
  manuell: "Manuell im Admin gesetzt",
} as const;

/**
 * Setzt "Keine E-Mails" und beendet eine laufende Sequenz. Idempotent: ist das
 * Feld schon gesetzt, bleiben Datum und Grund wie sie sind. Liefert true, wenn
 * das Feld neu gesetzt wurde.
 */
export async function sperreMails(leadId: string, grund: string): Promise<boolean> {
  const { count } = await prisma.lead.updateMany({
    where: { id: leadId, keineMailsAm: null },
    data: { keineMailsAm: new Date(), keineMailsGrund: grund },
  });
  if (count === 0) return false;

  await prisma.lead.updateMany({
    where: { id: leadId, sequenzNaechsteAm: { not: null } },
    data: { sequenzNaechsteAm: null, sequenzStopp: "keine_mails" },
  });
  await addActivity(leadId, { type: "NOTE", content: `Keine E-Mails: ${grund}` });
  return true;
}

/** Wie sperreMails, aber über die E-Mail-Adresse (z.B. Newsletter-Abmeldung). */
export async function sperreMailsFuerEmail(email: string, grund: string): Promise<boolean> {
  const lead = await prisma.lead.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  if (!lead) return false;
  return sperreMails(lead.id, grund);
}

/** Hebt "Keine E-Mails" auf. Eine beendete Sequenz startet dadurch nicht neu. */
export async function entsperreMails(leadId: string): Promise<boolean> {
  const { count } = await prisma.lead.updateMany({
    where: { id: leadId, keineMailsAm: { not: null } },
    data: { keineMailsAm: null, keineMailsGrund: null },
  });
  if (count === 0) return false;
  await addActivity(leadId, { type: "NOTE", content: "Keine E-Mails: Markierung entfernt" });
  return true;
}
