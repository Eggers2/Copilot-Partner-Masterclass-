import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

// Protokoll abgewiesener und verdächtiger Anmeldungen (Tabelle
// anmeldung_schutz_log). Zusätzlich eine Zeile im Railway-Log. Schreibt nie
// die volle E-Mail oder IP, nur Domain und einen gesalzenen Hash.

export type SchutzGrund =
  | "rate_limit"
  | "honeypot"
  | "zeitfalle_ungueltig"
  | "zu_schnell"
  | "formular_abgelaufen"
  | "pflichtfelder"
  | "email_ungueltig"
  | "wegwerf_domain"
  | "turnstile"
  | "turnstile_stoerung"
  | "bereits_vorhanden"
  | "verdacht_quarantaene";

export function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.CUSTOMER_SESSION_SECRET ?? "";
  return createHash("sha256").update(`anmeldeschutz:${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function clientIp(headers: Headers): string | null {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
}

export async function protokolliere(eintrag: {
  endpunkt: string;
  grund: SchutzGrund;
  ip: string | null;
  emailDomain?: string | null;
  details?: string | null;
}): Promise<void> {
  const hash = ipHash(eintrag.ip);
  const domain = eintrag.emailDomain?.slice(0, 255) ?? null;
  const details = eintrag.details?.slice(0, 1000) ?? null;
  console.warn(
    `[anmeldeschutz] endpunkt=${eintrag.endpunkt} grund=${eintrag.grund} ip=${hash ?? "-"} domain=${domain ?? "-"}${details ? ` details=${details}` : ""}`
  );
  try {
    await prisma.anmeldungSchutzLog.create({
      data: { endpunkt: eintrag.endpunkt, grund: eintrag.grund, ipHash: hash, emailDomain: domain, details },
    });
  } catch (err) {
    console.error("[anmeldeschutz] Protokoll konnte nicht gespeichert werden:", err);
  }
}

/** Löscht Protokolleinträge älter als 90 Tage. Läuft im stündlichen Cron. */
export async function bereinigeSchutzLog(jetzt: Date = new Date()): Promise<number> {
  const grenze = new Date(jetzt.getTime() - 90 * 24 * 60 * 60 * 1000);
  const { count } = await prisma.anmeldungSchutzLog.deleteMany({ where: { createdAt: { lt: grenze } } });
  return count;
}
