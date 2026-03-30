"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setAuthCookie, clearAuthCookie, requireAuth } from "@/lib/auth";
import { updateLead, addActivity, upsertFirstCallScore } from "@/lib/db/leads";
import {
  createWebinar,
  updateWebinar,
  updateRegistrationStatus,
  bulkUpdateRegistrationStatus,
} from "@/lib/db/webinars";
import type {
  LeadStatus,
  LeadSource,
  ActivityType,
  WebinarStatus,
  RegistrationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

  await updateLead(id, {
    name: (formData.get("name") as string) || null,
    company: (formData.get("company") as string) || null,
    phone: (formData.get("phone") as string) || null,
    status: newStatus,
    source: formData.get("source") as LeadSource,
    notes: (formData.get("notes") as string) || null,
    score: parseInt(formData.get("score") as string) || 0,
    revenue: newStatus === "WON" ? revenueCents : undefined,
    followUpAt: followUpAtRaw ? new Date(followUpAtRaw) : null,
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

// ─── WEBINAR ACTIONS ──────────────────────────────────

export async function createWebinarAction(
  _prev: unknown,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  await requireAuth();

  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const scheduledAtRaw = formData.get("scheduledAt") as string;

  if (!title?.trim() || !slug?.trim() || !scheduledAtRaw) {
    return { error: "Titel, Slug und Datum sind erforderlich." };
  }

  try {
    await createWebinar({
      title: title.trim(),
      slug: slug.trim(),
      scheduledAt: new Date(scheduledAtRaw),
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
      return { error: "Ein Webinar mit diesem Slug existiert bereits." };
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
      scheduledAt: new Date(scheduledAtRaw),
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
      return { error: "Ein Webinar mit diesem Slug existiert bereits." };
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
    if (attended && lead.status !== "WEBINAR_ATTENDED" && lead.status !== "WON" && lead.status !== "QUALIFIED" && lead.status !== "PROPOSAL") {
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
  return s === "attended" || s === "attended live" || s === "watched on-demand" || s === "watched on demand";
}
