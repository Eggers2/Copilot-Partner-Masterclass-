import { prisma } from "@/lib/prisma";
import {
  getNewsletter,
  readContent,
  updateContent,
  recentlyUsedSourceUrls,
} from "@/lib/db/newsletters";
import { newsFromLinksammlung, eventsFromLinksammlung } from "./research";
import type { NewsletterContent } from "./types";

/**
 * Startet News- und Termin-Recherche parallel und schreibt jedes Ergebnis
 * einzeln in die DB, sobald es fertig ist. Wird aus der
 * Server-Action fire-and-forget aufgerufen, damit der Editor sofort geladen
 * wird und den Fortschritt per Polling abholen kann.
 */
export async function generateNewsletterContent(id: string, count = 5) {
  const newsTask = recentlyUsedSourceUrls()
    .catch(() => [] as string[])
    .then((excludeUrls) => newsFromLinksammlung({ count, excludeUrls }))
    .then(async (candidates) => {
      const nl = await getNewsletter(id);
      if (!nl) return;
      const content = readContent(nl) as NewsletterContent;
      await updateContent(id, { content: { ...content, candidates } });
    })
    .catch((err) => logPartial(id, "News (Linksammlung)", err));

  const eventsTask = eventsFromLinksammlung({ count: 3 })
    .then(async (events) => {
      const nl = await getNewsletter(id);
      if (!nl) return;
      const content = readContent(nl) as NewsletterContent;
      await updateContent(id, { content: { ...content, events } });
    })
    .catch((err) => logPartial(id, "Events (Linksammlung)", err));

  await Promise.allSettled([newsTask, eventsTask]);
}

async function logPartial(id: string, label: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[newsletter.generate] ${label} failed:`, message);
  try {
    const nl = await prisma.newsletter.findUnique({
      where: { id },
      select: { fehlerText: true },
    });
    const prev = nl?.fehlerText ? `${nl.fehlerText}\n` : "";
    await prisma.newsletter.update({
      where: { id },
      data: { fehlerText: `${prev}${label}: ${message}` },
    });
  } catch (inner) {
    console.error("[newsletter.generate] logPartial write failed:", inner);
  }
}
