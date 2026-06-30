import { prisma } from "@/lib/prisma";
import type { Klasse } from "@prisma/client";

export class NoOpenKlasseError extends Error {
  constructor() {
    super(
      "Keine offene Klasse mit freier Kapazität verfügbar. Bitte im Admin eine Klasse auf 'Offen' setzen."
    );
    this.name = "NoOpenKlasseError";
  }
}

/**
 * Belegung einer Klasse = Anzahl Bestellungen mit dieser klasseId.
 */
export async function getKlasseBelegung(klasseId: string): Promise<number> {
  return prisma.bestellung.count({ where: { klasseId } });
}

/**
 * Liefert true, wenn die Klasse eine Kapazität hat und diese erreicht ist.
 */
export async function isKlasseFull(klasse: Pick<Klasse, "id" | "capacity">): Promise<boolean> {
  if (klasse.capacity == null) return false;
  const belegung = await getKlasseBelegung(klasse.id);
  return belegung >= klasse.capacity;
}

/**
 * Gibt die nächste freie Klasse zurück, in die eine neue Bestellung
 * automatisch zugewiesen werden kann.
 *
 * Regel:
 *   - status = OPEN
 *   - aufsteigend nach kickoffDate
 *   - capacity NULL oder belegung < capacity
 *
 * Wirft NoOpenKlasseError, wenn keine geeignete Klasse existiert.
 */
export async function getNextOpenKlasse(): Promise<Klasse> {
  const candidates = await prisma.klasse.findMany({
    where: { status: "OPEN" },
    orderBy: { kickoffDate: "asc" },
  });

  for (const klasse of candidates) {
    if (klasse.capacity == null) return klasse;
    const belegung = await getKlasseBelegung(klasse.id);
    if (belegung < klasse.capacity) return klasse;
  }

  throw new NoOpenKlasseError();
}

/**
 * Liefert alle Klassen mit Belegungsstatistik – für Admin-Dropdowns + Listen.
 */
export async function listKlassenMitBelegung() {
  const klassen = await prisma.klasse.findMany({
    orderBy: { kickoffDate: "asc" },
  });
  const counts = await prisma.bestellung.groupBy({
    by: ["klasseId"],
    _count: { id: true },
  });
  const countMap = new Map(counts.map((c) => [c.klasseId, c._count.id]));

  return klassen.map((k) => ({
    ...k,
    belegung: countMap.get(k.id) ?? 0,
    isFull: k.capacity != null && (countMap.get(k.id) ?? 0) >= k.capacity,
  }));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string | null {
  const clean = email.trim().toLowerCase();
  if (!clean || !EMAIL_RE.test(clean)) return null;
  return clean;
}

/**
 * Liefert alle Teilnehmer-E-Mails einer Klasse, dedupliziert und sortiert.
 * Umfasst die einzelnen Teilnehmer-Plätze (BestellungTeilnehmer) sowie den
 * Besteller-Kontakt (Bestellung.email) – analog zu getMasterclassRecipients,
 * aber auf eine Klasse eingegrenzt. Für den Export in neue Termine.
 */
export async function getKlasseTeilnehmerEmails(
  klasseId: string
): Promise<string[]> {
  const [bestellungen, teilnehmer] = await Promise.all([
    prisma.bestellung.findMany({
      where: { klasseId },
      select: { email: true },
    }),
    prisma.bestellungTeilnehmer.findMany({
      where: { bestellung: { klasseId } },
      select: { email: true },
    }),
  ]);

  const set = new Set<string>();
  for (const b of bestellungen) {
    const n = normalizeEmail(b.email ?? "");
    if (n) set.add(n);
  }
  for (const t of teilnehmer) {
    const n = normalizeEmail(t.email ?? "");
    if (n) set.add(n);
  }
  return [...set].sort();
}
