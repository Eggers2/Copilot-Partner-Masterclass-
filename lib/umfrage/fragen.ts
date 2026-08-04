import type { RotierendeAntwort, TeilnehmerRolle } from "@prisma/client";

/**
 * Alle Wortlaute der monatlichen Stand-Abfrage als Konstanten. Die Kernfrage
 * und die Blocker-Liste sind FACHLICHE VORGABE und dürfen nie geändert werden
 * (Vergleichbarkeit über alle Runden und Klassen). Die rotierenden Inhalte und
 * die Sofort-Ergebnis-Sätze sind redaktionell anpassbar.
 *
 * Textregeln: keine Gedankenstriche, durchgehend du/ihr, immer
 * "90-Tage-Transformation-Roadmap", keine Modulnummern in Partnertexten.
 */

// ─── Kernfrage (unveränderlich) ──────────────────────────────────────────────

export const KERNFRAGE = "Wo stehst du gerade auf der 90-Tage-Transformation-Roadmap?";
export const KERNFRAGE_HINWEIS =
  "Eine Auswahl. Nimm die höchste Stufe, die du wirklich erreicht hast.";

export const STUFEN: { wert: number; label: string }[] = [
  { wert: 0, label: "Noch nicht gestartet" },
  { wert: 1, label: "Ich arbeite an unserem Angebot, SKUs und Preise sind noch nicht fix" },
  { wert: 2, label: "Unser Angebot steht, SKUs beschrieben und Preise fix" },
  { wert: 3, label: "Bestandskunden-Liste steht, zwei bis fünf Kandidaten sind benannt" },
  { wert: 4, label: "Erster Kunde ist angesprochen" },
  { wert: 5, label: "Erstgespräch geführt" },
  { wert: 6, label: "Angebot liegt beim Kunden" },
  { wert: 7, label: "Workshop verkauft" },
  { wert: 8, label: "Workshop geliefert und abgerechnet" },
  { wert: 9, label: "Folgeauftrag aus dem Workshop entstanden" },
];

/** Die Stufen 2, 5 und 7 entsprechen den drei Meilensteinen der Roadmap. */
export const MEILENSTEINE = [2, 5, 7] as const;

// ─── Technik-Leiter (statt Kernfrage bei Rolle TECHNIK) ─────────────────────

export const TECHNIK_FRAGE = "Wo steht deine technische Lieferfähigkeit?";

export const TECH_STUFEN: { wert: number; label: string }[] = [
  { wert: 0, label: "Noch nicht eingestiegen" },
  { wert: 1, label: "Ich baue Grundlagen auf" },
  { wert: 2, label: "Ich könnte einen Kunden-Tenant vorbereiten" },
  { wert: 3, label: "Ich habe bei einem Kunden geliefert" },
  { wert: 4, label: "Ich habe mehrfach geliefert" },
];

// ─── Rollenfrage (in jeder Runde, vorbelegt mit der letzten Antwort) ────────

export const ROLLEN_FRAGE = "Womit beschäftigst du dich in diesem Programm gerade primär?";

export const ROLLEN: { wert: TeilnehmerRolle; label: string; istAlarm: boolean }[] = [
  { wert: "VERTRIEB", label: "Vertrieb", istAlarm: false },
  { wert: "BERATUNG", label: "Beratung", istAlarm: false },
  { wert: "BEIDES", label: "Beides", istAlarm: false },
  { wert: "TECHNIK", label: "Technik", istAlarm: false },
  { wert: "GESCHAEFTSFUEHRUNG", label: "Geschäftsführung", istAlarm: false },
  // "Das weiß ich nicht" ist ein Alarm und keine Antwort. Sie muss auffallen.
  { wert: "WEISS_NICHT", label: "Das weiß ich nicht", istAlarm: true },
];

export function rolleLabel(rolle: TeilnehmerRolle): string {
  return ROLLEN.find((r) => r.wert === rolle)?.label ?? rolle;
}

// ─── Blocker-Frage (unveränderlich) ─────────────────────────────────────────

export const BLOCKER_FRAGE = "Was bremst dich gerade am stärksten?";
export const BLOCKER_HINWEIS = "Wähle alles aus, was gerade bremst.";

export const BLOCKER: { wert: number; label: string }[] = [
  { wert: 1, label: "Zeit und Tagesgeschäft" },
  { wert: 2, label: "Mir fehlt technische Tiefe" },
  { wert: 3, label: "Interne Abstimmung oder unklare Zuständigkeiten" },
  { wert: 4, label: "Unser Produkt ist noch nicht definiert, SKUs oder Preise" },
  { wert: 5, label: "Kein Zugang zu passenden Kunden" },
  { wert: 6, label: "Ich bin unsicher bei Einwänden, Datenschutz, Kosten, Wettbewerb" },
  { wert: 7, label: "Ich finde Material oder Vorlagen nicht" },
  { wert: 8, label: "Nichts, läuft" },
];

/** Folgefrage nur, wenn Blocker 1 (Zeit) ausgewählt ist. */
export const BLOCKER_ZEIT_FOLGEFRAGE = "Welcher konkrete Schritt ist dabei liegen geblieben?";
/** Folgefrage nur, wenn Blocker 7 (Material) ausgewählt ist: einzeiliger Freitext. */
export const BLOCKER_MATERIAL_FOLGEFRAGE = "Was hast du gesucht?";
/** "Nichts, läuft" schließt die übrigen Blocker aus (exklusive Option). */
export const BLOCKER_NICHTS = 8;

// ─── Rotierende Programmfrage ────────────────────────────────────────────────

export function rotierendeFrage(inhalt: string): string {
  return `Hast du ${inhalt} in den letzten 30 Tagen bei einem echten Kunden angewendet?`;
}

export const ROTIERENDE_ANTWORTEN: { wert: RotierendeAntwort; label: string }[] = [
  { wert: "JA", label: "Ja" },
  { wert: "NEIN_GEPLANT", label: "Nein, aber konkret geplant" },
  { wert: "NEIN", label: "Nein" },
  { wert: "NICHT_RELEVANT", label: "War für mich nicht relevant" },
];

/**
 * Rotationsliste der Inhalte, nach Rundennummer: Runde N bekommt Eintrag
 * (N-1) % Länge. Gleiche Rundennummer = gleicher Inhalt über alle Klassen,
 * sonst wäre die Anwendungsquote im Kohortenvergleich nicht vergleichbar.
 * Im Admin je Runde editierbar, solange die Runde noch nicht versendet wurde.
 * Redaktionell anpassbar; abgeleitet aus den bisherigen Terminthemen.
 */
export const ROTIERENDE_INHALTE: string[] = [
  "die Bewertung der SharePoint-Struktur eines Kunden",
  "das Thema Datenstruktur in einem Kundengespräch",
  "die sechs Entscheidungsfragen aus Phase 0",
  "den Chat-Quick-Start, kostenpflichtig angeboten,",
];

// ─── Sofort-Ergebnis: typischer erster Schritt der nächsten Stufe ───────────
// Redaktionell anpassbar. Index = aktuelle Stufe des Antwortenden.

export const NAECHSTER_SCHRITT: string[] = [
  "Der übliche erste Schritt: blocke dir zwei Stunden und skizziere euer Copilot-Angebot, noch ohne fertige Preise.",
  "Der übliche erste Schritt: beschreibe eure SKUs und setze feste Preise, auch wenn ihr sie später noch anpasst.",
  "Der übliche erste Schritt: schreibe eure Bestandskunden-Liste und benenne zwei bis fünf Kandidaten. Das kostet etwa zwanzig Minuten.",
  "Der übliche erste Schritt: sprich den ersten Kandidaten von deiner Liste direkt an, per Anruf oder kurzer Mail.",
  "Der übliche erste Schritt: mache aus dem Kontakt einen festen Termin für das Erstgespräch.",
  "Der übliche erste Schritt: schicke dem Kunden nach dem Erstgespräch ein konkretes Angebot.",
  "Der übliche erste Schritt: fasse beim Kunden nach und hole die Entscheidung zum Workshop ein.",
  "Der übliche erste Schritt: terminiere die Durchführung und stelle die Rechnung direkt nach dem Workshop.",
  "Der übliche erste Schritt: sprich im Abschlussgespräch den Folgeauftrag an, zum Beispiel das Copilot Adoption-Programm.",
  "Stark, du hast die 90-Tage-Transformation-Roadmap komplett durchlaufen. Wiederhole den Weg mit dem nächsten Bestandskunden.",
];

export const NAECHSTER_SCHRITT_TECHNIK: string[] = [
  "Der übliche erste Schritt: richte dir eine eigene Testumgebung ein und arbeite dich in die Grundlagen ein.",
  "Der übliche erste Schritt: spiele die Vorbereitung eines Kunden-Tenants einmal komplett in deiner Testumgebung durch.",
  "Der übliche erste Schritt: übernimm beim nächsten Kundenprojekt die technische Vorbereitung, zum Beispiel das Readiness- und Purview-Audit.",
  "Der übliche erste Schritt: liefere bei einem weiteren Kunden, damit aus dem Einzelfall Routine wird.",
  "Stark, du lieferst technisch zuverlässig. Gib dein Wissen ans Team weiter, damit die Lieferfähigkeit nicht an dir allein hängt.",
];

// ─── Anonymes Feld ───────────────────────────────────────────────────────────

export const ANONYM_LABEL = "Möchtest du uns noch etwas mitgeben?";
export const ANONYM_HINWEIS =
  "Dieses Feld ist anonym. Es wird ohne deinen Namen gespeichert und kann dir nicht zugeordnet werden.";
