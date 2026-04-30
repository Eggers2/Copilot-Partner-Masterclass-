export const PACKAGES = {
  starter: { label: "Starter", users: 3, yearly: 8900, monthly: 890 },
  team: { label: "Team", users: 6, yearly: 9900, monthly: 990 },
  business: { label: "Business", users: 15, yearly: 14900, monthly: 1490 },
} as const;

export type PaketKey = keyof typeof PACKAGES;
export type Zahlungsmodell = "jahresabo" | "monatlich";

export type AdnChannelKey = "NONE" | "ADN_50" | "ADN_15";

export const ADN_CHANNEL_VALUES: AdnChannelKey[] = ["NONE", "ADN_50", "ADN_15"];

export function isPaketKey(value: unknown): value is PaketKey {
  return typeof value === "string" && value in PACKAGES;
}

export function isZahlungsmodell(value: unknown): value is Zahlungsmodell {
  return value === "jahresabo" || value === "monatlich";
}

export function isAdnChannelKey(value: unknown): value is AdnChannelKey {
  return value === "NONE" || value === "ADN_50" || value === "ADN_15";
}

export function getPreisNetto(paket: PaketKey, zahlungsmodell: Zahlungsmodell): number {
  const pkg = PACKAGES[paket];
  return zahlungsmodell === "jahresabo" ? pkg.yearly : pkg.monthly;
}

/**
 * Berechnet den Betrag, der dem Rechnungsempfänger fakturiert wird.
 *  - NONE / ADN_50 → voller Listenpreis (bei ADN_50 zahlt ADN intern 50%, wir berechnen 100%)
 *  - ADN_15        → 85% des Listenpreises (ADN fakturiert die übrigen 15% an den Endkunden weiter)
 */
export function getInvoicedPreisNetto(
  paket: PaketKey,
  zahlungsmodell: Zahlungsmodell,
  adnChannel: AdnChannelKey
): number {
  const list = getPreisNetto(paket, zahlungsmodell);
  if (adnChannel === "ADN_15") return Math.round(list * 0.85 * 100) / 100;
  return list;
}

export function calculateMwst(
  land: string,
  ustId: string | undefined,
  preisNetto: number
): {
  mwstSatz: number;
  mwstBetrag: number;
  preisBrutto: number;
  reverseCharge: boolean;
  reverseChargeHinweis: string;
} {
  let mwstSatz = 19; // DE default
  let reverseCharge = false;
  let reverseChargeHinweis = "";

  if (land === "AT") {
    if (ustId && ustId.trim().length > 0) {
      mwstSatz = 0;
      reverseCharge = true;
      reverseChargeHinweis =
        "Reverse Charge gem. Art. 196 MwSt-Richtlinie – Steuerschuldnerschaft des Leistungsempfängers";
    } else {
      mwstSatz = 20;
    }
  } else if (land === "CH") {
    mwstSatz = 0;
    reverseChargeHinweis = "Leistung nicht im Inland steuerbar (Drittland)";
  }

  const mwstBetrag = Math.round(preisNetto * (mwstSatz / 100) * 100) / 100;
  const preisBrutto = preisNetto + mwstBetrag;

  return { mwstSatz, mwstBetrag, preisBrutto, reverseCharge, reverseChargeHinweis };
}

export function validateUstId(land: string, ustId: string): boolean {
  if (land === "DE") return /^DE\d{9}$/.test(ustId);
  if (land === "AT") return /^ATU\d{8}$/.test(ustId);
  if (land === "CH") return /^CHE-\d{3}\.\d{3}\.\d{3}$/.test(ustId);
  return false;
}
