import {
  getAnthropic,
  CLAUDE_ANALYSIS_MODEL,
  TERMIN_PROTOKOLL_SYSTEM_PROMPT,
} from "@/lib/claude";
import { extractText, parseJson } from "@/lib/ai/json";
import { vttToPlainText } from "@/lib/ai/transcript";

/** Ergebnis der KI-Auswertung eines Termin-Transkripts. */
export interface TerminSummary {
  thema: string;
  zusammenfassung: string;
  protokoll: string;
}

export interface TerminContext {
  klasseName: string;
  datum: Date;
  thema: string | null;
}

interface RawSummary {
  thema?: unknown;
  zusammenfassung?: unknown;
  protokoll?: unknown;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Wertet das Transkript einer Klassen-Session per Claude (Sonnet) aus und liefert
 * Thema, eine kompakte Spiegelstrich-Zusammenfassung und ein ausführliches
 * Meetingprotokoll. Wirft, wenn das Transkript keinen auswertbaren Text enthält.
 */
export async function summarizeTermin(
  transcriptRaw: string,
  ctx: TerminContext
): Promise<TerminSummary> {
  const transcript = vttToPlainText(transcriptRaw);
  if (!transcript) {
    throw new Error("Das Transkript enthält keinen auswertbaren Text.");
  }

  const datumStr = ctx.datum.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const userPrompt = `Klasse: ${ctx.klasseName}
Termin-Datum: ${datumStr}${ctx.thema ? `\nGeplantes Thema: ${ctx.thema}` : ""}

Hier ist das Transkript der Session:
---
${transcript}
---

Erstelle thema, zusammenfassung und protokoll als JSON nach dem im System beschriebenen Schema.`;

  const client = getAnthropic();
  const response = await client.messages.create({
    model: CLAUDE_ANALYSIS_MODEL,
    max_tokens: 6000,
    system: [
      {
        type: "text",
        text: TERMIN_PROTOKOLL_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = parseJson<RawSummary>(extractText(response));
  return {
    thema: asString(raw.thema),
    zusammenfassung: asString(raw.zusammenfassung),
    protokoll: asString(raw.protokoll),
  };
}
