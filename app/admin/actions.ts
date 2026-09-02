"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setAuthCookie, clearAuthCookie, requireAuth } from "@/lib/auth";
import { requestOtpCode, resolveAppBaseUrl } from "@/lib/auth/customer";
import { parseBerlinDate } from "@/lib/datetime";
import {
  updateLead,
  addActivity,
  upsertFirstCallScore,
  getLead,
  saveTranscriptAnalysis,
} from "@/lib/db/leads";
import { analyzeFirstCall, type FirstCallAnalysis } from "@/lib/firstcall/analyze";
import { sendEmail, sendBulkWithAttachments } from "@/lib/email/resend";
import { plainTextToHtml } from "@/lib/email/format";
import { summarizeTermin } from "@/lib/termine/summarize";
import { parseAnwesenheitsbericht } from "@/lib/termine/anwesenheit";
import {
  replaceTerminAnwesenheit,
  clearTerminAnwesenheit,
  createKlasseAbgleich,
  setAnwesenheitIgnorierliste,
} from "@/lib/db/anwesenheit";
import {
  buildTerminProtokollHtml,
  formatTerminDatum,
  terminProtokollSubject,
} from "@/lib/termine/protokollMail";
import {
  createProtokollPdf,
  protokollPdfFilename,
} from "@/lib/termine/protokollPdf";
import {
  parseTerminRegel,
  computeNextTermine,
  type TerminRegel,
} from "@/lib/termine/regel";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { dispatchTeamsGuestInvites } from "@/lib/teams/dispatchTeamsGuest";
import { inviteGuestToTeam, isGraphConfigured } from "@/lib/teams/graph";
import {
  setTeamsAufnahmeModus,
  type TeamsAufnahmeModus,
} from "@/lib/db/appSettings";
import { geocodeAddress } from "@/lib/geocode";
import {
  createWebinar,
  updateWebinar,
  updateRegistrationStatus,
  bulkUpdateRegistrationStatus,
} from "@/lib/db/webinars";
import {
  createTermin,
  updateTermin,
  deleteTermin,
} from "@/lib/db/termine";
import { getKlasseTeilnehmerEmails } from "@/lib/klassen";
import type {
  LeadStatus,
  LeadSource,
  ActivityType,
  WebinarStatus,
  RegistrationStatus,
  AdnChannel,
  Groessenklasse,
  KlasseStatus,
  TerminStatus,
} from "@prisma/client";
import { starteRunde } from "@/lib/umfrage/runden";
import { sendeEinladungenFuerRunde } from "@/lib/umfrage/versand";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isAdnChannelKey } from "@/lib/packages";

export async function loginAction(
  _prev: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const password = formData.get("password") as string;

  if (!password?.trim()) {
    return { error: "Passwort ist erforderlich." };
  }

  const success = await setAuthCookie(password);

  if (!success) {
    return { error: "Falsches Passwort. Bitte versuche es erneut." };
  }

  redirect("/admin");
}

export async function logoutAction() {
  await clearAuthCookie();
  redirect("/admin/login");
}

export async function updateLeadAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const id = formData.get("id") as string;
  if (!id) return { error: "ID fehlt." };

  const currentLead = await prisma.lead.findUnique({
    where: { id },
    select: { status: true },
  });

  const newStatus = formData.get("status") as LeadStatus;
  const followUpAtRaw = formData.get("followUpAt") as string;

  const revenueRaw = formData.get("revenue") as string;
  const revenueEuro = parseFloat(revenueRaw);
  const revenueCents = !isNaN(revenueEuro) ? Math.round(revenueEuro * 100) : 0;

  const street = (formData.get("street") as string) || null;
  const zip = (formData.get("zip") as string) || null;
  const city = (formData.get("city") as string) || null;

  const currentAddress = await prisma.lead.findUnique({
    where: { id },
    select: { street: true, zip: true, city: true },
  });

  const addressChanged =
    currentAddress?.street !== street ||
    currentAddress?.zip !== zip ||
    currentAddress?.city !== city;

  const rawAdnChannel = formData.get("adnChannel");
  const adnChannel: AdnChannel | undefined = isAdnChannelKey(rawAdnChannel)
    ? rawAdnChannel
    : undefined;
  const rawKlasseId = formData.get("klasseId");
  const klasseId =
    typeof rawKlasseId === "string" && rawKlasseId.length > 0 ? rawKlasseId : null;

  await updateLead(id, {
    name: (formData.get("name") as string) || null,
    company: (formData.get("company") as string) || null,
    street,
    zip,
    city,
    website: (formData.get("website") as string) || null,
    phone: (formData.get("phone") as string) || null,
    status: newStatus,
    source: formData.get("source") as LeadSource,
    notes: (formData.get("notes") as string) || null,
    score: parseInt(formData.get("score") as string) || 0,
    revenue: newStatus === "WON" ? revenueCents : undefined,
    followUpAt: followUpAtRaw ? new Date(followUpAtRaw) : null,
    ...(adnChannel ? { adnChannel } : {}),
    klasseId,
    ...(addressChanged ? { latitude: null, longitude: null } : {}),
  });

  if (currentLead && currentLead.status !== newStatus) {
    await addActivity(id, {
      type: "STATUS_CHANGE" as ActivityType,
      content: `Status geändert: ${currentLead.status} → ${newStatus}`,
      oldValue: currentLead.status,
      newValue: newStatus,
    });
  }

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");

  return { success: true };
}

export async function addActivityAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const leadId = formData.get("leadId") as string;
  const type = formData.get("type") as ActivityType;
  const content = formData.get("content") as string;

  if (!leadId || !type || !content?.trim()) {
    return { error: "Alle Felder sind erforderlich." };
  }

  await addActivity(leadId, { type, content: content.trim() });

  revalidatePath(`/admin/leads/${leadId}`);

  return { success: true };
}

export async function deleteLeadAction(id: string): Promise<void> {
  await requireAuth();
  await prisma.webinarRegistration.deleteMany({ where: { leadId: id } });
  await prisma.firstCallScore.deleteMany({ where: { leadId: id } });
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/admin");
}

// ─── FIRST CALL SCORING ──────────────────────────────

/** Speichert oder aktualisiert den First-Call-Score eines Leads */
export async function saveFirstCallScoreAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const leadId = formData.get("leadId") as string;
  if (!leadId) return { error: "Lead-ID fehlt." };

  // Score-Felder parsen und auf 1–5 begrenzen
  const parseScore = (name: string) => {
    const val = parseInt(formData.get(name) as string) || 1;
    return Math.max(1, Math.min(5, val));
  };

  const followUpDateRaw = formData.get("followUpDate") as string;

  await upsertFirstCallScore(leadId, {
    copilotDemand: parseScore("copilotDemand"),
    currentOffer: parseScore("currentOffer"),
    teamCapacity: parseScore("teamCapacity"),
    decisionMaker: parseScore("decisionMaker"),
    budgetReadiness: parseScore("budgetReadiness"),
    urgency: parseScore("urgency"),
    mindset: parseScore("mindset"),
    msPartnerStatus: parseScore("msPartnerStatus"),
    description: (formData.get("description") as string) || null,
    painPoint: (formData.get("painPoint") as string) || null,
    teamSize: (formData.get("teamSize") as string) || null,
    recommendedPackage: (formData.get("recommendedPackage") as string) || null,
    objections: (formData.get("objections") as string) || null,
    nextStep: (formData.get("nextStep") as string) || null,
    followUpDate: followUpDateRaw ? new Date(followUpDateRaw) : null,
    contactSource: (formData.get("contactSource") as string) || null,
  });

  // Aktivität protokollieren
  await addActivity(leadId, {
    type: "CALL" as ActivityType,
    content: "First Call Scoring durchgeführt",
  });

  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin");

  return { success: true };
}

/** Wertet ein hochgeladenes VTT-Transkript per Claude Sonnet aus. */
export async function analyzeFirstCallTranscriptAction(
  leadId: string,
  vttText: string,
  filename: string
): Promise<{ success?: boolean; error?: string; analysis?: FirstCallAnalysis }> {
  await requireAuth();
  if (!leadId) return { error: "Lead-ID fehlt." };
  if (!vttText?.trim()) return { error: "Das Transkript ist leer." };

  const lead = await getLead(leadId);
  if (!lead) return { error: "Lead nicht gefunden." };

  try {
    const analysis = await analyzeFirstCall(
      vttText,
      {
        name: lead.name,
        company: lead.company,
        city: lead.city,
        email: lead.email,
      },
      new Date()
    );

    // Transkript + Begründungen festhalten – Scores bleiben unangetastet,
    // sie werden erst nach Sichtprüfung über saveFirstCallScoreAction gespeichert.
    await saveTranscriptAnalysis(leadId, {
      transcriptText: vttText,
      transcriptFilename: filename,
      scoreReasoning: analysis.reasoning,
    });

    await addActivity(leadId, {
      type: "CALL" as ActivityType,
      content: `First-Call-Transkript ausgewertet (${filename})`,
    });

    revalidatePath(`/admin/leads/${leadId}`);
    return { success: true, analysis };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Unbekannter Fehler bei der Auswertung.";
    return { error: msg };
  }
}

/**
 * Lädt den One Pager aus public/dokumente/ als E-Mail-Anhang – unabhängig von
 * der Groß-/Kleinschreibung (bevorzugt "onepager.pdf", sonst die erste PDF im
 * Ordner). Gibt undefined zurück, wenn keine PDF vorhanden ist.
 */
async function loadOnePagerAttachment(): Promise<
  { filename: string; content: Buffer } | undefined
> {
  const dir = path.join(process.cwd(), "public", "dokumente");
  try {
    const files = await readdir(dir);
    const pdfs = files.filter((f) => f.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return undefined;
    const chosen = pdfs.find((f) => f.toLowerCase() === "onepager.pdf") ?? pdfs[0];
    const content = await readFile(path.join(dir, chosen));
    return { filename: "Copilot-Masterclass-One-Pager.pdf", content };
  } catch {
    return undefined;
  }
}

/** Versendet den (ggf. angepassten) Entscheidungs-Mail-Entwurf über Resend. */
export async function sendFirstCallEmailAction(
  leadId: string,
  subject: string,
  body: string
): Promise<{ success?: boolean; error?: string; id?: string }> {
  await requireAuth();
  if (!leadId) return { error: "Lead-ID fehlt." };
  if (!subject?.trim() || !body?.trim()) {
    return { error: "Betreff und Text sind erforderlich." };
  }

  const lead = await getLead(leadId);
  if (!lead) return { error: "Lead nicht gefunden." };
  if (!lead.email) return { error: "Dem Lead fehlt eine E-Mail-Adresse." };

  // One Pager als PDF-Anhang laden (fehlt die Datei: ohne Anhang versenden).
  const onePager = await loadOnePagerAttachment();
  const attachments = onePager ? [onePager] : undefined;

  const res = await sendEmail({
    to: lead.email,
    subject: subject.trim(),
    html: plainTextToHtml(body.trim()),
    replyTo: process.env.FIRST_CALL_REPLY_TO || undefined,
    templateKey: "first_call_followup",
    attachments,
  });

  if (!res.ok) {
    return { error: res.error ?? "E-Mail konnte nicht gesendet werden." };
  }

  await addActivity(leadId, {
    type: "EMAIL" as ActivityType,
    content: `Entscheidungs-Mail versendet: ${subject.trim()}${
      attachments ? " (One Pager angehängt)" : " (ohne One Pager – PDF fehlt im Repo)"
    }`,
  });
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true, id: res.id };
}

// ─── WEBINAR ACTIONS ──────────────────────────────────

export async function createWebinarAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const title = formData.get("title") as string;
  const scheduledAtRaw = formData.get("scheduledAt") as string;

  if (!title?.trim() || !scheduledAtRaw) {
    return { error: "Titel und Datum sind erforderlich." };
  }

  try {
    await createWebinar({
      title: title.trim(),
      scheduledAt: parseBerlinDate(scheduledAtRaw),
      streamyardLink: (formData.get("streamyardLink") as string) || null,
      description: (formData.get("description") as string) || null,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "Fehler beim Erstellen des Webinars." };
    }
    throw error;
  }

  revalidatePath("/admin/webinars");
  redirect("/admin/webinars");
}

export async function updateWebinarStatusAction(
  id: string,
  status: WebinarStatus
): Promise<void> {
  await requireAuth();
  await updateWebinar(id, { status });
  revalidatePath(`/admin/webinars/${id}`);
  revalidatePath("/admin/webinars");
}

export async function deleteWebinarAction(id: string): Promise<void> {
  await requireAuth();
  await prisma.webinarRegistration.deleteMany({ where: { webinarId: id } });
  await prisma.webinar.delete({ where: { id } });
  revalidatePath("/admin/webinars");
  redirect("/admin/webinars");
}

export async function updateWebinarAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const scheduledAtRaw = formData.get("scheduledAt") as string;

  if (!id || !title?.trim() || !scheduledAtRaw) {
    return { error: "Titel und Datum sind erforderlich." };
  }

  try {
    await updateWebinar(id, {
      title: title.trim(),
      scheduledAt: parseBerlinDate(scheduledAtRaw),
      streamyardLink: (formData.get("streamyardLink") as string) || null,
      description: (formData.get("description") as string) || null,
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { error: "Fehler beim Erstellen des Webinars." };
    }
    throw error;
  }

  revalidatePath(`/admin/webinars/${id}`);
  revalidatePath("/admin/webinars");

  return { success: true };
}

export async function markAttendanceAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const registrationId = formData.get("registrationId") as string;
  const status = formData.get("status") as RegistrationStatus;
  const webinarId = formData.get("webinarId") as string;

  if (!registrationId || !status) {
    return { error: "Fehlende Daten." };
  }

  const registration = await prisma.webinarRegistration.findUnique({
    where: { id: registrationId },
    include: {
      lead: { select: { id: true, status: true } },
      webinar: { select: { title: true } },
    },
  });
  if (!registration) return { error: "Registrierung nicht gefunden." };

  await updateRegistrationStatus(registrationId, status);

  const newLeadStatus: LeadStatus =
    status === "ATTENDED" ? "WEBINAR_ATTENDED" : "FOLLOW_UP";
  const oldLeadStatus = registration.lead.status;

  await prisma.lead.update({
    where: { id: registration.lead.id },
    data: { status: newLeadStatus },
  });

  const activityContent =
    status === "ATTENDED"
      ? `Webinar besucht: ${registration.webinar.title}`
      : `No-Show: ${registration.webinar.title} – Follow-up gesetzt`;

  await addActivity(registration.lead.id, {
    type: "WEBINAR" as ActivityType,
    content: activityContent,
    oldValue: oldLeadStatus,
    newValue: newLeadStatus,
  });

  revalidatePath(`/admin/webinars/${webinarId}`);
  revalidatePath("/admin");

  return { success: true };
}

export async function bulkMarkAttendanceAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const webinarId = formData.get("webinarId") as string;
  const status = formData.get("status") as RegistrationStatus;
  const registrationIds = formData.getAll("registrationIds") as string[];

  if (!webinarId || !status || registrationIds.length === 0) {
    return { error: "Fehlende Daten." };
  }

  await bulkUpdateRegistrationStatus(webinarId, registrationIds, status);

  // Update lead statuses and log activities for each
  const registrations = await prisma.webinarRegistration.findMany({
    where: { id: { in: registrationIds } },
    include: {
      lead: { select: { id: true, status: true } },
      webinar: { select: { title: true } },
    },
  });

  const newLeadStatus: LeadStatus =
    status === "ATTENDED" ? "WEBINAR_ATTENDED" : "FOLLOW_UP";

  for (const reg of registrations) {
    await prisma.lead.update({
      where: { id: reg.lead.id },
      data: { status: newLeadStatus },
    });

    const activityContent =
      status === "ATTENDED"
        ? `Webinar besucht: ${reg.webinar.title}`
        : `No-Show: ${reg.webinar.title} – Follow-up gesetzt`;

    await addActivity(reg.lead.id, {
      type: "WEBINAR" as ActivityType,
      content: activityContent,
      oldValue: reg.lead.status,
      newValue: newLeadStatus,
    });
  }

  revalidatePath(`/admin/webinars/${webinarId}`);
  revalidatePath("/admin");

  return { success: true };
}

// ─── STREAMYARD CSV PROCESSING ──────────────────────

// Status, die ein CSV-Import nicht überschreiben darf: entweder liegt der Lead
// im Funnel schon weiter, oder er wurde manuell eingeordnet (EXPERTE /
// ONE_MAN_SHOW).
const STATUS_NICHT_UEBERSCHREIBEN: LeadStatus[] = [
  "WEBINAR_ATTENDED",
  "WON",
  "QUALIFIED",
  "PROPOSAL",
  "EXPERTE",
  "ONE_MAN_SHOW",
];

export interface CsvParticipant {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  status: string;
}

export interface CsvPreviewEntry {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  csvStatus: string;
  isNew: boolean;
  attended: boolean;
  existingLeadName: string | null;
  existingLeadCompany: string | null;
}

export async function previewCsvAction(
  csvText: string
): Promise<{ entries: CsvPreviewEntry[]; error?: string }> {
  await requireAuth();

  const participants = parseCsv(csvText);
  if (participants.length === 0) {
    return { entries: [], error: "Keine Teilnehmer in der CSV gefunden." };
  }

  const emails = participants.map((p) => p.email.toLowerCase().trim());
  const existingLeads = await prisma.lead.findMany({
    where: { email: { in: emails } },
    select: { email: true, name: true, company: true },
  });

  const leadMap = new Map(existingLeads.map((l) => [l.email, l]));

  const entries: CsvPreviewEntry[] = participants.map((p) => {
    const normalizedEmail = p.email.toLowerCase().trim();
    const existing = leadMap.get(normalizedEmail);
    const attended = isAttendedStatus(p.status);

    return {
      email: normalizedEmail,
      firstName: p.firstName,
      lastName: p.lastName,
      company: p.company,
      csvStatus: p.status,
      isNew: !existing,
      attended,
      existingLeadName: existing?.name ?? null,
      existingLeadCompany: existing?.company ?? null,
    };
  });

  return { entries };
}

export async function processCsvAction(
  webinarId: string,
  participants: CsvParticipant[]
): Promise<{ success?: boolean; error?: string; processed?: number }> {
  await requireAuth();

  const webinar = await prisma.webinar.findUnique({ where: { id: webinarId } });
  if (!webinar) return { error: "Webinar nicht gefunden." };

  let processed = 0;

  for (const p of participants) {
    const normalizedEmail = p.email.toLowerCase().trim();
    const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ") || null;
    const attended = isAttendedStatus(p.status);

    // Upsert lead: create if new
    const lead = await prisma.lead.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        name: fullName,
        company: p.company || null,
        status: attended ? "WEBINAR_ATTENDED" : "WAITLIST",
        source: "WEBINAR",
        webinarRegistered: true,
      },
      update: {
        webinarRegistered: true,
      },
    });

    // Update name/company only if currently empty, update status if attended
    const updates: Record<string, unknown> = {};
    if (!lead.name && fullName) updates.name = fullName;
    if (!lead.company && p.company) updates.company = p.company;
    if (attended && !STATUS_NICHT_UEBERSCHREIBEN.includes(lead.status)) {
      updates.status = "WEBINAR_ATTENDED";
    }

    if (Object.keys(updates).length > 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: updates,
      });
    }

    // Upsert webinar registration
    const regStatus = attended ? "ATTENDED" : "REGISTERED";
    await prisma.webinarRegistration.upsert({
      where: {
        webinarId_leadId: { webinarId, leadId: lead.id },
      },
      create: {
        webinarId,
        leadId: lead.id,
        status: regStatus as RegistrationStatus,
        attendedAt: attended ? new Date() : undefined,
        source: "streamyard",
      },
      update: {
        status: regStatus as RegistrationStatus,
        attendedAt: attended ? new Date() : undefined,
      },
    });

    // Log activity
    const activityContent = attended
      ? `Webinar besucht: ${webinar.title} (StreamYard Import)`
      : `Webinar-Anmeldung: ${webinar.title} (StreamYard Import)`;

    await addActivity(lead.id, {
      type: "WEBINAR" as ActivityType,
      content: activityContent,
    });

    processed++;
  }

  revalidatePath(`/admin/webinars/${webinarId}`);
  revalidatePath("/admin");

  return { success: true, processed };
}

function parseCsv(csvText: string): CsvParticipant[] {
  const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const emailIdx = header.findIndex((h) => h === "email");
  const firstNameIdx = header.findIndex((h) => h === "firstname" || h === "first name" || h === "vorname");
  const lastNameIdx = header.findIndex((h) => h === "lastname" || h === "last name" || h === "nachname");
  const companyIdx = header.findIndex((h) => h === "firma" || h === "company" || h === "organisation");
  const statusIdx = header.findIndex((h) => h === "status");

  if (emailIdx === -1) return [];

  const participants: CsvParticipant[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const email = cols[emailIdx]?.trim();
    if (!email || !email.includes("@")) continue;

    participants.push({
      email,
      firstName: firstNameIdx >= 0 ? cols[firstNameIdx]?.trim() || "" : "",
      lastName: lastNameIdx >= 0 ? cols[lastNameIdx]?.trim() || "" : "",
      company: companyIdx >= 0 ? cols[companyIdx]?.trim() || "" : "",
      status: statusIdx >= 0 ? cols[statusIdx]?.trim().toLowerCase() || "registered" : "registered",
    });
  }

  return participants;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function isAttendedStatus(status: string): boolean {
  const s = status.toLowerCase().trim();
  return s === "live" || s === "attended" || s === "attended live" || s === "watched on-demand" || s === "watched on demand";
}

// ─── BESTELLUNGEN / ONLINE SHOP ──────────────────────

export async function deleteBestellungAction(id: number): Promise<void> {
  await requireAuth();
  await prisma.bestellung.delete({ where: { id } });
  revalidatePath("/admin/shop");
}

export async function updateBestellungStatusAction(
  id: number,
  status: string
): Promise<void> {
  await requireAuth();
  await prisma.bestellung.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/admin/shop");
}

interface TeilnehmerInput {
  position: number;
  vorname: string;
  nachname: string;
  email: string;
}

interface UpdateBestellungInput {
  paket: string;
  userAnzahl: number;
  zahlungsmodell: string;
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  ustId: string | null;
  website: string | null;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string | null;
  position: string | null;
  anmerkungen: string | null;
  status: string;
  teilnehmer: TeilnehmerInput[];
  adnChannel?: AdnChannel;
  klasseId?: string;
  /** Interne Bestellung: vom Umfrage-Versand und allen Auswertungen ausgeschlossen */
  intern?: boolean;
  /** Größenklasse der Firma (Mitarbeiter), leer erlaubt */
  groessenklasse?: Groessenklasse | null;
  /**
   * Manuell vereinbarter Sonderpreis (netto). Ersetzt Listenpreis und
   * ADN-Anpassung. null oder Leerstring bedeutet: regulärer Preis.
   */
  sonderpreisNetto?: number | string | null;
}

export async function updateBestellungAction(
  id: number,
  input: UpdateBestellungInput
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  if (!input.firma?.trim() || !input.email?.trim()) {
    return { error: "Firma und E-Mail sind erforderlich." };
  }

  const {
    isPaketKey,
    isZahlungsmodell,
    isZahlungsmodellErlaubt,
    getPreisNetto,
    getEffektivPreisNetto,
    parseSonderpreisNetto,
    calculateMwst,
  } = await import("@/lib/packages");

  if (!isPaketKey(input.paket) || !isZahlungsmodell(input.zahlungsmodell)) {
    return { error: "Paket oder Zahlungsmodell ungültig." };
  }
  // Interne Pakete (Single Trainer) sind Einmal-Plätze und ausschließlich
  // jährlich abrechenbar.
  if (!isZahlungsmodellErlaubt(input.paket, input.zahlungsmodell)) {
    return { error: "Dieses Zahlungsmodell ist für das gewählte Paket nicht verfügbar." };
  }

  const adnChannel: AdnChannel = input.adnChannel ?? "NONE";
  // Plätze lassen sich unabhängig vom Paket nach oben erweitern oder nach
  // unten reduzieren – mindestens bleibt ein Platz bestehen. Der Preis
  // richtet sich allein nach Paket/Zahlungsmodell/Land/ADN, nicht nach der
  // Anzahl der Teilnehmerplätze.
  const effectiveSlotCount = Math.max(1, input.userAnzahl);

  // Sonderpreis: ein gesetzter Wert ersetzt Listenpreis und ADN-Anpassung als
  // fakturierten Netto-Betrag, MwSt und Brutto rechnen sich daraus neu.
  const sonderpreis = parseSonderpreisNetto(input.sonderpreisNetto);
  if (sonderpreis.error) {
    return { error: sonderpreis.error };
  }
  const sonderpreisNetto = sonderpreis.value;

  const listPreisNetto = getPreisNetto(input.paket, input.zahlungsmodell);
  const preisNetto = getEffektivPreisNetto(
    input.paket,
    input.zahlungsmodell,
    adnChannel,
    sonderpreisNetto
  );
  const { mwstSatz, mwstBetrag, preisBrutto, reverseCharge, reverseChargeHinweis } =
    calculateMwst(input.land, input.ustId ?? undefined, preisNetto);

  if (input.klasseId) {
    const klasseExists = await prisma.klasse.findUnique({
      where: { id: input.klasseId },
      select: { id: true },
    });
    if (!klasseExists) return { error: "Die angegebene Klasse existiert nicht." };
  }

  const current = await prisma.bestellung.findUnique({
    where: { id },
    select: {
      strasse: true,
      plz: true,
      ort: true,
      email: true,
      bestellNr: true,
      preisNetto: true,
      zahlungsmodell: true,
    },
  });
  const newStrasse = input.strasse.trim();
  const newPlz = input.plz.trim();
  const newOrt = input.ort.trim();
  const addressChanged =
    !current ||
    newStrasse !== current.strasse.trim() ||
    newPlz !== current.plz.trim() ||
    newOrt !== current.ort.trim();

  await prisma.$transaction(async (tx) => {
    await tx.bestellung.update({
      where: { id },
      data: {
        paket: input.paket,
        userAnzahl: effectiveSlotCount,
        zahlungsmodell: input.zahlungsmodell,
        preisNetto,
        listPreisNetto,
        sonderpreisNetto,
        mwstSatz,
        mwstBetrag,
        reverseCharge,
        reverseChargeHinweis: reverseChargeHinweis || null,
        preisBrutto,
        firma: input.firma.trim(),
        strasse: newStrasse,
        plz: newPlz,
        ort: newOrt,
        land: input.land,
        ustId: input.ustId?.trim() || null,
        website: input.website?.trim() || null,
        vorname: input.vorname.trim(),
        nachname: input.nachname.trim(),
        email: input.email.trim().toLowerCase(),
        telefon: input.telefon?.trim() || null,
        position: input.position?.trim() || null,
        anmerkungen: input.anmerkungen?.trim() || null,
        status: input.status,
        adnChannel,
        ...(input.intern !== undefined ? { intern: input.intern } : {}),
        ...(input.groessenklasse !== undefined
          ? { groessenklasse: input.groessenklasse }
          : {}),
        ...(input.klasseId ? { klasseId: input.klasseId } : {}),
        // Adressänderung → Geokoordinaten verwerfen, gleich darunter neu setzen.
        ...(addressChanged ? { latitude: null, longitude: null } : {}),
      },
    });

    const existingTeilnehmer = await tx.bestellungTeilnehmer.findMany({
      where: { bestellungId: id },
      select: { position: true, email: true, teamsEingeladenAm: true },
    });
    const existingEmailByPosition = new Map(
      existingTeilnehmer.map((e) => [e.position, e.email])
    );
    // Beim Entfernen einer leeren Zeile werden im Frontend nachfolgende
    // Teilnehmer hochgeschoben (Re-Indexierung). Damit dieselbe E-Mail
    // dadurch nicht erneut als Teams-Gast eingeladen wird, merken wir uns
    // den Einladungsstatus pro E-Mail.
    const previousInviteByEmail = new Map<string, Date | null>();
    for (const e of existingTeilnehmer) {
      if (e.email) previousInviteByEmail.set(e.email, e.teamsEingeladenAm);
    }

    await tx.bestellungTeilnehmer.deleteMany({
      where: { bestellungId: id, position: { gte: effectiveSlotCount } },
    });

    for (let i = 0; i < effectiveSlotCount; i++) {
      const t = input.teilnehmer.find((x) => x.position === i) ?? {
        position: i,
        vorname: "",
        nachname: "",
        email: "",
      };
      const newTeilnehmerEmail = t.email.trim().toLowerCase();
      const previousEmail = existingEmailByPosition.get(i);
      const emailChanged =
        previousEmail !== undefined && previousEmail !== newTeilnehmerEmail;
      const preservedInvite = newTeilnehmerEmail
        ? previousInviteByEmail.get(newTeilnehmerEmail) ?? null
        : null;

      await tx.bestellungTeilnehmer.upsert({
        where: {
          bestellungId_position: { bestellungId: id, position: i },
        },
        create: {
          bestellungId: id,
          position: i,
          vorname: t.vorname.trim(),
          nachname: t.nachname.trim(),
          email: newTeilnehmerEmail,
          teamsEingeladenAm: preservedInvite,
        },
        update: {
          vorname: t.vorname.trim(),
          nachname: t.nachname.trim(),
          email: newTeilnehmerEmail,
          // E-Mail-Wechsel: Einladungsstatus übernehmen, falls dieselbe
          // E-Mail in der Bestellung bereits eingeladen war, sonst zurücksetzen
          // damit der n8n-Webhook die neue Adresse als Teams-Gast einlädt.
          ...(emailChanged ? { teamsEingeladenAm: preservedInvite } : {}),
        },
      });
    }
  });

  const bestellung = await prisma.bestellung.findUnique({
    where: { id },
    select: {
      bestellNr: true,
      klasse: { select: { id: true, name: true, teamsGroupId: true } },
    },
  });
  const toInvite = await prisma.bestellungTeilnehmer.findMany({
    where: {
      bestellungId: id,
      teamsEingeladenAm: null,
      NOT: { email: "" },
    },
    select: { id: true, vorname: true, nachname: true, email: true },
  });
  if (bestellung && toInvite.length > 0) {
    await dispatchTeamsGuestInvites({
      participants: toInvite,
      klasse: bestellung.klasse,
      bestellNr: bestellung.bestellNr,
    });
  }

  // Bei Adressänderung sofort neu geocoden, damit der Marker direkt am
  // richtigen Ort steht. Best-effort: Fehler nicht propagieren.
  if (addressChanged) {
    try {
      const coords = await geocodeAddress(newStrasse, newPlz, newOrt);
      if (coords) {
        await prisma.bestellung.update({
          where: { id },
          data: { latitude: coords.latitude, longitude: coords.longitude },
        });
      }
    } catch (err) {
      console.error("[Admin] Re-Geocoding fehlgeschlagen:", err);
    }
  }

  // Preisänderung (z. B. Sonderpreis) auf den Umsatz des Leads übertragen,
  // damit die Umsatz-KPI auf dem Admin-Dashboard zur Bestellung passt. Der
  // Umsatz eines Leads summiert mehrere Bestellungen, deshalb wird nur die
  // Differenz verrechnet. Best-effort: Fehler blockieren das Speichern nicht.
  if (current && !current.preisNetto.equals(preisNetto)) {
    try {
      await syncLeadRevenueDelta({
        // Bewusst die bisherige E-Mail der Bestellung: dort wurde der Umsatz
        // gebucht, auch wenn die Adresse in diesem Speichervorgang wechselt.
        email: current.email,
        bestellNr: current.bestellNr,
        alt: { preisNetto: Number(current.preisNetto), zahlungsmodell: current.zahlungsmodell },
        neu: { preisNetto, zahlungsmodell: input.zahlungsmodell },
      });
    } catch (err) {
      console.error("[Admin] Umsatz-Abgleich am Lead fehlgeschlagen:", err);
    }
  }

  revalidatePath("/admin/shop");
  revalidatePath(`/admin/shop/${id}`);
  revalidatePath("/suche");
  revalidatePath("/admin");
  revalidatePath("/admin/leads");

  return { success: true };
}

/**
 * Verrechnet eine Preisänderung einer Bestellung mit dem Umsatz des zugehörigen
 * Leads und legt dazu eine Aktivität an. Es wird bewusst nur die Differenz
 * gebucht, weil ein Lead mehrere Bestellungen tragen kann.
 */
async function syncLeadRevenueDelta(data: {
  email: string;
  bestellNr: string;
  alt: { preisNetto: number; zahlungsmodell: string };
  neu: { preisNetto: number; zahlungsmodell: string };
}): Promise<void> {
  const jahresNetto = (p: { preisNetto: number; zahlungsmodell: string }) =>
    p.zahlungsmodell === "monatlich" ? p.preisNetto * 12 : p.preisNetto;

  const deltaCents =
    Math.round(jahresNetto(data.neu) * 100) - Math.round(jahresNetto(data.alt) * 100);
  if (deltaCents === 0) return;

  const lead = await prisma.lead.findUnique({
    where: { email: data.email.toLowerCase().trim() },
    select: { id: true, revenue: true },
  });
  if (!lead) return;

  const neuerUmsatz = Math.max(0, lead.revenue + deltaCents);
  await prisma.lead.update({
    where: { id: lead.id },
    data: { revenue: neuerUmsatz },
  });

  const euro = (cents: number) =>
    (cents / 100).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  await addActivity(lead.id, {
    type: "NOTE",
    content:
      `Preis der Bestellung ${data.bestellNr} geändert: ` +
      `${euro(Math.round(data.alt.preisNetto * 100))} € → ` +
      `${euro(Math.round(data.neu.preisNetto * 100))} € netto. ` +
      `Umsatz am Lead angepasst auf ${euro(neuerUmsatz)} €.`,
    oldValue: String(lead.revenue),
    newValue: String(neuerUmsatz),
  });
}

export async function sendCustomerOtpCodeAction(
  bestellungId: number
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const bestellung = await prisma.bestellung.findUnique({
    where: { id: bestellungId },
    select: { email: true },
  });
  if (!bestellung?.email) return { error: "Keine E-Mail hinterlegt." };

  const result = await requestOtpCode(bestellung.email);
  if (!result.ok) {
    return { error: "Code konnte nicht versendet werden (n8n-Webhook)." };
  }
  return { success: true };
}

// ─── LEAD ANLEGEN (manuell, z.B. ADN-Adressen) ──────

export async function createLeadAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string; leadId?: string }> {
  await requireAuth();

  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  const existing = await prisma.lead.findUnique({ where: { email } });
  if (existing) {
    return {
      error: `Lead mit dieser E-Mail existiert bereits (${existing.name ?? existing.email}).`,
    };
  }

  const rawAdnChannel = formData.get("adnChannel");
  const adnChannel: AdnChannel = isAdnChannelKey(rawAdnChannel) ? rawAdnChannel : "NONE";
  const rawKlasseId = formData.get("klasseId");
  const klasseId =
    typeof rawKlasseId === "string" && rawKlasseId.length > 0 ? rawKlasseId : null;

  if (klasseId) {
    const klasse = await prisma.klasse.findUnique({
      where: { id: klasseId },
      select: { id: true },
    });
    if (!klasse) return { error: "Die angegebene Klasse existiert nicht." };
  }

  const followUpAtRaw = formData.get("followUpAt") as string;
  const sourceRaw = formData.get("source") as string;
  const statusRaw = formData.get("status") as string;

  const lead = await prisma.lead.create({
    data: {
      email,
      name: ((formData.get("name") as string) || "").trim() || null,
      company: ((formData.get("company") as string) || "").trim() || null,
      street: ((formData.get("street") as string) || "").trim() || null,
      zip: ((formData.get("zip") as string) || "").trim() || null,
      city: ((formData.get("city") as string) || "").trim() || null,
      website: ((formData.get("website") as string) || "").trim() || null,
      phone: ((formData.get("phone") as string) || "").trim() || null,
      status: (statusRaw as LeadStatus) || "NEW",
      source: (sourceRaw as LeadSource) || "OTHER",
      notes: ((formData.get("notes") as string) || "").trim() || null,
      score: parseInt((formData.get("score") as string) || "0") || 0,
      followUpAt: followUpAtRaw ? new Date(followUpAtRaw) : null,
      adnChannel,
      klasseId,
    },
  });

  await addActivity(lead.id, {
    type: "NOTE",
    content: `Lead manuell angelegt${
      adnChannel !== "NONE" ? ` (ADN-Kanal: ${adnChannel})` : ""
    }.`,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${lead.id}`);
}

// ─── KLASSEN-VERWALTUNG ─────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Liest die Termin-Regel aus dem (Hidden-)Formularfeld terminRegelJson. */
function readTerminRegel(formData: FormData): TerminRegel {
  const raw = formData.get("terminRegelJson");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    return parseTerminRegel(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function createKlasseAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const name = ((formData.get("name") as string) || "").trim();
  if (name.length < 2) return { error: "Name ist erforderlich." };

  const slugRaw = ((formData.get("slug") as string) || "").trim() || slugify(name);
  const kickoffDateRaw = formData.get("kickoffDate") as string;
  const startDateRaw = formData.get("startDate") as string;
  const endDateRaw = formData.get("endDate") as string;

  if (!kickoffDateRaw || !startDateRaw || !endDateRaw) {
    return { error: "Kickoff-, Start- und Enddatum sind erforderlich." };
  }

  const capacityRaw = formData.get("capacity") as string;
  const capacity =
    capacityRaw && capacityRaw.trim().length > 0 ? parseInt(capacityRaw, 10) : null;
  if (capacity !== null && (Number.isNaN(capacity) || capacity < 0)) {
    return { error: "Kapazität muss eine positive Zahl sein." };
  }

  const statusRaw = (formData.get("status") as string) || "PLANNED";
  const teilnehmerSperreRaw = formData.get("teilnehmerSperre");
  const teilnehmerSperre =
    teilnehmerSperreRaw === "on" || teilnehmerSperreRaw === "true";
  const teamsGroupId =
    ((formData.get("teamsGroupId") as string) || "").trim() || null;

  try {
    await prisma.klasse.create({
      data: {
        name,
        slug: slugRaw,
        kickoffDate: new Date(kickoffDateRaw),
        startDate: new Date(startDateRaw),
        endDate: new Date(endDateRaw),
        capacity,
        status: statusRaw as KlasseStatus,
        teilnehmerSperre,
        teamsGroupId,
        terminRegel: readTerminRegel(formData) as unknown as Prisma.InputJsonValue,
        description: ((formData.get("description") as string) || "").trim() || null,
        curriculumStand:
          ((formData.get("curriculumStand") as string) || "").trim() || null,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { error: "Slug ist bereits vergeben." };
    }
    throw err;
  }

  revalidatePath("/admin/klassen");
  return { success: true };
}

export async function updateKlasseAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const id = formData.get("id") as string;
  if (!id) return { error: "ID fehlt." };

  const name = ((formData.get("name") as string) || "").trim();
  if (name.length < 2) return { error: "Name ist erforderlich." };

  const kickoffDateRaw = formData.get("kickoffDate") as string;
  const startDateRaw = formData.get("startDate") as string;
  const endDateRaw = formData.get("endDate") as string;
  const capacityRaw = formData.get("capacity") as string;
  const capacity =
    capacityRaw && capacityRaw.trim().length > 0 ? parseInt(capacityRaw, 10) : null;
  const statusRaw = (formData.get("status") as string) || "PLANNED";
  const teilnehmerSperreRaw = formData.get("teilnehmerSperre");
  const teilnehmerSperre =
    teilnehmerSperreRaw === "on" || teilnehmerSperreRaw === "true";
  const teamsGroupId =
    ((formData.get("teamsGroupId") as string) || "").trim() || null;

  await prisma.klasse.update({
    where: { id },
    data: {
      name,
      kickoffDate: new Date(kickoffDateRaw),
      startDate: new Date(startDateRaw),
      endDate: new Date(endDateRaw),
      capacity,
      status: statusRaw as KlasseStatus,
      teilnehmerSperre,
      teamsGroupId,
      terminRegel: readTerminRegel(formData) as unknown as Prisma.InputJsonValue,
      description: ((formData.get("description") as string) || "").trim() || null,
      curriculumStand:
        ((formData.get("curriculumStand") as string) || "").trim() || null,
    },
  });

  revalidatePath("/admin/klassen");
  revalidatePath(`/admin/klassen/${id}`);
  return { success: true };
}

export async function setKlasseStatusAction(
  id: string,
  status: KlasseStatus
): Promise<void> {
  await requireAuth();
  await prisma.klasse.update({ where: { id }, data: { status } });
  revalidatePath("/admin/klassen");
  revalidatePath(`/admin/klassen/${id}`);
}

// ─── Teams-Aufnahme: Laufzeit-Schalter (nativ/n8n) + Test-Einladung ──────────

export async function setTeamsAufnahmeModusAction(
  modus: TeamsAufnahmeModus
): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();
  // Guard analog zum Resend-Schalter: nativ nur, wenn Graph konfiguriert ist.
  if (modus === "nativ" && !isGraphConfigured()) {
    return {
      ok: false,
      error:
        "Microsoft Graph ist nicht konfiguriert (MS_GRAPH_TENANT_ID / MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET fehlt). Native Aufnahme nicht aktivierbar.",
    };
  }
  await setTeamsAufnahmeModus(modus);
  revalidatePath("/admin/klassen");
  return { ok: true };
}

/**
 * Lädt eine beliebige Test-Adresse über den NATIVEN Pfad in das Team der
 * angegebenen Klasse ein – zum Verifizieren, bevor der Schalter umgelegt wird.
 * Setzt bewusst kein teams_eingeladen_am (kein echter Teilnehmer).
 */
export async function sendTeamsTestInviteAction(
  klasseId: string,
  testEmail: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAuth();

  const email = testEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }
  if (!isGraphConfigured()) {
    return {
      ok: false,
      error: "Microsoft Graph ist nicht konfiguriert – Test-Einladung nicht möglich.",
    };
  }

  const klasse = await prisma.klasse.findUnique({
    where: { id: klasseId },
    select: { name: true, teamsGroupId: true },
  });
  if (!klasse) return { ok: false, error: "Klasse nicht gefunden." };
  if (!klasse.teamsGroupId) {
    return {
      ok: false,
      error: `Für „${klasse.name}" ist keine Teams-Group-ID hinterlegt.`,
    };
  }

  try {
    await inviteGuestToTeam({
      email,
      displayName: email,
      teamsGroupId: klasse.teamsGroupId,
      redirectUrl: process.env.APP_BASE_URL ?? "https://www.copilotberater.de",
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Test-Einladung fehlgeschlagen.",
    };
  }
  return { ok: true };
}

// ─── KLASSEN-TERMINE & THEMEN ───────────────────────

/** Lädt den Slug einer Klasse für gezieltes revalidatePath. */
async function getKlasseSlug(klasseId: string): Promise<string | null> {
  const klasse = await prisma.klasse.findUnique({
    where: { id: klasseId },
    select: { slug: true },
  });
  return klasse?.slug ?? null;
}

function isTerminStatus(value: unknown): value is TerminStatus {
  return value === "GEPLANT" || value === "DURCHGEFUEHRT";
}

export async function createTerminAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const klasseId = formData.get("klasseId") as string;
  const datumRaw = formData.get("datum") as string;
  if (!klasseId || !datumRaw) {
    return { error: "Klasse und Datum sind erforderlich." };
  }

  const slug = await getKlasseSlug(klasseId);
  if (!slug) return { error: "Klasse nicht gefunden." };

  const statusRaw = formData.get("status");
  const ferienRaw = formData.get("ferien");
  await createTermin({
    klasseId,
    datum: parseBerlinDate(datumRaw),
    thema: ((formData.get("thema") as string) || "").trim() || null,
    notizen: ((formData.get("notizen") as string) || "").trim() || null,
    status: isTerminStatus(statusRaw) ? statusRaw : "GEPLANT",
    ferien: ferienRaw === "on" || ferienRaw === "true",
    videoUrl: ((formData.get("videoUrl") as string) || "").trim() || null,
    teamsLink: ((formData.get("teamsLink") as string) || "").trim() || null,
  });

  revalidatePath(`/admin/klassen/${slug}`);
  return { success: true };
}

export async function updateTerminAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const id = formData.get("id") as string;
  const klasseId = formData.get("klasseId") as string;
  const datumRaw = formData.get("datum") as string;
  if (!id || !klasseId || !datumRaw) {
    return { error: "Datum ist erforderlich." };
  }

  const slug = await getKlasseSlug(klasseId);
  if (!slug) return { error: "Klasse nicht gefunden." };

  const statusRaw = formData.get("status");
  const ferienRaw = formData.get("ferien");
  await updateTermin(id, {
    datum: parseBerlinDate(datumRaw),
    thema: ((formData.get("thema") as string) || "").trim() || null,
    notizen: ((formData.get("notizen") as string) || "").trim() || null,
    ...(isTerminStatus(statusRaw) ? { status: statusRaw } : {}),
    ferien: ferienRaw === "on" || ferienRaw === "true",
    videoUrl: ((formData.get("videoUrl") as string) || "").trim() || null,
    teamsLink: ((formData.get("teamsLink") as string) || "").trim() || null,
    zusammenfassung: ((formData.get("zusammenfassung") as string) || "").trim() || null,
    protokoll: ((formData.get("protokoll") as string) || "").trim() || null,
  });

  revalidatePath(`/admin/klassen/${slug}`);
  return { success: true };
}

export async function setTerminStatusAction(
  id: string,
  klasseId: string,
  status: TerminStatus
): Promise<void> {
  await requireAuth();
  await updateTermin(id, { status });
  const slug = await getKlasseSlug(klasseId);
  if (slug) revalidatePath(`/admin/klassen/${slug}`);
}

export async function deleteTerminAction(
  id: string,
  klasseId: string
): Promise<void> {
  await requireAuth();
  await deleteTermin(id);
  const slug = await getKlasseSlug(klasseId);
  if (slug) revalidatePath(`/admin/klassen/${slug}`);
}

/**
 * Sammelt alle Teilnehmer-E-Mails einer Klasse zum Klickzeitpunkt und gibt sie
 * semikolongetrennt zurück – zum Einfügen in einen neuen Kalender-/Teams-Termin.
 */
export async function getKlasseTeilnehmerEmailsAction(
  klasseId: string
): Promise<{ emails: string; count: number; error?: string }> {
  await requireAuth();
  if (!klasseId) return { emails: "", count: 0, error: "Klasse fehlt." };

  const list = await getKlasseTeilnehmerEmails(klasseId);
  return { emails: list.join("; "), count: list.length };
}

/**
 * Legt automatisch die nächsten zwei künftigen Termine gemäß der Termin-Regel
 * der Klasse an (n-ter Wochentag im Monat). Bereits vorhandene Zeitpunkte werden
 * übersprungen, sodass mehrfaches Klicken keine Duplikate erzeugt.
 */
export async function generateNextTermineAction(
  klasseId: string
): Promise<{ success?: boolean; error?: string; created?: number }> {
  await requireAuth();
  if (!klasseId) return { error: "Klasse fehlt." };

  const klasse = await prisma.klasse.findUnique({
    where: { id: klasseId },
    select: {
      slug: true,
      terminRegel: true,
      termine: { select: { datum: true } },
    },
  });
  if (!klasse) return { error: "Klasse nicht gefunden." };

  const regel = parseTerminRegel(klasse.terminRegel);
  if (regel.length === 0) {
    return {
      error: "Für diese Klasse ist keine Termin-Regel hinterlegt. Bitte zuerst in den Stammdaten anlegen.",
    };
  }

  const existing = klasse.termine.map((t) => t.datum);
  const next = computeNextTermine(regel, 2, new Date(), existing);
  if (next.length === 0) {
    return { success: true, created: 0 };
  }

  for (const datum of next) {
    await createTermin({ klasseId, datum, status: "GEPLANT" });
  }

  revalidatePath(`/admin/klassen/${klasse.slug}`);
  return { success: true, created: next.length };
}

// ─── TERMIN: TRANSKRIPT-AUSWERTUNG & PROTOKOLL-VERSAND ──────────────────────
// Mail-HTML (Branddesign) und PDF-Erzeugung liegen in lib/termine/protokollMail
// bzw. lib/termine/protokollPdf – hier nur noch Laden, Bauen und Versenden.

type LoadedTerminProtokoll = NonNullable<
  Awaited<ReturnType<typeof loadTerminForProtokoll>>
>;

/**
 * Baut Betreff, gebrandetes Mail-HTML (kompakte Zusammenfassung, Video-Link,
 * Folgetermin) und das ausführliche Protokoll als PDF-Anhang. Identisch für
 * Test- und Echtversand.
 */
async function buildTerminProtokollMail({ termin, next }: LoadedTerminProtokoll) {
  const subject = terminProtokollSubject(termin.klasse.name, termin.thema);
  const html = buildTerminProtokollHtml(termin.klasse.name, termin, next);
  const pdfBase64 = await createProtokollPdf({
    klasseName: termin.klasse.name,
    datumFormatiert: formatTerminDatum(termin.datum),
    thema: termin.thema,
    protokoll: termin.protokoll ?? "",
  });
  const attachments = [
    {
      filename: protokollPdfFilename(termin.klasse.name, termin.datum),
      content: pdfBase64,
    },
  ];
  return { subject, html, attachments };
}

/** Wertet ein hochgeladenes Termin-Transkript per Claude aus (Thema/Zusammenfassung/Protokoll). */
export async function analyzeTerminTranscriptAction(
  terminId: string,
  transcriptText: string,
  filename: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();
  if (!terminId) return { error: "Termin-ID fehlt." };
  if (!transcriptText?.trim()) return { error: "Das Transkript ist leer." };

  const termin = await prisma.klasseTermin.findUnique({
    where: { id: terminId },
    include: { klasse: { select: { name: true, slug: true } } },
  });
  if (!termin) return { error: "Termin nicht gefunden." };

  try {
    const result = await summarizeTermin(transcriptText, {
      klasseName: termin.klasse.name,
      datum: termin.datum,
      thema: termin.thema,
    });

    await updateTermin(terminId, {
      transkript: transcriptText,
      transkriptDateiname: filename,
      zusammenfassung: result.zusammenfassung || null,
      protokoll: result.protokoll || null,
      // Thema nur setzen, wenn noch keins hinterlegt ist (Vorschlag der KI).
      ...(!termin.thema && result.thema ? { thema: result.thema } : {}),
    });

    revalidatePath(`/admin/klassen/${termin.klasse.slug}`);
    return { success: true };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Unbekannter Fehler bei der Auswertung.";
    return { error: msg };
  }
}

// ─── TERMIN: ANWESENHEITSBERICHT (MS TEAMS) ─────────────────────────────────
// Der Teams-Anwesenheitsbericht wird pro Termin hochgeladen (Parser in
// lib/termine/anwesenheit.ts, Persistenz in lib/db/anwesenheit.ts). Der
// Abgleich mit den gemeldeten Teilnehmern passiert zur Lesezeit auf der
// Klassen-Detailseite.

/** Speichert den hochgeladenen Teams-Anwesenheitsbericht eines Termins. */
export async function uploadTerminAnwesenheitAction(
  terminId: string,
  berichtText: string,
  filename: string
): Promise<{ success?: boolean; error?: string; gesamt?: number; unbekannt?: number }> {
  await requireAuth();
  if (!terminId) return { error: "Termin-ID fehlt." };
  if (!berichtText?.trim()) return { error: "Die Datei ist leer." };

  const termin = await prisma.klasseTermin.findUnique({
    where: { id: terminId },
    select: { klasseId: true, klasse: { select: { slug: true } } },
  });
  if (!termin) return { error: "Termin nicht gefunden." };

  const parsed = parseAnwesenheitsbericht(berichtText);
  if (parsed.error) return { error: parsed.error };
  if (parsed.teilnehmer.length === 0) {
    return { error: "Der Bericht enthält keine Teilnehmer-Zeilen." };
  }

  await replaceTerminAnwesenheit(terminId, filename, parsed.teilnehmer);

  // Direktes Feedback für die Upload-Meldung: wie viele Anwesende konnten
  // keinem Teilnehmer zugeordnet werden? Nutzt denselben intelligenten
  // Abgleich (E-Mail, Name, Heuristik, Ignorierliste) wie die Auswertung.
  const { abgleich } = await createKlasseAbgleich(termin.klasseId);
  const unbekannt = parsed.teilnehmer.filter(
    (t) => abgleich.match(t.name, t.email).status === "unbekannt"
  ).length;

  revalidatePath(`/admin/klassen/${termin.klasse.slug}`);
  return { success: true, gesamt: parsed.teilnehmer.length, unbekannt };
}

/**
 * Versendet die (im Dialog anpassbare) Teilnahme-Erinnerung an einen
 * Besteller-Kontakt einer Firma mit schwacher Teilnahmequote. Der Empfänger
 * wird serverseitig gegen die Bestellungen der Klasse geprüft, damit die
 * Action nicht als freier Mailversand missbraucht werden kann.
 */
export async function sendFirmenErinnerungAction(
  klasseId: string,
  empfaengerEmail: string,
  betreff: string,
  text: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();
  if (!klasseId) return { error: "Klasse fehlt." };

  const email = empfaengerEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Ungültige Empfänger-Adresse." };
  }
  if (!betreff.trim()) return { error: "Der Betreff ist leer." };
  if (!text.trim()) return { error: "Der E-Mail-Text ist leer." };

  const besteller = await prisma.bestellung.findFirst({
    where: { klasseId, email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!besteller) {
    return { error: "Der Empfänger ist kein Besteller dieser Klasse." };
  }

  const res = await sendEmail({
    to: email,
    subject: betreff.trim(),
    html: plainTextToHtml(text),
    templateKey: "klasse_teilnahme_erinnerung",
  });
  if (!res.ok) {
    return { error: res.error ?? "E-Mail konnte nicht gesendet werden." };
  }
  return { success: true };
}

/**
 * Speichert die globale Ignorierliste für den Anwesenheits-Abgleich
 * (Moderatoren/Sponsoren, eine Adresse pro Zeile bzw. komma-getrennt).
 */
export async function updateAnwesenheitIgnorierlisteAction(
  klasseSlug: string,
  raw: string
): Promise<{ success?: boolean; error?: string; count?: number }> {
  await requireAuth();

  const emails = raw
    .split(/[\n;,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const invalid = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (invalid.length > 0) {
    return { error: `Ungültige Adresse(n): ${invalid.join(", ")}` };
  }

  await setAnwesenheitIgnorierliste(emails);
  revalidatePath(`/admin/klassen/${klasseSlug}`);
  return { success: true, count: emails.length };
}

/** Entfernt den Anwesenheitsbericht eines Termins wieder. */
export async function deleteTerminAnwesenheitAction(
  terminId: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();
  if (!terminId) return { error: "Termin-ID fehlt." };

  const termin = await prisma.klasseTermin.findUnique({
    where: { id: terminId },
    select: { klasse: { select: { slug: true } } },
  });
  if (!termin) return { error: "Termin nicht gefunden." };

  await clearTerminAnwesenheit(terminId);
  revalidatePath(`/admin/klassen/${termin.klasse.slug}`);
  return { success: true };
}

/** Lädt Termin + Klasse + nächsten Termin für den Protokoll-Versand. */
async function loadTerminForProtokoll(terminId: string) {
  const termin = await prisma.klasseTermin.findUnique({
    where: { id: terminId },
    include: { klasse: { select: { id: true, name: true, slug: true } } },
  });
  if (!termin) return null;
  const next = await prisma.klasseTermin.findFirst({
    where: { klasseId: termin.klasseId, datum: { gt: termin.datum } },
    orderBy: { datum: "asc" },
    select: { datum: true, thema: true, teamsLink: true },
  });
  return { termin, next };
}

/** Versendet das Protokoll an alle Teilnehmer der Klasse (eine Mail pro Empfänger). */
export async function sendTerminProtokollAction(
  terminId: string
): Promise<{ success?: boolean; error?: string; sent?: number; failed?: number }> {
  await requireAuth();
  if (!terminId) return { error: "Termin-ID fehlt." };

  const loaded = await loadTerminForProtokoll(terminId);
  if (!loaded) return { error: "Termin nicht gefunden." };
  const { termin } = loaded;
  if (!termin.protokoll?.trim()) {
    return { error: "Kein Protokoll vorhanden. Bitte zuerst ein Transkript auswerten." };
  }

  const recipients = await getKlasseTeilnehmerEmails(termin.klasseId);
  if (recipients.length === 0) {
    return { error: "Keine Teilnehmer mit E-Mail in dieser Klasse." };
  }

  const { subject, html, attachments } = await buildTerminProtokollMail(loaded);

  // Einzelversand statt Batch-API: Resend unterstützt Anhänge nur je Einzel-Mail.
  const result = await sendBulkWithAttachments(
    recipients.map((to) => ({ to, subject, html })),
    attachments,
    { templateKey: "termin_protokoll" }
  );

  if (result.sent === 0) {
    return {
      error: result.error ?? "Versand fehlgeschlagen.",
      sent: 0,
      failed: result.failed.length,
    };
  }

  await updateTermin(terminId, { protokollGesendetAm: new Date() });
  revalidatePath(`/admin/klassen/${termin.klasse.slug}`);
  return { success: true, sent: result.sent, failed: result.failed.length };
}

/** Sendet das Protokoll als Vorschau an eine einzelne Test-Adresse (kein Status-Update). */
export async function sendTerminProtokollTestAction(
  terminId: string,
  testEmail: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();
  if (!terminId) return { error: "Termin-ID fehlt." };

  const email = testEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }

  const loaded = await loadTerminForProtokoll(terminId);
  if (!loaded) return { error: "Termin nicht gefunden." };
  if (!loaded.termin.protokoll?.trim()) {
    return { error: "Kein Protokoll vorhanden. Bitte zuerst ein Transkript auswerten." };
  }

  const { subject, html, attachments } = await buildTerminProtokollMail(loaded);
  const res = await sendEmail({
    to: email,
    subject: `[TEST] ${subject}`,
    html,
    attachments,
    templateKey: "termin_protokoll_test",
  });

  if (!res.ok) {
    return { error: res.error ?? "Test-E-Mail konnte nicht gesendet werden." };
  }
  return { success: true };
}

// ─── STAND-ABFRAGE (Umfrage-Runden) ─────────────────

/**
 * Rotierenden Inhalt einer Runde anpassen. Nur bis zum Versand möglich, damit
 * alle Antworten einer Runde dieselbe Frage beantwortet haben.
 */
export async function updateRundeInhaltAction(
  rundeId: string,
  inhalt: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const text = inhalt.trim();
  if (!text) return { error: "Der Inhalt darf nicht leer sein." };

  const runde = await prisma.umfrageRunde.findUnique({
    where: { id: rundeId },
    include: { klasse: { select: { slug: true } } },
  });
  if (!runde) return { error: "Runde nicht gefunden." };
  if (runde.versandAm) {
    return { error: "Die Runde wurde schon versendet, der Inhalt ist eingefroren." };
  }

  await prisma.umfrageRunde.update({
    where: { id: rundeId },
    data: { rotierenderInhalt: text },
  });
  revalidatePath(`/admin/klassen/${runde.klasse.slug}`);
  return { success: true };
}

/**
 * Startet manuell eine neue Runde für eine Klasse (ohne Versand). Ohne
 * durchgeführten Termin seit der letzten Runde kommt eine Rückfrage, die mit
 * `erzwingen` bestätigt wird.
 */
export async function starteUmfrageRundeAction(
  klasseId: string,
  erzwingen = false
): Promise<{
  success?: boolean;
  error?: string;
  brauchtBestaetigung?: boolean;
  nummer?: number;
}> {
  await requireAuth();

  const ergebnis = await starteRunde(klasseId, { erzwingen });
  if (!ergebnis.ok) {
    return { error: ergebnis.error, brauchtBestaetigung: ergebnis.brauchtBestaetigung };
  }

  const slug = await getKlasseSlug(klasseId);
  if (slug) revalidatePath(`/admin/klassen/${slug}`);
  return { success: true, nummer: ergebnis.nummer };
}

/**
 * Versendet die Einladungen einer Runde manuell an alle belegten, nicht
 * internen Plätze der Klasse. Doppelklick-sicher über den versandAm-Claim.
 */
export async function sendeUmfrageEinladungenAction(
  rundeId: string
): Promise<{
  success?: boolean;
  error?: string;
  empfaenger?: number;
  gesendet?: number;
  fehler?: number;
}> {
  await requireAuth();

  const runde = await prisma.umfrageRunde.findUnique({
    where: { id: rundeId },
    include: { klasse: { select: { slug: true } } },
  });
  if (!runde) return { error: "Runde nicht gefunden." };

  const baseUrl = await resolveAppBaseUrl();
  const ergebnis = await sendeEinladungenFuerRunde(rundeId, baseUrl);
  if (!ergebnis.ok) return { error: ergebnis.error };

  revalidatePath(`/admin/klassen/${runde.klasse.slug}`);
  return {
    success: true,
    empfaenger: ergebnis.empfaenger,
    gesendet: ergebnis.gesendet,
    fehler: ergebnis.fehler,
  };
}

/**
 * Offene Runde ohne Versand und ohne Antworten löschen (z.B. Testrunde).
 * Alles andere bleibt bewusst stehen, Runden werden nie automatisch gelöscht.
 */
export async function deleteUmfrageRundeAction(
  rundeId: string
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const runde = await prisma.umfrageRunde.findUnique({
    where: { id: rundeId },
    include: {
      klasse: { select: { slug: true } },
      _count: { select: { antworten: true } },
    },
  });
  if (!runde) return { error: "Runde nicht gefunden." };
  if (runde.status !== "OFFEN" || runde.versandAm || runde._count.antworten > 0) {
    return {
      error:
        "Nur offene Runden ohne Versand und ohne Antworten können gelöscht werden.",
    };
  }

  await prisma.umfrageRunde.delete({ where: { id: rundeId } });
  revalidatePath(`/admin/klassen/${runde.klasse.slug}`);
  return { success: true };
}
