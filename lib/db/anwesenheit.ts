import { prisma } from "@/lib/prisma";
import type { ParsedAnwesenheit } from "@/lib/termine/anwesenheit";
import { normalizeAnwesenheitEmail } from "@/lib/termine/anwesenheit";
import {
  createTeilnehmerAbgleich,
  type AbgleichStatus,
  type TeilnehmerAbgleich,
} from "@/lib/termine/abgleich";

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

// ─── Ignorierliste (Moderatoren/Sponsoren) ───────────────────────────────────
// Adressen, die in den Teams-Terminen auftauchen dürfen, ohne als Abweichung
// gemeldet zu werden (Moderator, Co-Moderator, Sponsor). Im Admin unter
// „Anwesenheit & KPI“ pflegbar; gespeichert als AppSetting (eine Adresse pro
// Zeile), damit die Liste für alle Klassen gilt.

export const ANWESENHEIT_IGNORIERLISTE_KEY = "anwesenheit_ignorierte_emails";

/** Startbelegung, solange im Admin noch nichts gespeichert wurde. */
const DEFAULT_IGNORIERLISTE = [
  "ae@next-skills.de", // Alexander Eggers (Moderator)
  "michael.greth@teamx.de", // Michael Greth (Co-Moderator)
  "thomas.kwasnitza@adn.de", // Thomas Kwasnitza (ADN, Sponsor)
];

export async function getAnwesenheitIgnorierliste(): Promise<string[]> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: ANWESENHEIT_IGNORIERLISTE_KEY },
  });
  const raw = setting?.value;
  if (raw == null) return DEFAULT_IGNORIERLISTE;
  return raw
    .split(/[\n;,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function setAnwesenheitIgnorierliste(emails: string[]) {
  const value = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
    .sort()
    .join("\n");
  await prisma.appSetting.upsert({
    where: { key: ANWESENHEIT_IGNORIERLISTE_KEY },
    create: { key: ANWESENHEIT_IGNORIERLISTE_KEY, value },
    update: { value },
  });
}

// ─── Auswertung ──────────────────────────────────────────────────────────────

export interface AnwesenheitZeile {
  name: string;
  email: string;
  rolle: string | null;
  dauerSekunden: number;
  /**
   * Ergebnis des intelligenten Abgleichs (lib/termine/abgleich.ts):
   * registriert = als Teilnehmer/Besteller erkannt (auch bei abweichender
   * E-Mail über den Namen), ignoriert = Moderator/Sponsor von der
   * Ignorierliste, unbekannt = deutlicher Hinweis nötig.
   */
  status: AbgleichStatus;
}

export interface TerminAnwesenheitView {
  terminId: string;
  datum: Date;
  thema: string | null;
  dateiname: string;
  importiertAm: Date;
  gesamt: number;
  registriert: number;
  ignoriert: number;
  /** Anwesende, die keinem Teilnehmer zugeordnet werden konnten. */
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

export interface FirmenStatistik {
  firma: string;
  /** Anzahl registrierter Teilnehmer der Firma. */
  teilnehmer: number;
  /** Summe wahrgenommener Termin-Teilnahmen über alle Mitarbeiter. */
  anwesend: number;
  /** Mögliche Teilnahmen = Teilnehmer × Termine mit Bericht. */
  moeglich: number;
  /** Teilnahmequote in Prozent (0–100). */
  quote: number;
}

export interface KlasseAnwesenheitAuswertung {
  /** Anzahl Termine mit hochgeladenem Bericht (= Nenner der Rangliste). */
  berichte: number;
  proTermin: TerminAnwesenheitView[];
  top: RankingEintrag[];
  bottom: RankingEintrag[];
  /** Über alle Termine: unbekannte Anwesende (nicht in der Teilnehmerübersicht). */
  unbekannte: UnbekannterTeilnehmer[];
  /** Firmen/Partner mit einer Teilnahmequote unter 50 % (inaktive Partner). */
  inaktiveFirmen: FirmenStatistik[];
  /** Aktuelle Ignorierliste (für die Pflege im Admin). */
  ignorierliste: string[];
}

const RANKING_SIZE = 20;

/**
 * Lädt Teilnehmerübersicht + Ignorierliste einer Klasse und baut daraus den
 * Abgleich. Auch von der Upload-Action genutzt (Sofort-Feedback).
 */
export async function createKlasseAbgleich(klasseId: string): Promise<{
  abgleich: TeilnehmerAbgleich;
  /** Registrierte Teilnehmer, dedupliziert nach E-Mail (Ranglisten-Basis). */
  registrierte: Map<string, { name: string; firma: string }>;
  ignorierliste: string[];
}> {
  const [teilnehmer, bestellungen, ignorierliste] = await Promise.all([
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
    getAnwesenheitIgnorierliste(),
  ]);

  const registrierte = new Map<string, { name: string; firma: string }>();
  const abgleichTeilnehmer: {
    vorname: string;
    nachname: string;
    email: string;
  }[] = [];
  for (const t of teilnehmer) {
    const email = normalizeAnwesenheitEmail(t.email ?? "");
    if (!email) continue;
    if (!registrierte.has(email)) {
      const name = `${t.vorname} ${t.nachname}`.trim() || email;
      registrierte.set(email, { name, firma: t.bestellung.firma });
      abgleichTeilnehmer.push({
        vorname: t.vorname,
        nachname: t.nachname,
        email,
      });
    }
  }

  // Besteller-Kontakte zählen beim Abgleich als bekannt (sie dürfen zuhören),
  // tauchen aber nur in der Rangliste auf, wenn sie selbst gemeldet sind.
  const bestellerEmails = bestellungen
    .map((b) => normalizeAnwesenheitEmail(b.email ?? ""))
    .filter(Boolean);

  const abgleich = createTeilnehmerAbgleich({
    registrierte: abgleichTeilnehmer,
    weitereBekannteEmails: bestellerEmails,
    ignorierteEmails: ignorierliste,
  });

  return { abgleich, registrierte, ignorierliste };
}

/**
 * Komplette Anwesenheits-Auswertung einer Klasse:
 * - pro Termin: Gesamtzahl und Abgleich gegen die im Shop gemeldeten
 *   Teilnehmer (intelligent: E-Mail, Name, E-Mail-Heuristik – siehe
 *   lib/termine/abgleich.ts) unter Berücksichtigung der Ignorierliste,
 * - Rangliste der registrierten Teilnehmer (Top/Bottom 20 nach Präsenz),
 * - Liste unbekannter Anwesender (deutlicher Hinweis auf weitergegebene Links).
 */
export async function getKlasseAnwesenheitAuswertung(
  klasseId: string
): Promise<KlasseAnwesenheitAuswertung> {
  const [termine, { abgleich, registrierte, ignorierliste }] = await Promise.all([
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
    createKlasseAbgleich(klasseId),
  ]);

  const praesenz = new Map<string, number>();
  const unbekannteMap = new Map<string, UnbekannterTeilnehmer>();

  const proTermin: TerminAnwesenheitView[] = termine.map((t) => {
    // Pro Termin zählt eine Person nur einmal, auch wenn mehrere
    // Berichts-Zeilen (z.B. zwei Geräte) auf denselben Teilnehmer matchen.
    const gezaehlt = new Set<string>();

    const zeilen: AnwesenheitZeile[] = t.anwesenheiten.map((a) => {
      const treffer = abgleich.match(a.name, a.email);
      if (treffer.teilnehmerEmail && !gezaehlt.has(treffer.teilnehmerEmail)) {
        gezaehlt.add(treffer.teilnehmerEmail);
        if (registrierte.has(treffer.teilnehmerEmail)) {
          praesenz.set(
            treffer.teilnehmerEmail,
            (praesenz.get(treffer.teilnehmerEmail) ?? 0) + 1
          );
        }
      }
      return {
        name: a.name,
        email: a.email,
        rolle: a.rolle,
        dauerSekunden: a.dauerSekunden,
        status: treffer.status,
      };
    });

    const unbekannt = zeilen.filter((z) => z.status === "unbekannt");
    for (const z of unbekannt) {
      const key = z.email || `name:${z.name.toLowerCase()}`;
      const entry = unbekannteMap.get(key);
      if (entry) entry.termine += 1;
      else unbekannteMap.set(key, { name: z.name, email: z.email, termine: 1 });
    }

    return {
      terminId: t.id,
      datum: t.datum,
      thema: t.thema,
      dateiname: t.anwesenheitDateiname ?? "",
      importiertAm: t.anwesenheitImportiertAm as Date,
      gesamt: zeilen.length,
      registriert: zeilen.filter((z) => z.status === "registriert").length,
      ignoriert: zeilen.filter((z) => z.status === "ignoriert").length,
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

  // Teilnahmequote pro Firma/Partner über alle Mitarbeiter: Firmen unter 50 %
  // machen inaktive Partner sichtbar.
  const firmen = new Map<string, { teilnehmer: number; anwesend: number }>();
  for (const [email, info] of registrierte) {
    const key = info.firma.trim() || "(ohne Firma)";
    const eintrag = firmen.get(key) ?? { teilnehmer: 0, anwesend: 0 };
    eintrag.teilnehmer += 1;
    eintrag.anwesend += praesenz.get(email) ?? 0;
    firmen.set(key, eintrag);
  }
  const inaktiveFirmen: FirmenStatistik[] =
    termine.length === 0
      ? []
      : [...firmen.entries()]
          .map(([firma, f]) => {
            const moeglich = f.teilnehmer * termine.length;
            return {
              firma,
              teilnehmer: f.teilnehmer,
              anwesend: f.anwesend,
              moeglich,
              quote: moeglich > 0 ? Math.round((f.anwesend / moeglich) * 100) : 0,
            };
          })
          .filter((f) => f.quote < 50)
          .sort(
            (a, b) => a.quote - b.quote || a.firma.localeCompare(b.firma, "de")
          );

  return {
    berichte: termine.length,
    proTermin,
    top,
    bottom,
    unbekannte: [...unbekannteMap.values()].sort((a, b) => b.termine - a.termine),
    inaktiveFirmen,
    ignorierliste,
  };
}
