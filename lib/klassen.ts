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

  // Termin-Statistik pro Klasse: gesamt, durchgeführt und nächster anstehender Termin.
  const terminCounts = await prisma.klasseTermin.groupBy({
    by: ["klasseId", "status"],
    _count: { id: true },
  });
  const terminTotal = new Map<string, number>();
  const terminDone = new Map<string, number>();
  for (const tc of terminCounts) {
    terminTotal.set(tc.klasseId, (terminTotal.get(tc.klasseId) ?? 0) + tc._count.id);
    if (tc.status === "DURCHGEFUEHRT") {
      terminDone.set(tc.klasseId, (terminDone.get(tc.klasseId) ?? 0) + tc._count.id);
    }
  }

  const upcoming = await prisma.klasseTermin.findMany({
    where: { datum: { gte: new Date() } },
    orderBy: { datum: "asc" },
    select: { klasseId: true, datum: true, thema: true },
  });
  const nextTermin = new Map<string, { datum: Date; thema: string | null }>();
  for (const t of upcoming) {
    if (!nextTermin.has(t.klasseId)) {
      nextTermin.set(t.klasseId, { datum: t.datum, thema: t.thema });
    }
  }

  return klassen.map((k) => ({
    ...k,
    belegung: countMap.get(k.id) ?? 0,
    isFull: k.capacity != null && (countMap.get(k.id) ?? 0) >= k.capacity,
    termineGesamt: terminTotal.get(k.id) ?? 0,
    termineDurchgefuehrt: terminDone.get(k.id) ?? 0,
    naechsterTermin: nextTermin.get(k.id) ?? null,
  }));
}

/**
 * Kennzahlen der aktuell zur Bewerbung offenen Klasse – für den Platz-Zähler
 * auf der Landing Page. "belegt" = Anzahl Bestellungen dieser Klasse, also
 * dieselbe Zahl, die der Admin unter Klassen/Bestellungen als Belegung zeigt.
 *
 * Gezählt wird die Klasse, in die neue Bestellungen laufen: die erste offene
 * Klasse (status OPEN, nach Kickoff sortiert) mit freier Kapazität – dieselbe
 * Auswahl wie in getNextOpenKlasse(). Sind alle offenen Klassen voll, zählt die
 * jüngste; "20 von 20 vergeben" ist auf der Startseite die wichtigste Aussage.
 * So bleibt der Zähler korrekt, auch wenn ausgebuchte Altklassen noch auf OPEN
 * stehen.
 *
 * Fällt auf die übergebenen Werte zurück, wenn keine offene Klasse existiert
 * oder die DB nicht erreichbar ist. Die Startseite ist der Railway-Healthcheck
 * und darf an einer Kennzahl nie scheitern.
 */
export async function getOffeneKlasseBelegung(fallback: {
  capacity: number;
  belegt: number;
}): Promise<{ capacity: number; belegt: number }> {
  try {
    const offene = await prisma.klasse.findMany({
      where: { status: "OPEN" },
      orderBy: { kickoffDate: "asc" },
      select: { id: true, capacity: true },
    });
    if (offene.length === 0) return fallback;

    const counts = await prisma.bestellung.groupBy({
      by: ["klasseId"],
      where: { klasseId: { in: offene.map((k) => k.id) } },
      _count: { id: true },
    });
    const countMap = new Map(counts.map((c) => [c.klasseId, c._count.id]));
    const belegungVon = (k: { id: string }) => countMap.get(k.id) ?? 0;

    const klasse =
      offene.find((k) => k.capacity == null || belegungVon(k) < k.capacity) ??
      offene[offene.length - 1];

    return {
      capacity: klasse.capacity ?? fallback.capacity,
      belegt: belegungVon(klasse),
    };
  } catch (error) {
    console.error(
      "[landing] Belegung der offenen Klasse nicht ermittelbar – nutze Fallback:",
      error
    );
    return fallback;
  }
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
