import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** Zufälliges, URL-sicheres Geheimnis mit Präfix (Präfix hilft beim Erkennen in Logs). */
export function randomSecret(prefix: string, bytes = 32): string {
  return `${prefix}${randomBytes(bytes).toString("base64url")}`;
}

/** SHA-256 als Hex. Es werden ausschließlich Hashes gespeichert, nie Klartext. */
export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** PKCE S256: BASE64URL(SHA256(code_verifier)) muss der code_challenge entsprechen. */
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(codeVerifier)) return false;
  const computed = createHash("sha256").update(codeVerifier, "ascii").digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  return a.length === b.length && timingSafeEqual(a, b);
}
