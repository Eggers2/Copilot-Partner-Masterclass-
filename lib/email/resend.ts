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
