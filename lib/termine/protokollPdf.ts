import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

// Markenfarben (siehe tailwind.config.ts / Connect-Day-Mails)
const SLATE = rgb(0x1a / 255, 0x1a / 255, 0x2e / 255);
const GREEN = rgb(0x00 / 255, 0xc8 / 255, 0x96 / 255);
const TEXT = rgb(0x0f / 255, 0x17 / 255, 0x2a / 255);
const GRAY = rgb(0x64 / 255, 0x74 / 255, 0x8b / 255);

// A4
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 56;
const MARGIN_BOTTOM = 64;
const CONTENT_W = PAGE_W - 2 * MARGIN_X;

const BODY_SIZE = 10.5;
const BODY_LEADING = 15;
const HEADING_SIZE = 12.5;

export interface ProtokollPdfInput {
  klasseName: string;
  /** bereits formatiertes Datum, z.B. "Montag, 06.07.2026, 10:00" */
  datumFormatiert: string;
  thema: string | null;
  /** ausführliches Protokoll als Klartext (Überschriften + Spiegelstriche) */
  protokoll: string;
}

/**
 * Die Standard-Fonts von pdf-lib können nur WinAnsi (Latin-1 + typografische
 * Zeichen). Alles andere (v.a. Emojis) wird entfernt, damit drawText nicht wirft.
 */
function toWinAnsi(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\t/g, "  ")
    .replace(/[→⇒➔➜]/g, "->")
    .replace(/[←⇐]/g, "<-")
    .replace(/[✓✔☑]/g, "+")
    .replace(
      /[^\x20-\x7e\xa0-\xff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178\n]/g,
      ""
    );
}

/** Bricht einen Absatz wortweise auf die verfügbare Breite um. */
function wrapLine(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "space" };

/**
 * Zerlegt das Protokoll (Klartext mit Überschriften und Spiegelstrichen) in
 * Blöcke. Kurze Zeilen ohne Spiegelstrich gelten als Überschrift.
 */
function parseBlocks(protokoll: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of protokoll.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (blocks.length > 0 && blocks[blocks.length - 1].kind !== "space") {
        blocks.push({ kind: "space" });
      }
      continue;
    }
    const bullet = line.match(/^[-•*]\s+(.*)$/);
    if (bullet) {
      blocks.push({ kind: "bullet", text: bullet[1] });
    } else if (line.length <= 70 && !/[.:!?,;]$/.test(line)) {
      blocks.push({ kind: "heading", text: line.replace(/^#+\s*/, "") });
    } else {
      blocks.push({ kind: "paragraph", text: line });
    }
  }
  return blocks;
}

interface Cursor {
  page: PDFPage;
  y: number;
}

/**
 * Erzeugt das ausführliche Protokoll als gebrandetes A4-PDF (dunkler Kopf mit
 * Grün-Akzent, Fließtext mit Überschriften/Spiegelstrichen, Seitennummern).
 * Rückgabe: Base64-String für den Resend-Anhang.
 */
export async function createProtokollPdf(input: ProtokollPdfInput): Promise<string> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.setTitle(
    toWinAnsi(`Protokoll – ${input.klasseName} – ${input.datumFormatiert}`)
  );
  doc.setAuthor("Next Skills · Copilot Partner Masterclass");

  const newPage = (): PDFPage => doc.addPage([PAGE_W, PAGE_H]);

  // ── Kopf auf Seite 1 ──────────────────────────────────────────────────────
  const first = newPage();
  const headerH = 132;
  first.drawRectangle({
    x: 0,
    y: PAGE_H - headerH,
    width: PAGE_W,
    height: headerH,
    color: SLATE,
  });
  first.drawRectangle({
    x: 0,
    y: PAGE_H - headerH - 4,
    width: PAGE_W,
    height: 4,
    color: GREEN,
  });
  first.drawText("NEXT SKILLS · COPILOT PARTNER MASTERCLASS", {
    x: MARGIN_X,
    y: PAGE_H - 40,
    size: 8.5,
    font: bold,
    color: GREEN,
  });
  first.drawText("Session-Protokoll", {
    x: MARGIN_X,
    y: PAGE_H - 68,
    size: 22,
    font: bold,
    color: rgb(1, 1, 1),
  });
  const metaLines = [
    `${toWinAnsi(input.klasseName)} · ${toWinAnsi(input.datumFormatiert)}`,
    ...(input.thema ? [`Thema: ${toWinAnsi(input.thema)}`] : []),
  ];
  let metaY = PAGE_H - 92;
  for (const meta of metaLines) {
    for (const line of wrapLine(meta, font, 10.5, CONTENT_W)) {
      first.drawText(line, {
        x: MARGIN_X,
        y: metaY,
        size: 10.5,
        font,
        color: rgb(0.85, 0.85, 0.9),
      });
      metaY -= 15;
    }
  }

  const cursor: Cursor = { page: first, y: PAGE_H - headerH - 40 };

  const ensureSpace = (needed: number) => {
    if (cursor.y - needed < MARGIN_BOTTOM) {
      cursor.page = newPage();
      cursor.y = PAGE_H - 64;
    }
  };

  const drawWrapped = (
    text: string,
    opts: { font: PDFFont; size: number; leading: number; indent?: number; color?: ReturnType<typeof rgb> }
  ) => {
    const indent = opts.indent ?? 0;
    const lines = wrapLine(text, opts.font, opts.size, CONTENT_W - indent);
    for (const line of lines) {
      ensureSpace(opts.leading);
      cursor.page.drawText(line, {
        x: MARGIN_X + indent,
        y: cursor.y,
        size: opts.size,
        font: opts.font,
        color: opts.color ?? TEXT,
      });
      cursor.y -= opts.leading;
    }
  };

  // ── Inhalt ────────────────────────────────────────────────────────────────
  for (const block of parseBlocks(toWinAnsi(input.protokoll))) {
    switch (block.kind) {
      case "space":
        cursor.y -= 6;
        break;
      case "heading":
        ensureSpace(HEADING_SIZE + BODY_LEADING * 2); // Überschrift nicht allein am Seitenende
        cursor.y -= 6;
        drawWrapped(block.text, {
          font: bold,
          size: HEADING_SIZE,
          leading: 18,
          color: SLATE,
        });
        cursor.y -= 2;
        break;
      case "bullet":
        ensureSpace(BODY_LEADING);
        cursor.page.drawText("•", {
          x: MARGIN_X + 2,
          y: cursor.y,
          size: BODY_SIZE,
          font: bold,
          color: GREEN,
        });
        drawWrapped(block.text, {
          font,
          size: BODY_SIZE,
          leading: BODY_LEADING,
          indent: 14,
        });
        cursor.y -= 2;
        break;
      case "paragraph":
        drawWrapped(block.text, { font, size: BODY_SIZE, leading: BODY_LEADING });
        cursor.y -= 4;
        break;
    }
  }

  // ── Fußzeile mit Seitennummern ────────────────────────────────────────────
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawText("Next Skills · Copilot Partner Masterclass", {
      x: MARGIN_X,
      y: 36,
      size: 8,
      font,
      color: GRAY,
    });
    const label = `Seite ${i + 1} von ${pages.length}`;
    page.drawText(label, {
      x: PAGE_W - MARGIN_X - font.widthOfTextAtSize(label, 8),
      y: 36,
      size: 8,
      font,
      color: GRAY,
    });
  });

  return doc.saveAsBase64();
}

/** Dateiname für den PDF-Anhang, z.B. "Protokoll_Klasse-2_2026-07-06.pdf". */
export function protokollPdfFilename(klasseName: string, datum: Date): string {
  const safeKlasse = klasseName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(datum);
  return `Protokoll_${safeKlasse || "Klasse"}_${iso}.pdf`;
}
