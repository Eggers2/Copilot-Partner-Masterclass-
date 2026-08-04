// Parser für den Microsoft-Teams-Anwesenheitsbericht (CSV-Export eines
// Meetings). Die Datei ist trotz .csv-Endung UTF-16LE-kodiert und
// tab-getrennt und besteht aus nummerierten Abschnitten ("1. Zusammenfassung",
// "2. Teilnehmer", …). Ausgewertet wird der Abschnitt "2. Teilnehmer" – dort
// steht pro Person eine aggregierte Zeile mit Name, Beitritt/Verlassen,
// Gesamtdauer, E-Mail und Rolle.
//
// Bewusst ohne Server-Imports gehalten: decodeAnwesenheitsdatei läuft im
// Browser (FileReader/ArrayBuffer), parseAnwesenheitsbericht in der Server
// Action.

export interface ParsedAnwesenheit {
  name: string;
  /** Normalisiert (lowercase); leer, wenn der Bericht keine E-Mail enthält. */
  email: string;
  rolle: string | null;
  dauerSekunden: number;
  ersterBeitritt: Date | null;
  letztesVerlassen: Date | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAnwesenheitEmail(raw: string): string {
  const clean = raw.trim().toLowerCase();
  return EMAIL_RE.test(clean) ? clean : "";
}

/**
 * Dekodiert die hochgeladene Berichtsdatei. Teams exportiert UTF-16LE mit BOM;
 * zur Sicherheit werden UTF-16BE und UTF-8 (z.B. nach manuellem Re-Export aus
 * Excel) ebenfalls erkannt.
 */
export function decodeAnwesenheitsdatei(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer);
  }
  // Ohne BOM: viele NUL-Bytes deuten auf UTF-16LE hin.
  const probe = Math.min(bytes.length, 2000);
  let nul = 0;
  for (let i = 0; i < probe; i++) if (bytes[i] === 0) nul++;
  if (probe > 0 && nul / probe > 0.2) {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  return new TextDecoder("utf-8").decode(buffer);
}

/** "1h 2m 3s" / "7s" / "1 Std. 5 Min." → Sekunden. Unbekanntes ergibt 0. */
export function parseDauerToSekunden(raw: string): number {
  let total = 0;
  for (const m of raw.matchAll(/(\d+)\s*([a-zA-ZäöüÄÖÜ.]+)/g)) {
    const value = parseInt(m[1], 10);
    const unit = m[2].toLowerCase().replace(/\./g, "");
    if (unit === "h" || unit === "hr" || unit === "hrs" || unit === "std") {
      total += value * 3600;
    } else if (unit === "m" || unit === "min" || unit === "mins") {
      total += value * 60;
    } else if (unit === "s" || unit === "sec" || unit === "sek") {
      total += value;
    }
  }
  return total;
}

/** Sekunden → kompakte Anzeige, z.B. "1 h 23 min" oder "45 s". */
export function formatDauer(sekunden: number): string {
  if (sekunden < 60) return `${sekunden} s`;
  const h = Math.floor(sekunden / 3600);
  const m = Math.floor((sekunden % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Zeitstempel des Berichts → Date. Teams exportiert je nach Systemsprache
 * US-Format ("6/17/26, 10:52:53 AM") oder deutsches Format
 * ("17.06.26, 10:52:53"). Die Zeiten sind lokale Zeiten (Europe/Berlin beim
 * Export hierzulande) – für die Auswertung reicht Minutengenauigkeit, daher
 * wird pragmatisch mit fixem Berlin-Offset über Intl geprüft.
 */
export function parseBerichtZeit(raw: string): Date | null {
  const t = raw.trim();
  if (!t) return null;

  let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;

  const us = t.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
  );
  const de = us
    ? null
    : t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (us) {
    month = parseInt(us[1], 10);
    day = parseInt(us[2], 10);
    year = parseInt(us[3], 10);
    hour = parseInt(us[4], 10);
    minute = parseInt(us[5], 10);
    second = us[6] ? parseInt(us[6], 10) : 0;
    const ampm = us[7]?.toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
  } else if (de) {
    day = parseInt(de[1], 10);
    month = parseInt(de[2], 10);
    year = parseInt(de[3], 10);
    hour = parseInt(de[4], 10);
    minute = parseInt(de[5], 10);
    second = de[6] ? parseInt(de[6], 10) : 0;
  } else {
    return null;
  }

  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Als Berlin-Zeit interpretieren: Sommer- und Winterzeit-Offset probieren
  // und den nehmen, der auf die gewünschte Stunde zurückführt (analog
  // lib/datetime.parseBerlinDate, hier mit Sekunden).
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
  const cest = new Date(`${base}+02:00`);
  const cet = new Date(`${base}+01:00`);
  if (Number.isNaN(cest.getTime())) return null;
  const berlinHour = (d: Date) =>
    Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Berlin",
        hour: "numeric",
        hour12: false,
      }).format(d)
    );
  if (berlinHour(cest) === hour % 24) return cest;
  if (berlinHour(cet) === hour % 24) return cet;
  return cest;
}

/**
 * Quote-bewusstes Zerlegen einer CSV-Zeile am gegebenen Trennzeichen.
 * Auch vom Videokurs-Parser (lib/kurs/fortschritt.ts) genutzt.
 */
export function splitCsvZeile(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

interface HeaderMapping {
  name: number;
  email: number;
  rolle: number;
  dauer: number;
  beitritt: number;
  verlassen: number;
}

function mapHeader(cells: string[]): HeaderMapping | null {
  const idx = (pred: (c: string) => boolean) =>
    cells.findIndex((c) => pred(c.toLowerCase()));

  const name = idx((c) => c === "name" || c === "vollständiger name" || c === "full name");
  const email = idx((c) => c.startsWith("e-mail") || c.startsWith("email"));
  if (name === -1 || email === -1) return null;

  return {
    name,
    email,
    rolle: idx((c) => c === "rolle" || c === "role"),
    dauer: idx((c) => c.startsWith("dauer") || c.includes("duration")),
    beitritt: idx((c) => c.startsWith("erster beitritt") || c.startsWith("first join")),
    verlassen: idx((c) => c.includes("verlassen") || c.includes("last leave")),
  };
}

export interface AnwesenheitsberichtResult {
  teilnehmer: ParsedAnwesenheit[];
  error?: string;
}

/**
 * Parst den Abschnitt "2. Teilnehmer" (bzw. "2. Participants") des
 * Teams-Anwesenheitsberichts. Doppelte Zeilen derselben Person (gleiche
 * E-Mail bzw. gleicher Name) werden zusammengeführt: Dauern summiert,
 * frühester Beitritt / spätestes Verlassen behalten.
 */
export function parseAnwesenheitsbericht(text: string): AnwesenheitsberichtResult {
  const lines = text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");

  // Abschnitt "2. Teilnehmer" suchen; danach kommt die Kopfzeile der Tabelle.
  let headerIndex = -1;
  let mapping: HeaderMapping | null = null;
  let delimiter = "\t";

  const sectionIndex = lines.findIndex((l) =>
    /^\s*2\.\s*(teilnehmer|participants)/i.test(l.trim())
  );
  const searchFrom = sectionIndex >= 0 ? sectionIndex + 1 : 0;

  for (let i = searchFrom; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    for (const d of ["\t", ";", ","]) {
      const m = mapHeader(splitCsvZeile(line, d));
      if (m) {
        headerIndex = i;
        mapping = m;
        delimiter = d;
        break;
      }
    }
    if (mapping) break;
    // Innerhalb des Teilnehmer-Abschnitts muss die erste nicht-leere Zeile
    // die Kopfzeile sein – sonst ist das Format unbekannt.
    if (sectionIndex >= 0) break;
  }

  if (!mapping || headerIndex === -1) {
    return {
      teilnehmer: [],
      error:
        "Format nicht erkannt. Bitte den unveränderten Teams-Anwesenheitsbericht (CSV) hochladen – er enthält den Abschnitt „2. Teilnehmer“ mit den Spalten Name und E-Mail.",
    };
  }

  const merged = new Map<string, ParsedAnwesenheit>();

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    // Leerzeile oder nächster nummerierter Abschnitt beendet die Tabelle.
    if (!line.trim() || /^\s*\d+\.\s/.test(line)) break;

    const cells = splitCsvZeile(line, delimiter);
    const name = (cells[mapping.name] ?? "").trim();
    const email = normalizeAnwesenheitEmail(cells[mapping.email] ?? "");
    if (!name && !email) continue;

    const row: ParsedAnwesenheit = {
      name: name || email,
      email,
      rolle: mapping.rolle >= 0 ? (cells[mapping.rolle] ?? "").trim() || null : null,
      dauerSekunden:
        mapping.dauer >= 0 ? parseDauerToSekunden(cells[mapping.dauer] ?? "") : 0,
      ersterBeitritt:
        mapping.beitritt >= 0 ? parseBerichtZeit(cells[mapping.beitritt] ?? "") : null,
      letztesVerlassen:
        mapping.verlassen >= 0 ? parseBerichtZeit(cells[mapping.verlassen] ?? "") : null,
    };

    const key = email || `name:${row.name.toLowerCase()}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, row);
    } else {
      existing.dauerSekunden += row.dauerSekunden;
      if (
        row.ersterBeitritt &&
        (!existing.ersterBeitritt || row.ersterBeitritt < existing.ersterBeitritt)
      ) {
        existing.ersterBeitritt = row.ersterBeitritt;
      }
      if (
        row.letztesVerlassen &&
        (!existing.letztesVerlassen || row.letztesVerlassen > existing.letztesVerlassen)
      ) {
        existing.letztesVerlassen = row.letztesVerlassen;
      }
      if (!existing.rolle && row.rolle) existing.rolle = row.rolle;
    }
  }

  return { teilnehmer: [...merged.values()] };
}
