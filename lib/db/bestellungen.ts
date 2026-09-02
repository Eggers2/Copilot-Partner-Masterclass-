import { prisma } from "@/lib/prisma";
import {
  PACKAGES,
  calculateMwst,
  getPreisNetto,
  getInvoicedPreisNetto,
  type PaketKey,
  type Zahlungsmodell,
  type AdnChannelKey,
} from "@/lib/packages";
import { fireBestellungWebhook } from "@/lib/webhooks/bestellung";
import { addActivity } from "@/lib/db/leads";
import { getNextOpenKlasse, NoOpenKlasseError } from "@/lib/klassen";

export async function getBestellungen() {
  return prisma.bestellung.findMany({
    orderBy: { erstelltAm: "desc" },
    include: {
      klasse: { select: { id: true, name: true, slug: true } },
      teilnehmer: {
        where: { email: { not: "" } },
        orderBy: { position: "asc" },
        select: {
          position: true,
          vorname: true,
          nachname: true,
          email: true,
          teamsEingeladenAm: true,
        },
      },
      _count: {
        select: {
          teilnehmer: {
            where: { email: { not: "" } },
          },
        },
      },
    },
  });
}

export async function deleteBestellung(id: number) {
  return prisma.bestellung.delete({ where: { id } });
}

export async function updateBestellungStatus(id: number, status: string) {
  return prisma.bestellung.update({
    where: { id },
    data: { status },
  });
}

export async function getShopKpis() {
  const [total, byStatus, byPaket, revenueAgg] = await Promise.all([
    prisma.bestellung.count(),
    prisma.bestellung.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.bestellung.groupBy({
      by: ["paket"],
      _count: { id: true },
    }),
    prisma.bestellung.aggregate({
      _sum: { preisNetto: true },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of byStatus) {
    statusMap[s.status] = s._count.id;
  }

  const paketMap: Record<string, number> = {};
  for (const p of byPaket) {
    paketMap[p.paket] = p._count.id;
  }

  return {
    total,
    neu: statusMap["neu"] ?? 0,
    bearbeitet: statusMap["bearbeitet"] ?? 0,
    abgeschlossen: statusMap["abgeschlossen"] ?? 0,
    revenueNetto: Number(revenueAgg._sum.preisNetto ?? 0),
    byPaket: paketMap,
  };
}

// ─── LEAD → BESTELLUNG BACKFILL ──────────────────────────────

const PLACEHOLDER = "—";

export type Confidence = "high" | "medium" | "low" | "ambiguous";
export type HintSource = "email" | "note-call" | "first-call-score" | "lead-notes";

export interface Evidence {
  source: HintSource;
  snippet: string;
  createdAt: string;
  paket: PaketKey | null;
  zahlungsmodell: Zahlungsmodell | null;
}

export interface DetectionResult {
  paket: PaketKey | null;
  zahlungsmodell: Zahlungsmodell | null;
  confidence: Confidence;
  evidence: Evidence[];
}

export class BestellungCreateError extends Error {
  constructor(
    public code: "ALREADY_EXISTS" | "NEEDS_REVIEW" | "LEAD_NOT_FOUND" | "NO_OPEN_KLASSE",
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "BestellungCreateError";
  }
}

// Nur öffentliche Pakete: interne Pakete (Single Trainer) werden bewusst nicht
// aus Notizen oder E-Mails erkannt, sie werden im Admin immer explizit gewählt.
const PAKET_REGEX = /\b(starter|team|business)\b/i;
const MONATLICH_REGEX = /\b(monatlich|monthly|pro\s*monat)\b/i;
const JAHRESABO_REGEX = /\b(jahresabo|j[aä]hrlich(?:es)?|yearly|annual)\b/i;

function snippetAround(text: string, match: RegExpMatchArray): string {
  const idx = match.index ?? 0;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + match[0].length + 40);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
}

function normalizePaket(value: string | null | undefined): PaketKey | null {
  if (!value) return null;
  const m = value.match(PAKET_REGEX);
  if (!m) return null;
  const key = m[1].toLowerCase() as PaketKey;
  return key in PACKAGES ? key : null;
}

function sourceRank(s: HintSource): number {
  return { email: 4, "note-call": 3, "first-call-score": 2, "lead-notes": 1 }[s];
}

function degrade(c: Confidence): Confidence {
  if (c === "high") return "medium";
  if (c === "medium") return "low";
  return "ambiguous";
}

function baseConfidence(s: HintSource): Confidence {
  if (s === "email") return "high";
  if (s === "note-call" || s === "first-call-score") return "medium";
  return "low";
}

function pickWinner<T extends string>(
  hits: { source: HintSource; value: T; createdAt: Date }[]
): { winner: { source: HintSource; value: T; createdAt: Date } | null; conflict: boolean } {
  if (hits.length === 0) return { winner: null, conflict: false };
  const sorted = [...hits].sort((a, b) => {
    const rankDiff = sourceRank(b.source) - sourceRank(a.source);
    if (rankDiff !== 0) return rankDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  const winner = sorted[0];
  const conflict = hits.some((h) => h.value !== winner.value);
  return { winner, conflict };
}

export async function detectBestellungFromLead(leadId: string): Promise<DetectionResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      firstCallScore: true,
    },
  });

  if (!lead) {
    throw new BestellungCreateError("LEAD_NOT_FOUND", `Lead ${leadId} nicht gefunden.`);
  }

  const evidence: Evidence[] = [];
  const paketHits: { source: HintSource; value: PaketKey; createdAt: Date }[] = [];
  const aboHits: { source: HintSource; value: Zahlungsmodell; createdAt: Date }[] = [];

  for (const a of lead.activities) {
    if (!["EMAIL", "NOTE", "CALL"].includes(a.type)) continue;
    const source: HintSource = a.type === "EMAIL" ? "email" : "note-call";

    const paketMatch = a.content.match(PAKET_REGEX);
    const aboMonat = a.content.match(MONATLICH_REGEX);
    const aboJahr = a.content.match(JAHRESABO_REGEX);
    const detectedPaket = paketMatch ? (paketMatch[1].toLowerCase() as PaketKey) : null;
    const detectedAbo: Zahlungsmodell | null = aboJahr ? "jahresabo" : aboMonat ? "monatlich" : null;

    if (!detectedPaket && !detectedAbo) continue;

    if (detectedPaket) paketHits.push({ source, value: detectedPaket, createdAt: a.createdAt });
    if (detectedAbo) aboHits.push({ source, value: detectedAbo, createdAt: a.createdAt });

    const trigger = paketMatch ?? aboJahr ?? aboMonat;
    evidence.push({
      source,
      snippet: trigger ? snippetAround(a.content, trigger) : a.content.slice(0, 100),
      createdAt: a.createdAt.toISOString(),
      paket: detectedPaket,
      zahlungsmodell: detectedAbo,
    });
  }

  if (lead.firstCallScore?.recommendedPackage) {
    const value = normalizePaket(lead.firstCallScore.recommendedPackage);
    if (value) {
      paketHits.push({
        source: "first-call-score",
        value,
        createdAt: lead.firstCallScore.calledAt,
      });
      evidence.push({
        source: "first-call-score",
        snippet: `First-Call-Empfehlung: ${lead.firstCallScore.recommendedPackage}`,
        createdAt: lead.firstCallScore.calledAt.toISOString(),
        paket: value,
        zahlungsmodell: null,
      });
    }
  }

  if (lead.notes) {
    const paketMatch = lead.notes.match(PAKET_REGEX);
    const aboMonat = lead.notes.match(MONATLICH_REGEX);
    const aboJahr = lead.notes.match(JAHRESABO_REGEX);
    const detectedPaket = paketMatch ? (paketMatch[1].toLowerCase() as PaketKey) : null;
    const detectedAbo: Zahlungsmodell | null = aboJahr ? "jahresabo" : aboMonat ? "monatlich" : null;

    if (detectedPaket || detectedAbo) {
      if (detectedPaket) paketHits.push({ source: "lead-notes", value: detectedPaket, createdAt: lead.updatedAt });
      if (detectedAbo) aboHits.push({ source: "lead-notes", value: detectedAbo, createdAt: lead.updatedAt });
      const trigger = paketMatch ?? aboJahr ?? aboMonat;
      evidence.push({
        source: "lead-notes",
        snippet: trigger ? snippetAround(lead.notes, trigger) : lead.notes.slice(0, 100),
        createdAt: lead.updatedAt.toISOString(),
        paket: detectedPaket,
        zahlungsmodell: detectedAbo,
      });
    }
  }

  const paketResult = pickWinner(paketHits);
  const aboResult = pickWinner(aboHits);

  const paket = paketResult.winner?.value ?? null;
  const zahlungsmodell = aboResult.winner?.value ?? null;

  let paketConfidence: Confidence = paketResult.winner
    ? baseConfidence(paketResult.winner.source)
    : "ambiguous";
  if (paketResult.conflict) paketConfidence = degrade(paketConfidence);

  let aboConfidence: Confidence = aboResult.winner
    ? baseConfidence(aboResult.winner.source)
    : "ambiguous";
  if (aboResult.conflict) aboConfidence = degrade(aboConfidence);

  const confidenceOrder: Confidence[] = ["ambiguous", "low", "medium", "high"];
  const overallConfidence: Confidence =
    paket === null || zahlungsmodell === null
      ? "ambiguous"
      : confidenceOrder[
          Math.min(
            confidenceOrder.indexOf(paketConfidence),
            confidenceOrder.indexOf(aboConfidence)
          )
        ];

  return { paket, zahlungsmodell, confidence: overallConfidence, evidence };
}

function splitName(name: string | null): { vorname: string; nachname: string } {
  if (!name || name.trim().length === 0) {
    return { vorname: PLACEHOLDER, nachname: PLACEHOLDER };
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { vorname: PLACEHOLDER, nachname: parts[0] };
  return { vorname: parts.slice(0, -1).join(" "), nachname: parts[parts.length - 1] };
}

export interface CreateResult {
  bestellNr: string;
  usedPlaceholders: string[];
  source: "heuristic" | "override";
  confidence: Confidence;
  evidence: Evidence[];
}

export interface CreateOverrides {
  paket?: PaketKey;
  zahlungsmodell?: Zahlungsmodell;
  adnChannel?: AdnChannelKey;
  klasseId?: string;
}

async function nextBestellNrNumber(prefix: string): Promise<number> {
  const last = await prisma.bestellung.findFirst({
    where: { bestellNr: { startsWith: prefix } },
    orderBy: { bestellNr: "desc" },
    select: { bestellNr: true },
  });
  if (!last) return 1;
  const match = last.bestellNr.slice(prefix.length).match(/^(\d+)/);
  return match ? parseInt(match[1], 10) + 1 : 1;
}

export async function hasBestellungForLead(leadId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { email: true },
  });
  if (!lead) return false;
  const existing = await prisma.bestellung.findFirst({
    where: { email: lead.email.toLowerCase() },
    select: { id: true },
  });
  return !!existing;
}

export async function createBestellungFromLead(
  leadId: string,
  overrides?: CreateOverrides
): Promise<CreateResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new BestellungCreateError("LEAD_NOT_FOUND", `Lead ${leadId} nicht gefunden.`);
  }

  const existing = await prisma.bestellung.findFirst({
    where: { email: lead.email.toLowerCase() },
    select: { bestellNr: true },
  });
  if (existing) {
    throw new BestellungCreateError(
      "ALREADY_EXISTS",
      `Für ${lead.email} existiert bereits Bestellung ${existing.bestellNr}.`,
      { bestellNr: existing.bestellNr }
    );
  }

  const detection = await detectBestellungFromLead(leadId);
  const hasOverride = !!(overrides?.paket || overrides?.zahlungsmodell);
  const source: "heuristic" | "override" = hasOverride ? "override" : "heuristic";

  const paket: PaketKey | null = overrides?.paket ?? detection.paket;
  const zahlungsmodell: Zahlungsmodell | null =
    overrides?.zahlungsmodell ?? detection.zahlungsmodell;

  if (source === "heuristic" && detection.confidence !== "high") {
    throw new BestellungCreateError(
      "NEEDS_REVIEW",
      `Heuristik unsicher (${detection.confidence}). Bitte Paket/Abo manuell bestätigen.`,
      detection
    );
  }

  if (!paket || !zahlungsmodell) {
    throw new BestellungCreateError(
      "NEEDS_REVIEW",
      "Paket oder Zahlungsmodell nicht eindeutig ermittelbar.",
      detection
    );
  }

  const { vorname: detectedVorname, nachname: detectedNachname } = splitName(lead.name);
  const firma = lead.company?.trim() || PLACEHOLDER;
  const strasse = lead.street?.trim() || PLACEHOLDER;
  const plz = lead.zip?.trim() || PLACEHOLDER;
  const ort = lead.city?.trim() || PLACEHOLDER;
  const vorname = detectedVorname;
  const nachname = detectedNachname;
  const land = "DE";

  const usedPlaceholders: string[] = [];
  if (firma === PLACEHOLDER) usedPlaceholders.push("firma");
  if (strasse === PLACEHOLDER) usedPlaceholders.push("strasse");
  if (plz === PLACEHOLDER) usedPlaceholders.push("plz");
  if (ort === PLACEHOLDER) usedPlaceholders.push("ort");
  if (vorname === PLACEHOLDER) usedPlaceholders.push("vorname");
  if (nachname === PLACEHOLDER) usedPlaceholders.push("nachname");

  // ADN-Kanal: Override hat Vorrang, sonst vom Lead übernehmen
  const adnChannel: AdnChannelKey = overrides?.adnChannel ?? lead.adnChannel ?? "NONE";

  // Klasse: Override hat Vorrang, sonst Auto-Assignment (Lead.klasseId wird bewusst NICHT
  // automatisch übernommen – Klasse muss bei Konvertierung explizit gewählt werden).
  let klasseId: string;
  if (overrides?.klasseId) {
    const exists = await prisma.klasse.findUnique({
      where: { id: overrides.klasseId },
      select: { id: true },
    });
    if (!exists) {
      throw new BestellungCreateError("NEEDS_REVIEW", "Die angegebene Klasse existiert nicht.");
    }
    klasseId = overrides.klasseId;
  } else {
    try {
      const next = await getNextOpenKlasse();
      klasseId = next.id;
    } catch (err) {
      if (err instanceof NoOpenKlasseError) {
        throw new BestellungCreateError("NO_OPEN_KLASSE", err.message);
      }
      throw err;
    }
  }

  const listPreisNetto = getPreisNetto(paket, zahlungsmodell);
  const preisNetto = getInvoicedPreisNetto(paket, zahlungsmodell, adnChannel);
  const pkg = PACKAGES[paket];
  const { mwstSatz, mwstBetrag, preisBrutto, reverseCharge, reverseChargeHinweis } =
    calculateMwst(land, undefined, preisNetto);

  let bestellNr = "";
  const year = new Date().getFullYear();
  const prefix = `NS-${year}-`;
  let nextNum = await nextBestellNrNumber(prefix);
  let retries = 10;
  while (retries > 0) {
    try {
      bestellNr = `${prefix}${String(nextNum).padStart(4, "0")}`;

      await prisma.bestellung.create({
        data: {
          bestellNr,
          paket,
          userAnzahl: pkg.users,
          zahlungsmodell,
          preisNetto,
          listPreisNetto,
          mwstSatz,
          mwstBetrag,
          reverseCharge,
          reverseChargeHinweis: reverseChargeHinweis || null,
          preisBrutto,
          firma,
          strasse,
          plz,
          ort,
          land,
          ustId: null,
          vorname,
          nachname,
          email: lead.email.toLowerCase(),
          telefon: lead.phone?.trim() || null,
          position: null,
          anmerkungen: null,
          adnChannel,
          klasseId,
        },
      });
      break;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        retries--;
        nextNum++;
        if (retries === 0) throw err;
        continue;
      }
      throw err;
    }
  }

  await addActivity(leadId, {
    type: "NOTE",
    content:
      `Bestellung retroaktiv angelegt: ${bestellNr} – Paket: ${pkg.label}, ` +
      `Abo: ${zahlungsmodell} (Quelle: ${source === "override" ? "Manuell" : "Heuristik"}` +
      `${source === "heuristic" ? `, Confidence: ${detection.confidence}` : ""})` +
      (usedPlaceholders.length > 0 ? ` | Platzhalter: ${usedPlaceholders.join(", ")}` : ""),
  });

  const klasseForWebhook = await prisma.klasse.findUnique({ where: { id: klasseId } });

  fireBestellungWebhook({
    bestellNr,
    paket,
    userAnzahl: pkg.users,
    zahlungsmodell,
    preisNetto,
    listPreisNetto,
    preisBrutto,
    mwstSatz,
    mwstBetrag,
    reverseCharge,
    reverseChargeHinweis,
    adnChannel,
    klasse: klasseForWebhook
      ? {
          id: klasseForWebhook.id,
          name: klasseForWebhook.name,
          slug: klasseForWebhook.slug,
          kickoffDate: klasseForWebhook.kickoffDate.toISOString(),
          startDate: klasseForWebhook.startDate.toISOString(),
          endDate: klasseForWebhook.endDate.toISOString(),
        }
      : null,
    firma,
    strasse,
    plz,
    ort,
    land,
    ustId: "",
    vorname,
    nachname,
    email: lead.email.toLowerCase(),
    telefon: lead.phone?.trim() || "",
    position: "",
    anmerkungen: "",
    quelle: "admin/backfill",
    ip: "admin",
  });

  return {
    bestellNr,
    usedPlaceholders,
    source,
    confidence: source === "override" ? "high" : detection.confidence,
    evidence: detection.evidence,
  };
}
