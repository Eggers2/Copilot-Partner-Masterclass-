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
