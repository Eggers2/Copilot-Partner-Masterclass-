import { prisma } from "@/lib/prisma";
import type { NewsletterContent } from "@/lib/newsletter/types";
import type { Newsletter, Prisma } from "@prisma/client";

export type { NewsletterStatus } from "@prisma/client";

export function isoWeek(date: Date): { kw: number; jahr: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const kw = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return { kw, jahr: d.getUTCFullYear() };
}

export async function nextAusgabeNr(): Promise<number> {
  const max = await prisma.newsletter.aggregate({
    _max: { ausgabeNr: true },
  });
  return (max._max.ausgabeNr ?? 0) + 1;
}

export async function deleteNewsletter(id: string) {
  return prisma.newsletter.delete({ where: { id } });
}

export async function listNewsletters() {
  return prisma.newsletter.findMany({
    orderBy: [{ erstelltAm: "desc" }],
    select: {
      id: true,
      ausgabeNr: true,
      kw: true,
      jahr: true,
      titel: true,
      status: true,
      gesendetAm: true,
      erstelltAm: true,
      aktualisiertAm: true,
    },
  });
}

export async function getNewsletter(id: string) {
  return prisma.newsletter.findUnique({ where: { id } });
}

export async function getSentNewsletters() {
  return prisma.newsletter.findMany({
    where: { status: "SENT" },
    orderBy: [{ gesendetAm: "desc" }],
    select: {
      id: true,
      ausgabeNr: true,
      kw: true,
      jahr: true,
      titel: true,
      subtitle: true,
      gesendetAm: true,
    },
  });
}

export async function createDraft(input: {
  ausgabeNr: number;
  kw: number;
  jahr: number;
  content: NewsletterContent;
  titel?: string;
  subtitle?: string | null;
}) {
  return prisma.newsletter.create({
    data: {
      ausgabeNr: input.ausgabeNr,
      kw: input.kw,
      jahr: input.jahr,
      titel: input.titel ?? "Copilot Insider Update",
      subtitle: input.subtitle ?? null,
      status: "DRAFT",
      content: input.content as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateContent(
  id: string,
  patch: {
    content?: NewsletterContent;
    titel?: string;
    subtitle?: string | null;
    zusatzMails?: string | null;
  }
) {
  const data: Prisma.NewsletterUpdateInput = {};
  if (patch.content !== undefined) data.content = patch.content as unknown as Prisma.InputJsonValue;
  if (patch.titel !== undefined) data.titel = patch.titel;
  if (patch.subtitle !== undefined) data.subtitle = patch.subtitle;
  if (patch.zusatzMails !== undefined) data.zusatzMails = patch.zusatzMails;
  return prisma.newsletter.update({ where: { id }, data });
}

export async function markSending(id: string, html: string) {
  return prisma.newsletter.update({
    where: { id },
    data: { status: "SENDING", html, fehlerText: null },
  });
}

export async function markSent(id: string, recipients: string[]) {
  return prisma.newsletter.update({
    where: { id },
    data: {
      status: "SENT",
      gesendetAm: new Date(),
      recipients: recipients as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function markFailed(id: string, fehlerText: string) {
  return prisma.newsletter.update({
    where: { id },
    data: { status: "FAILED", fehlerText },
  });
}

export function readContent(newsletter: Newsletter): NewsletterContent {
  return newsletter.content as unknown as NewsletterContent;
}
