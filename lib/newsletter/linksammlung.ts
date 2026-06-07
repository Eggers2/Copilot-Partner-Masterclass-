/**
 * HTTP-Client für die externe "Linksammlung"-API (separate Railway-Instanz).
 *
 * Liefert kuratierte, bereits KI-aufbereitete Links (titleDe, summary,
 * longSummary, category, siteName …). Read-only. Dies ist der einzige Ort im
 * Projekt, der das API-Schema der Linksammlung kennt – bei Schema-Änderungen
 * nur hier anpassen.
 *
 * Server-only: Das Token darf niemals client-seitig landen.
 */

const DEFAULT_BASE_URL = "https://linksammlung-production.up.railway.app";

function baseUrl(): string {
  const raw = process.env.LINKSAMMLUNG_API_URL?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export interface LinkRow {
  id: string;
  url: string;
  title: string | null;
  titleDe: string | null;
  summary: string | null;
  longSummary: string | null;
  category: string | null;
  tags: string[];
  sourceType: string | null;
  siteName: string | null;
  imageUrl: string | null;
  language: string | null;
  createdAt: string | null;
}

export interface FetchLinksOptions {
  /** max. Anzahl (Default 100, Maximum 500) */
  limit?: number;
  /** exakte Kategorie, z.B. "Microsoft 365" */
  category?: string;
  /** ISO-Datum/Zeit; nur Einträge mit createdAt >= since */
  since?: string;
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeRow(raw: unknown): LinkRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const url = str(r.url);
  if (!url) return null; // ohne URL unbrauchbar – sie ist die Quelle im Newsletter
  return {
    id: str(r.id) ?? url,
    url,
    title: str(r.title),
    titleDe: str(r.titleDe),
    summary: str(r.summary),
    longSummary: str(r.longSummary),
    category: str(r.category),
    tags: strArray(r.tags),
    sourceType: str(r.sourceType),
    siteName: str(r.siteName),
    imageUrl: str(r.imageUrl),
    language: str(r.language),
    createdAt: str(r.createdAt),
  };
}

/**
 * Generischer GET-Aufruf gegen die Linksammlung-API mit Bearer-Token. Wirft
 * einen sprechenden Fehler, wenn das Token fehlt oder die API nicht erreichbar
 * ist – dieser landet im Newsletter-Modul über logPartial in `fehlerText`.
 */
async function apiGet(
  path: string,
  params: Record<string, string | undefined>
): Promise<unknown> {
  const token = process.env.LINKSAMMLUNG_API_TOKEN;
  if (!token) {
    throw new Error(
      "LINKSAMMLUNG_API_TOKEN nicht gesetzt. Bitte das Read-Token der Linksammlung in den Environment-Variablen hinterlegen."
    );
  }

  const url = new URL(`${baseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // Newsletter-Inhalte sollen frisch sein – kein Caching durch Next.
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Netzwerkfehler";
    throw new Error(`Linksammlung-API nicht erreichbar: ${msg}`);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(
      `Linksammlung-API antwortete mit ${res.status}${body?.error ? `: ${body.error}` : ""}`
    );
  }

  return res.json().catch(() => null);
}

/**
 * Holt Links aus der Linksammlung-API (neueste zuerst).
 */
export async function fetchLinks(opts: FetchLinksOptions = {}): Promise<LinkRow[]> {
  const data = (await apiGet("/api/links", {
    limit: String(Math.min(Math.max(opts.limit ?? 100, 1), 500)),
    category: opts.category,
    since: opts.since,
  })) as { links?: unknown[] } | null;
  const rows = Array.isArray(data?.links) ? data!.links : [];
  return rows.map(normalizeRow).filter((r): r is LinkRow => r !== null);
}

// ───────────────────────────────────────────────────────────────────────────
// Events / Termine (GET /api/events)
// ───────────────────────────────────────────────────────────────────────────

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  role: string | null;
  imageUrl: string | null;
}

export interface FetchEventsOptions {
  /** SPEAKER | PROMOTE – ohne Angabe liefert die API alle Rollen */
  role?: string;
  /** true = auch vergangene Termine */
  all?: boolean;
  /** max. Anzahl (clientseitig begrenzt; API liefert aufsteigend nach Start) */
  limit?: number;
}

function normalizeEvent(raw: unknown): EventRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title);
  if (!title) return null; // ohne Titel nicht darstellbar
  return {
    id: str(r.id) ?? title,
    title,
    description: str(r.description),
    url: str(r.url),
    location: str(r.location),
    startsAt: str(r.startsAt),
    endsAt: str(r.endsAt),
    role: str(r.role),
    imageUrl: str(r.imageUrl),
  };
}

/**
 * Holt kommende Termine aus der Linksammlung-API (standardmäßig nur
 * zukünftige, aufsteigend nach Startdatum).
 */
export async function fetchEvents(opts: FetchEventsOptions = {}): Promise<EventRow[]> {
  const data = (await apiGet("/api/events", {
    role: opts.role,
    all: opts.all ? "true" : undefined,
  })) as { events?: unknown[] } | null;
  const rows = Array.isArray(data?.events) ? data!.events : [];
  const events = rows
    .map(normalizeEvent)
    .filter((e): e is EventRow => e !== null);
  return typeof opts.limit === "number" ? events.slice(0, opts.limit) : events;
}
