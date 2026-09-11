/**
 * Dünner Client für die Ablefy-API (früher elopage).
 *
 * Einziger Ausgang zur Ablefy-API: aus Actions, Routen oder Komponenten wird
 * nie direkt gefetcht.
 *
 * Env:
 *   ABLEFY_API_KEY, ABLEFY_API_SECRET  Zugangsdaten. Ablefy nimmt sie als
 *                                      Query-Parameter, deshalb wird nie eine
 *                                      unmaskierte URL geloggt.
 *   ABLEFY_PRODUCT_ID                  Kurs, auf den eingebucht wird
 *   ABLEFY_DRY_RUN="true"              kein echter Call, nur Log
 *   ABLEFY_CANCEL_ENABLED="true"       Storno-Route aktiv (Default: aus)
 *
 * Drei Eigenheiten der API bestimmen das Design, alle drei sind im Betrieb
 * teuer gelernt worden:
 *
 * 1. Es gibt keine Such- oder Listenroute für Bestellungen. POST /api/orders
 *    legt an, GET /api/orders/{id} liest, mehr nicht. Zu einer E-Mail lässt
 *    sich die Bestellung nachträglich nicht ermitteln. Die ID aus der Antwort
 *    zu speichern ist deshalb kritisch: ohne sie gibt es später keinen Entzug.
 *
 * 2. Der Storno verlangt den Order-Token, nicht die Bestell-ID
 *    (POST /api/orders/{token}/cancel). Wird die ID in den Token-Platzhalter
 *    gesetzt, antwortet Ablefy mit 2xx und tut nichts, der Zugang bleibt
 *    bestehen. Deshalb: ohne Token kein Storno, und nach jedem Storno ein GET
 *    zur Verifikation. Erfolg wird nie angenommen.
 *
 * 3. Es gibt keine Idempotenz. Ein zweiter POST erzeugt eine zweite Bestellung.
 *    Die Absicherung liegt vollständig bei uns (siehe Claim in
 *    lib/ablefy/dispatchEnrollment.ts).
 */

const BASE_URL = "https://api.myablefy.com";
const TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

export function isAblefyDryRun(): boolean {
  return (process.env.ABLEFY_DRY_RUN ?? "").trim().toLowerCase() === "true";
}

export function isAblefyCancelEnabled(): boolean {
  return (
    (process.env.ABLEFY_CANCEL_ENABLED ?? "").trim().toLowerCase() === "true"
  );
}

export function isAblefyConfigured(): boolean {
  return Boolean(process.env.ABLEFY_API_KEY && process.env.ABLEFY_API_SECRET);
}

export function getAblefyProductId(): string | null {
  return process.env.ABLEFY_PRODUCT_ID?.trim() || null;
}

/** Maskiert ein Secret für Logausgaben. Nie den Klartext loggen. */
function mask(value: string | undefined): string {
  if (!value) return "(nicht gesetzt)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

/** Ersetzt key und secret in einer URL durch Platzhalter. */
function redactUrl(url: string): string {
  return url
    .replace(/([?&]key=)[^&]*/gi, "$1[maskiert]")
    .replace(/([?&]secret=)[^&]*/gi, "$1[maskiert]");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AblefyResponse {
  ok: boolean;
  status: number | null;
  data: unknown;
  raw: string | null;
  error: string | null;
}

/**
 * Führt einen Ablefy-Request aus.
 *
 * Retry mit Backoff nur bei 5xx, 429 und Netzwerk-/Timeout-Fehlern. Bei 4xx
 * wird nicht wiederholt: eine abgelehnte Anfrage wird beim zweiten Versuch
 * genauso abgelehnt, und auf /api/orders könnte ein blinder Retry eine zweite
 * Bestellung erzeugen.
 */
async function request(
  method: "GET" | "POST",
  pathname: string,
  params: Record<string, string | number | undefined | null> = {},
  opts: { label?: string; body?: Record<string, unknown> | null } = {}
): Promise<AblefyResponse> {
  const label = opts.label ?? pathname;

  if (!isAblefyConfigured()) {
    return {
      ok: false,
      status: null,
      data: null,
      raw: null,
      error:
        "Ablefy ist nicht konfiguriert (ABLEFY_API_KEY und ABLEFY_API_SECRET erforderlich).",
    };
  }

  const url = new URL(pathname, BASE_URL);
  url.searchParams.set("key", process.env.ABLEFY_API_KEY!);
  url.searchParams.set("secret", process.env.ABLEFY_API_SECRET!);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  // Zugangsdaten zusätzlich in den Body: Ablefy ist darin nicht einheitlich,
  // die Storno-Route verlangt sie laut Spezifikation im JSON-Body. Beides zu
  // schicken kostet nichts und deckt beide Lesarten ab.
  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: string | undefined;
  if (opts.body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify({
      key: process.env.ABLEFY_API_KEY,
      secret: process.env.ABLEFY_API_SECRET,
      ...opts.body,
    });
  }

  let lastError = "unbekannt";
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: payload,
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const raw = await res.text();
      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // kein JSON – der Aufrufer entscheidet, was das bedeutet
      }

      lastStatus = res.status;
      // Die URL wird maskiert, der Body nie geloggt (Personendaten).
      console.log(
        `[Ablefy] ${method} ${label} → ${res.status} (${Date.now() - started} ms, Versuch ${attempt}/${MAX_ATTEMPTS})`
      );

      if (res.ok) {
        return { ok: true, status: res.status, data, raw, error: null };
      }

      const record = (data ?? {}) as Record<string, unknown>;
      const message =
        (typeof record.message === "string" && record.message) ||
        (typeof record.error === "string" && record.error) ||
        `HTTP ${res.status}`;

      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        console.error(
          `[Ablefy] dauerhaft abgelehnt: ${method} ${label} → ${res.status}: ${message}`
        );
        return { ok: false, status: res.status, data, raw, error: message };
      }

      lastError = `HTTP ${res.status}: ${message}`;
    } catch (err) {
      lastError =
        err instanceof Error && err.name === "TimeoutError"
          ? `Timeout nach ${TIMEOUT_MS} ms`
          : err instanceof Error
            ? err.message
            : String(err);
      console.warn(
        `[Ablefy] ${method} ${label} fehlgeschlagen (Versuch ${attempt}/${MAX_ATTEMPTS}): ${lastError}`
      );
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(1000 * 2 ** (attempt - 1)); // 1 s, 2 s
    }
  }

  console.error(
    `[Ablefy] endgültig fehlgeschlagen: ${method} ${redactUrl(url.toString())} (${lastError}), Key ${mask(process.env.ABLEFY_API_KEY)}`
  );
  return { ok: false, status: lastStatus, data: null, raw: null, error: lastError };
}

// ─── Bestell-ID und Order-Token aus der Antwort holen ────────────────────────

/** Liest verschachtelte Felder aus einer Antwort unbekannter Form. */
function pick(value: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, value);
}

function pickCandidate(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    // Die Kandidatenlisten enthalten Kurzschluss-Ausdrücke, die `false` oder
    // `undefined` liefern, wenn ihre Bedingung nicht greift. `String(false)`
    // wäre eine gültig aussehende ID.
    if (typeof candidate !== "string" && typeof candidate !== "number") continue;
    const value = String(candidate).trim();
    if (!value || value === "0" || value === "null" || value === "undefined") {
      continue;
    }
    return value;
  }
  return null;
}

/**
 * Sucht die Bestell-ID in einer Antwort. Das Antwortformat ist nicht
 * dokumentiert, deshalb werden mehrere plausible Formen geprüft. null heißt:
 * der Zugang ist vermutlich angelegt, aber nie wieder ansprechbar – das ist ein
 * Alarmfall, kein Erfolg.
 */
export function extractOrderId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  return pickCandidate([
    pick(data, "id"),
    pick(data, "order_id"),
    pick(data, "orderId"),
    pick(data, "order", "id"),
    pick(data, "data", "id"),
    pick(data, "data", "order_id"),
    pick(data, "orders", "0", "id"),
    pick(data, "0", "id"),
  ]);
}

/**
 * Sucht den Order-Token in einer Antwort.
 *
 * Der Token ist nicht die Bestellnummer aus der Oberfläche. Er ist der einzige
 * Schlüssel, mit dem sich ein Zugang je wieder entziehen lässt. Bewusst
 * getrennt von extractOrderId: genau diese Verwechslung hat den Entzug schon
 * einmal monatelang wirkungslos gemacht, ohne dass es auffiel. Eine rein
 * numerische Angabe ist deshalb mit hoher Wahrscheinlichkeit die Bestellnummer
 * und wird hier verworfen.
 */
export function extractOrderToken(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const value = pickCandidate([
    pick(data, "token"),
    pick(data, "order_token"),
    pick(data, "orderToken"),
    pick(data, "order", "token"),
    pick(data, "data", "token"),
    pick(data, "data", "order_token"),
    pick(data, "orders", "0", "token"),
    pick(data, "0", "token"),
  ]);
  if (!value || /^\d+$/.test(value)) return null;
  return value;
}

// ─── Zugang anlegen ──────────────────────────────────────────────────────────

export interface CreateOrderResult {
  ok: boolean;
  orderId: string | null;
  orderToken: string | null;
  dryRun: boolean;
  /** Call erfolgreich, aber ohne Bestell-ID – Alarmfall, kein Erfolg. */
  idMissing: boolean;
  status: number | null;
  error: string | null;
}

/**
 * Legt eine kostenlose Bestellung an und verschafft der Person damit Zugang
 * zum Kurs. Ablefy versendet die Zugangsmail selbst, wir schreiben Teilnehmer
 * dafür nicht an.
 */
export async function createOrder(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  productId: string;
}): Promise<CreateOrderResult> {
  const base = {
    orderId: null,
    orderToken: null,
    dryRun: false,
    idMissing: false,
    status: null,
  };

  if (!input.email || !input.productId) {
    return {
      ...base,
      ok: false,
      error: "createOrder: email und productId sind erforderlich.",
    };
  }

  if (isAblefyDryRun()) {
    const fakeId = `dryrun-${crypto.randomUUID()}`;
    console.log(
      `[Ablefy] DRY_RUN – kein Call gesendet. Geplant war: POST /api/orders ` +
        `product_id=${input.productId} email=${input.email} → Fake-ID ${fakeId}`
    );
    return {
      ok: true,
      orderId: fakeId,
      orderToken: `dryrun-token-${crypto.randomUUID()}`,
      dryRun: true,
      idMissing: false,
      status: 200,
      error: null,
    };
  }

  const result = await request(
    "POST",
    "/api/orders",
    {
      product_id: input.productId,
      email: input.email,
      first_name: input.firstName || undefined,
      last_name: input.lastName || undefined,
    },
    { label: "/api/orders (Zugang anlegen)" }
  );

  if (!result.ok) {
    return { ...base, ok: false, status: result.status, error: result.error };
  }

  const orderId = extractOrderId(result.data);
  const orderToken = extractOrderToken(result.data);

  if (!orderId) {
    console.error(
      "[Ablefy] ALARM: Bestellung angelegt, aber keine order_id in der Antwort. " +
        "Ein Entzug ist für diesen Zugang nicht mehr über die API möglich. Antwort: " +
        JSON.stringify(result.data).slice(0, 500)
    );
    return {
      ...base,
      ok: false,
      orderToken,
      idMissing: true,
      status: result.status,
      error:
        "Ablefy hat die Bestellung angenommen, aber keine order_id zurückgegeben. " +
        "Der Zugang muss manuell im Ablefy-Backend geprüft werden.",
    };
  }

  // Fehlender Token ist kein Abbruch: der Zugang steht. Er wird beim Entzug
  // über GET /api/orders/{id} nachgeholt.
  if (!orderToken) {
    console.warn(
      `[Ablefy] Bestellung ${orderId} angelegt, aber kein Order-Token in der Antwort. ` +
        `Ein Entzug muss den Token später über GET /api/orders/${orderId} nachholen.`
    );
  }

  return {
    ok: true,
    orderId,
    orderToken,
    dryRun: false,
    idMissing: false,
    status: result.status,
    error: null,
  };
}

// ─── Bestellung lesen (Verifikation) ─────────────────────────────────────────

export async function getOrder(
  orderId: string
): Promise<{ ok: boolean; data: unknown; error: string | null }> {
  if (!orderId) return { ok: false, data: null, error: "getOrder: orderId fehlt." };

  if (orderId.startsWith("dryrun-")) {
    return { ok: true, data: { dry_run: true, id: orderId, state: "dryrun" }, error: null };
  }

  const result = await request(
    "GET",
    `/api/orders/${encodeURIComponent(orderId)}`,
    {},
    { label: "/api/orders/:id (lesen)" }
  );
  return { ok: result.ok, data: result.data ?? result.raw, error: result.error };
}

/** Holt den Order-Token zu einer bekannten Bestell-ID nach. */
export async function fetchOrderToken(orderId: string): Promise<string | null> {
  if (!orderId) return null;
  const result = await getOrder(orderId);
  if (!result.ok) return null;
  return extractOrderToken(result.data);
}

// ─── Zugang entziehen ────────────────────────────────────────────────────────

export interface CancelOrderResult {
  ok: boolean;
  dryRun: boolean;
  /** ABLEFY_CANCEL_ENABLED ist aus – es wurde nichts gesendet. */
  disabled: boolean;
  verified: boolean;
  tokenMissing: boolean;
  status: number | null;
  error: string | null;
}

/**
 * Storniert eine Bestellung und entzieht damit den Kurszugang.
 *
 * Defensiv, weil die Route undokumentiert ist: ohne ABLEFY_CANCEL_ENABLED wird
 * gar nichts gesendet, Erfolg wird nie angenommen, und nach dem Call folgt
 * immer ein GET zur Verifikation.
 */
export async function cancelOrder(input: {
  orderId?: string | null;
  orderToken?: string | null;
}): Promise<CancelOrderResult> {
  const { orderId = null, orderToken = null } = input;
  const base: CancelOrderResult = {
    ok: false,
    dryRun: false,
    disabled: false,
    verified: false,
    tokenMissing: false,
    status: null,
    error: null,
  };

  if (!orderId && !orderToken) {
    return {
      ...base,
      tokenMissing: true,
      error:
        "cancelOrder: weder Bestell-ID noch Order-Token vorhanden. Ohne beides ist kein Entzug möglich.",
    };
  }

  if (!isAblefyCancelEnabled()) {
    console.warn(
      `[Ablefy] Storno übersprungen: ABLEFY_CANCEL_ENABLED ist nicht aktiv. ` +
        `Bestellung ${orderId} muss manuell im Ablefy-Backend storniert werden.`
    );
    return {
      ...base,
      disabled: true,
      error:
        "Der automatische Entzug ist deaktiviert (ABLEFY_CANCEL_ENABLED). " +
        "Die Stornierung muss manuell im Ablefy-Backend erfolgen.",
    };
  }

  if (
    isAblefyDryRun() ||
    String(orderId).startsWith("dryrun-") ||
    String(orderToken).startsWith("dryrun-")
  ) {
    console.log(
      `[Ablefy] DRY_RUN – Storno nicht gesendet. Geplant war: POST /api/orders/${orderToken || orderId}/cancel`
    );
    return { ...base, ok: true, dryRun: true, verified: true, status: 200 };
  }

  // Ohne Token wird nicht storniert: mit der ID im Token-Platzhalter quittiert
  // Ablefy den Aufruf mit 2xx und entzieht nichts. Ein Fehlschlag, der wie
  // Erfolg aussieht, ist schlimmer als einer, der sich meldet.
  if (!orderToken) {
    return {
      ...base,
      tokenMissing: true,
      error:
        `Für Bestellung ${orderId} ist kein Order-Token gespeichert. Der Storno verlangt ` +
        "den Token, nicht die Bestellnummer. Der Zugang ist NICHT entzogen.",
    };
  }

  const result = await request(
    "POST",
    `/api/orders/${encodeURIComponent(orderToken)}/cancel`,
    {},
    { label: "/api/orders/:token/cancel (Storno)", body: {} }
  );

  console.log(
    `[Ablefy] Storno-Antwort für ${orderId}: ok=${result.ok} status=${result.status} ` +
      `body=${JSON.stringify(result.data ?? result.raw ?? null).slice(0, 800)}`
  );

  if (!result.ok) {
    return { ...base, status: result.status, error: result.error };
  }

  // Eine 2xx-Antwort ohne JSON ist kein Erfolg: antwortet ein Server auf einen
  // unbekannten Pfad mit HTML oder leerem Body, sagt der Statuscode nichts über
  // die Wirkung.
  const answeredJson = result.data !== null && typeof result.data === "object";
  if (!answeredJson) {
    const preview = String(result.raw ?? "").trim().slice(0, 200);
    const looksHtml = /^<(!doctype|html)/i.test(preview);
    return {
      ...base,
      status: result.status,
      error:
        `Ablefy hat auf die Storno-Route mit HTTP ${result.status}, aber ohne verwertbare ` +
        `Antwort geantwortet${looksHtml ? " (HTML statt JSON)" : ""}. Das spricht dafür, dass ` +
        "diese Route nicht existiert. Der Zugang ist NICHT entzogen.",
    };
  }

  // Verifikation läuft über die ID, nicht über den Token: GET /api/orders nimmt
  // nur die ID.
  const check = orderId
    ? await getOrder(orderId)
    : { ok: false, data: null, error: "Keine Bestell-ID für die Verifikation." };
  const verified = looksCancelled(check.data);
  const state = describeState(check.data);

  return {
    ...base,
    ok: verified,
    verified,
    status: result.status,
    error: verified
      ? null
      : "Der Storno-Call kam mit Erfolg zurück, die Bestellung ist danach aber nicht als " +
        "storniert erkennbar" +
        (state ? ` – Ablefy meldet weiterhin ${state}` : "") +
        ". Der Zugang ist NICHT entzogen.",
  };
}

/**
 * Deutet eine Bestell-Antwort auf "storniert" hin? Bewusst konservativ: nur bei
 * einem klaren Signal true. Lieber ein falscher Alarm als ein Zugang, der
 * weiterläuft, obwohl das System ihn als entzogen führt.
 */
export function looksCancelled(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  if (pick(data, "dry_run")) return true;

  const states = [
    pick(data, "state"),
    pick(data, "status"),
    pick(data, "order_state"),
    pick(data, "payment_state"),
    pick(data, "order", "state"),
    pick(data, "order", "status"),
    pick(data, "data", "state"),
    pick(data, "data", "status"),
  ]
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.toLowerCase());

  if (
    states.some((v) =>
      ["cancelled", "canceled", "refunded", "revoked", "storniert"].includes(v)
    )
  ) {
    return true;
  }
  if (pick(data, "cancelled") === true || pick(data, "canceled") === true) {
    return true;
  }
  if (pick(data, "active") === false) return true;
  return false;
}

/**
 * Beschreibt, welchen Zustand Ablefy zu einer Bestellung meldet. "Die
 * Verifikation bestätigt die Stornierung nicht" sagt dem Admin nichts,
 * "Ablefy meldet weiterhin state=paid" sagt ihm alles.
 */
export function describeState(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const found = (
    [
      ["state", pick(data, "state")],
      ["status", pick(data, "status")],
      ["order_state", pick(data, "order_state")],
      ["payment_state", pick(data, "payment_state")],
      ["order.state", pick(data, "order", "state")],
      ["order.status", pick(data, "order", "status")],
      ["data.state", pick(data, "data", "state")],
      ["data.status", pick(data, "data", "status")],
    ] as [string, unknown][]
  ).filter(([, v]) => typeof v === "string" && v);

  if (found.length === 0) return null;
  return found.map(([k, v]) => `${k}=${v}`).join(", ");
}

// ─── Produkte auflisten (einmalig zur Bestimmung der Produkt-ID) ─────────────

export async function listProducts(): Promise<{
  ok: boolean;
  products: { id: string; name: string }[];
  error: string | null;
}> {
  const result = await request("GET", "/api/products", {}, { label: "/api/products" });
  if (!result.ok) return { ok: false, products: [], error: result.error };

  // Antwortform ist nicht dokumentiert: Array oder Objekt mit products/data.
  const data = result.data;
  const raw = Array.isArray(data)
    ? data
    : (pick(data, "products") ?? pick(data, "data") ?? []);

  const products = (Array.isArray(raw) ? raw : [])
    .map((p: unknown) => ({
      id: pick(p, "id") ?? pick(p, "product_id") ?? null,
      name:
        pick(p, "name") ?? pick(p, "title") ?? pick(p, "internal_name") ?? "(ohne Namen)",
    }))
    .filter((p) => p.id !== null && p.id !== undefined)
    .map((p) => ({ id: String(p.id), name: String(p.name) }));

  return { ok: true, products, error: null };
}
