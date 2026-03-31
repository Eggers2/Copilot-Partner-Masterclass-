import { prisma } from "@/lib/prisma";
import type { WebinarStatus, RegistrationStatus } from "@prisma/client";

export async function getWebinars() {
  // Auto-close webinars that have already started
  await prisma.webinar.updateMany({
    where: {
      status: "OPEN",
      scheduledAt: { lte: new Date() },
    },
    data: { status: "CLOSED" },
  });

  return prisma.webinar.findMany({
    orderBy: { scheduledAt: "desc" },
    include: { _count: { select: { registrations: true } } },
  });
}

export async function getOpenWebinars() {
  // Auto-close webinars that have already started
  await prisma.webinar.updateMany({
    where: {
      status: "OPEN",
      scheduledAt: { lte: new Date() },
    },
    data: { status: "CLOSED" },
  });

  return prisma.webinar.findMany({
    where: { status: "OPEN" },
    orderBy: { scheduledAt: "asc" },
    include: { _count: { select: { registrations: true } } },
  });
}

export async function getWebinar(id: string) {
  return prisma.webinar.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          lead: {
            select: {
              id: true,
              email: true,
              name: true,
              company: true,
              status: true,
            },
          },
        },
        orderBy: { registeredAt: "desc" },
      },
      _count: { select: { registrations: true } },
    },
  });
}

export async function getWebinarBySlug(slug: string) {
  return prisma.webinar.findUnique({
    where: { slug },
    include: { _count: { select: { registrations: true } } },
  });
}

export async function createWebinar(data: {
  title: string;
  slug: string;
  scheduledAt: Date;
  streamyardLink?: string | null;
  description?: string | null;
}) {
  return prisma.webinar.create({ data });
}

export async function updateWebinar(
  id: string,
  data: {
    title?: string;
    slug?: string;
    scheduledAt?: Date;
    streamyardLink?: string | null;
    status?: WebinarStatus;
    description?: string | null;
  }
) {
  return prisma.webinar.update({ where: { id }, data });
}

export async function registerForWebinar(
  webinarId: string,
  leadId: string,
  source?: string | null
) {
  return prisma.webinarRegistration.upsert({
    where: { webinarId_leadId: { webinarId, leadId } },
    create: { webinarId, leadId, source },
    update: { status: "REGISTERED" },
  });
}

export async function updateRegistrationStatus(
  id: string,
  status: RegistrationStatus
) {
  return prisma.webinarRegistration.update({
    where: { id },
    data: {
      status,
      attendedAt: status === "ATTENDED" ? new Date() : undefined,
    },
  });
}

export async function bulkUpdateRegistrationStatus(
  webinarId: string,
  registrationIds: string[],
  status: RegistrationStatus
) {
  return prisma.webinarRegistration.updateMany({
    where: {
      id: { in: registrationIds },
      webinarId,
    },
    data: {
      status,
      attendedAt: status === "ATTENDED" ? new Date() : undefined,
    },
  });
}
