import { prisma } from "@/lib/prisma";
import {
  PACKAGES,
  isPaketKey,
  isZahlungsmodell,
  isAdnChannelKey,
  calculateMwst,
  validateUstId,
  getInvoicedPreisNetto,
  getPreisNetto,
  type PaketKey,
  type Zahlungsmodell,
  type AdnChannelKey,
} from "@/lib/packages";
import { syncOrderWithLead } from "@/lib/db/leads";
import { fireBestellungWebhook } from "@/lib/webhooks/bestellung";
import { getNextOpenKlasse, NoOpenKlasseError } from "@/lib/klassen";
import type { Klasse } from "@prisma/client";

export class OrderValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

export interface OrderInput {
  paket: unknown;
  zahlungsmodell: unknown;
  firma: unknown;
  strasse: unknown;
  plz: unknown;
  ort: unknown;
  land: unknown;
  ustId?: unknown;
  vorname: unknown;
  nachname: unknown;
  email: unknown;
  telefon?: unknown;
  position?: unknown;
  anmerkungen?: unknown;
  adnChannel?: unknown;
  klasseId?: unknown;
}

export interface OrderContext {
  ip: string;
  quelle: string;
}

export interface OrderResult {
  bestellNr: string;
}

interface ValidatedOrder {
  paket: PaketKey;
  zahlungsmodell: Zahlungsmodell;
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  ustId: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  position: string;
  anmerkungen: string;
  adnChannel: AdnChannelKey;
  klasseId: string | null;
}

function validate(input: OrderInput): ValidatedOrder {
  if (!isPaketKey(input.paket)) {
    throw new OrderValidationError("paket", "Ungültiges Paket gewählt.");
  }
  if (!isZahlungsmodell(input.zahlungsmodell)) {
    throw new OrderValidationError("zahlungsmodell", "Ungültiges Zahlungsmodell.");
  }

  const firma = typeof input.firma === "string" ? input.firma.trim() : "";
  if (firma.length < 2) {
    throw new OrderValidationError("firma", "Firmenname ist erforderlich (min. 2 Zeichen).");
  }

  const strasse = typeof input.strasse === "string" ? input.strasse.trim() : "";
  if (strasse.length < 1) {
    throw new OrderValidationError("strasse", "Straße + Hausnummer ist erforderlich.");
  }

  const plz = typeof input.plz === "string" ? input.plz.trim() : "";
  if (!/^\d{4,5}$/.test(plz)) {
    throw new OrderValidationError("plz", "Bitte geben Sie eine gültige PLZ ein (4-5 Ziffern).");
  }

  const ort = typeof input.ort === "string" ? input.ort.trim() : "";
  if (ort.length < 1) {
    throw new OrderValidationError("ort", "Ort ist erforderlich.");
  }

  const land = typeof input.land === "string" ? input.land : "";
  if (!["DE", "AT", "CH"].includes(land)) {
    throw new OrderValidationError("land", "Ungültiges Land.");
  }

  const ustId = typeof input.ustId === "string" ? input.ustId.trim() : "";
  if ((land === "AT" || land === "CH") && ustId.length === 0) {
    throw new OrderValidationError(
      "ustId",
      "Für die steuerfreie Abrechnung benötigen wir Ihre USt-IdNr."
    );
  }
  if (ustId.length > 0 && !validateUstId(land, ustId)) {
    throw new OrderValidationError("ustId", "Bitte geben Sie eine gültige USt-IdNr. ein.");
  }

  const vorname = typeof input.vorname === "string" ? input.vorname.trim() : "";
  if (vorname.length < 1) {
    throw new OrderValidationError("vorname", "Vorname ist erforderlich.");
  }

  const nachname = typeof input.nachname === "string" ? input.nachname.trim() : "";
  if (nachname.length < 1) {
    throw new OrderValidationError("nachname", "Nachname ist erforderlich.");
  }

  const email = typeof input.email === "string" ? input.email.trim() : "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new OrderValidationError("email", "Bitte geben Sie eine gültige E-Mail-Adresse ein.");
  }

  const telefon = typeof input.telefon === "string" ? input.telefon.trim() : "";
  const position = typeof input.position === "string" ? input.position.trim() : "";
  const anmerkungen =
    typeof input.anmerkungen === "string" ? input.anmerkungen.trim() : "";
  if (anmerkungen.length > 500) {
    throw new OrderValidationError(
      "anmerkungen",
      "Anmerkungen dürfen maximal 500 Zeichen lang sein."
    );
  }

  const adnChannel = isAdnChannelKey(input.adnChannel) ? input.adnChannel : "NONE";

  const klasseId =
    typeof input.klasseId === "string" && input.klasseId.length > 0
      ? input.klasseId
      : null;

  return {
    paket: input.paket,
    zahlungsmodell: input.zahlungsmodell,
    firma,
    strasse,
    plz,
    ort,
    land,
    ustId,
    vorname,
    nachname,
    email: email.toLowerCase(),
    telefon,
    position,
    anmerkungen,
    adnChannel,
    klasseId,
  };
}

async function resolveKlasse(klasseId: string | null): Promise<Klasse> {
  if (klasseId) {
    const klasse = await prisma.klasse.findUnique({ where: { id: klasseId } });
    if (!klasse) {
      throw new OrderValidationError("klasseId", "Die angegebene Klasse existiert nicht.");
    }
    return klasse;
  }
  return getNextOpenKlasse();
}

async function generateBestellNr(): Promise<{ bestellNr: string; nextNum: number; prefix: string }> {
  const year = new Date().getFullYear();
  const prefix = `NS-${year}-`;
  const last = await prisma.bestellung.findFirst({
    where: { bestellNr: { startsWith: prefix } },
    orderBy: { bestellNr: "desc" },
    select: { bestellNr: true },
  });
  let nextNum = 1;
  if (last) {
    const m = last.bestellNr.slice(prefix.length).match(/^(\d+)/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  return { bestellNr: `${prefix}${String(nextNum).padStart(4, "0")}`, nextNum, prefix };
}

/**
 * Validiert eine Bestellung, weist Klasse zu, berechnet Preis & MwSt
 * (inkl. ADN-Kanal-Anpassung), legt die Bestellung an, synct den Lead und
 * feuert den n8n-Webhook.
 */
export async function createBestellung(
  input: OrderInput,
  context: OrderContext
): Promise<OrderResult> {
  const v = validate(input);

  let klasse: Klasse;
  try {
    klasse = await resolveKlasse(v.klasseId);
  } catch (err) {
    if (err instanceof NoOpenKlasseError) {
      throw new OrderValidationError("klasseId", err.message);
    }
    throw err;
  }

  const pkg = PACKAGES[v.paket];
  const listPreisNetto = getPreisNetto(v.paket, v.zahlungsmodell);
  const preisNetto = getInvoicedPreisNetto(v.paket, v.zahlungsmodell, v.adnChannel);
  const { mwstSatz, mwstBetrag, preisBrutto, reverseCharge, reverseChargeHinweis } =
    calculateMwst(v.land, v.ustId, preisNetto);

  // BestellNr generieren mit Retry für Race-Condition (P2002)
  const generated = await generateBestellNr();
  const prefix = generated.prefix;
  let bestellNr = generated.bestellNr;
  let nextNum = generated.nextNum;
  let retries = 10;
  while (retries > 0) {
    try {
      await prisma.bestellung.create({
        data: {
          bestellNr,
          paket: v.paket,
          userAnzahl: pkg.users,
          zahlungsmodell: v.zahlungsmodell,
          preisNetto,
          listPreisNetto,
          mwstSatz,
          mwstBetrag,
          reverseCharge,
          reverseChargeHinweis: reverseChargeHinweis || null,
          preisBrutto,
          firma: v.firma,
          strasse: v.strasse,
          plz: v.plz,
          ort: v.ort,
          land: v.land,
          ustId: v.ustId || null,
          vorname: v.vorname,
          nachname: v.nachname,
          email: v.email,
          telefon: v.telefon || null,
          position: v.position || null,
          anmerkungen: v.anmerkungen || null,
          adnChannel: v.adnChannel,
          klasseId: klasse.id,
        },
      });
      break;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        retries--;
        nextNum++;
        bestellNr = `${prefix}${String(nextNum).padStart(4, "0")}`;
        if (retries === 0) throw err;
        continue;
      }
      throw err;
    }
  }

  // Lead-Sync (fire-and-forget)
  syncOrderWithLead({
    email: v.email,
    vorname: v.vorname,
    nachname: v.nachname,
    firma: v.firma,
    strasse: v.strasse,
    plz: v.plz,
    ort: v.ort,
    telefon: v.telefon || null,
    position: v.position || null,
    paket: pkg.label,
    zahlungsmodell: v.zahlungsmodell,
    bestellNr,
    preisNetto,
    adnChannel: v.adnChannel,
    klasseId: klasse.id,
  }).catch((err) => console.error("[OrderSync] Lead-Sync fehlgeschlagen:", err));

  // n8n-Webhook (fire-and-forget)
  fireBestellungWebhook({
    bestellNr,
    paket: v.paket,
    userAnzahl: pkg.users,
    zahlungsmodell: v.zahlungsmodell,
    preisNetto,
    listPreisNetto,
    preisBrutto,
    mwstSatz,
    mwstBetrag,
    reverseCharge,
    reverseChargeHinweis,
    adnChannel: v.adnChannel,
    klasse: {
      id: klasse.id,
      name: klasse.name,
      slug: klasse.slug,
      kickoffDate: klasse.kickoffDate.toISOString(),
      startDate: klasse.startDate.toISOString(),
      endDate: klasse.endDate.toISOString(),
    },
    firma: v.firma,
    strasse: v.strasse,
    plz: v.plz,
    ort: v.ort,
    land: v.land,
    ustId: v.ustId,
    vorname: v.vorname,
    nachname: v.nachname,
    email: v.email,
    telefon: v.telefon,
    position: v.position,
    anmerkungen: v.anmerkungen,
    quelle: context.quelle,
    ip: context.ip,
  });

  return { bestellNr };
}
