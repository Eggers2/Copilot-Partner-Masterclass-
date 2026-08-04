import { prisma } from "@/lib/prisma";
import { BLOCKER, MEILENSTEINE, ROLLEN, STUFEN } from "./fragen";
import { signSlotToken } from "./tokens";
import type { Jahreszeit, TeilnehmerRolle, UmfrageRundeStatus } from "@prisma/client";

/**
 * Auswertung der Stand-Abfrage. Harte Regeln aus der Vorgabe:
 * - Firmenzuordnung über die Bestellung, nie über die Mail-Domain.
 * - Quoten erst ab 8 Firmen in einer Zelle, darunter die absolute Zahl.
 * - Rücklauf ist keine Bindungskennzahl und wird nie mit Anwesenheit gemischt.
 * - Interne Bestellungen sind auf Query-Ebene ausgeschlossen.
 */

export const MIN_FIRMEN_FUER_QUOTE = 8;

/**
 * Zentrale Quoten-Formatierung: Prozent nur, wenn die Zelle mindestens 8
 * Firmen enthält, sonst "3 von 6". `firmenInZelle` default = nenner (für
 * Zellen, die selbst Firmen zählen).
 */
export function formatQuote(
  zaehler: number,
  nenner: number,
  firmenInZelle: number = nenner
): string {
  if (nenner === 0) return "0 von 0";
  if (firmenInZelle >= MIN_FIRMEN_FUER_QUOTE) {
    return `${Math.round((zaehler / nenner) * 100)} %`;
  }
  return `${zaehler} von ${nenner}`;
}

function median(werte: number[]): number | null {
  if (werte.length === 0) return null;
  const sorted = [...werte].sort((a, b) => a - b);
  const mitte = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mitte] : (sorted[mitte - 1] + sorted[mitte]) / 2;
}

/**
 * Referenz aus den alten Excel-Abfragen von Klasse 1 und 2, rückgerechnet auf
 * die Leiter. Als UNTERGRENZE gekennzeichnet (die Stufen 4 und 5 fehlten in
 * den alten Fragen). Vergleichsmaßstab für Klasse 3 und 4.
 */
export const BASELINE = [
  {
    label: "Referenz alte Umfragen (Untergrenze)",
    programmtag: 30,
    medianFirma: 2,
    meilenstein1: "42 %",
    meilenstein3: "0 %",
  },
  {
    label: "Referenz alte Umfragen (Untergrenze)",
    programmtag: 70,
    medianFirma: 6,
    meilenstein1: "76 %",
    meilenstein3: "32 %",
  },
] as const;

/** Divergenz-Schwelle: Programmtage gleicher Rundennummer > 14 Tage auseinander. */
export const PROGRAMMTAG_DIVERGENZ_TAGE = 14;

// ─── Runden-Auswertung je Klasse ─────────────────────────────────────────────

export interface AusnahmeEintrag {
  teilnehmerId: number;
  name: string;
  firma: string;
  email: string;
  telefon: string | null;
  link: string;
}

export interface FirmenZeile {
  firma: string;
  antworten: number;
  maxStufe: number;
  spannweite: number | null;
  lieferrisiko: boolean;
}

export interface RundenAuswertung {
  klasse: { id: string; name: string; slug: string; curriculumStand: string | null };
  runde: {
    id: string;
    nummer: number;
    status: UmfrageRundeStatus;
    stichtag: Date;
    programmtag: number;
    jahreszeit: Jahreszeit;
    rotierenderInhalt: string;
    versandAm: Date | null;
    erinnerungAm: Date | null;
  };
  rundenNummern: number[];
  empfaengerGesamt: number;
  antwortenGesamt: number;
  ausnahmeliste: AusnahmeEintrag[];
  kern: { median: number | null; verteilung: number[]; gesamt: number };
  technik: { verteilung: number[]; gesamt: number };
  meilensteine: { stufe: number; erreicht: number; firmenGesamt: number; quote: string }[];
  bewegung: {
    vergleichbar: number;
    vor: number;
    gleich: number;
    zurueck: number;
    rueckschritte: { name: string; firma: string; alt: number; neu: number }[];
  } | null;
  firmen: FirmenZeile[];
  blocker: { wert: number; label: string; anzahl: number }[];
  blockerStufen: { wert: number; label: string; anzahl: number }[];
  blockerSuchen: string[];
  rollen: { wert: TeilnehmerRolle; label: string; anzahl: number; istAlarm: boolean }[];
  alarmPersonen: { name: string; firma: string }[];
  anwendungsquote: {
    nummer: number;
    inhalt: string;
    ja: number;
    antworten: number;
    firmen: number;
    quote: string;
  }[];
  anonym: string[];
}

export async function getRundenAuswertung(
  klasseSlug: string,
  nummer: number | null,
  baseUrl: string
): Promise<RundenAuswertung | null> {
  const klasse = await prisma.klasse.findUnique({
    where: { slug: klasseSlug },
    select: { id: true, name: true, slug: true, curriculumStand: true },
  });
  if (!klasse) return null;

  const alleRunden = await prisma.umfrageRunde.findMany({
    where: { klasseId: klasse.id },
    orderBy: { nummer: "asc" },
  });
  if (alleRunden.length === 0) return null;

  const runde =
    (nummer !== null ? alleRunden.find((r) => r.nummer === nummer) : null) ??
    alleRunden[alleRunden.length - 1];

  // Alle belegten, nicht-internen Plätze der Klasse (Empfängermenge).
  const plaetze = await prisma.bestellungTeilnehmer.findMany({
    where: { email: { not: "" }, bestellung: { klasseId: klasse.id, intern: false } },
    include: { bestellung: { select: { firma: true, telefon: true } } },
    orderBy: { id: "asc" },
  });

  const antworten = await prisma.umfrageAntwort.findMany({
    where: { rundeId: runde.id, teilnehmer: { bestellung: { intern: false } } },
    include: { teilnehmer: { include: { bestellung: { select: { firma: true } } } } },
  });
  const antwortIds = new Set(antworten.map((a) => a.teilnehmerId));

  // Ausnahmeliste: Non-Responder für den Anruf (keine weitere Mail).
  const ausnahmeliste: AusnahmeEintrag[] = plaetze
    .filter((p) => !antwortIds.has(p.id))
    .map((p) => ({
      teilnehmerId: p.id,
      name: `${p.vorname} ${p.nachname}`.trim() || p.email,
      firma: p.bestellung.firma.trim(),
      email: p.email,
      telefon: p.bestellung.telefon,
      link: `${baseUrl}/umfrage/${signSlotToken(runde.id, p.id)}`,
    }));

  // Kernstufen-Verteilung + Median (nur Roadmap-Leiter).
  const kernAntworten = antworten.filter((a) => a.stufe !== null);
  const kernVerteilung = Array<number>(10).fill(0);
  for (const a of kernAntworten) kernVerteilung[a.stufe as number]++;

  // Technik-Leiter separat.
  const technikAntworten = antworten.filter((a) => a.techStufe !== null);
  const technikVerteilung = Array<number>(5).fill(0);
  for (const a of technikAntworten) technikVerteilung[a.techStufe as number]++;

  // Firmenebene: Max-Stufe + Spannweite (nur bei >= 2 Stufen-Antworten).
  const stufenJeFirma = new Map<string, number[]>();
  for (const a of kernAntworten) {
    const firma = a.teilnehmer.bestellung.firma.trim();
    if (!stufenJeFirma.has(firma)) stufenJeFirma.set(firma, []);
    stufenJeFirma.get(firma)!.push(a.stufe as number);
  }
  const firmen: FirmenZeile[] = [...stufenJeFirma.entries()]
    .map(([firma, stufen]) => {
      const max = Math.max(...stufen);
      const spannweite = stufen.length >= 2 ? max - Math.min(...stufen) : null;
      return {
        firma,
        antworten: stufen.length,
        maxStufe: max,
        spannweite,
        lieferrisiko: spannweite !== null && spannweite > 4,
      };
    })
    .sort((a, b) => b.maxStufe - a.maxStufe);

  // Meilensteine: Anteil der Firmen mit Firmen-Max-Stufe >= 2 / 5 / 7.
  const firmenGesamt = firmen.length;
  const meilensteine = MEILENSTEINE.map((stufe) => {
    const erreicht = firmen.filter((f) => f.maxStufe >= stufe).length;
    return { stufe, erreicht, firmenGesamt, quote: formatQuote(erreicht, firmenGesamt) };
  });

  // Bewegung gegenüber der Vorrunde (Join über den Platz, nur Kernstufe).
  let bewegung: RundenAuswertung["bewegung"] = null;
  const vorrunde = alleRunden.find((r) => r.nummer === runde.nummer - 1);
  if (vorrunde) {
    const vorherige = await prisma.umfrageAntwort.findMany({
      where: {
        rundeId: vorrunde.id,
        stufe: { not: null },
        teilnehmer: { bestellung: { intern: false } },
      },
      select: { teilnehmerId: true, stufe: true },
    });
    const vorherigeStufe = new Map(vorherige.map((a) => [a.teilnehmerId, a.stufe as number]));
    let vor = 0;
    let gleich = 0;
    const rueckschritte: NonNullable<RundenAuswertung["bewegung"]>["rueckschritte"] = [];
    let vergleichbar = 0;
    for (const a of kernAntworten) {
      const alt = vorherigeStufe.get(a.teilnehmerId);
      if (alt === undefined) continue;
      vergleichbar++;
      const neu = a.stufe as number;
      if (neu > alt) vor++;
      else if (neu === alt) gleich++;
      else {
        rueckschritte.push({
          name: `${a.vorname} ${a.nachname}`.trim() || a.email,
          firma: a.teilnehmer.bestellung.firma.trim(),
          alt,
          neu,
        });
      }
    }
    bewegung = { vergleichbar, vor, gleich, zurueck: rueckschritte.length, rueckschritte };
  }

  // Blocker-Verteilung + Folgefragen. Mehrfachauswahl: eine Person kann in
  // mehreren Kategorien zählen, die Summe kann daher über der Antwortzahl liegen.
  const blocker = BLOCKER.map((b) => ({
    ...b,
    anzahl: antworten.filter((a) => a.blocker.includes(b.wert)).length,
  }));
  const blockerStufen = STUFEN.filter((s) => s.wert >= 1).map((s) => ({
    ...s,
    anzahl: antworten.filter((a) => a.blockerStufe === s.wert).length,
  }));
  const blockerSuchen = antworten
    .map((a) => a.blockerSuche)
    .filter((s): s is string => !!s && s.trim() !== "");

  // Rollen-Verteilung; WEISS_NICHT ist ein Alarm und wird namentlich gelistet.
  const rollen = ROLLEN.map((r) => ({
    ...r,
    anzahl: antworten.filter((a) => a.rolle === r.wert).length,
  }));
  const alarmPersonen = antworten
    .filter((a) => a.rolle === "WEISS_NICHT")
    .map((a) => ({
      name: `${a.vorname} ${a.nachname}`.trim() || a.email,
      firma: a.teilnehmer.bestellung.firma.trim(),
    }));

  // Anwendungsquote der rotierenden Frage als Zeitreihe über alle Runden.
  const alleAntworten = await prisma.umfrageAntwort.findMany({
    where: {
      runde: { klasseId: klasse.id },
      teilnehmer: { bestellung: { intern: false } },
    },
    select: {
      rundeId: true,
      rotierend: true,
      teilnehmer: { select: { bestellung: { select: { firma: true } } } },
    },
  });
  const anwendungsquote = alleRunden.map((r) => {
    const inRunde = alleAntworten.filter((a) => a.rundeId === r.id);
    const ja = inRunde.filter((a) => a.rotierend === "JA").length;
    const firmenInRunde = new Set(inRunde.map((a) => a.teilnehmer.bestellung.firma.trim()))
      .size;
    return {
      nummer: r.nummer,
      inhalt: r.rotierenderInhalt,
      ja,
      antworten: inRunde.length,
      firmen: firmenInRunde,
      quote: formatQuote(ja, inRunde.length, firmenInRunde),
    };
  });

  const anonym = (
    await prisma.umfrageAnonymFeedback.findMany({
      where: { rundeId: runde.id },
      select: { text: true },
    })
  ).map((f) => f.text);

  return {
    klasse,
    runde: {
      id: runde.id,
      nummer: runde.nummer,
      status: runde.status,
      stichtag: runde.stichtag,
      programmtag: runde.programmtag,
      jahreszeit: runde.jahreszeit,
      rotierenderInhalt: runde.rotierenderInhalt,
      versandAm: runde.versandAm,
      erinnerungAm: runde.erinnerungAm,
    },
    rundenNummern: alleRunden.map((r) => r.nummer),
    empfaengerGesamt: plaetze.length,
    antwortenGesamt: antworten.length,
    ausnahmeliste,
    kern: { median: median(kernAntworten.map((a) => a.stufe as number)), verteilung: kernVerteilung, gesamt: kernAntworten.length },
    technik: { verteilung: technikVerteilung, gesamt: technikAntworten.length },
    meilensteine,
    bewegung,
    firmen,
    blocker,
    blockerStufen,
    blockerSuchen,
    rollen,
    alarmPersonen,
    anwendungsquote,
    anonym,
  };
}

// ─── Kohortenvergleich (nur Runde N gegen Runde N) ──────────────────────────

export interface KohortenZeile {
  klasse: { name: string; slug: string; curriculumStand: string | null };
  hatRunde: boolean;
  programmtag: number | null;
  jahreszeit: Jahreszeit | null;
  medianPerson: number | null;
  medianFirma: number | null;
  meilensteine: string[];
  anwendung: string | null;
  ruecklauf: string | null;
  ausnahmen: number | null;
  divergenz: boolean;
}

export interface KohortenVergleich {
  nummer: number;
  maxNummer: number;
  zeilen: KohortenZeile[];
}

/**
 * Vergleichstabelle Runde N über alle Klassen mit mindestens einer Runde.
 * Kalenderdaten kommen bewusst nicht vor; divergieren die Programmtage zweier
 * Klassen bei gleicher Rundennummer um mehr als 14 Tage, wird die Zeile
 * markiert.
 */
export async function getKohortenVergleich(
  nummer: number | null,
  baseUrl: string
): Promise<KohortenVergleich | null> {
  const maxNummerAgg = await prisma.umfrageRunde.aggregate({ _max: { nummer: true } });
  const maxNummer = maxNummerAgg._max.nummer ?? 0;
  if (maxNummer === 0) return null;

  const n = nummer !== null && nummer >= 1 && nummer <= maxNummer ? nummer : maxNummer;

  const klassen = await prisma.klasse.findMany({
    where: { umfrageRunden: { some: {} } },
    orderBy: { startDate: "asc" },
    select: { id: true, name: true, slug: true, curriculumStand: true },
  });

  const zeilen: KohortenZeile[] = [];
  for (const klasse of klassen) {
    const auswertung = await getRundenAuswertung(klasse.slug, n, baseUrl);
    const hatRunde = !!auswertung && auswertung.runde.nummer === n;
    if (!auswertung || !hatRunde) {
      zeilen.push({
        klasse,
        hatRunde: false,
        programmtag: null,
        jahreszeit: null,
        medianPerson: null,
        medianFirma: null,
        meilensteine: [],
        anwendung: null,
        ruecklauf: null,
        ausnahmen: null,
        divergenz: false,
      });
      continue;
    }
    const firmenMax = auswertung.firmen.map((f) => f.maxStufe);
    const eintrag = auswertung.anwendungsquote.find((a) => a.nummer === n);
    zeilen.push({
      klasse,
      hatRunde: true,
      programmtag: auswertung.runde.programmtag,
      jahreszeit: auswertung.runde.jahreszeit,
      medianPerson: auswertung.kern.median,
      medianFirma: median(firmenMax),
      meilensteine: auswertung.meilensteine.map((m) => m.quote),
      anwendung: eintrag?.quote ?? null,
      ruecklauf: formatQuote(
        auswertung.antwortenGesamt,
        auswertung.empfaengerGesamt,
        auswertung.firmen.length
      ),
      ausnahmen: auswertung.ausnahmeliste.length,
      divergenz: false,
    });
  }

  // Divergenz-Flag: Programmtag weicht um mehr als 14 Tage vom Median der
  // übrigen Klassen mit dieser Rundennummer ab.
  const tage = zeilen.filter((z) => z.programmtag !== null).map((z) => z.programmtag as number);
  if (tage.length >= 2) {
    const ref = median(tage) as number;
    for (const z of zeilen) {
      if (z.programmtag !== null && Math.abs(z.programmtag - ref) > PROGRAMMTAG_DIVERGENZ_TAGE) {
        z.divergenz = true;
      }
    }
  }

  return { nummer: n, maxNummer, zeilen };
}

// ─── Übersicht (Einstiegsseite) ──────────────────────────────────────────────

export interface UmfrageUebersichtZeile {
  klasse: { name: string; slug: string };
  letzteRunde: {
    nummer: number;
    status: UmfrageRundeStatus;
    programmtag: number;
    versandAm: Date | null;
  } | null;
  empfaenger: number;
  antworten: number;
  ausnahmen: number;
}

export async function getUmfrageUebersicht(): Promise<UmfrageUebersichtZeile[]> {
  const klassen = await prisma.klasse.findMany({
    where: { status: { notIn: ["PLANNED"] } },
    orderBy: { startDate: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const zeilen: UmfrageUebersichtZeile[] = [];
  for (const klasse of klassen) {
    const letzte = await prisma.umfrageRunde.findFirst({
      where: { klasseId: klasse.id },
      orderBy: { nummer: "desc" },
      include: { _count: { select: { antworten: true } } },
    });
    const empfaenger = await prisma.bestellungTeilnehmer.count({
      where: { email: { not: "" }, bestellung: { klasseId: klasse.id, intern: false } },
    });
    zeilen.push({
      klasse: { name: klasse.name, slug: klasse.slug },
      letzteRunde: letzte
        ? {
            nummer: letzte.nummer,
            status: letzte.status,
            programmtag: letzte.programmtag,
            versandAm: letzte.versandAm,
          }
        : null,
      empfaenger,
      antworten: letzte?._count.antworten ?? 0,
      ausnahmen: letzte ? Math.max(0, empfaenger - letzte._count.antworten) : 0,
    });
  }
  return zeilen;
}
