// Folien-Download nach Vorträgen und Trainings. Jede Veranstaltung hat eine
// eigene Seite (QR-Code auf der letzten Folie), eine Danke-Seite mit dem PDF
// und eine eigene API-Route. Seiten, Formular und Lead-Logik sind für alle
// gleich (components/event-download, lib/event-download/handler.ts), hier
// stehen nur die Angaben je Veranstaltung.
//
// Neue Veranstaltung: Eintrag ergänzen, dann app/<slug>/page.tsx,
// app/<slug>/danke/page.tsx und app/api/<slug>/route.ts nach dem Muster der
// bestehenden anlegen und das PDF unter public/downloads ablegen.

export interface EventDownload {
  /** URL-Pfad ohne Schrägstrich, gleichzeitig Kennung für das Rate-Limit */
  slug: string;
  /** Überschrift der Seite */
  ueberschrift: string;
  /** Unterzeile unter der Überschrift: Titel · Veranstalter, Datum */
  unterzeile: string;
  /** Titel im Browser-Tab, hinter "Die Folien zum ..." bzw. "Vielen Dank" */
  veranstalter: string;
  /** Kurzbeschreibung für die Meta-Angaben (noindex, nur für Vorschauen) */
  beschreibung: string;
  /** erste Zeile der Notiz am Lead */
  notizTitel: string;
  /** Grund für "Keine E-Mails" bei neuen Leads ohne Einwilligung */
  keineMailsGrund: string;
  /** PDF unter public/downloads. Zum Austausch nur die Datei ersetzen, der Name bleibt. */
  pdfUrl: string;
}

export const EVENT_DOWNLOADS = {
  "adn-schweiz": {
    slug: "adn-schweiz",
    ueberschrift: "Die Folien zum Vortrag",
    unterzeile: "Von Copilot-Hype zu nachhaltiger Wertschöpfung · ADN Schweiz, 28. Oktober 2026",
    veranstalter: "ADN Schweiz",
    beschreibung: "Folien zum Vortrag „Von Copilot-Hype zu nachhaltiger Wertschöpfung“ bei ADN Schweiz.",
    notizTitel: "ADN Schweiz 28.10.2026, Folien-Download",
    keineMailsGrund: "Keine Marketing-Einwilligung (ADN Schweiz, 28.10.2026)",
    pdfUrl: "/downloads/ADN_Schweiz_Copilot_Wertschoepfung_2026-10-28.pdf",
  },
  "ingram-muenchen": {
    slug: "ingram-muenchen",
    ueberschrift: "Die Folien zum Training",
    unterzeile: "Copilot & AI Transformation · Ingram Micro, München, 3. November 2026",
    veranstalter: "Ingram Micro München",
    beschreibung: "Folien zu Tag 1 „Copilot & AI Transformation“ des CSP Partner Enablement Trainings bei Ingram Micro in München.",
    notizTitel: "Ingram Micro München 03.11.2026, Folien-Download",
    keineMailsGrund: "Keine Marketing-Einwilligung (Ingram Micro München, 03.11.2026)",
    pdfUrl: "/downloads/Ingram_Muenchen_Copilot_AI_Transformation_2026-11-03.pdf",
  },
} satisfies Record<string, EventDownload>;
