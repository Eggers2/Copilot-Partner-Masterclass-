import { prisma } from "@/lib/prisma";
import type {
  LeadStatus,
  LeadSource,
  ActivityType,
  AdnChannel,
  Prisma,
} from "@prisma/client";

export interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  limit?: number;
}

export async function getLeads(filters?: LeadFilters) {
  const where: Record<string, unknown> = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.source) {
    where.source = filters.source;
  }
  if (filters?.search) {
    where.OR = [
      { email: { contains: filters.search, mode: "insensitive" } },
      { name: { contains: filters.search, mode: "insensitive" } },
      { company: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit,
    include: {
      _count: { select: { activities: true } },
      firstCallScore: { select: { totalScore: true } },
      klasse: { select: { id: true, name: true, slug: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
}

export async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateLead(
  id: string,
  data: {
    name?: string | null;
    company?: string | null;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
    website?: string | null;
    phone?: string | null;
    status?: LeadStatus;
    source?: LeadSource;
    notes?: string | null;
    score?: number;
    revenue?: number;
    followUpAt?: Date | null;
    latitude?: number | null;
    longitude?: number | null;
    adnChannel?: AdnChannel;
    klasseId?: string | null;
  }
) {
  return prisma.lead.update({ where: { id }, data });
}

export async function getLeadActivities(leadId: string) {
  return prisma.leadActivity.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addActivity(
  leadId: string,
  activity: {
    type: ActivityType;
    content: string;
    oldValue?: string | null;
    newValue?: string | null;
  }
) {
  return prisma.leadActivity.create({
    data: {
      leadId,
      type: activity.type,
      content: activity.content,
      oldValue: activity.oldValue ?? null,
      newValue: activity.newValue ?? null,
    },
  });
}

export async function getKpiStats() {
  const [total, byStatus, revenueSum] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.lead.aggregate({
      where: { status: "WON" },
      _sum: { revenue: true },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of byStatus) {
    statusMap[s.status] = s._count.id;
  }

  const won = statusMap["WON"] ?? 0;
  const lost = statusMap["LOST"] ?? 0;
  const closed = won + lost;
  const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
  const waitlistCount = statusMap["WAITLIST"] ?? 0;
  const followUpCount = statusMap["FOLLOW_UP"] ?? 0;

  const activeFunnel = total - won - lost;

  return {
    total,
    byStatus: statusMap,
    waitlistCount,
    followUpCount,
    conversionRate,
    won,
    activeFunnel,
    revenueTotal: revenueSum._sum.revenue ?? 0,
  };
}

// ─── FIRST CALL SCORING ──────────────────────────────

/** Gibt den First-Call-Score für einen Lead zurück (oder null) */
export async function getFirstCallScore(leadId: string) {
  return prisma.firstCallScore.findUnique({
    where: { leadId },
  });
}

/** Eingabedaten für First-Call-Score */
export interface FirstCallScoreInput {
  copilotDemand: number;
  currentOffer: number;
  teamCapacity: number;
  decisionMaker: number;
  budgetReadiness: number;
  urgency: number;
  mindset: number;
  msPartnerStatus: number;
  description?: string | null;
  painPoint?: string | null;
  teamSize?: string | null;
  recommendedPackage?: string | null;
  objections?: string | null;
  nextStep?: string | null;
  followUpDate?: Date | null;
  contactSource?: string | null;
}

/**
 * Speichert Transkript + KI-Begründungen am First-Call-Score, ohne die
 * (ggf. bereits manuell gepflegten) Scorecard-Werte zu überschreiben. Beim
 * ersten Mal greifen die Schema-Defaults für die Score-Felder.
 */
export async function saveTranscriptAnalysis(
  leadId: string,
  data: {
    transcriptText: string;
    transcriptFilename: string;
    scoreReasoning: Record<string, string>;
  }
) {
  const fields = {
    transcriptText: data.transcriptText,
    transcriptFilename: data.transcriptFilename,
    scoreReasoning: data.scoreReasoning as Prisma.InputJsonValue,
    analyzedAt: new Date(),
  };
  return prisma.firstCallScore.upsert({
    where: { leadId },
    create: { leadId, ...fields },
    update: fields,
  });
}

/** Erstellt oder aktualisiert den First-Call-Score für einen Lead */
export async function upsertFirstCallScore(leadId: string, data: FirstCallScoreInput) {
  const totalScore =
    data.copilotDemand + data.currentOffer + data.teamCapacity +
    data.decisionMaker + data.budgetReadiness + data.urgency +
    data.mindset + data.msPartnerStatus;

  const payload = { ...data, totalScore };

  return prisma.firstCallScore.upsert({
    where: { leadId },
    create: { leadId, ...payload },
    update: payload,
  });
}

// ─── ORDER → LEAD SYNC ──────────────────────────────

export interface OrderLeadSyncData {
  email: string;
  vorname: string;
  nachname: string;
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  telefon?: string | null;
  position?: string | null;
  paket: string;
  zahlungsmodell: string;
  bestellNr: string;
  preisNetto: number;
  adnChannel?: AdnChannel;
  klasseId?: string | null;
}

/**
 * Synchronisiert eine Bestellung mit der Lead-Datenbank.
 * - Lead existiert (per E-Mail): Kontaktdaten aktualisieren, Status → WON, Aktivität loggen
 * - Lead existiert nicht: Neuen Lead anlegen mit Status WON, Aktivität loggen
 */
export async function syncOrderWithLead(data: OrderLeadSyncData) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const fullName = `${data.vorname.trim()} ${data.nachname.trim()}`;
  const jahresNetto = data.zahlungsmodell === "monatlich"
    ? data.preisNetto * 12
    : data.preisNetto;
  const revenueInCents = Math.round(jahresNetto * 100);

  const activityContent =
    `Bestellung eingegangen: ${data.bestellNr} – ` +
    `Paket: ${data.paket}, Zahlungsmodell: ${data.zahlungsmodell}, ` +
    `Firma: ${data.firma}, Ansprechpartner: ${fullName}, ` +
    `Netto: ${(data.preisNetto / 100).toFixed(2)} €`;

  const existingLead = await prisma.lead.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingLead) {
    const oldStatus = existingLead.status;

    const addressChanged =
      existingLead.street !== data.strasse.trim() ||
      existingLead.zip !== data.plz.trim() ||
      existingLead.city !== data.ort.trim();

    // ADN-Kanal: nur überschreiben, wenn die Bestellung aktiv einen Kanal trägt –
    // sonst bestehende ADN-Markierung am Lead nicht löschen.
    // Klasse: immer auf die aktuellste Bestellung-Klasse setzen, da ein Lead
    // typischerweise einer Kohorte angehört.
    const adnUpdate =
      data.adnChannel && data.adnChannel !== "NONE"
        ? { adnChannel: data.adnChannel }
        : {};
    const klasseUpdate = data.klasseId ? { klasseId: data.klasseId } : {};

    await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        name: fullName,
        company: data.firma.trim(),
        street: data.strasse.trim(),
        zip: data.plz.trim(),
        city: data.ort.trim(),
        phone: data.telefon?.trim() || existingLead.phone,
        status: "WON",
        revenue: existingLead.revenue + revenueInCents,
        ...adnUpdate,
        ...klasseUpdate,
        ...(addressChanged ? { latitude: null, longitude: null } : {}),
      },
    });

    // Aktivität: Status-Änderung
    if (oldStatus !== "WON") {
      await addActivity(existingLead.id, {
        type: "STATUS_CHANGE",
        content: `Status geändert: ${oldStatus} → WON (durch Bestellung ${data.bestellNr})`,
        oldValue: oldStatus,
        newValue: "WON",
      });
    }

    // Aktivität: Bestellung
    await addActivity(existingLead.id, {
      type: "NOTE",
      content: activityContent,
    });

    console.log(`[OrderSync] Lead aktualisiert: ${existingLead.id} (${normalizedEmail})`);
  } else {
    const newLead = await prisma.lead.create({
      data: {
        email: normalizedEmail,
        name: fullName,
        company: data.firma.trim(),
        street: data.strasse.trim(),
        zip: data.plz.trim(),
        city: data.ort.trim(),
        phone: data.telefon?.trim() || null,
        status: "WON",
        source: "WEBSITE",
        revenue: revenueInCents,
        adnChannel: data.adnChannel ?? "NONE",
        klasseId: data.klasseId ?? null,
      },
    });

    // Aktivität: Neuer Lead durch Bestellung
    await addActivity(newLead.id, {
      type: "STATUS_CHANGE",
      content: `Lead neu angelegt durch Bestellung ${data.bestellNr} – Status: WON`,
      oldValue: null,
      newValue: "WON",
    });

    await addActivity(newLead.id, {
      type: "NOTE",
      content: activityContent,
    });

    console.log(`[OrderSync] Neuer Lead angelegt: ${newLead.id} (${normalizedEmail})`);
  }
}

export async function getFollowUpTasks() {
  return prisma.lead.findMany({
    where: {
      followUpAt: { not: null },
      status: { notIn: ["WON", "LOST"] },
    },
    orderBy: { followUpAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      status: true,
      followUpAt: true,
    },
  });
}
