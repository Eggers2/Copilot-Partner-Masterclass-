import { prisma } from "@/lib/prisma";
import { diffBerlinTage } from "@/lib/datetime";
import { getEmailTemplate } from "@/lib/db/emailTemplates";
import { sendBulk, sendEmail, type BulkMessage } from "@/lib/email/resend";
import { getTemplateDefinition, renderTemplate } from "@/lib/email/renderTemplate";
import { signSlotToken } from "./tokens";
import { syncUmfrageRunden, type RundenSyncErgebnis } from "./runden";

/**
 * Mailversand der Stand-Abfrage. Läuft ausschließlich über Resend (eigener
 * Absender via RESEND_UMFRAGE_FROM_EMAIL möglich, z.B. eigene Subdomain).
 * Jeder Versand-Schritt claimt seine Runde atomar über ein Zeitstempel-Feld
 * (updateMany mit null-Guard), damit parallele Cron-Treffer nie doppelt senden.
 */

/** Absender der Umfrage-Mails (eigene Subdomain), sonst Standard-Absender. */
export function umfrageFrom(): string | undefined {
  return process.env.RESEND_UMFRAGE_FROM_EMAIL || undefined;
}

function notifyEmail(): string | null {
  return process.env.UMFRAGE_NOTIFY_EMAIL || process.env.NEWSLETTER_REVIEW_EMAIL || null;
}

/**
 * Template aus der DB (wenn aktiv), sonst Default aus der Registry. Die
 * Stand-Abfrage darf nie stillstehen, deshalb wird auch bei inaktivem
 * Template mit dem Standard-HTML versendet (Muster connect_day_rechnung).
 */
async function resolveTemplate(key: string): Promise<{ betreff: string; html: string } | null> {
  const definition = getTemplateDefinition(key);
  try {
    const template = await getEmailTemplate(key);
    if (template?.aktiv) return { betreff: template.betreff, html: template.html };
  } catch (err) {
    console.error(`[Umfrage] Template ${key} konnte nicht geladen werden:`, err);
  }
  if (!definition) return null;
  return { betreff: definition.defaultBetreff, html: definition.defaultHtml };
}

/**
 * Empfänger einer Klasse: alle belegten Plätze, interne Bestellungen
 * ausgeschlossen. Bewusst direkt auf den Plätzen (kein Dedupe über Besteller):
 * jeder Platz bekommt seinen eigenen persönlichen Link.
 */
export async function getUmfrageEmpfaenger(klasseId: string) {
  return prisma.bestellungTeilnehmer.findMany({
    where: {
      email: { not: "" },
      bestellung: { klasseId, intern: false },
    },
    include: { bestellung: { select: { firma: true, telefon: true } } },
    orderBy: { id: "asc" },
  });
}

export interface VersandErgebnis {
  runde: string;
  klasse: string;
  nummer: number;
  empfaenger: number;
  gesendet: number;
  fehler: number;
  uebersprungen?: string;
}

// ─── Einladungen ─────────────────────────────────────────────────────────────

export async function sendeEinladungen(baseUrl: string): Promise<VersandErgebnis[]> {
  const jetzt = new Date();
  const faellig = await prisma.umfrageRunde.findMany({
    where: { status: "OFFEN", versandAm: null },
    include: { klasse: true },
  });

  const ergebnisse: VersandErgebnis[] = [];
  for (const runde of faellig) {
    // Atomarer Claim: nur wer versandAm von null auf jetzt setzt, sendet.
    const claim = await prisma.umfrageRunde.updateMany({
      where: { id: runde.id, versandAm: null },
      data: { versandAm: jetzt },
    });
    if (claim.count !== 1) continue;

    const template = await resolveTemplate("umfrage_einladung");
    if (!template) continue;

    const empfaenger = await getUmfrageEmpfaenger(runde.klasseId);
    const messages: BulkMessage[] = empfaenger.map((t) => {
      const vars = {
        vorname: t.vorname || "zusammen",
        klasse: runde.klasse.name,
        link: `${baseUrl}/umfrage/${signSlotToken(runde.id, t.id)}`,
      };
      return {
        to: t.email,
        subject: renderTemplate(template.betreff, vars),
        html: renderTemplate(template.html, vars),
      };
    });

    const res = await sendBulk(messages, {
      templateKey: "umfrage_einladung",
      from: umfrageFrom(),
    });
    ergebnisse.push({
      runde: runde.id,
      klasse: runde.klasse.name,
      nummer: runde.nummer,
      empfaenger: messages.length,
      gesendet: res.sent,
      fehler: res.failed.length,
    });
  }
  return ergebnisse;
}

// ─── Erinnerung (genau eine, nach 4 Tagen, nur Nicht-Antwortende) ───────────

export async function sendeErinnerungen(baseUrl: string): Promise<VersandErgebnis[]> {
  const jetzt = new Date();
  const kandidaten = await prisma.umfrageRunde.findMany({
    where: { status: "OFFEN", versandAm: { not: null }, erinnerungAm: null },
    include: { klasse: true },
  });

  const ergebnisse: VersandErgebnis[] = [];
  for (const runde of kandidaten) {
    if (!runde.versandAm || diffBerlinTage(runde.versandAm, jetzt) < 4) continue;

    // In Ferienfenstern und um den Jahreswechsel keine Erinnerung. Der Claim
    // wird trotzdem gesetzt, damit die Runde nicht jeden Tag erneut geprüft wird.
    if (runde.jahreszeit !== "NORMAL") {
      const claim = await prisma.umfrageRunde.updateMany({
        where: { id: runde.id, erinnerungAm: null },
        data: { erinnerungAm: jetzt },
      });
      if (claim.count === 1) {
        ergebnisse.push({
          runde: runde.id,
          klasse: runde.klasse.name,
          nummer: runde.nummer,
          empfaenger: 0,
          gesendet: 0,
          fehler: 0,
          uebersprungen: `Keine Erinnerung bei Jahreszeit ${runde.jahreszeit}.`,
        });
      }
      continue;
    }

    const claim = await prisma.umfrageRunde.updateMany({
      where: { id: runde.id, erinnerungAm: null },
      data: { erinnerungAm: jetzt },
    });
    if (claim.count !== 1) continue;

    const template = await resolveTemplate("umfrage_erinnerung");
    if (!template) continue;

    const beantwortet = await prisma.umfrageAntwort.findMany({
      where: { rundeId: runde.id },
      select: { teilnehmerId: true },
    });
    const beantwortetIds = new Set(beantwortet.map((a) => a.teilnehmerId));
    const empfaenger = (await getUmfrageEmpfaenger(runde.klasseId)).filter(
      (t) => !beantwortetIds.has(t.id)
    );

    const messages: BulkMessage[] = empfaenger.map((t) => {
      const vars = {
        vorname: t.vorname || "zusammen",
        klasse: runde.klasse.name,
        link: `${baseUrl}/umfrage/${signSlotToken(runde.id, t.id)}`,
      };
      return {
        to: t.email,
        subject: renderTemplate(template.betreff, vars),
        html: renderTemplate(template.html, vars),
      };
    });

    const res = await sendBulk(messages, {
      templateKey: "umfrage_erinnerung",
      from: umfrageFrom(),
    });
    ergebnisse.push({
      runde: runde.id,
      klasse: runde.klasse.name,
      nummer: runde.nummer,
      empfaenger: messages.length,
      gesendet: res.sent,
      fehler: res.failed.length,
    });
  }
  return ergebnisse;
}

// ─── Lieferrisiko: Firmen-Spannweite über 4 (Sammel-Mail an den Betreiber) ──

export interface LieferrisikoErgebnis {
  runde: string;
  klasse: string;
  nummer: number;
  firmen: string[];
  gesendet: boolean;
}

/**
 * Einmal pro Runde, am Erinnerungs-Zeitpunkt (+4 Tage, wenn der Rücklauf im
 * Wesentlichen komplett ist): Firmen mit Stufen-Spannweite über 4 in EINER
 * Mail an den Betreiber. Läuft bewusst auch in Ferien-Runden.
 */
export async function pruefeLieferrisiko(baseUrl: string): Promise<LieferrisikoErgebnis[]> {
  const jetzt = new Date();
  const kandidaten = await prisma.umfrageRunde.findMany({
    where: { status: "OFFEN", versandAm: { not: null }, lieferrisikoGeprueftAm: null },
    include: { klasse: true },
  });

  const ergebnisse: LieferrisikoErgebnis[] = [];
  for (const runde of kandidaten) {
    if (!runde.versandAm || diffBerlinTage(runde.versandAm, jetzt) < 4) continue;

    const claim = await prisma.umfrageRunde.updateMany({
      where: { id: runde.id, lieferrisikoGeprueftAm: null },
      data: { lieferrisikoGeprueftAm: jetzt },
    });
    if (claim.count !== 1) continue;

    const antworten = await prisma.umfrageAntwort.findMany({
      where: { rundeId: runde.id, stufe: { not: null }, teilnehmer: { bestellung: { intern: false } } },
      include: { teilnehmer: { include: { bestellung: { select: { firma: true } } } } },
    });

    // Firmenzuordnung über die Bestellung (schlägt Mail-Domain), Spannweite
    // nur bei mindestens zwei Stufen-Antworten derselben Firma.
    const stufenJeFirma = new Map<string, number[]>();
    for (const a of antworten) {
      const firma = a.teilnehmer.bestellung.firma.trim();
      if (!stufenJeFirma.has(firma)) stufenJeFirma.set(firma, []);
      stufenJeFirma.get(firma)!.push(a.stufe as number);
    }
    const risikoFirmen: string[] = [];
    for (const [firma, stufen] of stufenJeFirma) {
      if (stufen.length < 2) continue;
      const max = Math.max(...stufen);
      const min = Math.min(...stufen);
      if (max - min > 4) risikoFirmen.push(`${firma} (${min} bis ${max})`);
    }

    let gesendet = false;
    const to = notifyEmail();
    if (risikoFirmen.length > 0 && to) {
      const template = await resolveTemplate("umfrage_lieferrisiko_intern");
      if (template) {
        const vars = {
          klasse: runde.klasse.name,
          runde: String(runde.nummer),
          firmenListe: risikoFirmen.join(", "),
          adminLink: `${baseUrl}/admin/umfragen/${runde.klasse.slug}?runde=${runde.nummer}`,
        };
        const res = await sendEmail({
          to,
          subject: renderTemplate(template.betreff, vars),
          html: renderTemplate(template.html, vars),
          templateKey: "umfrage_lieferrisiko_intern",
        });
        gesendet = res.ok;
      }
    }

    ergebnisse.push({
      runde: runde.id,
      klasse: runde.klasse.name,
      nummer: runde.nummer,
      firmen: risikoFirmen,
      gesendet,
    });
  }
  return ergebnisse;
}

// ─── Rückschritt: sofort beim Submit (ein verlorenes Angebot ist zeitkritisch) ─

export async function sendeRueckschrittMail(args: {
  name: string;
  firma: string;
  klasseName: string;
  klasseSlug: string;
  rundeNummer: number;
  alteStufe: number;
  neueStufe: number;
  baseUrl: string;
}): Promise<boolean> {
  const to = notifyEmail();
  if (!to) return false;
  const template = await resolveTemplate("umfrage_rueckschritt_intern");
  if (!template) return false;

  const vars = {
    name: args.name,
    firma: args.firma,
    klasse: args.klasseName,
    runde: String(args.rundeNummer),
    alt: String(args.alteStufe),
    neu: String(args.neueStufe),
    adminLink: `${args.baseUrl}/admin/umfragen/${args.klasseSlug}?runde=${args.rundeNummer}`,
  };
  const res = await sendEmail({
    to,
    subject: renderTemplate(template.betreff, vars),
    html: renderTemplate(template.html, vars),
    templateKey: "umfrage_rueckschritt_intern",
  });
  return res.ok;
}

// ─── Orchestrator für den Cron ───────────────────────────────────────────────

export interface UmfrageCronErgebnis {
  sync: RundenSyncErgebnis;
  einladungen: VersandErgebnis[];
  erinnerungen: VersandErgebnis[];
  lieferrisiko: LieferrisikoErgebnis[];
}

/**
 * Ein Cron-Lauf macht genau vier Dinge: Runden anlegen (nur im Monats-Fenster),
 * Einladungen senden, die eine Erinnerung senden, Lieferrisiko prüfen. Sonst
 * nichts. Keine Eskalation, keine Partner-Mails bei Non-Response.
 */
export async function runUmfrageCron(baseUrl: string): Promise<UmfrageCronErgebnis> {
  const sync = await syncUmfrageRunden();
  const einladungen = await sendeEinladungen(baseUrl);
  const erinnerungen = await sendeErinnerungen(baseUrl);
  const lieferrisiko = await pruefeLieferrisiko(baseUrl);
  return { sync, einladungen, erinnerungen, lieferrisiko };
}
