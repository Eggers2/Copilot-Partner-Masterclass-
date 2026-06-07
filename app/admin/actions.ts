"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setAuthCookie, clearAuthCookie, requireAuth } from "@/lib/auth";
import { requestOtpCode } from "@/lib/auth/customer";

/**
 * Parses a datetime-local string (e.g. "2026-03-31T17:00") as Europe/Berlin time.
 * datetime-local inputs have no timezone – new Date() on a UTC server would treat
 * it as UTC, causing a 1–2h offset. This tries both CET (+01:00) and CEST (+02:00)
 * and returns the one that round-trips correctly to the intended Berlin hour.
 */
function parseBerlinDate(dateTimeLocal: string): Date {
  const hour = parseInt(dateTimeLocal.split("T")[1]?.split(":")[0] ?? "0", 10);

  const cest = new Date(dateTimeLocal + ":00+02:00"); // summer
  const cet = new Date(dateTimeLocal + ":00+01:00");  // winter

  const berlinHour = (d: Date) =>
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Berlin",
        hour: "numeric",
        hour12: false,
      }).format(d)
    );

  if (berlinHour(cest) === hour) return cest;
  if (berlinHour(cet) === hour) return cet;
  return cest; // fallback to summer time
}
import { updateLead, addActivity, upsertFirstCallScore } from "@/lib/db/leads";
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
import type {
  LeadStatus,
  LeadSource,
  ActivityType,
  WebinarStatus,
  RegistrationStatus,
  AdnChannel,
  KlasseStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
    PACKAGES,
    isPaketKey,
    isZahlungsmodell,
    getPreisNetto,
    getInvoicedPreisNetto,
    calculateMwst,
  } = await import("@/lib/packages");

  if (!isPaketKey(input.paket) || !isZahlungsmodell(input.zahlungsmodell)) {
    return { error: "Paket oder Zahlungsmodell ungültig." };
  }

  const adnChannel: AdnChannel = input.adnChannel ?? "NONE";
  const pkg = PACKAGES[input.paket];
  const effectiveSlotCount = Math.max(pkg.users, input.userAnzahl);
  const listPreisNetto = getPreisNetto(input.paket, input.zahlungsmodell);
  const preisNetto = getInvoicedPreisNetto(input.paket, input.zahlungsmodell, adnChannel);
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
    select: { strasse: true, plz: true, ort: true },
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

  revalidatePath("/admin/shop");
  revalidatePath(`/admin/shop/${id}`);
  revalidatePath("/suche");

  return { success: true };
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
        description: ((formData.get("description") as string) || "").trim() || null,
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
      description: ((formData.get("description") as string) || "").trim() || null,
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
