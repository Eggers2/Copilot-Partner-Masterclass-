import { randomUUID } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, CLAUDE_MODEL, NEWSLETTER_SYSTEM_PROMPT } from "@/lib/claude";
import type {
  NewsletterNewsItem,
  NewsletterPromptOfWeek,
  NewsletterZahlOfWeek,
  NewsBadge,
} from "./types";

const WEB_SEARCH_TOOL = {
  type: "web_search_20260209" as const,
  name: "web_search" as const,
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
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: NEWSLETTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [WEB_SEARCH_TOOL],
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
    max_tokens: 4000,
    thinking: { type: "adaptive" },
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
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: NEWSLETTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [WEB_SEARCH_TOOL],
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
