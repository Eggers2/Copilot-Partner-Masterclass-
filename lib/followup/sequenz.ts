// Reine Logik der Follow-up-Sequenz nach dem Wartelisten-Eintrag, ohne
// Datenbank und ohne Versand (testbar in tests/followup.test.ts).
//
// Ablauf: Tag 0 Bestätigung (sofort beim Eintrag), danach vier Follow-up-Mails
// an Tag 2, 5, 9 und 14. Fünf Tage nach Mail 4 endet die Sequenz: der Lead
// bekommt den Status FOLLOW_UP und ein Follow-up-Datum in 30 Tagen.

import type { LeadStatus } from "@prisma/client";

/** Versandtag (relativ zum Eintrag) je Follow-up-Mail, Index 0 = Mail 1. */
export const FOLLOWUP_TAGE = [2, 5, 9, 14] as const;
export const FOLLOWUP_ANZAHL = FOLLOWUP_TAGE.length;

/** Wartezeit nach der letzten Mail, bevor die Sequenz als beendet gilt. */
export const TAGE_BIS_ENDE = 5;
/** Follow-up-Datum für Alex, nachdem die Sequenz ohne Reaktion endet. */
export const FOLLOWUP_NACH_ENDE_TAGE = 30;
/** Mindestabstand zwischen zwei Mails, falls ein Lead in Verzug geraten ist. */
export const MINDESTABSTAND_TAGE = 2;

/** Nur in diesen Status läuft die Sequenz. Jeder andere Status stoppt sie. */
export const SEQUENZ_STATUS: readonly LeadStatus[] = ["NEW", "CONTACTED"];

export type SequenzStopp = "abgeschlossen" | "status" | "abgemeldet";

/** Microsoft-Bookings-Seite von Alex (30 Minuten per Teams). */
export const TERMIN_LINK =
  "https://outlook.office.com/bookwithme/user/4b050f737ab34ce585384802dacd4143@nextvideo.de?anonymous&ep=bwmEmailSignature";

export function followupTemplateKey(schritt: number): string {
  return `warteliste_followup_${schritt}`;
}

const TAG_MS = 24 * 60 * 60 * 1000;

function plusTage(date: Date, tage: number): Date {
  return new Date(date.getTime() + tage * TAG_MS);
}

/** Erster fälliger Zeitpunkt direkt nach dem Eintrag (Follow-up-Mail 1). */
export function ersteFaelligkeit(start: Date): Date {
  return plusTage(start, FOLLOWUP_TAGE[0]);
}

/**
 * Nächster fälliger Zeitpunkt, nachdem `gesendet` Mails verschickt sind.
 * Planmäßig gilt der Tag aus FOLLOWUP_TAGE ab Sequenzstart. Ist ein Lead in
 * Verzug geraten (z.B. weil eine Vorlage eine Weile inaktiv war), liegen
 * zwischen zwei Mails trotzdem mindestens MINDESTABSTAND_TAGE, damit nicht
 * mehrere Mails kurz hintereinander kommen.
 */
export function naechsteFaelligkeit(start: Date, gesendet: number, jetzt: Date): Date {
  const planTag =
    gesendet < FOLLOWUP_ANZAHL
      ? FOLLOWUP_TAGE[gesendet]
      : FOLLOWUP_TAGE[FOLLOWUP_ANZAHL - 1] + TAGE_BIS_ENDE;
  const mindestTage = gesendet < FOLLOWUP_ANZAHL ? MINDESTABSTAND_TAGE : TAGE_BIS_ENDE;
  const plan = plusTage(start, planTag);
  const frueheste = plusTage(jetzt, mindestTage);
  return plan > frueheste ? plan : frueheste;
}

/** Follow-up-Datum für den Lead, nachdem die Sequenz ohne Reaktion endet. */
export function followUpNachEnde(jetzt: Date): Date {
  return plusTage(jetzt, FOLLOWUP_NACH_ENDE_TAGE);
}

/** Versand nur werktags zwischen 8 und 18 Uhr Berliner Zeit. */
export function imSendefenster(t: { weekday: number; hour: number }): boolean {
  return t.weekday >= 1 && t.weekday <= 5 && t.hour >= 8 && t.hour < 18;
}

const GENERISCHE_POSTFAECHER = [
  "info",
  "service",
  "kontakt",
  "office",
  "mail",
  "post",
  "admin",
  "team",
  "support",
  "hello",
  "hallo",
  "contact",
  "vertrieb",
  "sales",
  "buero",
  "empfang",
];

function grossschreiben(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Vorname aus dem Namen oder, falls keiner gepflegt ist, aus der Mailadresse
 * (vorname.nachname@ oder vorname_nachname@). Gleiche Heuristik wie im
 * bisherigen n8n-Workflow, aber ohne den Kurzadressen-Fall, der bei
 * Kürzeln wie "mm@" zu falschen Anreden führte. Liefert null, wenn nichts
 * Verlässliches zu finden ist.
 */
export function ermittleVorname(name: string | null | undefined, email: string): string | null {
  const ausName = name?.trim().split(/\s+/)[0];
  if (ausName && ausName.length > 1 && /^[\p{L}-]+$/u.test(ausName)) {
    return grossschreiben(ausName);
  }

  const lokal = email.split("@")[0] ?? "";
  const teile = lokal.split(/[._]/);
  if (teile.length < 2) return null;
  const kandidat = teile[0];
  if (kandidat.length <= 2) return null;
  if (!/^\p{L}+$/u.test(kandidat)) return null;
  if (GENERISCHE_POSTFAECHER.includes(kandidat.toLowerCase())) return null;
  return grossschreiben(kandidat);
}

/** "Hallo Max," oder, ohne Vornamen, "Hallo,". */
export function anrede(vorname: string | null): string {
  return vorname ? `Hallo ${vorname},` : "Hallo,";
}
