import { prisma } from "@/lib/prisma";
import {
  markFailed,
  markSending,
  markSent,
  readContent,
} from "@/lib/db/newsletters";
import { sendBulk } from "@/lib/email/resend";
import { buildRecipientList } from "./recipients";
import { renderNewsletterHtml } from "./render";
import { signToken } from "./tokens";
import type { Newsletter } from "@prisma/client";

const UNSUB_PLACEHOLDER = "__UNSUB_URL__";

export interface SendNewsletterResult {
  ok: boolean;
  recipientCount: number;
  failedCount: number;
  error?: string;
}

/**
 * Liefert die Empfänger eines Newsletters abzüglich der abgemeldeten Adressen.
 */
async function resolveRecipients(zusatzMails: string | null): Promise<string[]> {
  const { all } = await buildRecipientList(zusatzMails);
  if (all.length === 0) return [];
  const abgemeldet = await prisma.newsletterAbmeldung.findMany({
    select: { email: true },
  });
  const suppress = new Set(abgemeldet.map((a) => a.email.toLowerCase()));
  return all.filter((e) => !suppress.has(e.toLowerCase()));
}

/**
 * Versendet einen Newsletter über Resend – je Empfänger eine eigene Mail mit
 * persönlichem Abmelde-Link (List-Unsubscribe-Header + Footer-Link). Setzt den
 * Status (`SENDING` → `SENT`/`FAILED`) und speichert die Empfängerliste.
 *
 * Einzige Versand-Quelle: wird sowohl vom „Versenden"-Button (Server-Action)
 * als auch vom Freitag-Cron genutzt. `baseUrl` kommt vom Aufrufer
 * (resolveAppBaseUrl), damit diese Funktion request-unabhängig bleibt.
 */
export async function sendNewsletter(
  nl: Newsletter,
  baseUrl: string
): Promise<SendNewsletterResult> {
  const content = readContent(nl);

  const recipients = await resolveRecipients(nl.zusatzMails);
  if (recipients.length === 0) {
    const error =
      "Keine Empfänger gefunden (alle abgemeldet oder keine Adressen vorhanden).";
    await markFailed(nl.id, error);
    return { ok: false, recipientCount: 0, failedCount: 0, error };
  }

  const header = {
    ausgabeNr: nl.ausgabeNr,
    kw: nl.kw,
    jahr: nl.jahr,
    titel: nl.titel,
    subtitle: nl.subtitle,
    gesendetAm: new Date(),
  };

  // Archiv-HTML (ohne persönlichen Abmelde-Link) für Kundenportal & Status.
  const archiveHtml = renderNewsletterHtml(content, header);
  await markSending(nl.id, archiveHtml);

  // Sende-HTML mit Platzhalter, der pro Empfänger ersetzt wird.
  const htmlTemplate = renderNewsletterHtml(content, {
    ...header,
    unsubscribeUrl: UNSUB_PLACEHOLDER,
  });

  const subject = `${nl.titel} – Ausgabe #${nl.ausgabeNr} · KW ${nl.kw}`;
  const replyTo = process.env.NEWSLETTER_SENDER_EMAIL || undefined;

  const messages = recipients.map((email) => {
    const unsubUrl = `${baseUrl}/newsletter/abmelden?token=${signToken(
      "unsub",
      email.toLowerCase()
    )}`;
    return {
      to: email,
      subject,
      html: htmlTemplate.split(UNSUB_PLACEHOLDER).join(unsubUrl),
      replyTo,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };
  });

  const result = await sendBulk(messages, { templateKey: "newsletter" });

  if (result.sent > 0) {
    const delivered = recipients.filter(
      (e) => !result.failed.some((f) => f.to === e)
    );
    await markSent(nl.id, delivered);
    if (result.failed.length > 0) {
      const sample = result.failed
        .slice(0, 5)
        .map((f) => f.to)
        .join(", ");
      await prisma.newsletter.update({
        where: { id: nl.id },
        data: {
          fehlerText: `${result.failed.length} Adresse(n) nicht zugestellt: ${sample}${
            result.failed.length > 5 ? " …" : ""
          }`,
        },
      });
    }
    return {
      ok: true,
      recipientCount: result.sent,
      failedCount: result.failed.length,
    };
  }

  const error = result.error ?? "Versand fehlgeschlagen (0 zugestellt).";
  await markFailed(nl.id, error);
  return { ok: false, recipientCount: 0, failedCount: result.failed.length, error };
}
