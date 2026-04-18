import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { fireMagicLinkWebhook } from "@/lib/webhooks/magicLink";

const COOKIE_NAME = "kundenportal-session";
const TOKEN_TTL_MINUTES = 30;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

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

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signSession(email: string): string {
  const payload = b64url(Buffer.from(email.toLowerCase(), "utf8"));
  const sig = b64url(
    createHmac("sha256", getSessionSecret()).update(payload).digest()
  );
  return `${payload}.${sig}`;
}

function verifySession(raw: string | undefined): CustomerSession | null {
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
    const email = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    if (!email.includes("@")) return null;
    return { email };
  } catch {
    return null;
  }
}

export async function requestMagicLink(
  emailInput: string,
  baseUrl: string
): Promise<void> {
  const email = emailInput.trim().toLowerCase();
  if (!email.includes("@")) return;

  const bestandskunde = await prisma.bestellung.findFirst({
    where: { email },
    select: { id: true },
  });
  if (!bestandskunde) {
    // Kein Leak: wir tun so, als wäre alles ok — Response signalisiert dem Aufrufer nichts.
    return;
  }

  const rawToken = b64url(randomBytes(32));
  const tokenHash = sha256(rawToken);
  const ablaufAm = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.kundenMagicLink.create({
    data: { tokenHash, email, ablaufAm },
  });

  const cleanBase = baseUrl.replace(/\/$/, "");
  const linkUrl = `${cleanBase}/kundenportal/verify?token=${rawToken}`;

  fireMagicLinkWebhook({ email, linkUrl });
}

export async function verifyMagicLink(rawToken: string): Promise<
  { ok: true; email: string } | { ok: false; reason: "invalid" | "expired" | "used" }
> {
  if (!rawToken || rawToken.length < 10) return { ok: false, reason: "invalid" };
  const tokenHash = sha256(rawToken);
  const entry = await prisma.kundenMagicLink.findUnique({
    where: { tokenHash },
  });
  if (!entry) return { ok: false, reason: "invalid" };
  if (entry.eingeloest) return { ok: false, reason: "used" };
  if (entry.ablaufAm.getTime() < Date.now())
    return { ok: false, reason: "expired" };

  await prisma.kundenMagicLink.update({
    where: { id: entry.id },
    data: { eingeloest: true },
  });

  await setCustomerSession(entry.email);
  return { ok: true, email: entry.email };
}

export async function setCustomerSession(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signSession(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  return verifySession(raw);
}

export async function requireCustomerSession(): Promise<CustomerSession> {
  const session = await getCustomerSession();
  if (!session) redirect("/kundenportal");
  return session;
}

export async function clearCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
