export interface BestellungWebhookKlasse {
  id: string;
  name: string;
  slug: string;
  kickoffDate: string;
  startDate: string;
  endDate: string;
}

export interface BestellungWebhookInput {
  bestellNr: string;
  paket: string;
  userAnzahl: number;
  zahlungsmodell: string;
  preisNetto: number;
  listPreisNetto: number;
  preisBrutto: number;
  mwstSatz: number;
  mwstBetrag: number;
  reverseCharge: boolean;
  reverseChargeHinweis: string;
  adnChannel: "NONE" | "ADN_50" | "ADN_15";
  klasse: BestellungWebhookKlasse | null;
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
  quelle: string;
  ip: string;
}

/**
 * Feuert den n8n-Webhook für eine Bestellung (fire-and-forget).
 * n8n legt nur Email-Drafts an, daher sicher auch für retroaktive Backfills.
 */
export function fireBestellungWebhook(data: BestellungWebhookInput): void {
  const webhookUrl = process.env.N8N_WEBHOOK_URL_bestellen;
  console.log("N8N Bestell-Webhook URL configured:", !!webhookUrl);
  if (!webhookUrl) return;

  const payload = {
    bestellung: {
      paket: data.paket,
      user_anzahl: data.userAnzahl,
      zahlungsmodell: data.zahlungsmodell,
      preis_netto: data.preisNetto,
      list_preis_netto: data.listPreisNetto,
      preis_brutto: data.preisBrutto,
      mwst_satz: data.mwstSatz,
      mwst_betrag: data.mwstBetrag,
      reverse_charge: data.reverseCharge,
      reverse_charge_hinweis: data.reverseChargeHinweis,
      adn_channel: data.adnChannel,
      waehrung: "EUR",
    },
    klasse: data.klasse,
    unternehmen: {
      firma: data.firma,
      strasse: data.strasse,
      plz: data.plz,
      ort: data.ort,
      land: data.land,
      ust_id: data.ustId,
    },
    ansprechpartner: {
      vorname: data.vorname,
      nachname: data.nachname,
      email: data.email,
      telefon: data.telefon,
      position: data.position,
    },
    anmerkungen: data.anmerkungen,
    meta: {
      bestellt_am: new Date().toISOString(),
      quelle: data.quelle,
      bestell_nr: data.bestellNr,
      ip: data.ip,
    },
  };

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      console.log(`N8N Bestell-Webhook response: ${res.status}`);
      if (!res.ok) console.error(`N8N Bestell-Webhook returned ${res.status}`);
    })
    .catch((err) =>
      console.error("N8N Bestell-Webhook delivery failed:", err)
    );
}
