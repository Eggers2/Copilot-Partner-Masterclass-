// Parser für den ablefy-Videokurs-Export ("export course_sessions"). Die
// Datei ist semikolongetrennt (UTF-8) mit einer Kopfzeile wie
// ID;NAME;E-MAIL;KURS;PRODUKT-ID;…;STATUS;FORTSCHRITT – ausgewertet werden
// Name, E-Mail und FORTSCHRITT (Anteil gesehener Videos in Prozent, 0–100).
// Dieselbe Adresse kann mehrfach vorkommen (mehrere Buchungen); dann zählt
// der höchste Fortschritt.
//
// Bewusst ohne Server-Imports gehalten: die Dekodierung der Datei läuft im
// Browser (lib/termine/anwesenheit.decodeAnwesenheitsdatei ist generisch und
// wird mitverwendet), parseKursFortschrittExport in der Server Action.

import { normalizeAnwesenheitEmail, splitCsvZeile } from "@/lib/termine/anwesenheit";

export interface ParsedKursFortschritt {
  name: string;
  /** Normalisiert (lowercase), nicht leer. */
  email: string;
  /** Anteil gesehener Videos des Kurses in Prozent (0–100). */
  fortschritt: number;
}

export interface KursFortschrittExportResult {
  /** Eine Zeile je E-Mail (höchster Fortschritt bei Mehrfach-Buchungen). */
  eintraege: ParsedKursFortschritt[];
  error?: string;
}

interface HeaderMapping {
  name: number;
  email: number;
  fortschritt: number;
}

function mapHeader(cells: string[]): HeaderMapping | null {
  const idx = (pred: (c: string) => boolean) =>
    cells.findIndex((c) => pred(c.toLowerCase()));

  const email = idx((c) => c.startsWith("e-mail") || c.startsWith("email"));
  const fortschritt = idx((c) => c === "fortschritt" || c === "progress");
  if (email === -1 || fortschritt === -1) return null;

  return { name: idx((c) => c === "name"), email, fortschritt };
}

/** "84" / "12,5" / "12.5" → gerundeter, auf 0–100 begrenzter Prozentwert. */
function parseFortschritt(raw: string): number {
  const value = parseFloat(raw.replace("%", "").replace(",", ".").trim());
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Parst den kompletten Export. Zeilen ohne gültige E-Mail werden übersprungen
 * (der Abgleich mit den Teilnehmern läuft über E-Mail bzw. Name).
 */
export function parseKursFortschrittExport(text: string): KursFortschrittExportResult {
  const lines = text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");

  // Kopfzeile suchen (erste nicht-leere Zeile, Trennzeichen automatisch).
  let headerIndex = -1;
  let mapping: HeaderMapping | null = null;
  let delimiter = ";";

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    for (const d of [";", "\t", ","]) {
      const m = mapHeader(splitCsvZeile(lines[i], d));
      if (m) {
        headerIndex = i;
        mapping = m;
        delimiter = d;
        break;
      }
    }
    break;
  }

  if (!mapping || headerIndex === -1) {
    return {
      eintraege: [],
      error:
        "Format nicht erkannt. Bitte den unveränderten ablefy-Export der Kurs-Teilnehmer (CSV) hochladen – er enthält die Spalten E-MAIL und FORTSCHRITT.",
    };
  }

  const merged = new Map<string, ParsedKursFortschritt>();

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = splitCsvZeile(line, delimiter);
    const email = normalizeAnwesenheitEmail(cells[mapping.email] ?? "");
    if (!email) continue;

    const name =
      mapping.name >= 0 ? (cells[mapping.name] ?? "").trim() || email : email;
    const fortschritt = parseFortschritt(cells[mapping.fortschritt] ?? "");

    const existing = merged.get(email);
    if (!existing) {
      merged.set(email, { name, email, fortschritt });
    } else if (fortschritt > existing.fortschritt) {
      existing.fortschritt = fortschritt;
    }
  }

  return { eintraege: [...merged.values()] };
}
