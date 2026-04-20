import { prisma } from "@/lib/prisma";
import { getNewsletter, readContent, updateContent } from "@/lib/db/newsletters";
import {
  researchNews,
  generatePromptOfWeek,
  generateZahlOfWeek,
} from "./research";
import type { NewsletterContent } from "./types";

/**
 * Startet die drei Claude-Calls (News, Prompt, Zahl) parallel und schreibt
 * jedes Ergebnis einzeln in die DB, sobald es fertig ist. Wird aus der
 * Server-Action fire-and-forget aufgerufen, damit der Editor sofort geladen
 * wird und den Fortschritt per Polling abholen kann.
 */
export async function generateNewsletterContent(id: string, count = 5) {
  const newsTask = researchNews({ count })
    .then(async (candidates) => {
      const nl = await getNewsletter(id);
      if (!nl) return;
      const content = readContent(nl) as NewsletterContent;
      await updateContent(id, { content: { ...content, candidates } });
    })
    .catch((err) => logPartial(id, "News-Recherche", err));

  const promptTask = generatePromptOfWeek()
    .then(async (prompt) => {
      const nl = await getNewsletter(id);
      if (!nl) return;
      const content = readContent(nl) as NewsletterContent;
      await updateContent(id, { content: { ...content, prompt } });
    })
    .catch((err) => logPartial(id, "Prompt der Woche", err));

  const zahlTask = generateZahlOfWeek()
    .then(async (zahl) => {
      const nl = await getNewsletter(id);
      if (!nl) return;
      const content = readContent(nl) as NewsletterContent;
      await updateContent(id, { content: { ...content, zahl } });
    })
    .catch((err) => logPartial(id, "Zahl der Woche", err));

  await Promise.allSettled([newsTask, promptTask, zahlTask]);
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
