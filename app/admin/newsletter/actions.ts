"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createDraft,
  deleteNewsletter,
  getNewsletter,
  isoWeek,
  markFailed,
  markSending,
  markSent,
  nextAusgabeNr,
  readContent,
  recentlyUsedSourceUrls,
  updateContent,
} from "@/lib/db/newsletters";
import {
  newsFromLinksammlung,
  eventsFromLinksammlung,
} from "@/lib/newsletter/research";
import { generateNewsletterContent } from "@/lib/newsletter/generate";
import { renderNewsletterHtml } from "@/lib/newsletter/render";
import { buildRecipientList } from "@/lib/newsletter/recipients";
import { sendNewsletter } from "@/lib/newsletter/send";
import { signToken } from "@/lib/newsletter/tokens";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import { fireNewsletterWebhook } from "@/lib/webhooks/newsletter";
import type { NewsletterContent } from "@/lib/newsletter/types";

const EMPTY_CONTENT: NewsletterContent = {
  candidates: [],
  selectedIds: [],
  masterclassNews: { title: "", body: "", ctaLabel: "", ctaUrl: "" },
  events: [],
};

export async function createDraftAction() {
  await requireAuth();

  const now = new Date();
  const { kw, jahr } = isoWeek(now);
  const ausgabeNr = await nextAusgabeNr();

  // Leeren Draft sofort anlegen und in den Editor springen – die Inhalte werden
  // im Hintergrund generiert und per Polling nachgeladen.
  const draft = await createDraft({
    ausgabeNr,
    kw,
    jahr,
    content: EMPTY_CONTENT,
  });

  // Fire-and-forget: läuft auf Railway (Node-Runtime) weiter, während wir
  // redirecten. Die Editor-Seite pollt auf Teilergebnisse.
  void generateNewsletterContent(draft.id).catch((err) => {
    console.error("[newsletter] Background-Generierung fehlgeschlagen:", err);
  });

  revalidatePath("/admin/newsletter");
  redirect(`/admin/newsletter/${draft.id}`);
}

export async function deleteNewsletterAction(id: string) {
  await requireAuth();
  const nl = await getNewsletter(id);
  if (!nl) return { ok: false, error: "Newsletter nicht gefunden" };
  await deleteNewsletter(id);
  revalidatePath("/admin/newsletter");
  revalidatePath("/kundenportal/newsletter");
  return { ok: true };
}

export async function fetchMoreNewsAction(
  id: string
): Promise<{ content: NewsletterContent }> {
  await requireAuth();
  const nl = await getNewsletter(id);
  if (!nl) throw new Error("Newsletter nicht gefunden");
  const content = readContent(nl);

  const used = await recentlyUsedSourceUrls().catch(() => [] as string[]);
  const excludeUrls = [
    ...content.candidates.map((c) => c.sourceUrl).filter((u): u is string => !!u),
    ...used,
  ];

  const more = await newsFromLinksammlung({ count: 5, excludeUrls });
  const seenUrls = new Set(excludeUrls.map((u) => u.toLowerCase()));
  const filtered = more.filter(
    (m) => m.sourceUrl && !seenUrls.has(m.sourceUrl.toLowerCase())
  );

  const next: NewsletterContent = {
    ...content,
    candidates: [...content.candidates, ...filtered],
  };
  await updateContent(id, { content: next });
  revalidatePath(`/admin/newsletter/${id}`);
  return { content: next };
}

export async function refreshEventsAction(
  id: string
): Promise<{ content: NewsletterContent }> {
  await requireAuth();
  const nl = await getNewsletter(id);
  if (!nl) throw new Error("Newsletter nicht gefunden");
  const content = readContent(nl);
  const events = await eventsFromLinksammlung({ count: 3 });
  const next: NewsletterContent = { ...content, events };
  await updateContent(id, { content: next });
  revalidatePath(`/admin/newsletter/${id}`);
  return { content: next };
}

export async function saveContentAction(
  id: string,
  patch: {
    content: NewsletterContent;
    titel: string;
    subtitle: string;
    zusatzMails: string;
  }
) {
  await requireAuth();
  await updateContent(id, {
    content: patch.content,
    titel: patch.titel,
    subtitle: patch.subtitle || null,
    zusatzMails: patch.zusatzMails || null,
  });
  revalidatePath(`/admin/newsletter/${id}`);
}

export async function sendTestMailAction(id: string, toEmail: string) {
  await requireAuth();
  const nl = await getNewsletter(id);
  if (!nl) return { ok: false, error: "Newsletter nicht gefunden" };

  const content = readContent(nl);
  const subject = `[TEST] ${nl.titel} – Ausgabe #${nl.ausgabeNr} · KW ${nl.kw}`;
  const to = toEmail.trim();

  if (isResendConfigured()) {
    const baseUrl = await resolveAppBaseUrl();
    const unsubUrl = `${baseUrl}/newsletter/abmelden?token=${signToken("unsub", to.toLowerCase())}`;
    const html = renderNewsletterHtml(content, {
      ausgabeNr: nl.ausgabeNr,
      kw: nl.kw,
      jahr: nl.jahr,
      titel: nl.titel,
      subtitle: nl.subtitle,
      unsubscribeUrl: unsubUrl,
    });
    const res = await sendEmail({
      to,
      subject,
      html,
      replyTo: process.env.NEWSLETTER_SENDER_EMAIL || undefined,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      templateKey: "newsletter_test",
    });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }

  // Fallback: n8n-Webhook (Outlook-Draft).
  const html = renderNewsletterHtml(content, {
    ausgabeNr: nl.ausgabeNr,
    kw: nl.kw,
    jahr: nl.jahr,
    titel: nl.titel,
    subtitle: nl.subtitle,
  });
  return fireNewsletterWebhook({
    newsletterId: nl.id,
    ausgabeNr: nl.ausgabeNr,
    kw: nl.kw,
    jahr: nl.jahr,
    subject,
    html,
    bcc: [to],
    testMail: true,
  });
}

export async function sendNewsletterAction(id: string) {
  await requireAuth();
  const nl = await getNewsletter(id);
  if (!nl) return { ok: false, error: "Newsletter nicht gefunden" };
  if (nl.status === "SENT") return { ok: false, error: "Newsletter wurde bereits versandt" };

  const content = readContent(nl);

  if (content.selectedIds.length === 0) {
    return { ok: false, error: "Bitte wähle mindestens eine News aus, bevor du versendest." };
  }

  // Primär: Versand über Resend (je Empfänger eine Mail mit Abmelde-Link).
  if (isResendConfigured()) {
    const baseUrl = await resolveAppBaseUrl();
    const res = await sendNewsletter(nl, baseUrl);
    revalidatePath("/admin/newsletter");
    revalidatePath(`/admin/newsletter/${id}`);
    revalidatePath("/kundenportal/newsletter");
    return res.ok
      ? { ok: true, recipientCount: res.recipientCount }
      : { ok: false, error: res.error };
  }

  // Fallback: n8n-Webhook (BCC-Draft in Outlook), wenn Resend nicht konfiguriert.
  const { all } = await buildRecipientList(nl.zusatzMails);
  if (all.length === 0) {
    return {
      ok: false,
      error: "Keine Empfänger gefunden. Prüfe bitte die Bestellerdaten oder trage Zusatz-Adressen ein.",
    };
  }

  const html = renderNewsletterHtml(content, {
    ausgabeNr: nl.ausgabeNr,
    kw: nl.kw,
    jahr: nl.jahr,
    titel: nl.titel,
    subtitle: nl.subtitle,
  });

  await markSending(id, html);

  const subject = `${nl.titel} – Ausgabe #${nl.ausgabeNr} · KW ${nl.kw}`;
  const result = await fireNewsletterWebhook({
    newsletterId: nl.id,
    ausgabeNr: nl.ausgabeNr,
    kw: nl.kw,
    jahr: nl.jahr,
    subject,
    html,
    bcc: all,
    testMail: false,
  });

  if (result.ok) {
    await markSent(id, all);
    revalidatePath("/admin/newsletter");
    revalidatePath(`/admin/newsletter/${id}`);
    revalidatePath("/kundenportal/newsletter");
    return { ok: true, recipientCount: all.length };
  } else {
    await markFailed(id, result.error ?? "Unbekannter Fehler");
    revalidatePath(`/admin/newsletter/${id}`);
    return { ok: false, error: result.error };
  }
}

/** Gibt einen Entwurf für den (automatischen) Versand am Freitag 09:00 frei. */
export async function approveNewsletterAction(id: string) {
  await requireAuth();
  const nl = await getNewsletter(id);
  if (!nl) return { ok: false, error: "Newsletter nicht gefunden" };
  if (nl.status === "SENT" || nl.status === "SENDING") {
    return { ok: false, error: "Newsletter ist bereits im Versand." };
  }
  const content = readContent(nl);
  if (content.selectedIds.length === 0) {
    return { ok: false, error: "Bitte wähle mindestens eine News aus, bevor du freigibst." };
  }
  await prisma.newsletter.update({
    where: { id },
    data: { status: "APPROVED", freigegebenAm: new Date() },
  });
  revalidatePath("/admin/newsletter");
  revalidatePath(`/admin/newsletter/${id}`);
  return { ok: true };
}

/** Zieht eine Freigabe zurück (APPROVED → DRAFT). */
export async function retractApprovalAction(id: string) {
  await requireAuth();
  const nl = await getNewsletter(id);
  if (!nl) return { ok: false, error: "Newsletter nicht gefunden" };
  if (nl.status !== "APPROVED") {
    return { ok: false, error: "Newsletter ist nicht im Status 'Freigegeben'." };
  }
  await prisma.newsletter.update({
    where: { id },
    data: { status: "DRAFT", freigegebenAm: null },
  });
  revalidatePath("/admin/newsletter");
  revalidatePath(`/admin/newsletter/${id}`);
  return { ok: true };
}
