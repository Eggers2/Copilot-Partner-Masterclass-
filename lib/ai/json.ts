import type Anthropic from "@anthropic-ai/sdk";

/** Extrahiert den reinen Text aus einer Claude-Antwort (nur Text-Blöcke). */
export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/** Entfernt umschließende ```json … ``` Fences. */
export function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  return trimmed;
}

/**
 * Parst das erste JSON-Objekt/-Array aus einer (ggf. von Prosa umgebenen)
 * Claude-Antwort. Wirft, wenn kein JSON gefunden wird.
 */
export function parseJson<T>(raw: string): T {
  const cleaned = stripJsonFences(raw);
  const firstBrace = cleaned.search(/[[{]/);
  if (firstBrace < 0) {
    throw new Error("Claude-Antwort enthält kein JSON");
  }
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  const payload = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(payload) as T;
}
