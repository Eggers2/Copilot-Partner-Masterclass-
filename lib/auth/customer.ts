import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendOtpCodeViaWebhook } from "@/lib/webhooks/otpCode";

const SESSION_COOKIE_NAME = "kundenportal-session";
const PENDING_COOKIE_NAME = "kundenportal-otp-pending";
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const PENDING_TTL_SECONDS = 60 * 15; // 15 Min — etwas länger als der Code selbst
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 Tage
const PRODUCTION_BASE_URL = "https://www.copilotberater.de";

/**
 * Ermittelt die Basis-URL für absolute Redirects/Mails.
 * Priorität: APP_BASE_URL > x-forwarded-host > host. In Production wird ein
 * lokal wirkender Host (localhost/127.0.0.1) verworfen.
 */
export async function resolveAppBaseUrl(): Promise<string> {
  const envBase = process.env.APP_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";

  const looksLocal = !host || /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/i.test(host);
  if (looksLocal) {
    if (process.env.NODE_ENV === "production") return PRODUCTION_BASE_URL;
    return `${proto}://${host ?? "localhost:3000"}`;
  }

  return `${proto}://${host}`;
}

export interface CustomerSession {
  email: string;
}

function getSessionSecret(): string {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "CUSTOMER_SESSION_SECRET fehlt oder ist zu kurz (min. 16 Zeichen)."
    );
  }
  return secret;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signValue(value: string): string {
  const payload = b64url(Buffer.from(value.toLowerCase(), "utf8"));
  const sig = b64url(
    createHmac("sha256", getSessionSecret()).update(payload).digest()
  );
  return `${payload}.${sig}`;
}

function verifyValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = b64url(
    createHmac("sha256", getSessionSecret()).update(payload).digest()
  );
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const value = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    if (!value.includes("@")) return null;
    return value;
  } catch {
    return null;
  }
}

// ─── OTP-Code-Flow ──────────────────────────────────────────────────────────

export type RequestOtpResult =
  | { ok: true }
  | { ok: false; reason: "delivery_failed" };

/**
 * Erzeugt einen 6-stelligen OTP-Code für die angegebene E-Mail und versendet
 * ihn per n8n-Webhook. Gibt nach außen — abgesehen vom Zustellfehler — kein
 * Signal, ob die E-Mail bekannt ist (Anti-Enumeration).
 */
export async function requestOtpCode(emailInput: string): Promise<RequestOtpResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email.includes("@")) return { ok: true };

  const bestandskunde = await prisma.bestellung.findFirst({
    where: { email },
    select: { id: true },
  });
  if (!bestandskunde) {
    // Anti-Enumeration: gleicher Erfolgs-Pfad wie bei bekannter E-Mail.
    return { ok: true };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  const ablaufAm = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.kundenOtpCode.create({
    data: { codeHash, email, ablaufAm },
  });

  const sent = await sendOtpCodeViaWebhook({ email, code });
  if (!sent) return { ok: false, reason: "delivery_failed" };
  return { ok: true };
}

export type VerifyOtpResult =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "expired" | "used" | "too_many_attempts" };

/**
 * Prüft den eingegebenen Code gegen den jüngsten aktiven Code-Hash der E-Mail.
 * Bei Mismatch wird `fehlversuche` inkrementiert; ab `OTP_MAX_ATTEMPTS` wird
 * der Code invalidiert.
 */
export async function verifyOtpCode(
  emailInput: string,
  codeInput: string
): Promise<VerifyOtpResult> {
  const email = emailInput.trim().toLowerCase();
  const code = codeInput.trim();
  if (!/^[0-9]{6}$/.test(code)) return { ok: false, reason: "invalid" };

  const entry = await prisma.kundenOtpCode.findFirst({
    where: { email },
    orderBy: { erstelltAm: "desc" },
  });
  if (!entry) return { ok: false, reason: "invalid" };
  if (entry.eingeloest) return { ok: false, reason: "used" };
  if (entry.ablaufAm.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (entry.fehlversuche >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const matches = await bcrypt.compare(code, entry.codeHash);
  if (!matches) {
    const next = entry.fehlversuche + 1;
    await prisma.kundenOtpCode.update({
      where: { id: entry.id },
      data: {
        fehlversuche: next,
        // Nach dem letzten erlaubten Fehlversuch direkt entwerten,
        // damit selbst ein nachträglicher Treffer nicht mehr zählt.
        eingeloest: next >= OTP_MAX_ATTEMPTS,
      },
    });
    if (next >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
    return { ok: false, reason: "invalid" };
  }

  await prisma.kundenOtpCode.update({
    where: { id: entry.id },
    data: { eingeloest: true },
  });
  await setCustomerSession(email);
  return { ok: true, email };
}

// ─── Pending-Cookie (E-Mail zwischen Schritt 1 und 2 transportieren) ────────

export async function setOtpPendingCookie(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_COOKIE_NAME, signValue(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PENDING_TTL_SECONDS,
    path: "/",
  });
}

export async function getOtpPendingEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_COOKIE_NAME)?.value;
  return verifyValue(raw);
}

export async function clearOtpPendingCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_COOKIE_NAME);
}

// ─── Session ────────────────────────────────────────────────────────────────

export async function setCustomerSession(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signValue(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const email = verifyValue(raw);
  return email ? { email } : null;
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect("/kundenportal");
  return session;
}

export async function clearCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
