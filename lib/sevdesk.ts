/**
 * Dünner Client für die sevDesk-REST-API (Faktura).
 *
 * Modi über SEVDESK_MODE:
 *   - "live": echte API-Calls (braucht SEVDESK_API_KEY)
 *   - "mock": kein API-Call, Payloads werden geloggt, Fake-IDs zurückgegeben
 *             (für lokale Tests ohne sevDesk-Account)
 *   - "off":  Integration deaktiviert – Aufrufer bekommen einen Fehler und
 *             lassen die Rechnung auf FAILED stehen (Admin-Retry möglich)
 * Ohne SEVDESK_MODE gilt: API-Key vorhanden → live, sonst off.
 *
 * Alle Funktionen werfen SevdeskError; der Orchestrator in
 * lib/events/connectDayInvoice.ts fängt das ab und schreibt den Status fort.
 */

export type SevdeskMode = "live" | "mock" | "off";

export class SevdeskError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "SevdeskError";
  }
}

function getApiUrl(): string {
  return (
    process.env.SEVDESK_API_URL?.replace(/\/$/, "") ??
    "https://my.sevdesk.de/api/v1"
  );
}

export function getSevdeskMode(): SevdeskMode {
  const raw = process.env.SEVDESK_MODE?.trim().toLowerCase();
  if (raw === "live" || raw === "mock" || raw === "off") return raw;
  return process.env.SEVDESK_API_KEY ? "live" : "off";
}

let mockSequence = 0;
function nextMockId(prefix: string): string {
  mockSequence += 1;
  return `${prefix}-mock-${mockSequence}`;
}

interface FetchOptions {
  method?: "GET" | "POST" | "PUT";
  query?: Record<string, string>;
  body?: unknown;
}

async function sevdeskFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const apiKey = process.env.SEVDESK_API_KEY;
  if (!apiKey) {
    throw new SevdeskError("SEVDESK_API_KEY ist nicht konfiguriert.");
  }

  const url = new URL(`${getApiUrl()}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SevdeskError(`sevDesk nicht erreichbar: ${message}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new SevdeskError(
      `sevDesk ${opts.method ?? "GET"} /${path} → HTTP ${res.status}: ${text.slice(0, 500)}`,
      res.status
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SevdeskError(`sevDesk /${path}: Antwort ist kein JSON.`);
  }
}

// ─── Stammdaten-Lookups (gecacht pro Prozess) ────────────────────────────────

let cachedBookkeepingVersion: string | null = null;

/**
 * "1.0" (Legacy: taxType/taxRate) oder "2.0" (sevdesk-Update: taxRule).
 */
export async function getBookkeepingVersion(): Promise<string> {
  if (cachedBookkeepingVersion) return cachedBookkeepingVersion;
  const res = await sevdeskFetch<{ objects?: { version?: string } }>(
    "Tools/bookkeepingSystemVersion"
  );
  cachedBookkeepingVersion = res.objects?.version ?? "1.0";
  return cachedBookkeepingVersion;
}

let cachedSevUserId: string | null = null;

/** SevUser (Kontaktperson der Rechnung): aus ENV oder erster Benutzer. */
async function getSevUserId(): Promise<string> {
  const fromEnv = process.env.SEVDESK_SEV_USER_ID?.trim();
  if (fromEnv) return fromEnv;
  if (cachedSevUserId) return cachedSevUserId;
  const res = await sevdeskFetch<{ objects?: { id: string }[] }>("SevUser", {
    query: { limit: "1" },
  });
  const id = res.objects?.[0]?.id;
  if (!id) throw new SevdeskError("Kein SevUser gefunden (SEVDESK_SEV_USER_ID setzen).");
  cachedSevUserId = id;
  return id;
}

let cachedCountries: Map<string, string> | null = null;

/** StaticCountry-ID zu ISO-Code ("DE"/"AT"/"CH"). */
async function getCountryId(landCode: string): Promise<string | null> {
  if (!cachedCountries) {
    const res = await sevdeskFetch<{
      objects?: { id: string; code?: string }[];
    }>("StaticCountry", { query: { limit: "300" } });
    cachedCountries = new Map(
      (res.objects ?? [])
        .filter((c) => c.code)
        .map((c) => [c.code!.toLowerCase(), c.id])
    );
  }
  return cachedCountries.get(landCode.toLowerCase()) ?? null;
}

// ─── Kontakte ────────────────────────────────────────────────────────────────

export interface ContactInput {
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string; // "DE" | "AT" | "CH"
  ustId: string | null;
  email: string;
}

/**
 * Findet einen Organisations-Kontakt per exaktem Namen oder legt ihn neu an
 * (inkl. Rechnungsadresse + E-Mail). Gibt die sevDesk-Kontakt-ID zurück.
 */
export async function ensureContact(input: ContactInput): Promise<string> {
  if (getSevdeskMode() === "mock") {
    console.log("[sevDesk:mock] ensureContact", { firma: input.firma });
    return nextMockId("contact");
  }

  // 1. Suche nach exaktem Firmennamen (name-Filter ist ein Substring-Match,
  //    daher client-seitig exakt nachprüfen).
  const search = await sevdeskFetch<{
    objects?: { id: string; name?: string }[];
  }>("Contact", { query: { depth: "1", limit: "100", name: input.firma } });
  const match = (search.objects ?? []).find(
    (c) => (c.name ?? "").trim().toLowerCase() === input.firma.trim().toLowerCase()
  );
  if (match) return match.id;

  // 2. Kontakt anlegen (category 3 = Standard "Kunde")
  const categoryId = process.env.SEVDESK_CONTACT_CATEGORY_ID?.trim() || "3";
  const created = await sevdeskFetch<{ objects?: { id: string } }>("Contact", {
    method: "POST",
    body: {
      name: input.firma,
      category: { id: Number(categoryId), objectName: "Category" },
      ...(input.ustId ? { vatNumber: input.ustId } : {}),
    },
  });
  const contactId = created.objects?.id;
  if (!contactId) throw new SevdeskError("Kontakt konnte nicht angelegt werden.");

  // 3. Rechnungsadresse (best-effort: fehlendes Land bricht nicht ab)
  const countryId = await getCountryId(input.land);
  await sevdeskFetch("ContactAddress", {
    method: "POST",
    body: {
      contact: { id: contactId, objectName: "Contact" },
      street: input.strasse,
      zip: input.plz,
      city: input.ort,
      ...(countryId
        ? { country: { id: Number(countryId), objectName: "StaticCountry" } }
        : {}),
    },
  });

  // 4. E-Mail als Kommunikationsweg (key 2 = "Geschäftlich")
  await sevdeskFetch("CommunicationWay", {
    method: "POST",
    body: {
      contact: { id: contactId, objectName: "Contact" },
      type: "EMAIL",
      value: input.email,
      key: { id: 2, objectName: "CommunicationWayKey" },
      main: true,
    },
  });

  return contactId;
}

// ─── Rechnungen ──────────────────────────────────────────────────────────────

export interface InvoicePosition {
  name: string;
  text?: string;
  quantity: number;
  /** Netto-Einzelpreis */
  price: number;
  taxRate: number;
}

export interface CreateInvoiceInput {
  contactId: string;
  /**
   * Kompletter Empfänger-Adressblock (Zeilenumbrüche erlaubt). sevDesk füllt
   * die Adresse bei API-Rechnungen NICHT automatisch aus dem Kontakt –
   * ohne dieses Feld bleibt der Adressblock auf dem PDF leer.
   */
  address: string;
  header: string;
  headText?: string;
  footText?: string;
  positions: InvoicePosition[];
  taxRate: number;
  /**
   * Steuerfall der Rechnung:
   *   "default"  → umsatzsteuerpflichtig (taxRule 1 bzw. taxType "default")
   *   "eu"       → Reverse Charge EU (taxRule 21 bzw. taxType "eu")
   *   "noteu"    → nicht im Inland steuerbar / Drittland (taxRule 17 / "noteu")
   */
  taxCase: "default" | "eu" | "noteu";
  /** Hinweistext, z.B. Reverse-Charge-Klausel */
  taxText?: string;
  /** Zahlungsziel in Tagen (erscheint als Fälligkeit auf der Rechnung) */
  timeToPayDays?: number;
}

export interface CreateInvoiceResult {
  invoiceId: string;
  invoiceNumber: string | null;
}

const TAX_RULE_IDS: Record<CreateInvoiceInput["taxCase"], number> = {
  // sevdesk-Update 2.0 (taxRule): 1 = Umsatzsteuerpflichtige Umsätze,
  // 21 = Reverse Charge gem. §18b UStG, 17 = Nicht im Inland steuerbare Leistung
  default: 1,
  eu: 21,
  noteu: 17,
};

/**
 * Erstellt eine Rechnung als ENTWURF (Status 100) – sevDesk erlaubt über
 * Factory/saveInvoice nur noch Status 100; der Status wird beim Versand über
 * sendViaEmail automatisch auf "Offen" angehoben und die endgültige
 * Rechnungsnummer aus dem Nummernkreis vergeben. Unterstützt beide
 * Rechnungswesen-Versionen (taxType/taxRate vs. taxRule).
 */
export async function createInvoice(
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult> {
  if (getSevdeskMode() === "mock") {
    console.log("[sevDesk:mock] createInvoice", JSON.stringify(input, null, 2));
    return { invoiceId: nextMockId("invoice"), invoiceNumber: "MOCK-0001" };
  }

  const [version, sevUserId] = await Promise.all([
    getBookkeepingVersion(),
    getSevUserId(),
  ]);
  const isV2 = version.startsWith("2");

  const invoiceDate = new Date().toISOString().slice(0, 10);
  // Auch unter Rechnungswesen 2.0 (taxRule) verlangt sevDesk ein befülltes
  // taxRate am Invoice-Objekt (DB-Spalte tax_rate ist NOT NULL).
  const taxFields = isV2
    ? {
        taxRule: { id: TAX_RULE_IDS[input.taxCase], objectName: "TaxRule" },
        taxRate: input.taxRate,
      }
    : { taxType: input.taxCase, taxRate: input.taxRate };

  const res = await sevdeskFetch<{
    objects?: { invoice?: { id: string; invoiceNumber?: string | null } };
  }>("Invoice/Factory/saveInvoice", {
    method: "POST",
    body: {
      invoice: {
        objectName: "Invoice",
        invoiceType: "RE",
        status: 100,
        address: input.address,
        invoiceDate,
        header: input.header,
        headText: input.headText ?? null,
        footText: input.footText ?? null,
        currency: "EUR",
        discount: 0,
        ...(input.timeToPayDays ? { timeToPay: input.timeToPayDays } : {}),
        contact: { id: Number(input.contactId), objectName: "Contact" },
        contactPerson: { id: Number(sevUserId), objectName: "SevUser" },
        taxText: input.taxText ?? `Umsatzsteuer ${input.taxRate}%`,
        ...taxFields,
        mapAll: true,
      },
      invoicePosSave: input.positions.map((pos) => ({
        objectName: "InvoicePos",
        name: pos.name,
        text: pos.text ?? null,
        quantity: pos.quantity,
        price: pos.price,
        taxRate: input.taxCase === "default" ? pos.taxRate : 0,
        unity: { id: 1, objectName: "Unity" }, // 1 = Stück
        mapAll: true,
      })),
      invoicePosDelete: null,
      discountSave: null,
      discountDelete: null,
    },
  });

  const invoice = res.objects?.invoice;
  if (!invoice?.id) {
    throw new SevdeskError("Rechnung wurde nicht angelegt (keine ID in der Antwort).");
  }
  return { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber ?? null };
}

/**
 * Rendert das Rechnungs-PDF in sevDesk neu (forceReload). Nach dem
 * Festschreiben nötig, damit getPdf nicht das gecachte Entwurfs-PDF ohne
 * Rechnungsnummer ausliefert.
 */
export async function renderInvoice(invoiceId: string): Promise<void> {
  if (getSevdeskMode() === "mock") {
    console.log("[sevDesk:mock] renderInvoice", { invoiceId });
    return;
  }
  await sevdeskFetch(`Invoice/${invoiceId}/render`, {
    method: "POST",
    body: { forceReload: true },
  });
}

/**
 * Lädt eine Rechnung nach (z.B. um die nach dem Versand endgültig vergebene
 * Rechnungsnummer zu übernehmen).
 */
export async function getInvoice(
  invoiceId: string
): Promise<{ invoiceNumber: string | null; status: string | null }> {
  if (getSevdeskMode() === "mock") {
    return { invoiceNumber: "MOCK-0001", status: "200" };
  }
  const res = await sevdeskFetch<{
    objects?: { invoiceNumber?: string | null; status?: string | null }[];
  }>(`Invoice/${invoiceId}`);
  const invoice = res.objects?.[0];
  return {
    invoiceNumber: invoice?.invoiceNumber ?? null,
    status: invoice?.status ?? null,
  };
}

/**
 * Holt das Rechnungs-PDF aus sevDesk, OHNE den Versandstatus der Rechnung zu
 * verändern (preventSendBy). WICHTIG: Die Rechnung muss vorher über
 * markInvoiceSent() festgeschrieben und neu gerendert worden sein – das PDF
 * eines Entwurfs (Status 100) enthält noch keine Rechnungsnummer.
 */
export async function getInvoicePdf(
  invoiceId: string
): Promise<{ filename: string; contentBase64: string }> {
  if (getSevdeskMode() === "mock") {
    console.log("[sevDesk:mock] getInvoicePdf", { invoiceId });
    return {
      filename: `Rechnung-${invoiceId}.pdf`,
      contentBase64: Buffer.from("%PDF-1.4 mock").toString("base64"),
    };
  }
  // Kein download=true: damit käme das rohe PDF-Binary statt der
  // JSON-Antwort { objects: { filename, content: <base64> } }.
  const res = await sevdeskFetch<{
    objects?: { filename?: string; content?: string };
  }>(`Invoice/${invoiceId}/getPdf`, {
    query: { preventSendBy: "true" },
  });
  const content = res.objects?.content;
  if (!content) {
    throw new SevdeskError("PDF-Abruf lieferte keinen Inhalt.");
  }
  return {
    filename: res.objects?.filename ?? `Rechnung-${invoiceId}.pdf`,
    contentBase64: content,
  };
}

/**
 * Markiert die Rechnung in sevDesk als versendet (Versandart PDF) und hebt
 * den Status damit von Entwurf auf "Offen" an – dabei vergibt sevDesk die
 * endgültige Rechnungsnummer aus dem Nummernkreis. Muss deshalb VOR dem
 * PDF-Abruf laufen; die E-Mail selbst geht über unsere eigene Infrastruktur
 * (Resend) raus.
 */
export async function markInvoiceSent(invoiceId: string): Promise<void> {
  if (getSevdeskMode() === "mock") {
    console.log("[sevDesk:mock] markInvoiceSent", { invoiceId });
    return;
  }
  await sevdeskFetch(`Invoice/${invoiceId}/sendBy`, {
    method: "PUT",
    body: { sendType: "VPDF", sendDraft: false },
  });
}

/**
 * Versendet die Rechnung als PDF-Anhang per E-Mail direkt aus sevDesk.
 * Hebt den Rechnungsstatus dabei automatisch von Entwurf auf "Offen" an.
 * Fallback-Weg, wenn Resend nicht konfiguriert ist (Mail kommt dann vom
 * sevDesk-Absender, ohne Branddesign).
 */
export async function sendInvoiceByEmail(params: {
  invoiceId: string;
  toEmail: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (getSevdeskMode() === "mock") {
    console.log("[sevDesk:mock] sendInvoiceByEmail", {
      invoiceId: params.invoiceId,
      toEmail: params.toEmail,
      subject: params.subject,
    });
    return;
  }

  await sevdeskFetch(`Invoice/${params.invoiceId}/sendViaEmail`, {
    method: "POST",
    body: {
      toEmail: params.toEmail,
      subject: params.subject,
      text: params.text,
      copy: false,
    },
  });
}
