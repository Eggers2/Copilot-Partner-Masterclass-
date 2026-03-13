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
    include: { _count: { select: { activities: true } } },
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
  activity: { type: ActivityType; content: string }
) {
  return prisma.leadActivity.create({
    data: {
      leadId,
      type: activity.type,
      content: activity.content,
    },
  });
}

export async function getKpiStats() {
  const [total, byStatus, followUpsDue] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.lead.count({
      where: {
        followUpAt: { lte: new Date() },
        status: { notIn: ["WON", "LOST"] },
      },
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

  return {
    total,
    byStatus: statusMap,
    followUpsDue,
    conversionRate,
    won,
  };
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
