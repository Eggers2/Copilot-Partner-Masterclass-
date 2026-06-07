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
 * Holt Links aus der Linksammlung-API (neueste zuerst). Wirft einen
 * sprechenden Fehler, wenn das Token fehlt oder die API nicht erreichbar ist –
 * dieser landet im Newsletter-Modul über logPartial in `fehlerText`.
 */
export async function fetchLinks(opts: FetchLinksOptions = {}): Promise<LinkRow[]> {
  const token = process.env.LINKSAMMLUNG_API_TOKEN;
  if (!token) {
    throw new Error(
      "LINKSAMMLUNG_API_TOKEN nicht gesetzt. Bitte das Read-Token der Linksammlung in den Environment-Variablen hinterlegen."
    );
  }

  const url = new URL(`${baseUrl()}/api/links`);
  url.searchParams.set("limit", String(Math.min(Math.max(opts.limit ?? 100, 1), 500)));
  if (opts.category) url.searchParams.set("category", opts.category);
  if (opts.since) url.searchParams.set("since", opts.since);

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

  const data = (await res.json().catch(() => null)) as { links?: unknown[] } | null;
  const rows = Array.isArray(data?.links) ? data!.links : [];
  return rows.map(normalizeRow).filter((r): r is LinkRow => r !== null);
}
