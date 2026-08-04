import { prisma } from "@/lib/prisma";
import { signToken, verifyToken } from "@/lib/newsletter/tokens";
import type {
  Bestellung,
  BestellungTeilnehmer,
  Klasse,
  UmfrageRunde,
} from "@prisma/client";

/**
 * Tokens der Stand-Abfrage: dünner Wrapper um das HMAC-Modul der
 * Newsletter-Tokens (eine einzige Sign/Verify-Implementierung im Projekt).
 *
 * Persönliches Token: `rundeId:teilnehmerId` (cuid enthält keinen Doppelpunkt).
 * Klassen-Token (QR-Folie): nur `rundeId`; ein Token je Runde, nicht je Klasse,
 * damit der QR-Code einer alten Folie automatisch stirbt.
 *
 * Kein gespeichertes Expiry: Gültigkeit wird bei jedem Request gegen den
 * Runden-Status geprüft (nur OFFEN ist gültig).
 */

export function signSlotToken(rundeId: string, teilnehmerId: number): string {
  return signToken("umfrage-slot", `${rundeId}:${teilnehmerId}`);
}

export function parseSlotToken(
  raw: string | undefined | null
): { rundeId: string; teilnehmerId: number } | null {
  const value = verifyToken("umfrage-slot", raw);
  if (!value) return null;
  const idx = value.lastIndexOf(":");
  if (idx <= 0) return null;
  const rundeId = value.slice(0, idx);
  const teilnehmerId = Number.parseInt(value.slice(idx + 1), 10);
  if (!Number.isInteger(teilnehmerId) || teilnehmerId <= 0) return null;
  return { rundeId, teilnehmerId };
}

export function signKlasseToken(rundeId: string): string {
  return signToken("umfrage-klasse", rundeId);
}

export function parseKlasseToken(raw: string | undefined | null): { rundeId: string } | null {
  const value = verifyToken("umfrage-klasse", raw);
  if (!value) return null;
  return { rundeId: value };
}

// ─── Token + DB-Validierung ──────────────────────────────────────────────────

export type RundeMitKlasse = UmfrageRunde & { klasse: Klasse };
export type TeilnehmerMitBestellung = BestellungTeilnehmer & { bestellung: Bestellung };

export type SlotTokenErgebnis =
  | { ok: true; runde: RundeMitKlasse; teilnehmer: TeilnehmerMitBestellung }
  | { ok: false; grund: "ungueltig" | "beendet" };

/**
 * Löst ein persönliches Token vollständig auf: Signatur, Runde, Platz.
 * Ein Platz ist nur gültig, wenn er belegt ist (E-Mail gesetzt), zur Klasse
 * der Runde gehört und nicht zu einer internen Bestellung zählt.
 */
export async function resolveSlotToken(raw: string): Promise<SlotTokenErgebnis> {
  const parsed = parseSlotToken(raw);
  if (!parsed) return { ok: false, grund: "ungueltig" };

  const runde = await prisma.umfrageRunde.findUnique({
    where: { id: parsed.rundeId },
    include: { klasse: true },
  });
  if (!runde) return { ok: false, grund: "ungueltig" };

  const teilnehmer = await prisma.bestellungTeilnehmer.findUnique({
    where: { id: parsed.teilnehmerId },
    include: { bestellung: true },
  });
  if (
    !teilnehmer ||
    teilnehmer.email.trim() === "" ||
    teilnehmer.bestellung.intern ||
    teilnehmer.bestellung.klasseId !== runde.klasseId
  ) {
    return { ok: false, grund: "ungueltig" };
  }

  if (runde.status !== "OFFEN") return { ok: false, grund: "beendet" };
  return { ok: true, runde, teilnehmer };
}

export type KlasseTokenErgebnis =
  | { ok: true; runde: RundeMitKlasse }
  | { ok: false; grund: "ungueltig" | "beendet" };

export async function resolveKlasseToken(raw: string): Promise<KlasseTokenErgebnis> {
  const parsed = parseKlasseToken(raw);
  if (!parsed) return { ok: false, grund: "ungueltig" };

  const runde = await prisma.umfrageRunde.findUnique({
    where: { id: parsed.rundeId },
    include: { klasse: true },
  });
  if (!runde) return { ok: false, grund: "ungueltig" };
  if (runde.status !== "OFFEN") return { ok: false, grund: "beendet" };
  return { ok: true, runde };
}
