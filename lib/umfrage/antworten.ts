import { prisma } from "@/lib/prisma";
import { NAECHSTER_SCHRITT, NAECHSTER_SCHRITT_TECHNIK, ROLLEN } from "./fragen";
import { resolveKlasseToken, resolveSlotToken } from "./tokens";
import { sendeRueckschrittMail } from "./versand";
import type { TeilnehmerRolle, RotierendeAntwort, UmfrageKanal } from "@prisma/client";

/**
 * Speichert eine Antwort der Stand-Abfrage (Upsert je Platz und Runde) und
 * berechnet das Sofort-Ergebnis. Der Server ist Quelle der Wahrheit: Token
 * wird re-verifiziert, der Kanal aus dem Token-Typ abgeleitet, alle Werte
 * werden serverseitig validiert.
 */

const ROTIERENDE_WERTE: RotierendeAntwort[] = ["JA", "NEIN_GEPLANT", "NEIN", "NICHT_RELEVANT"];

export interface AntwortInput {
  token: string;
  /** nur beim Klassen-Token: der im Namepicker gewählte Platz */
  teilnehmerId?: number;
  rolle?: string;
  stufe?: number | null;
  techStufe?: number | null;
  blocker?: number;
  blockerStufe?: number | null;
  blockerSuche?: string | null;
  rotierend?: string;
  anonym?: string | null;
}

export interface ErgebnisView {
  technik: boolean;
  eigeneStufe: number;
  /** Antwortanzahl je Stufe: Länge 10 (Roadmap) oder 5 (Technik) */
  verteilung: number[];
  antwortenGesamt: number;
  naechsterSchrittSatz: string;
}

export type SpeichernErgebnis =
  | { ok: true; ergebnis: ErgebnisView }
  | { ok: false; error: string; status: number };

function fehler(error: string, status = 400): SpeichernErgebnis {
  return { ok: false, error, status };
}

export async function speichereAntwort(
  input: AntwortInput,
  baseUrl: string
): Promise<SpeichernErgebnis> {
  // 1. Token auflösen: erst persönlich, dann Klassen-Token (QR-Weg).
  let kanal: UmfrageKanal;
  let runde;
  let teilnehmer;

  const slot = await resolveSlotToken(input.token);
  if (slot.ok) {
    kanal = "EMAIL";
    runde = slot.runde;
    teilnehmer = slot.teilnehmer;
  } else {
    if (slot.grund === "beendet") {
      return fehler("Diese Umfrage-Runde ist beendet.", 410);
    }
    const klasse = await resolveKlasseToken(input.token);
    if (!klasse.ok) {
      return fehler(
        klasse.grund === "beendet"
          ? "Diese Umfrage-Runde ist beendet."
          : "Dieser Link ist nicht mehr gültig.",
        410
      );
    }
    kanal = "KLASSE";
    runde = klasse.runde;
    const teilnehmerId = Number(input.teilnehmerId);
    if (!Number.isInteger(teilnehmerId) || teilnehmerId <= 0) {
      return fehler("Bitte wähle deinen Namen aus.");
    }
    const t = await prisma.bestellungTeilnehmer.findUnique({
      where: { id: teilnehmerId },
      include: { bestellung: true },
    });
    if (
      !t ||
      t.email.trim() === "" ||
      t.bestellung.intern ||
      t.bestellung.klasseId !== runde.klasseId
    ) {
      return fehler("Dieser Platz gehört nicht zu dieser Klasse.");
    }
    teilnehmer = t;
  }

  // 2. Validierung.
  const rolle = ROLLEN.find((r) => r.wert === input.rolle)?.wert;
  if (!rolle) return fehler("Bitte wähle aus, womit du dich gerade beschäftigst.");

  let stufe: number | null = null;
  let techStufe: number | null = null;
  if (rolle === "TECHNIK") {
    techStufe = Number(input.techStufe);
    if (!Number.isInteger(techStufe) || techStufe < 0 || techStufe > 4) {
      return fehler("Bitte wähle deine Stufe auf der Technik-Leiter.");
    }
  } else {
    stufe = Number(input.stufe);
    if (!Number.isInteger(stufe) || stufe < 0 || stufe > 9) {
      return fehler("Bitte wähle deine Stufe auf der 90-Tage-Transformation-Roadmap.");
    }
  }

  const blocker = Number(input.blocker);
  if (!Number.isInteger(blocker) || blocker < 1 || blocker > 8) {
    return fehler("Bitte wähle aus, was dich gerade am stärksten bremst.");
  }

  let blockerStufe: number | null = null;
  if (blocker === 1) {
    blockerStufe = Number(input.blockerStufe);
    if (!Number.isInteger(blockerStufe) || blockerStufe < 1 || blockerStufe > 9) {
      return fehler("Bitte wähle, welcher konkrete Schritt liegen geblieben ist.");
    }
  }

  let blockerSuche: string | null = null;
  if (blocker === 7) {
    blockerSuche = String(input.blockerSuche ?? "").trim().slice(0, 300);
    if (!blockerSuche) return fehler("Bitte schreib kurz, was du gesucht hast.");
  }

  const rotierend = ROTIERENDE_WERTE.find((w) => w === input.rotierend);
  if (!rotierend) return fehler("Bitte beantworte noch die letzte Frage.");

  // 3. Upsert mit frischem Namens-Snapshot: letzter Schreibvorgang gewinnt,
  // egal über welchen Kanal.
  const daten = {
    vorname: teilnehmer.vorname,
    nachname: teilnehmer.nachname,
    email: teilnehmer.email,
    rolle: rolle as TeilnehmerRolle,
    stufe,
    techStufe,
    blocker,
    blockerStufe,
    blockerSuche,
    rotierend,
    kanal,
  };
  const antwort = await prisma.umfrageAntwort.upsert({
    where: { rundeId_teilnehmerId: { rundeId: runde.id, teilnehmerId: teilnehmer.id } },
    create: { rundeId: runde.id, teilnehmerId: teilnehmer.id, ...daten },
    update: daten,
  });

  // 4. Rolle am Platz persistieren (zuletzt gemeldete Rolle).
  await prisma.bestellungTeilnehmer.update({
    where: { id: teilnehmer.id },
    data: { rolle: rolle as TeilnehmerRolle },
  });

  // 5. Anonymes Feedback: eigener Insert ohne Personenbezug und Zeitstempel.
  const anonymText = String(input.anonym ?? "").trim().slice(0, 2000);
  if (anonymText) {
    await prisma.umfrageAnonymFeedback.create({
      data: { rundeId: runde.id, klasseId: runde.klasseId, text: anonymText },
    });
  }

  // 6. Rückschritt gegenüber der Vorrunde: sofortige Betreiber-Mail, genau
  // einmal je Antwort (Claim über rueckschrittGemeldetAm).
  if (stufe !== null && runde.nummer > 1) {
    const vorrunde = await prisma.umfrageRunde.findUnique({
      where: { klasseId_nummer: { klasseId: runde.klasseId, nummer: runde.nummer - 1 } },
    });
    const vorherige = vorrunde
      ? await prisma.umfrageAntwort.findUnique({
          where: {
            rundeId_teilnehmerId: { rundeId: vorrunde.id, teilnehmerId: teilnehmer.id },
          },
        })
      : null;
    if (vorherige?.stufe != null && stufe < vorherige.stufe) {
      const claim = await prisma.umfrageAntwort.updateMany({
        where: { id: antwort.id, rueckschrittGemeldetAm: null },
        data: { rueckschrittGemeldetAm: new Date() },
      });
      if (claim.count === 1) {
        await sendeRueckschrittMail({
          name: `${teilnehmer.vorname} ${teilnehmer.nachname}`.trim() || teilnehmer.email,
          firma: teilnehmer.bestellung.firma,
          klasseName: runde.klasse.name,
          klasseSlug: runde.klasse.slug,
          rundeNummer: runde.nummer,
          alteStufe: vorherige.stufe,
          neueStufe: stufe,
          baseUrl,
        }).catch((err) => console.error("[Umfrage] Rückschritt-Mail fehlgeschlagen:", err));
      }
    }
  }

  // 7. Sofort-Ergebnis.
  const ergebnis = await getErgebnisView(runde.id, { stufe, techStufe });
  return { ok: true, ergebnis };
}

/**
 * Klassenverteilung für die Rückgabe nach dem Absenden: absolute Zahlen je
 * Stufe (keine Quoten nötig, 8-Firmen-Regel damit unkritisch). Technik-
 * Antwortende sehen die Technik-Leiter-Verteilung.
 */
export async function getErgebnisView(
  rundeId: string,
  eigene: { stufe: number | null; techStufe: number | null }
): Promise<ErgebnisView> {
  const technik = eigene.techStufe !== null;
  if (technik) {
    const rows = await prisma.umfrageAntwort.findMany({
      where: { rundeId, techStufe: { not: null }, teilnehmer: { bestellung: { intern: false } } },
      select: { techStufe: true },
    });
    const verteilung = Array<number>(5).fill(0);
    for (const r of rows) verteilung[r.techStufe as number]++;
    const eigeneStufe = eigene.techStufe as number;
    return {
      technik: true,
      eigeneStufe,
      verteilung,
      antwortenGesamt: rows.length,
      naechsterSchrittSatz: NAECHSTER_SCHRITT_TECHNIK[eigeneStufe],
    };
  }

  const rows = await prisma.umfrageAntwort.findMany({
    where: { rundeId, stufe: { not: null }, teilnehmer: { bestellung: { intern: false } } },
    select: { stufe: true },
  });
  const verteilung = Array<number>(10).fill(0);
  for (const r of rows) verteilung[r.stufe as number]++;
  const eigeneStufe = eigene.stufe as number;
  return {
    technik: false,
    eigeneStufe,
    verteilung,
    antwortenGesamt: rows.length,
    naechsterSchrittSatz: NAECHSTER_SCHRITT[eigeneStufe],
  };
}
