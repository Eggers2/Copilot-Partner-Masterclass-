import type { EmailTemplate, Lead, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addActivity } from "@/lib/db/leads";
import { getEmailTemplate } from "@/lib/db/emailTemplates";
import { renderTemplate } from "@/lib/email/renderTemplate";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";
import { signToken } from "@/lib/newsletter/tokens";
import {
  FOLLOWUP_ANZAHL,
  SEQUENZ_STATUS,
  TERMIN_LINK,
  anrede,
  ermittleVorname,
  ersteFaelligkeit,
  followUpNachEnde,
  followupTemplateKey,
  naechsteFaelligkeit,
} from "@/lib/followup/sequenz";

// Wartelisten-Mails ohne n8n: Bestätigung beim Eintrag und vier Follow-ups
// über Resend. Ersetzt die n8n-Workflows "EMail Masterclass" und
// "Masterclass – Follow-up Sequenz (4 Mails)".
//
// Absender: WARTELISTE_FROM_EMAIL, sonst Alex persönlich auf copilotberater.de
// (wie der Newsletter bei Resend verifiziert). Antworten gehen an
// WARTELISTE_REPLY_TO, sonst ae@next-skills.de.

const BESTAETIGUNG_KEY = "warteliste_bestaetigung";
const DEFAULT_FROM = "Alexander Eggers <alexander@copilotberater.de>";
const DEFAULT_REPLY_TO = "ae@next-skills.de";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function absender(): { from: string; replyTo: string } {
  return {
    from: process.env.WARTELISTE_FROM_EMAIL || DEFAULT_FROM,
    replyTo: process.env.WARTELISTE_REPLY_TO || DEFAULT_REPLY_TO,
  };
}

export function abmeldeLink(baseUrl: string, leadId: string): string {
  const token = signToken("warteliste-abmelden", leadId);
  return `${baseUrl}/warteliste/abmelden?token=${encodeURIComponent(token)}`;
}

function variablenFuer(lead: Pick<Lead, "id" | "name" | "email">, baseUrl: string) {
  return {
    anrede: anrede(ermittleVorname(lead.name, lead.email)),
    termin_link: TERMIN_LINK,
    abmelde_link: abmeldeLink(baseUrl, lead.id),
  };
}

/** RFC 8058 One-Click-Abmeldung, damit Gmail/Outlook "Abbestellen" anbieten. */
function abmeldeHeader(link: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${link}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Felder, mit denen ein neuer Lead in die Sequenz startet. */
export function sequenzStartDaten(jetzt: Date = new Date()) {
  return { sequenzStartAm: jetzt, sequenzSchritt: 0, sequenzNaechsteAm: ersteFaelligkeit(jetzt) };
}

// ─── Tag 0: Bestätigung ──────────────────────────────────────────────────────

/**
 * true, wenn die App die Bestätigung selbst verschickt (Vorlage aktiv und
 * Resend konfiguriert). Dann darf der n8n-Webhook nicht mehr feuern, sonst
 * bekäme der Lead die Bestätigung doppelt.
 */
export async function bestaetigungUeberApp(): Promise<boolean> {
  if (!isResendConfigured()) return false;
  const template = await getEmailTemplate(BESTAETIGUNG_KEY);
  return !!template?.aktiv;
}

/**
 * Verschickt die Bestätigung an den Lead und die interne Info an Alex. Wirft
 * nicht: ein Fehler beim Versand darf den Eintrag nie scheitern lassen.
 */
export async function sendeWartelisteBestaetigung(lead: Lead, baseUrl: string): Promise<void> {
  try {
    const template = await getEmailTemplate(BESTAETIGUNG_KEY);
    if (!template) return;
    const vars = variablenFuer(lead, baseUrl);
    const result = await sendEmail({
      to: lead.email,
      subject: renderTemplate(template.betreff, vars),
      html: renderTemplate(template.html, vars),
      ...absender(),
      headers: abmeldeHeader(vars.abmelde_link),
      templateKey: BESTAETIGUNG_KEY,
    });
    if (result.ok) {
      await addActivity(lead.id, { type: "EMAIL", content: "Bestätigungsmail Warteliste gesendet" });
    } else {
      console.error(`[warteliste] Bestätigung an ${lead.email} fehlgeschlagen:`, result.error);
    }
  } catch (err) {
    console.error("[warteliste] Bestätigung fehlgeschlagen:", err);
  }

  const intern = process.env.WARTELISTE_NOTIFY_EMAIL || process.env.NEWSLETTER_REVIEW_EMAIL;
  if (!intern) return;
  try {
    const leadUrl = `${baseUrl}/admin/leads/${lead.id}`;
    await sendEmail({
      to: intern,
      subject: "Neuer Wartelisteneintrag",
      html: `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;">Hi,<br><strong>${escapeHtml(lead.email)}</strong> hat sich eben eingetragen. Stark!</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;"><a href="${leadUrl}">Lead im CRM öffnen</a></p>`,
      templateKey: "warteliste_info_intern",
    });
  } catch (err) {
    console.error("[warteliste] Interne Info fehlgeschlagen:", err);
  }
}

// ─── Stündlicher Cron: Follow-ups ────────────────────────────────────────────

export interface FollowupCronErgebnis {
  faellig: number;
  gesendet: { email: string; schritt: number }[];
  /** fällig, aber die Vorlage für den nächsten Schritt ist inaktiv */
  wartend: number;
  beendet: number;
  gestopptStatus: number;
  fehler: { email: string; schritt: number; error: string }[];
}

/**
 * Arbeitet alle fälligen Leads ab. Jeder Schritt wird vor dem Versand per
 * bedingtem Update "geclaimt" (nur wenn Schritt und Fälligkeit noch
 * unverändert sind), damit zwei überlappende Läufe nie doppelt senden.
 */
export async function runFollowupCron(
  baseUrl: string,
  jetzt: Date = new Date()
): Promise<FollowupCronErgebnis> {
  const ergebnis: FollowupCronErgebnis = {
    faellig: 0,
    gesendet: [],
    wartend: 0,
    beendet: 0,
    gestopptStatus: 0,
    fehler: [],
  };

  const leads = await prisma.lead.findMany({
    where: { sequenzNaechsteAm: { lte: jetzt }, sequenzStopp: null },
    orderBy: { sequenzNaechsteAm: "asc" },
    take: 100,
  });
  ergebnis.faellig = leads.length;
  if (leads.length === 0) return ergebnis;

  const templates = new Map<number, EmailTemplate | null>();
  for (let schritt = 1; schritt <= FOLLOWUP_ANZAHL; schritt++) {
    templates.set(schritt, await getEmailTemplate(followupTemplateKey(schritt)));
  }

  for (const lead of leads) {
    const claim: Prisma.LeadWhereInput = {
      id: lead.id,
      sequenzSchritt: lead.sequenzSchritt,
      sequenzNaechsteAm: lead.sequenzNaechsteAm,
      sequenzStopp: null,
    };

    if (!SEQUENZ_STATUS.includes(lead.status)) {
      const { count } = await prisma.lead.updateMany({
        where: claim,
        data: { sequenzNaechsteAm: null, sequenzStopp: "status" },
      });
      if (count > 0) {
        ergebnis.gestopptStatus++;
        await addActivity(lead.id, {
          type: "NOTE",
          content: `Follow-up-Sequenz beendet: Status ist ${lead.status}`,
        });
      }
      continue;
    }

    if (lead.sequenzSchritt >= FOLLOWUP_ANZAHL) {
      await beendeOhneReaktion(lead, claim, jetzt, ergebnis);
      continue;
    }

    const schritt = lead.sequenzSchritt + 1;
    const template = templates.get(schritt);
    if (!template?.aktiv) {
      ergebnis.wartend++;
      continue;
    }

    const start = lead.sequenzStartAm ?? lead.createdAt;
    const { count } = await prisma.lead.updateMany({
      where: claim,
      data: { sequenzSchritt: schritt, sequenzNaechsteAm: naechsteFaelligkeit(start, schritt, jetzt) },
    });
    if (count === 0) continue;

    const vars = variablenFuer(lead, baseUrl);
    const betreff = renderTemplate(template.betreff, vars);
    const result = await sendEmail({
      to: lead.email,
      subject: betreff,
      html: renderTemplate(template.html, vars),
      ...absender(),
      headers: abmeldeHeader(vars.abmelde_link),
      templateKey: template.key,
    });

    if (!result.ok) {
      // Schritt zurückdrehen, nächster Versuch in einer Stunde.
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          sequenzSchritt: lead.sequenzSchritt,
          sequenzNaechsteAm: new Date(jetzt.getTime() + 60 * 60 * 1000),
        },
      });
      ergebnis.fehler.push({ email: lead.email, schritt, error: result.error ?? "unbekannt" });
    } else {
      ergebnis.gesendet.push({ email: lead.email, schritt });
      await addActivity(lead.id, {
        type: "EMAIL",
        content: `Follow-up-Mail ${schritt} von ${FOLLOWUP_ANZAHL} gesendet: ${betreff}`,
      });
      if (lead.status === "NEW") await setzeStatus(lead.id, "NEW", "CONTACTED", "Follow-up-Sequenz");
    }

    // Resend erlaubt 2 Requests pro Sekunde.
    await sleep(600);
  }

  return ergebnis;
}

async function beendeOhneReaktion(
  lead: Lead,
  claim: Prisma.LeadWhereInput,
  jetzt: Date,
  ergebnis: FollowupCronErgebnis
): Promise<void> {
  const followUpAt = followUpNachEnde(jetzt);
  const { count } = await prisma.lead.updateMany({
    where: claim,
    data: {
      sequenzNaechsteAm: null,
      sequenzStopp: "abgeschlossen",
      status: "FOLLOW_UP",
      followUpAt,
    },
  });
  if (count === 0) return;
  ergebnis.beendet++;
  await addActivity(lead.id, {
    type: "STATUS_CHANGE",
    content: `Status geändert: ${lead.status} → FOLLOW_UP (Follow-up-Sequenz ohne Reaktion beendet)`,
    oldValue: lead.status,
    newValue: "FOLLOW_UP",
  });
  await addActivity(lead.id, {
    type: "FOLLOW_UP",
    content: "Follow-up gesetzt: persönlich nachfassen",
    oldValue: lead.followUpAt?.toISOString() ?? null,
    newValue: followUpAt.toISOString(),
  });
}

async function setzeStatus(
  leadId: string,
  alt: LeadStatus,
  neu: LeadStatus,
  grund: string
): Promise<void> {
  const { count } = await prisma.lead.updateMany({
    where: { id: leadId, status: alt },
    data: { status: neu },
  });
  if (count === 0) return;
  await addActivity(leadId, {
    type: "STATUS_CHANGE",
    content: `Status geändert: ${alt} → ${neu} (${grund})`,
    oldValue: alt,
    newValue: neu,
  });
}

// ─── Abmeldung ───────────────────────────────────────────────────────────────

/** Beendet die Sequenz per Abmelde-Link. Idempotent. Liefert die E-Mail des Leads. */
export async function meldeVonSequenzAb(leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { email: true, sequenzStopp: true },
  });
  if (!lead) return null;
  if (lead.sequenzStopp === "abgemeldet") return lead.email;

  await prisma.lead.update({
    where: { id: leadId },
    data: { sequenzNaechsteAm: null, sequenzStopp: "abgemeldet" },
  });
  await addActivity(leadId, {
    type: "NOTE",
    content: "Follow-up-Sequenz: per Link abgemeldet, keine weiteren Mails",
  });
  return lead.email;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
