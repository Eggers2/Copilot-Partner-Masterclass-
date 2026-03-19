import { prisma } from "@/lib/prisma";
import type { LeadStatus, LeadSource, ActivityType } from "@prisma/client";

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
    phone?: string | null;
    status?: LeadStatus;
    source?: LeadSource;
    notes?: string | null;
    score?: number;
    revenue?: number;
    followUpAt?: Date | null;
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

  return {
    total,
    byStatus: statusMap,
    waitlistCount,
    followUpCount,
    conversionRate,
    won,
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
  painPoint?: string | null;
  teamSize?: string | null;
  recommendedPackage?: string | null;
  objections?: string | null;
  nextStep?: string | null;
  followUpDate?: Date | null;
  contactSource?: string | null;
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
