import type Anthropic from "@anthropic-ai/sdk";
import {
  getAnthropic,
  CLAUDE_ANALYSIS_MODEL,
  TERMIN_PROTOKOLL_SYSTEM_PROMPT,
} from "@/lib/claude";
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
 * Tool zum strukturierten Zurückgeben des Ergebnisses. strict: true sorgt dafür,
 * dass die API ein schema-valides Objekt liefert, sodass kein fragiles
 * JSON-Parsing langer Freitexte (Protokoll) nötig ist. Ein erzwungenes
 * tool_choice ("tool"/"any") lehnt Sonnet 5.5 ab; der Systemprompt weist
 * deshalb ausdrücklich an, das Tool zu nutzen.
 */
const PROTOKOLL_TOOL: Anthropic.Tool = {
  name: "submit_protokoll",
  strict: true,
  description:
    "Gibt Thema, kompakte Zusammenfassung und ausführliches Meetingprotokoll der Session strukturiert zurück.",
  input_schema: {
    type: "object",
    properties: {
      thema: {
        type: "string",
        description: "Kurzer, prägnanter Titel der Session (max. 8 Wörter, ohne Datum).",
      },
      zusammenfassung: {
        type: "string",
        description:
          "Kompakte Spiegelstrich-Liste (4–6 Bullets, je eine Zeile, beginnend mit '- ').",
      },
      protokoll: {
        type: "string",
        description:
          "Ausführliches Meetingprotokoll als Klartext mit echten Zeilenumbrüchen, gegliedert mit kurzen Überschriften und Spiegelstrichen.",
      },
    },
    required: ["thema", "zusammenfassung", "protokoll"],
    additionalProperties: false,
  },
};

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

Erstelle thema, zusammenfassung und protokoll und gib sie über das Tool "submit_protokoll" zurück.`;

  const client = getAnthropic();
  const response = await client.messages.create({
    model: CLAUDE_ANALYSIS_MODEL,
    max_tokens: 16000,
    system: [
      {
        type: "text",
        text: TERMIN_PROTOKOLL_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [PROTOKOLL_TOOL],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude hat keine strukturierte Antwort geliefert.");
  }

  const raw = toolUse.input as RawSummary;
  return {
    thema: asString(raw.thema),
    zusammenfassung: asString(raw.zusammenfassung),
    protokoll: asString(raw.protokoll),
  };
}
