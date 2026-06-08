import { prisma } from "@/lib/prisma";
import {
  createDraft,
  getNewsletter,
  isoWeek,
  nextAusgabeNr,
  readContent,
  updateContent,
} from "@/lib/db/newsletters";
import { sendEmail } from "@/lib/email/resend";
import { generateNewsletterContent } from "./generate";
import { sendNewsletter } from "./send";
import { signToken } from "./tokens";
import type { NewsletterContent } from "./types";
import type { Newsletter } from "@prisma/client";

const EMPTY_CONTENT: NewsletterContent = {
  candidates: [],
  selectedIds: [],
  prompt: { badge: "", title: "", body: "", tipp: "" },
  events: [],
};

export interface BerlinTime {
  /** 1 = Montag … 7 = Sonntag */
  weekday: number;
  hour: number;
  minute: number;
}

/**
 * Aktuelle Wanduhrzeit in Europe/Berlin. Railway-Cron läuft in UTC – die
 * Dispatch-Entscheidung trifft daher diese Funktion, sodass Sommer-/Winterzeit
 * automatisch korrekt ist.
 */
export function berlinNow(date: Date = new Date()): BerlinTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const wdMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  const weekday = wdMap[parts.find((p) => p.type === "weekday")?.value ?? ""] ?? 1;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { weekday, hour, minute };
}

// ─── Donnerstag 18:00: Entwurf anlegen + Benachrichtigung ───────────────────

export async function runThursdayDraft(baseUrl: string) {
  const now = new Date();
  const { kw, jahr } = isoWeek(now);

  // Idempotenz: existiert für diese KW bereits eine Ausgabe (egal welcher
  // Status), wird nichts neu angelegt – schützt vor mehrfachen Cron-Treffern.
  const existing = await prisma.newsletter.findFirst({
    where: { kw, jahr },
    orderBy: { erstelltAm: "desc" },
  });
  if (existing) {
    return {
      action: "thursday" as const,
      skipped: true,
      reason: `Ausgabe für KW ${kw}/${jahr} existiert bereits (#${existing.ausgabeNr}, Status ${existing.status}).`,
      newsletterId: existing.id,
    };
  }

  const ausgabeNr = await nextAusgabeNr();
  const draft = await createDraft({ ausgabeNr, kw, jahr, content: EMPTY_CONTENT });

  // Inhalte VOLLSTÄNDIG generieren (im Cron bewusst awaited, kein fire-and-forget).
  await generateNewsletterContent(draft.id).catch((err) => {
    console.error("[schedule] Generierung fehlgeschlagen:", err);
  });

  // Top-5-Kandidaten automatisch auswählen, damit der 1-Klick-Versand am Freitag
  // ohne manuelles Zutun etwas zu senden hat.
  const fresh = await getNewsletter(draft.id);
  if (fresh) {
    const content = readContent(fresh);
    if (content.selectedIds.length === 0 && content.candidates.length > 0) {
      const top5 = content.candidates.slice(0, 5).map((c) => c.id);
      await updateContent(draft.id, { content: { ...content, selectedIds: top5 } });
    }
  }

  await sendReviewNotification(draft.id, ausgabeNr, kw, jahr, baseUrl);

  return {
    action: "thursday" as const,
    skipped: false,
    newsletterId: draft.id,
    ausgabeNr,
  };
}

// ─── Freitag 09:00: freigegebene Ausgabe versenden (oder erinnern) ──────────

export async function runFridaySend(baseUrl: string) {
  const approved = await prisma.newsletter.findMany({
    where: { status: "APPROVED" },
    orderBy: { erstelltAm: "asc" },
  });

  if (approved.length === 0) {
    // Nichts freigegeben → an den Entwurf der Woche erinnern (Q4: nicht senden).
    const { kw, jahr } = isoWeek(new Date());
    const draft = await prisma.newsletter.findFirst({
      where: { kw, jahr, status: "DRAFT" },
      orderBy: { erstelltAm: "desc" },
    });
    if (draft) {
      await sendReminder(draft, baseUrl);
      return {
        action: "friday" as const,
        skipped: false,
        sent: 0,
        reminded: true,
        newsletterId: draft.id,
      };
    }
    return {
      action: "friday" as const,
      skipped: true,
      reason: "Keine freigegebene Ausgabe und kein Entwurf der laufenden KW.",
    };
  }

  const results: { id: string; ok: boolean; recipientCount: number; error?: string }[] = [];
  for (const nl of approved) {
    // Atomar claimen: nur, wenn die Zeile noch APPROVED ist (verhindert
    // Doppelversand bei parallelen/mehrfachen Cron-Aufrufen).
    const claim = await prisma.newsletter.updateMany({
      where: { id: nl.id, status: "APPROVED" },
      data: { status: "SENDING" },
    });
    if (claim.count !== 1) continue;

    const res = await sendNewsletter(nl, baseUrl);
    results.push({ id: nl.id, ok: res.ok, recipientCount: res.recipientCount, error: res.error });
  }

  const sent = results.filter((r) => r.ok).reduce((acc, r) => acc + r.recipientCount, 0);
  return {
    action: "friday" as const,
    skipped: false,
    count: results.length,
    sent,
    results,
  };
}

// ─── Benachrichtigungs-Mails (Resend) ───────────────────────────────────────

function reviewEmailAddress(): string | null {
  return (
    process.env.NEWSLETTER_REVIEW_EMAIL ||
    process.env.NEWSLETTER_SENDER_EMAIL ||
    null
  );
}

async function sendReviewNotification(
  id: string,
  ausgabeNr: number,
  kw: number,
  jahr: number,
  baseUrl: string
): Promise<void> {
  const to = reviewEmailAddress();
  if (!to) {
    console.warn(
      "[schedule] Keine Review-Adresse (NEWSLETTER_REVIEW_EMAIL/NEWSLETTER_SENDER_EMAIL) – Benachrichtigung übersprungen."
    );
    return;
  }

  const nl = await getNewsletter(id);
  const content = nl ? readContent(nl) : null;
  const selectedCount = content?.selectedIds.length ?? 0;
  const editorUrl = `${baseUrl}/admin/newsletter/${id}`;
  const approveUrl = `${baseUrl}/newsletter/freigabe?token=${signToken("approve", id)}`;

  await sendEmail({
    to,
    subject: `📰 Newsletter #${ausgabeNr} (KW ${kw}/${jahr}) bereit zur Freigabe`,
    html: notificationHtml({
      heading: `Newsletter #${ausgabeNr} ist bereit`,
      intro: `Der Entwurf für KW ${kw}/${jahr} wurde automatisch erstellt – mit ${selectedCount} vorausgewählten News. Prüfe ihn und gib ihn für den Versand am <strong>Freitag 09:00 Uhr</strong> frei.`,
      primaryLabel: "✓ Für Freitag 09:00 freigeben",
      primaryUrl: approveUrl,
      secondaryLabel: "Im Editor öffnen / anpassen",
      secondaryUrl: editorUrl,
      note: "Ohne Freigabe bis Freitag 09:00 Uhr wird nichts versendet.",
    }),
    replyTo: process.env.NEWSLETTER_SENDER_EMAIL || undefined,
    templateKey: "newsletter_review",
  });
}

async function sendReminder(draft: Newsletter, baseUrl: string): Promise<void> {
  const to = reviewEmailAddress();
  if (!to) return;

  const editorUrl = `${baseUrl}/admin/newsletter/${draft.id}`;
  const approveUrl = `${baseUrl}/newsletter/freigabe?token=${signToken("approve", draft.id)}`;

  await sendEmail({
    to,
    subject: `⚠️ Newsletter #${draft.ausgabeNr} (KW ${draft.kw}) wurde NICHT versendet`,
    html: notificationHtml({
      heading: `Kein Versand für Newsletter #${draft.ausgabeNr}`,
      intro: `Der Entwurf für KW ${draft.kw}/${draft.jahr} wurde bis Freitag 09:00 Uhr <strong>nicht freigegeben</strong> – es wurde daher nichts versendet. Du kannst ihn weiterhin prüfen und manuell freigeben/versenden.`,
      primaryLabel: "✓ Jetzt freigeben",
      primaryUrl: approveUrl,
      secondaryLabel: "Im Editor öffnen",
      secondaryUrl: editorUrl,
      note: "Nach der Freigabe kannst du im Editor direkt 'Versenden' wählen.",
    }),
    replyTo: process.env.NEWSLETTER_SENDER_EMAIL || undefined,
    templateKey: "newsletter_reminder",
  });
}

function notificationHtml(opts: {
  heading: string;
  intro: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
  note: string;
}): string {
  const bg = "#1A1A2E";
  const accent = "#00C896";
  const cool = "#E8E8F0";
  const gray = "#6B6B8A";
  const card = "#22223C";
  const border = "#2B2B48";
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};">
  <tr><td align="center" style="padding:32px 20px;">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${card};border:1px solid ${border};border-radius:16px;">
      <tr><td style="padding:32px 32px 8px 32px;">
        <div style="color:${accent};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Copilot Partner Masterclass</div>
        <h1 style="margin:12px 0 0 0;color:${cool};font-size:24px;font-weight:700;line-height:1.25;">${opts.heading}</h1>
        <p style="margin:14px 0 0 0;color:${gray};font-size:15px;line-height:1.6;">${opts.intro}</p>
      </td></tr>
      <tr><td style="padding:24px 32px 8px 32px;">
        <a href="${opts.primaryUrl}" target="_blank" style="display:inline-block;background:${accent};color:#06251D;font-size:15px;font-weight:700;text-decoration:none;padding:13px 22px;border-radius:10px;">${opts.primaryLabel}</a>
      </td></tr>
      <tr><td style="padding:8px 32px 4px 32px;">
        <a href="${opts.secondaryUrl}" target="_blank" style="display:inline-block;color:${accent};font-size:14px;text-decoration:none;">${opts.secondaryLabel} &rarr;</a>
      </td></tr>
      <tr><td style="padding:20px 32px 32px 32px;">
        <div style="color:${gray};font-size:12px;line-height:1.6;border-top:1px solid ${border};padding-top:16px;">${opts.note}</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
