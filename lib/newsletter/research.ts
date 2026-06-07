import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, CLAUDE_MODEL, NEWSLETTER_SYSTEM_PROMPT } from "@/lib/claude";
import { fetchLinks, type LinkRow } from "./linksammlung";
import type {
  NewsletterNewsItem,
  NewsletterPromptOfWeek,
  NewsletterZahlOfWeek,
  NewsBadge,
} from "./types";

const WEB_SEARCH_NEWS = {
  type: "web_search_20260209" as const,
  name: "web_search" as const,
  max_uses: 2,
  allowed_callers: ["direct" as const],
};

const WEB_SEARCH_ZAHL = {
  type: "web_search_20260209" as const,
  name: "web_search" as const,
  max_uses: 1,
  allowed_callers: ["direct" as const],
};

const ALLOWED_BADGES: NewsBadge[] = [
  "PREMIUM",
  "CHAT",
  "STUDIO",
  "DATENSCHUTZ",
  "DISTRIBUTOR",
  "EVENT",
  "ADOPTION",
];

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  return trimmed;
}

function parseJson<T>(raw: string): T {
  const cleaned = stripJsonFences(raw);
  const firstBrace = cleaned.search(/[\[{]/);
  if (firstBrace < 0) {
    throw new Error("Claude-Antwort enthält kein JSON");
  }
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  const payload = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(payload) as T;
}

function normalizeBadge(input: string): NewsBadge {
  const upper = input.trim().toUpperCase();
  if ((ALLOWED_BADGES as string[]).includes(upper)) return upper as NewsBadge;
  if (upper.includes("STUDIO")) return "STUDIO";
  if (upper.includes("PREM")) return "PREMIUM";
  if (upper.includes("DATEN") || upper.includes("PRIVACY")) return "DATENSCHUTZ";
  if (upper.includes("DIST") || upper.includes("ADN")) return "DISTRIBUTOR";
  if (upper.includes("EVENT")) return "EVENT";
  if (upper.includes("ADOPT")) return "ADOPTION";
  return "CHAT";
}

export interface ResearchNewsOptions {
  topics?: string[];
  excludeUrls?: string[];
  count?: number;
}

const DEFAULT_TOPICS = [
  "Microsoft Copilot Chat",
  "Microsoft 365 Copilot Premium",
  "Microsoft Copilot Studio",
  "Microsoft Copilot Datenschutz / Compliance / Privacy",
];

export async function researchNews(
  opts: ResearchNewsOptions = {}
): Promise<NewsletterNewsItem[]> {
  const topics = opts.topics ?? DEFAULT_TOPICS;
  const count = opts.count ?? 10;
  const excludeUrls = opts.excludeUrls ?? [];

  const excludeBlock =
    excludeUrls.length > 0
      ? `\n\nDiese URLs haben wir bereits verwendet – bitte NICHT erneut nennen und keine inhaltlichen Dubletten:\n${excludeUrls
          .map((u) => `- ${u}`)
          .join("\n")}`
      : "";

  const userPrompt = `Recherchiere über die web_search die ${count} wichtigsten News der letzten 7 Tage zu folgenden Themen (jeweils mit Relevanz für Microsoft-Partner, die Copilot verkaufen):

${topics.map((t) => `- ${t}`).join("\n")}

Für jede News liefere:
- badge: EXAKT einer dieser Werte – PREMIUM, CHAT, STUDIO, DATENSCHUTZ, DISTRIBUTOR, EVENT, ADOPTION
- title: knackige Headline (max 80 Zeichen)
- body: 1–2 Sätze, worum es geht und warum es für Microsoft-Partner relevant ist (max 280 Zeichen)
- cta: ein kurzer Partner-Call-to-Action, der mit "→" beginnt (max 90 Zeichen), z.B. "→ Pipeline prüfen – blockierte Deals sind wieder im Spiel."
- sourceLabel: Kurzname der Quelle ("Microsoft Blog", "365NinjaCat", "ChangePilot", "Microsoft Partner Center", "Microsoft Learn", etc.)
- sourceUrl: die echte URL der Originalquelle (vollständig, mit https://)

WICHTIG:
- Nur News, die tatsächlich in den letzten 7 Tagen veröffentlicht wurden.
- Quelle muss real und aufrufbar sein. Wenn du keine echte Quelle findest, nimm die News nicht auf.
- Keine doppelten Themen.
- Keine allgemeinen Tutorials, sondern konkrete Produkt-/Feature-/Konditionsnachrichten.${excludeBlock}

Antworte ausschließlich mit einem JSON-Array nach dieser Struktur:
[
  {
    "badge": "PREMIUM",
    "title": "…",
    "body": "…",
    "cta": "→ …",
    "sourceLabel": "…",
    "sourceUrl": "https://…"
  }
]`;

  const client = getAnthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: NEWSLETTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [WEB_SEARCH_NEWS],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = extractText(response);
  const parsed = parseJson<
    Array<{
      badge: string;
      title: string;
      body: string;
      cta: string;
      sourceLabel: string;
      sourceUrl: string;
    }>
  >(text);

  return parsed.map((item) => ({
    id: randomUUID(),
    badge: normalizeBadge(item.badge),
    title: (item.title ?? "").trim(),
    body: (item.body ?? "").trim(),
    cta: (item.cta ?? "").trim(),
    sourceLabel: (item.sourceLabel ?? "").trim(),
    sourceUrl: (item.sourceUrl ?? "").trim(),
  }));
}

export async function generatePromptOfWeek(): Promise<NewsletterPromptOfWeek> {
  const userPrompt = `Schlage einen "Prompt der Woche" für den Copilot-Insider-Update-Newsletter vor. Zielgruppe: Microsoft-Partner und deren Endkunden.

Der Prompt soll:
- ein konkretes Business-Szenario adressieren (Meeting-Nachbereitung, Angebotserstellung, Kundenrecherche, Vertriebs-Follow-up, etc.)
- in Microsoft 365 Copilot (Chat / Premium) funktionieren
- so formuliert sein, dass man ihn wörtlich kopieren kann
- einen klaren Sales-Hook für Partner haben (der Aha-Moment, der Copilot-Lizenzen verkauft)

Antworte ausschließlich mit JSON:
{
  "badge": "COPILOT PREMIUM",
  "title": "Kurzer Titel (max 60 Zeichen)",
  "body": "Der fertige Prompt, wortwörtlich kopierbar, 2–4 Sätze",
  "tipp": "1 Satz Sales-Tipp für Partner, beginnend mit einem konkreten Einsatzhinweis"
}`;

  const client = getAnthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: NEWSLETTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = extractText(response);
  const parsed = parseJson<NewsletterPromptOfWeek>(text);
  return {
    badge: (parsed.badge ?? "COPILOT PREMIUM").trim(),
    title: (parsed.title ?? "").trim(),
    body: (parsed.body ?? "").trim(),
    tipp: (parsed.tipp ?? "").trim(),
  };
}

export async function generateZahlOfWeek(): Promise<NewsletterZahlOfWeek> {
  const userPrompt = `Recherchiere über die web_search eine aktuelle, belegbare Zahl rund um Microsoft Copilot / Microsoft 365 / KI im Enterprise-Kontext (aus den letzten ~4 Wochen, idealerweise aus Microsoft-Earnings, Studien, IDC/Gartner/Forrester, offiziellen Microsoft-Posts).

Beispiele für das Format (nicht diese Zahlen verwenden):
- "90% der Fortune 500 nutzen Microsoft Copilot"
- "3,2x ROI im ersten Jahr laut Forrester TEI Study"

Antworte ausschließlich mit JSON:
{
  "wert": "die Zahl selbst, prominent (z.B. \"90%\", \"3,2x\", \"1,4 Mrd.\")",
  "titel": "kurze Einordnung in 1 Zeile (max 70 Zeichen)",
  "body": "1 Satz Kontext, warum diese Zahl für Partner relevant ist (max 160 Zeichen)"
}`;

  const client = getAnthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: NEWSLETTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [WEB_SEARCH_ZAHL],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = extractText(response);
  const parsed = parseJson<NewsletterZahlOfWeek>(text);
  return {
    wert: (parsed.wert ?? "").trim(),
    titel: (parsed.titel ?? "").trim(),
    body: (parsed.body ?? "").trim(),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// News aus der Linksammlung (statt Claude-Websuche)
// ───────────────────────────────────────────────────────────────────────────

function hostnameFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Wählt bis zu `count` Links aus, möglichst ausgewogen über die vorhandenen
 * Kategorien gestreut (Round-Robin). Innerhalb einer Kategorie bleibt die
 * Eingabereihenfolge erhalten (API liefert neueste zuerst). Links ohne
 * Kategorie werden hinten angestellt.
 */
function pickBalanced(links: LinkRow[], count: number): LinkRow[] {
  const NO_CATEGORY = " ";
  const groups = new Map<string, LinkRow[]>();
  for (const link of links) {
    const key = link.category ?? NO_CATEGORY;
    const bucket = groups.get(key);
    if (bucket) bucket.push(link);
    else groups.set(key, [link]);
  }
  // Kategorien mit Inhalt zuerst, "ohne Kategorie" zuletzt.
  const buckets = [...groups.entries()]
    .sort(([a], [b]) => (a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : 0))
    .map(([, v]) => v);

  const picked: LinkRow[] = [];
  let progress = true;
  while (picked.length < count && progress) {
    progress = false;
    for (const bucket of buckets) {
      if (picked.length >= count) break;
      const next = bucket.shift();
      if (next) {
        picked.push(next);
        progress = true;
      }
    }
  }
  return picked;
}

export interface NewsFromLinksammlungOptions {
  count?: number;
  excludeUrls?: string[];
}

/**
 * Holt kuratierte Links aus der Linksammlung-API, streut sie ausgewogen über
 * die Kategorien und lässt Claude pro Link den redaktionellen Partner-Text
 * (badge/title/body/cta) schreiben. Die echte URL und der Quellname kommen
 * deterministisch aus der API – nie aus dem Modell. Ein einziger Claude-Call,
 * ohne web_search (Inhalt und URL sind bereits bekannt).
 */
export async function newsFromLinksammlung(
  opts: NewsFromLinksammlungOptions = {}
): Promise<NewsletterNewsItem[]> {
  const count = opts.count ?? 5;
  const exclude = new Set((opts.excludeUrls ?? []).map((u) => u.toLowerCase()));

  const all = await fetchLinks({ limit: 100 });
  const available = all.filter((l) => !exclude.has(l.url.toLowerCase()));
  const selected = pickBalanced(available, count);
  if (selected.length === 0) return [];

  // Stabile Kurz-IDs entkoppeln das id-Echo vom DB-Wert (robust gg. Halluzination).
  const indexed = selected.map((link, i) => ({ key: `L${i + 1}`, link }));

  const linkBlock = indexed
    .map(({ key, link }) => {
      const titel = link.titleDe ?? link.title ?? "(kein Titel)";
      const beschreibung = link.longSummary ?? link.summary ?? "(keine Beschreibung)";
      const tags = link.tags.length > 0 ? link.tags.join(", ") : "(keine)";
      return `- id: ${key}
  titel: ${titel}
  kategorie: ${link.category ?? "(keine)"}
  quelle: ${link.siteName ?? hostnameFrom(link.url)}
  tags: ${tags}
  beschreibung: ${beschreibung}`;
    })
    .join("\n\n");

  const userPrompt = `Du bekommst ${indexed.length} kuratierte, bereits recherchierte Links für den "Copilot Insider Update"-Newsletter. Schreibe pro Link einen redaktionellen Eintrag für Microsoft-Partner.

WICHTIG: Recherchiere NICHT und erfinde KEINE Fakten oder URLs. Nutze ausschließlich die unten gelieferten Angaben (titel, beschreibung, kategorie, tags) als Grundlage.

LINKS:
${linkBlock}

Für jeden Link liefere ein Objekt mit:
- id: EXAKT die mitgegebene id (z.B. "L1") – unverändert zurückgeben, damit wir die Quelle korrekt zuordnen können
- badge: EXAKT einer dieser Werte – PREMIUM, CHAT, STUDIO, DATENSCHUTZ, DISTRIBUTOR, EVENT, ADOPTION (passend zu Kategorie/Inhalt wählen)
- title: knackige deutsche Headline (max 80 Zeichen)
- body: 1–2 Sätze, worum es geht und warum es für Microsoft-Partner relevant ist (max 280 Zeichen)
- cta: ein kurzer Partner-Call-to-Action, der mit "→" beginnt (max 90 Zeichen)

Regeln:
- Gib für JEDEN gelieferten Link genau ein Objekt zurück, in derselben Reihenfolge.
- Gib KEINE sourceUrl aus – die echte URL hängen wir selbst an.
- Antworte ausschließlich mit einem JSON-Array, ohne Markdown-Fences, ohne Prosa.

Struktur:
[
  { "id": "L1", "badge": "CHAT", "title": "…", "body": "…", "cta": "→ …" }
]`;

  const client = getAnthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: [
      {
        type: "text",
        text: NEWSLETTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const parsed = parseJson<
    Array<{ id: string; badge: string; title: string; body: string; cta: string }>
  >(extractText(response));

  const byKey = new Map(indexed.map((x) => [x.key, x.link]));
  const items: NewsletterNewsItem[] = [];
  for (const p of parsed) {
    const key = (p.id ?? "").trim();
    const link = byKey.get(key);
    if (!link) continue; // unbekanntes/halluziniertes id -> verwerfen
    byKey.delete(key); // gegen doppelte Echos
    items.push({
      id: randomUUID(),
      badge: normalizeBadge(p.badge ?? ""),
      title: (p.title ?? "").trim(),
      body: (p.body ?? "").trim(),
      cta: (p.cta ?? "").trim(),
      sourceLabel: link.siteName ?? hostnameFrom(link.url),
      sourceUrl: link.url,
    });
  }
  return items;
}
