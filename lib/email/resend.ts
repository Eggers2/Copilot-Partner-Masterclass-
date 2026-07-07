import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

let client: Resend | null = null;

/**
 * Lazily-initialisierter Resend-Client. Gibt `null` zurück, wenn kein
 * API-Key konfiguriert ist – die Aufrufer fallen dann auf den n8n-Webhook
 * zurück.
 */
function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  /** optionaler Reply-To, sonst nur der Absender aus RESEND_FROM_EMAIL */
  replyTo?: string;
  /** zusätzliche Header, z.B. List-Unsubscribe */
  headers?: Record<string, string>;
  /** Template-Key für die Protokollierung (EmailLog) */
  templateKey?: string;
  /** optionale Datei-Anhänge (content = Buffer oder base64-String) */
  attachments?: { filename: string; content: Buffer | string }[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Versendet eine E-Mail über Resend und protokolliert jeden Versuch in
 * `EmailLog`. Wirft nicht – Fehler werden als `{ ok: false }` zurückgegeben,
 * damit der Aufrufer ggf. auf n8n zurückfallen kann.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend || !from) {
    return { ok: false, error: "Resend ist nicht konfiguriert (RESEND_API_KEY / RESEND_FROM_EMAIL fehlt)." };
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.headers ? { headers: input.headers } : {}),
      ...(input.attachments && input.attachments.length > 0
        ? { attachments: input.attachments }
        : {}),
    });

    if (error) {
      await logEmail(input, recipients, "failed", undefined, error.message);
      return { ok: false, error: error.message };
    }

    await logEmail(input, recipients, "sent", data?.id);
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmail(input, recipients, "failed", undefined, message);
    return { ok: false, error: message };
  }
}

export interface BulkMessage {
  /** genau ein Empfänger pro Nachricht (kein gemeinsames BCC → Datenschutz) */
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendBulkResult {
  ok: boolean;
  sent: number;
  failed: { to: string; error: string }[];
  /** gesetzt, wenn der Versand grundsätzlich nicht laufen konnte (z.B. kein Key) */
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Versendet viele personalisierte E-Mails über die Resend-Batch-API – je
 * Empfänger eine eigene Nachricht (eigenes HTML / eigener List-Unsubscribe-Link).
 * Sendet in 100er-Chunks mit `batchValidation: "permissive"`, damit gültige
 * Adressen durchgehen, auch wenn einzelne fehlerhaft sind. Protokolliert das
 * Ergebnis aggregiert in `EmailLog`. Wirft nicht.
 */
export async function sendBulk(
  messages: BulkMessage[],
  opts?: { templateKey?: string }
): Promise<SendBulkResult> {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    return {
      ok: false,
      sent: 0,
      failed: messages.map((m) => ({ to: m.to, error: "Resend nicht konfiguriert" })),
      error: "Resend ist nicht konfiguriert (RESEND_API_KEY / RESEND_FROM_EMAIL fehlt).",
    };
  }
  if (messages.length === 0) return { ok: true, sent: 0, failed: [] };

  const CHUNK = 100;
  let sent = 0;
  const failed: { to: string; error: string }[] = [];

  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    const payload = chunk.map((m) => ({
      from,
      to: [m.to],
      subject: m.subject,
      html: m.html,
      ...(m.replyTo ? { replyTo: m.replyTo } : {}),
      ...(m.headers ? { headers: m.headers } : {}),
    }));

    try {
      const { data, error } = await resend.batch.send(payload, {
        batchValidation: "permissive",
      });
      if (error) {
        for (const m of chunk) failed.push({ to: m.to, error: error.message });
        continue;
      }
      // Im permissive-Modus liefert Resend pro fehlgeschlagener Nachricht
      // { index, message } in `errors`; alle übrigen gelten als versendet.
      const errors =
        (data as { errors?: { index: number; message: string }[] } | null)?.errors ?? [];
      for (const e of errors) {
        failed.push({ to: chunk[e.index]?.to ?? "?", error: e.message });
      }
      sent += chunk.length - errors.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const m of chunk) failed.push({ to: m.to, error: message });
    }

    // sanftes Throttling zwischen den Chunks
    if (i + CHUNK < messages.length) await sleep(500);
  }

  // Aggregiertes Log (eine Zeile pro Bulk-Aufruf, nicht pro Empfänger).
  try {
    await prisma.emailLog.create({
      data: {
        templateKey: opts?.templateKey ?? null,
        empfaenger: `${messages.length} Empfänger (${sent} ok, ${failed.length} Fehler)`,
        betreff: messages[0]?.subject ?? "",
        provider: "resend",
        status: failed.length === 0 ? "sent" : sent > 0 ? "sent" : "failed",
        fehlerText:
          failed.length > 0
            ? failed
                .slice(0, 10)
                .map((f) => `${f.to}: ${f.error}`)
                .join("\n")
            : null,
      },
    });
  } catch (err) {
    console.error("[email] EmailLog (bulk) konnte nicht geschrieben werden:", err);
  }

  return { ok: sent > 0 && failed.length === 0, sent, failed };
}

/**
 * Versendet viele personalisierte E-Mails MIT Datei-Anhängen – die
 * Resend-Batch-API unterstützt keine Anhänge, deshalb je Empfänger ein
 * einzelner Send mit sanftem Throttling (Resend-Limit: 2 Requests/Sekunde).
 * Die Anhänge sind für alle Empfänger identisch. Protokolliert das Ergebnis
 * aggregiert in `EmailLog` (eine Zeile pro Aufruf). Wirft nicht.
 */
export async function sendBulkWithAttachments(
  messages: BulkMessage[],
  attachments: { filename: string; content: Buffer | string }[],
  opts?: { templateKey?: string }
): Promise<SendBulkResult> {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!resend || !from) {
    return {
      ok: false,
      sent: 0,
      failed: messages.map((m) => ({ to: m.to, error: "Resend nicht konfiguriert" })),
      error: "Resend ist nicht konfiguriert (RESEND_API_KEY / RESEND_FROM_EMAIL fehlt).",
    };
  }
  if (messages.length === 0) return { ok: true, sent: 0, failed: [] };

  let sent = 0;
  const failed: { to: string; error: string }[] = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    try {
      const { error } = await resend.emails.send({
        from,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        ...(m.replyTo ? { replyTo: m.replyTo } : {}),
        ...(m.headers ? { headers: m.headers } : {}),
        ...(attachments.length > 0 ? { attachments } : {}),
      });
      if (error) {
        failed.push({ to: m.to, error: error.message });
      } else {
        sent++;
      }
    } catch (err) {
      failed.push({ to: m.to, error: err instanceof Error ? err.message : String(err) });
    }
    if (i + 1 < messages.length) await sleep(600);
  }

  try {
    await prisma.emailLog.create({
      data: {
        templateKey: opts?.templateKey ?? null,
        empfaenger: `${messages.length} Empfänger (${sent} ok, ${failed.length} Fehler)`,
        betreff: messages[0]?.subject ?? "",
        provider: "resend",
        status: failed.length === 0 ? "sent" : sent > 0 ? "sent" : "failed",
        fehlerText:
          failed.length > 0
            ? failed
                .slice(0, 10)
                .map((f) => `${f.to}: ${f.error}`)
                .join("\n")
            : null,
      },
    });
  } catch (err) {
    console.error("[email] EmailLog (bulk) konnte nicht geschrieben werden:", err);
  }

  return { ok: sent > 0 && failed.length === 0, sent, failed };
}

async function logEmail(
  input: SendEmailInput,
  recipients: string[],
  status: "sent" | "failed",
  providerId?: string,
  fehlerText?: string
): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        templateKey: input.templateKey ?? null,
        empfaenger: recipients.join(", "),
        betreff: input.subject,
        provider: "resend",
        status,
        providerId: providerId ?? null,
        fehlerText: fehlerText ?? null,
      },
    });
  } catch (err) {
    // Logging darf den Versand nie blockieren.
    console.error("[email] EmailLog konnte nicht geschrieben werden:", err);
  }
}
