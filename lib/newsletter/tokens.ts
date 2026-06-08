import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signierte, zweckgebundene Tokens für öffentliche Newsletter-Aktionen ohne
 * Login (Freigabe-Link, Abmelde-Link). Gleiches HMAC-Muster wie die
 * Session-Cookies in `lib/auth/customer.ts`, aber generisch: der `purpose` ist
 * Teil der signierten Nutzlast, damit ein Abmelde-Token nicht als Freigabe-Token
 * (oder umgekehrt) missbraucht werden kann.
 */
export type TokenPurpose = "approve" | "unsub";

function getSecret(): string {
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

/** Signiert `${purpose}:${value}` und liefert `payload.signature` (beide base64url). */
export function signToken(purpose: TokenPurpose, value: string): string {
  const payload = b64url(Buffer.from(`${purpose}:${value}`, "utf8"));
  const sig = b64url(createHmac("sha256", getSecret()).update(payload).digest());
  return `${payload}.${sig}`;
}

/**
 * Prüft Signatur und Zweck. Gibt bei Erfolg den ursprünglichen `value` zurück
 * (z.B. die Newsletter-ID oder die – kleingeschriebene – E-Mail), sonst `null`.
 */
export function verifyToken(
  purpose: TokenPurpose,
  raw: string | undefined | null
): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  const expected = b64url(
    createHmac("sha256", getSecret()).update(payload).digest()
  );
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
  } catch {
    return null;
  }

  const prefix = `${purpose}:`;
  if (!decoded.startsWith(prefix)) return null;
  const value = decoded.slice(prefix.length);
  return value.length > 0 ? value : null;
}
