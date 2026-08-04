import { prisma } from "@/lib/prisma";
import type { ParsedAnwesenheit } from "@/lib/termine/anwesenheit";
import { normalizeAnwesenheitEmail } from "@/lib/termine/anwesenheit";
import {
  createTeilnehmerAbgleich,
  type AbgleichStatus,
  type TeilnehmerAbgleich,
} from "@/lib/termine/abgleich";
import {
  getKursFortschrittStand,
  type KursFortschrittImportMeta,
} from "@/lib/db/kursFortschritt";

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
  /**
   * Anteil gesehener Videos des Kurses in Prozent (0–100);
   * null = die Person taucht im Videokurs-Export nicht auf.
   */
  video: number | null;
}

export interface UnbekannterTeilnehmer {
  name: string;
  email: string;
  termine: number;
}

export interface FirmenMitarbeiter {
  name: string;
  email: string;
  /** Anzahl Termine (mit Bericht), an denen die Person anwesend war. */
  anwesend: number;
  /** Videokurs-Fortschritt in Prozent; null = nicht im Kurs-Export. */
  video: number | null;
}

export interface BestellerKontakt {
  name: string;
  email: string;
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
  /**
   * Durchschnittlicher Videokurs-Fortschritt (0–100) über die Mitarbeiter mit
   * Kurs-Daten; null = niemand der Firma taucht im Kurs-Export auf.
   */
  videoQuote: number | null;
  /** Mitarbeiter ohne Eintrag im Kurs-Export (nicht in videoQuote enthalten). */
  ohneVideoDaten: number;
  /**
   * Kombinierter Engagement-Score (0–100): Mittel aus Teilnahmequote und
   * Video-Fortschritt; ohne Video-Daten entspricht er der Teilnahmequote.
   */
  engagement: number;
  /** Alle registrierten Mitarbeiter mit ihrer Präsenz (für die Erinnerungs-Mail). */
  mitarbeiter: FirmenMitarbeiter[];
  /** Besteller-Kontakte der Firma (Empfänger der Erinnerungs-Mail). */
  besteller: BestellerKontakt[];
}

export interface KlasseAnwesenheitAuswertung {
  /** Anzahl Termine mit hochgeladenem Bericht (= Nenner der Rangliste). */
  berichte: number;
  proTermin: TerminAnwesenheitView[];
  top: RankingEintrag[];
  bottom: RankingEintrag[];
  /** Über alle Termine: unbekannte Anwesende (nicht in der Teilnehmerübersicht). */
  unbekannte: UnbekannterTeilnehmer[];
  /**
   * Wenig engagierte Firmen/Partner: Teilnahmequote oder Videokurs-Fortschritt
   * unter 50 %, sortiert nach Engagement-Score (die schwächsten zuerst).
   */
  inaktiveFirmen: FirmenStatistik[];
  /** Aktuelle Ignorierliste (für die Pflege im Admin). */
  ignorierliste: string[];
  /** Anzahl registrierter Teilnehmer der Klasse (dedupliziert nach E-Mail). */
  teilnehmerGesamt: number;
  /** Metadaten des letzten Videokurs-Imports; null = noch keiner hochgeladen. */
  kursImport: KursFortschrittImportMeta | null;
  /** Kurs-Einträge, die Teilnehmern dieser Klasse zugeordnet werden konnten. */
  kursZugeordnet: number;
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
  /** Besteller-Kontakte je Firma (dedupliziert nach E-Mail). */
  bestellerByFirma: Map<string, BestellerKontakt[]>;
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
      select: { firma: true, vorname: true, nachname: true, email: true },
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
  const bestellerEmails: string[] = [];
  const bestellerByFirma = new Map<string, BestellerKontakt[]>();
  for (const b of bestellungen) {
    const email = normalizeAnwesenheitEmail(b.email ?? "");
    if (!email) continue;
    bestellerEmails.push(email);
    const firma = b.firma.trim() || "(ohne Firma)";
    const kontakte = bestellerByFirma.get(firma) ?? [];
    if (!kontakte.some((k) => k.email === email)) {
      kontakte.push({
        name: `${b.vorname} ${b.nachname}`.trim() || email,
        email,
      });
    }
    bestellerByFirma.set(firma, kontakte);
  }

  const abgleich = createTeilnehmerAbgleich({
    registrierte: abgleichTeilnehmer,
    weitereBekannteEmails: bestellerEmails,
    ignorierteEmails: ignorierliste,
  });

  return { abgleich, registrierte, bestellerByFirma, ignorierliste };
}

/**
 * Komplette Anwesenheits-Auswertung einer Klasse:
 * - pro Termin: Gesamtzahl und Abgleich gegen die im Shop gemeldeten
 *   Teilnehmer (intelligent: E-Mail, Name, E-Mail-Heuristik – siehe
 *   lib/termine/abgleich.ts) unter Berücksichtigung der Ignorierliste,
 * - Rangliste der registrierten Teilnehmer (Top/Bottom 20 nach Präsenz),
 * - Liste unbekannter Anwesender (deutlicher Hinweis auf weitergegebene Links),
 * - Videokurs-Fortschritt je Teilnehmer/Firma aus dem ablefy-Export.
 */
export async function getKlasseAnwesenheitAuswertung(
  klasseId: string
): Promise<KlasseAnwesenheitAuswertung> {
  const [
    termine,
    { abgleich, registrierte, bestellerByFirma, ignorierliste },
    kursStand,
  ] = await Promise.all([
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
    getKursFortschrittStand(),
  ]);

  // Videokurs-Fortschritt den registrierten Teilnehmern zuordnen – derselbe
  // intelligente Abgleich wie beim Teams-Bericht (E-Mail, Name, Heuristik),
  // damit abweichende Adressen im Kurs-Export trotzdem matchen. Einträge
  // anderer Klassen bleiben unberücksichtigt (der Export ist global).
  const videoByTeilnehmer = new Map<string, number>();
  for (const eintrag of kursStand.eintraege) {
    const treffer = abgleich.match(eintrag.name, eintrag.email);
    const key = treffer.teilnehmerEmail;
    if (!key || !registrierte.has(key)) continue;
    const bisher = videoByTeilnehmer.get(key);
    if (bisher === undefined || eintrag.fortschritt > bisher) {
      videoByTeilnehmer.set(key, eintrag.fortschritt);
    }
  }

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
      video: videoByTeilnehmer.get(email) ?? null,
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

  // Engagement pro Firma/Partner über alle Mitarbeiter: Firmen mit unter 50 %
  // Teilnahmequote ODER unter 50 % Videokurs-Fortschritt machen wenig
  // engagierte Partner sichtbar; sortiert nach kombiniertem Engagement-Score.
  // Mitarbeiter ohne Eintrag im Kurs-Export fließen nicht in den Video-
  // Durchschnitt ein (sie werden separat gezählt). Mitarbeiter-Details und
  // Besteller-Kontakte werden für die Erinnerungs-Mail mitgeliefert.
  const firmen = new Map<string, FirmenMitarbeiter[]>();
  for (const [email, info] of registrierte) {
    const key = info.firma.trim() || "(ohne Firma)";
    const liste = firmen.get(key) ?? [];
    liste.push({
      name: info.name,
      email,
      anwesend: praesenz.get(email) ?? 0,
      video: videoByTeilnehmer.get(email) ?? null,
    });
    firmen.set(key, liste);
  }
  const inaktiveFirmen: FirmenStatistik[] =
    termine.length === 0
      ? []
      : [...firmen.entries()]
          .map(([firma, mitarbeiter]) => {
            const anwesend = mitarbeiter.reduce((sum, m) => sum + m.anwesend, 0);
            const moeglich = mitarbeiter.length * termine.length;
            const quote =
              moeglich > 0 ? Math.round((anwesend / moeglich) * 100) : 0;
            const mitVideo = mitarbeiter.filter((m) => m.video !== null);
            const videoQuote =
              mitVideo.length > 0
                ? Math.round(
                    mitVideo.reduce((sum, m) => sum + (m.video ?? 0), 0) /
                      mitVideo.length
                  )
                : null;
            return {
              firma,
              teilnehmer: mitarbeiter.length,
              anwesend,
              moeglich,
              quote,
              videoQuote,
              ohneVideoDaten: mitarbeiter.length - mitVideo.length,
              engagement:
                videoQuote === null
                  ? quote
                  : Math.round((quote + videoQuote) / 2),
              mitarbeiter: [...mitarbeiter].sort(
                (a, b) =>
                  b.anwesend - a.anwesend || a.name.localeCompare(b.name, "de")
              ),
              besteller: bestellerByFirma.get(firma) ?? [],
            };
          })
          .filter(
            (f) => f.quote < 50 || (f.videoQuote !== null && f.videoQuote < 50)
          )
          .sort(
            (a, b) =>
              a.engagement - b.engagement || a.firma.localeCompare(b.firma, "de")
          );

  return {
    berichte: termine.length,
    proTermin,
    top,
    bottom,
    unbekannte: [...unbekannteMap.values()].sort((a, b) => b.termine - a.termine),
    inaktiveFirmen,
    ignorierliste,
    teilnehmerGesamt: registrierte.size,
    kursImport: kursStand.meta,
    kursZugeordnet: videoByTeilnehmer.size,
  };
}
