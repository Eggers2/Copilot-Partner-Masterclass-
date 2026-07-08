import { prisma } from "@/lib/prisma";
import type { ParsedAnwesenheit } from "@/lib/termine/anwesenheit";
import { normalizeAnwesenheitEmail } from "@/lib/termine/anwesenheit";

/**
 * Ersetzt den Anwesenheitsbericht eines Termins komplett (erneuter Upload
 * überschreibt den alten Stand) und aktualisiert die Metadaten am Termin.
 */
export async function replaceTerminAnwesenheit(
  terminId: string,
  dateiname: string,
  rows: ParsedAnwesenheit[]
) {
  await prisma.$transaction([
    prisma.terminAnwesenheit.deleteMany({ where: { terminId } }),
    prisma.terminAnwesenheit.createMany({
      data: rows.map((r) => ({
        terminId,
        name: r.name,
        email: r.email,
        rolle: r.rolle,
        dauerSekunden: r.dauerSekunden,
        ersterBeitritt: r.ersterBeitritt,
        letztesVerlassen: r.letztesVerlassen,
      })),
    }),
    prisma.klasseTermin.update({
      where: { id: terminId },
      data: {
        anwesenheitDateiname: dateiname,
        anwesenheitImportiertAm: new Date(),
      },
    }),
  ]);
}

/** Entfernt den Anwesenheitsbericht eines Termins vollständig. */
export async function clearTerminAnwesenheit(terminId: string) {
  await prisma.$transaction([
    prisma.terminAnwesenheit.deleteMany({ where: { terminId } }),
    prisma.klasseTermin.update({
      where: { id: terminId },
      data: { anwesenheitDateiname: null, anwesenheitImportiertAm: null },
    }),
  ]);
}

export interface AnwesenheitZeile {
  name: string;
  email: string;
  rolle: string | null;
  dauerSekunden: number;
  /** true = E-Mail ist als Teilnehmer/Besteller der Klasse bekannt. */
  registriert: boolean;
}

export interface TerminAnwesenheitView {
  terminId: string;
  datum: Date;
  thema: string | null;
  dateiname: string;
  importiertAm: Date;
  gesamt: number;
  registriert: number;
  /** Anwesende, deren E-Mail NICHT in der Teilnehmerübersicht steht. */
  unbekannt: AnwesenheitZeile[];
  zeilen: AnwesenheitZeile[];
}

export interface RankingEintrag {
  name: string;
  email: string;
  firma: string;
  /** Anzahl Termine (mit Bericht), an denen die Person anwesend war. */
  anwesend: number;
}

export interface UnbekannterTeilnehmer {
  name: string;
  email: string;
  termine: number;
}

export interface KlasseAnwesenheitAuswertung {
  /** Anzahl Termine mit hochgeladenem Bericht (= Nenner der Rangliste). */
  berichte: number;
  proTermin: TerminAnwesenheitView[];
  top: RankingEintrag[];
  bottom: RankingEintrag[];
  /** Über alle Termine: unbekannte Anwesende (nicht in der Teilnehmerübersicht). */
  unbekannte: UnbekannterTeilnehmer[];
}

const RANKING_SIZE = 20;

/**
 * Komplette Anwesenheits-Auswertung einer Klasse:
 * - pro Termin: Gesamtzahl, Abgleich gegen die im Shop gemeldeten Teilnehmer
 *   (BestellungTeilnehmer) plus Besteller-Kontakte (Bestellung.email),
 * - Rangliste der registrierten Teilnehmer (Top/Bottom 20 nach Präsenz),
 * - Liste unbekannter Anwesender (deutlicher Hinweis auf weitergegebene Links).
 */
export async function getKlasseAnwesenheitAuswertung(
  klasseId: string
): Promise<KlasseAnwesenheitAuswertung> {
  const [termine, teilnehmer, bestellungen] = await Promise.all([
    prisma.klasseTermin.findMany({
      where: { klasseId, anwesenheitImportiertAm: { not: null } },
      orderBy: { datum: "asc" },
      select: {
        id: true,
        datum: true,
        thema: true,
        anwesenheitDateiname: true,
        anwesenheitImportiertAm: true,
        anwesenheiten: {
          orderBy: { dauerSekunden: "desc" },
          select: {
            name: true,
            email: true,
            rolle: true,
            dauerSekunden: true,
          },
        },
      },
    }),
    prisma.bestellungTeilnehmer.findMany({
      where: { bestellung: { klasseId } },
      select: {
        vorname: true,
        nachname: true,
        email: true,
        bestellung: { select: { firma: true } },
      },
    }),
    prisma.bestellung.findMany({
      where: { klasseId },
      select: { email: true },
    }),
  ]);

  // Whitelist: gemeldete Teilnehmer + Besteller-Kontakte. Besteller zählen
  // beim Abgleich als bekannt (sie dürfen zuhören), tauchen aber nur in der
  // Rangliste auf, wenn sie selbst als Teilnehmer gemeldet sind.
  const bekannt = new Set<string>();
  for (const b of bestellungen) {
    const n = normalizeAnwesenheitEmail(b.email ?? "");
    if (n) bekannt.add(n);
  }

  // Registrierte Teilnehmer, dedupliziert nach E-Mail (Basis der Rangliste).
  const registrierte = new Map<string, { name: string; firma: string }>();
  for (const t of teilnehmer) {
    const email = normalizeAnwesenheitEmail(t.email ?? "");
    if (!email) continue;
    bekannt.add(email);
    if (!registrierte.has(email)) {
      const name = `${t.vorname} ${t.nachname}`.trim() || email;
      registrierte.set(email, { name, firma: t.bestellung.firma });
    }
  }

  const praesenz = new Map<string, number>();
  const unbekannteMap = new Map<string, UnbekannterTeilnehmer>();

  const proTermin: TerminAnwesenheitView[] = termine.map((t) => {
    const zeilen: AnwesenheitZeile[] = t.anwesenheiten.map((a) => ({
      name: a.name,
      email: a.email,
      rolle: a.rolle,
      dauerSekunden: a.dauerSekunden,
      registriert: !!a.email && bekannt.has(a.email),
    }));

    for (const z of zeilen) {
      if (z.email && registrierte.has(z.email)) {
        praesenz.set(z.email, (praesenz.get(z.email) ?? 0) + 1);
      }
      if (!z.registriert) {
        const key = z.email || `name:${z.name.toLowerCase()}`;
        const entry = unbekannteMap.get(key);
        if (entry) entry.termine += 1;
        else unbekannteMap.set(key, { name: z.name, email: z.email, termine: 1 });
      }
    }

    const unbekannt = zeilen.filter((z) => !z.registriert);
    return {
      terminId: t.id,
      datum: t.datum,
      thema: t.thema,
      dateiname: t.anwesenheitDateiname ?? "",
      importiertAm: t.anwesenheitImportiertAm as Date,
      gesamt: zeilen.length,
      registriert: zeilen.length - unbekannt.length,
      unbekannt,
      zeilen,
    };
  });

  // Rangliste über alle registrierten Teilnehmer – auch die mit 0 Präsenzen,
  // damit die Bottom-Liste Nichtnutzer sichtbar macht.
  const ranking: RankingEintrag[] = [...registrierte.entries()].map(
    ([email, info]) => ({
      name: info.name,
      email,
      firma: info.firma,
      anwesend: praesenz.get(email) ?? 0,
    })
  );

  const byName = (a: RankingEintrag, b: RankingEintrag) =>
    a.name.localeCompare(b.name, "de");
  const top = [...ranking]
    .sort((a, b) => b.anwesend - a.anwesend || byName(a, b))
    .slice(0, RANKING_SIZE);
  const bottom = [...ranking]
    .sort((a, b) => a.anwesend - b.anwesend || byName(a, b))
    .slice(0, RANKING_SIZE);

  return {
    berichte: termine.length,
    proTermin,
    top,
    bottom,
    unbekannte: [...unbekannteMap.values()].sort((a, b) => b.termine - a.termine),
  };
}
