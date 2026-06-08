import {
  getAnthropic,
  CLAUDE_ANALYSIS_MODEL,
  FIRST_CALL_SYSTEM_PROMPT,
} from "@/lib/claude";
import { extractText, parseJson } from "@/lib/ai/json";

/** Die 8 Scorecard-Kriterien (Reihenfolge wie im First Call Scoring). */
export const SCORE_KEYS = [
  "copilotDemand",
  "currentOffer",
  "teamCapacity",
  "decisionMaker",
  "budgetReadiness",
  "urgency",
  "mindset",
  "msPartnerStatus",
] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

const PACKAGE_LABELS = ["Starter", "Team", "Business"] as const;
const CONTACT_SOURCES = ["ADN", "Warteliste", "Training", "LinkedIn", "Sonstiges"] as const;

/** Strukturiertes Ergebnis der KI-Auswertung eines First-Call-Transkripts. */
export interface FirstCallAnalysis {
  scores: Record<ScoreKey, number>;
  reasoning: Record<ScoreKey, string>;
  notes: {
    description: string;
    painPoint: string;
    teamSize: string;
    recommendedPackage: string; // "" | "Starter" | "Team" | "Business"
    objections: string;
    nextStep: string;
    contactSource: string; // "" | ADN | Warteliste | Training | LinkedIn | Sonstiges
    deadlineDate: string | null; // YYYY-MM-DD (Call + 10 Tage)
    followUpDate: string | null; // YYYY-MM-DD (Deadline − 3 Tage)
  };
  email: { subject: string; body: string };
}

export interface FirstCallLeadContext {
  name: string | null;
  company: string | null;
  city: string | null;
  email: string;
}

/** Entfernt VTT-Metadaten (Header, Cue-Nummern, Timestamps, NOTE) → reiner Text. */
function vttToPlainText(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((line) => {
      if (!line) return false;
      if (line === "WEBVTT") return false;
      if (/^NOTE\b/.test(line)) return false;
      if (/^\d+$/.test(line)) return false; // Cue-Nummer
      if (/-->/.test(line)) return false; // Timestamp-Zeile
      return true;
    })
    .join("\n");
}

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function pickFrom<T extends string>(v: unknown, allowed: readonly T[]): string {
  const s = asString(v);
  return (allowed as readonly string[]).includes(s) ? s : "";
}

function asIsoDate(v: unknown): string | null {
  const s = asString(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

interface RawAnalysis {
  scores?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
  notes?: Record<string, unknown>;
  email?: { subject?: unknown; body?: unknown };
}

/**
 * Wertet ein VTT-Transkript per Claude Sonnet aus und liefert Scores (mit
 * Begründung), Gesprächsnotizen und einen Entscheidungs-Mail-Entwurf. Werte
 * werden serverseitig validiert/geclamped, damit die UI sich auf das Schema
 * verlassen kann.
 */
export async function analyzeFirstCall(
  vttText: string,
  lead: FirstCallLeadContext,
  today: Date
): Promise<FirstCallAnalysis> {
  const transcript = vttToPlainText(vttText);
  if (!transcript) {
    throw new Error("Das Transkript enthält keinen auswertbaren Text.");
  }

  const todayStr = today.toISOString().slice(0, 10);
  const leadLine = [
    lead.name ?? "(Name unbekannt)",
    lead.company ? `(${lead.company})` : "",
    lead.city ? `, ${lead.city}` : "",
  ]
    .join(" ")
    .replace(/\s+,/, ",")
    .replace(/\s{2,}/g, " ")
    .trim();

  const userPrompt = `Heutiges Datum (Call-Datum): ${todayStr}
Lead: ${leadLine} – E-Mail: ${lead.email}

Hier ist das Transkript des Erstgesprächs:
---
${transcript}
---

Werte das Gespräch aus und liefere das JSON nach dem im System beschriebenen Schema.
Berechne deadlineDate = Call-Datum + 10 Tage und followUpDate = deadlineDate − 3 Tage.
Sprich den Lead in der Mail mit Vornamen an (aus dem Namen ableiten) und nutze "du/ihr".`;

  const client = getAnthropic();
  const response = await client.messages.create({
    model: CLAUDE_ANALYSIS_MODEL,
    max_tokens: 6000,
    system: [
      {
        type: "text",
        text: FIRST_CALL_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = parseJson<RawAnalysis>(extractText(response));

  const scores = {} as Record<ScoreKey, number>;
  const reasoning = {} as Record<ScoreKey, string>;
  for (const key of SCORE_KEYS) {
    scores[key] = clampScore(raw.scores?.[key]);
    reasoning[key] = asString(raw.reasoning?.[key]);
  }

  const notes = raw.notes ?? {};
  return {
    scores,
    reasoning,
    notes: {
      description: asString(notes.description),
      painPoint: asString(notes.painPoint),
      teamSize: asString(notes.teamSize),
      recommendedPackage: pickFrom(notes.recommendedPackage, PACKAGE_LABELS),
      objections: asString(notes.objections),
      nextStep: asString(notes.nextStep),
      contactSource: pickFrom(notes.contactSource, CONTACT_SOURCES),
      deadlineDate: asIsoDate(notes.deadlineDate),
      followUpDate: asIsoDate(notes.followUpDate),
    },
    email: {
      subject: asString(raw.email?.subject),
      body: asString(raw.email?.body),
    },
  };
}
