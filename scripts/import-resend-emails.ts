/**
 * Einmaliger Import der ueber Resend versendeten Mails als EMAIL-Aktivitaet
 * in die Timeline der Leads.
 *
 *   npx tsx scripts/import-resend-emails.ts                  Probelauf (Standard)
 *   npx tsx scripts/import-resend-emails.ts --ausfuehren     schreibt ins CRM
 *
 * Optionen:
 *   --csv=datei.csv          Ergebnis zusaetzlich als CSV speichern
 *   --ignoriere="Regex"      weitere Betreffzeilen als Massenmail ignorieren
 *                            (mehrfach angebbar, Gross-/Kleinschreibung egal)
 *
 * Braucht RESEND_API_KEY und DATABASE_URL, z.B. per `railway run`.
 *
 * Ablauf: Alle versendeten Mails seitenweise ueber GET /emails laden, nur die
 * behalten, deren Empfaenger ein Lead ist, Massenmails (Protokolle,
 * Zugangsmails, Anmeldelinks) verwerfen. Fuer die uebrigen den vollen Text
 * ueber GET /emails/{id} holen und gegen die vorhandenen Aktivitaeten des Leads
 * pruefen. Duplikat heisst: gleicher Lead, Datum +-1 Tag und gleicher Betreff
 * oder gleicher Textanfang. Duplikate werden nicht angelegt, sondern am Ende
 * aufgelistet.
 *
 * Wiederholbar: Jede importierte Aktivitaet traegt die Resend-ID, ein zweiter
 * Lauf erkennt sie als Duplikat.
 */

import { writeFileSync } from "fs";
import { prisma } from "../lib/prisma";
import { formatBerlinDateTime } from "../lib/datetime";

const AUSFUEHREN = process.argv.includes("--ausfuehren");
const API = "https://api.resend.com";
const KEY = process.env.RESEND_API_KEY;

const TAG_MS = 24 * 60 * 60 * 1000;
/** Laenge des Textanfangs, der fuer den Duplikat-Vergleich herangezogen wird */
const ANFANG_LAENGE = 80;

/** Betreffzeilen von Massen- und Systemmails, die nicht in die Timeline gehoeren */
const MASSENMAIL_MUSTER: RegExp[] = [
  /protokoll/i,
  /zugang/i,
  /anmeldelink/i,
  ...argListe("ignoriere").map((m) => new RegExp(m, "i")),
];

/** Mails mit diesem letzten Ereignis sind nie beim Empfaenger angekommen */
const NICHT_ZUGESTELLT = new Set(["failed", "canceled", "scheduled", "queued"]);

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

function argListe(name: string): string[] {
  return process.argv
    .filter((a) => a.startsWith(`--${name}=`))
    .map((a) => a.split("=").slice(1).join("="));
}

interface ResendListeEintrag {
  id: string;
  to: string[];
  subject: string;
  created_at: string;
  last_event?: string;
}

interface ResendMail extends ResendListeEintrag {
  from: string;
  html?: string | null;
  text?: string | null;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET gegen die Resend-API mit Wiederholung bei Rate-Limit (2 Anfragen/s) */
async function resendGet<T>(pfad: string): Promise<T> {
  for (let versuch = 1; ; versuch++) {
    const res = await fetch(`${API}${pfad}`, { headers: { Authorization: `Bearer ${KEY}` } });
    if (res.status === 429 && versuch <= 5) {
      await pause(1000 * versuch);
      continue;
    }
    if (!res.ok) throw new Error(`Resend ${pfad}: HTTP ${res.status} ${await res.text()}`);
    await pause(550);
    return (await res.json()) as T;
  }
}

async function alleMailsLaden(): Promise<ResendListeEintrag[]> {
  const alle: ResendListeEintrag[] = [];
  let after: string | undefined;
  for (let seite = 1; ; seite++) {
    const q = new URLSearchParams({ limit: "100" });
    if (after) q.set("after", after);
    const antwort = await resendGet<{ data: ResendListeEintrag[]; has_more: boolean }>(`/emails?${q}`);
    alle.push(...antwort.data);
    process.stderr.write(`Seite ${seite}: ${alle.length} Mails geladen\n`);
    if (!antwort.has_more || antwort.data.length === 0) break;
    after = antwort.data[antwort.data.length - 1].id;
  }
  return alle;
}

/** Einfache HTML-zu-Text-Umwandlung fuer Mails ohne Textteil */
function htmlZuText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, txt) =>
      txt.replace(/<[^>]+>/g, "").trim() === href ? href : `${txt} (${href})`
    )
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mailText(mail: ResendMail): string {
  const text = mail.text?.trim();
  if (text) return text;
  return mail.html ? htmlZuText(mail.html) : "";
}

/** Vergleichsform: klein, ohne Satzzeichen, Leerraum zusammengefasst */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function aktivitaetsInhalt(mail: ResendMail, empfaenger: string, text: string): string {
  return [
    `E-Mail versendet: ${mail.subject}`,
    `An: ${empfaenger}`,
    `Von: ${mail.from}`,
    "",
    text,
    "",
    `[Import aus Resend, ID ${mail.id}]`,
  ].join("\n");
}

interface Ergebnis {
  lead: string;
  leadId: string;
  datum: Date;
  betreff: string;
  art: "neu" | "duplikat";
  grund?: string;
  inhalt?: string;
}

async function main() {
  if (!KEY) throw new Error("RESEND_API_KEY fehlt.");

  const leads = await prisma.lead.findMany({ select: { id: true, email: true } });
  const leadNachMail = new Map(leads.map((l) => [l.email.trim().toLowerCase(), l]));

  const mails = await alleMailsLaden();
  let ohneLead = 0;
  let massenmail = 0;
  let nichtZugestellt = 0;
  const kandidaten: { mail: ResendListeEintrag; lead: { id: string; email: string } }[] = [];
  for (const mail of mails) {
    const treffer = mail.to.map((t) => leadNachMail.get(t.trim().toLowerCase())).filter((l) => !!l);
    if (treffer.length === 0) {
      ohneLead++;
      continue;
    }
    if (MASSENMAIL_MUSTER.some((m) => m.test(mail.subject))) {
      massenmail++;
      continue;
    }
    if (mail.last_event && NICHT_ZUGESTELLT.has(mail.last_event)) {
      nichtZugestellt++;
      continue;
    }
    for (const lead of treffer) kandidaten.push({ mail, lead: lead! });
  }

  // Aktivitaeten aller betroffenen Leads in einem Rutsch laden
  const leadIds = [...new Set(kandidaten.map((k) => k.lead.id))];
  const aktivitaeten = await prisma.leadActivity.findMany({
    where: { leadId: { in: leadIds }, type: { not: "STATUS_CHANGE" } },
    select: { id: true, leadId: true, type: true, content: true, createdAt: true },
  });
  const aktivitaetenNachLead = new Map<string, typeof aktivitaeten>();
  for (const a of aktivitaeten) {
    const liste = aktivitaetenNachLead.get(a.leadId) ?? [];
    liste.push(a);
    aktivitaetenNachLead.set(a.leadId, liste);
  }

  const ergebnisse: Ergebnis[] = [];
  for (const { mail: eintrag, lead } of kandidaten) {
    const mail = await resendGet<ResendMail>(`/emails/${eintrag.id}`);
    const datum = new Date(mail.created_at.replace(" ", "T").replace(/\+00$/, "Z"));
    const text = mailText(mail);
    const betreffN = norm(mail.subject);
    const anfangN = norm(text).slice(0, ANFANG_LAENGE);

    let grund: string | undefined;
    for (const a of aktivitaetenNachLead.get(lead.id) ?? []) {
      if (a.content.includes(mail.id)) {
        grund = `bereits importiert (${a.type}, ${formatBerlinDateTime(a.createdAt)})`;
        break;
      }
      if (Math.abs(a.createdAt.getTime() - datum.getTime()) > TAG_MS) continue;
      const inhaltN = norm(a.content);
      if (betreffN && inhaltN.includes(betreffN)) {
        grund = `gleicher Betreff in ${a.type} vom ${formatBerlinDateTime(a.createdAt)}`;
        break;
      }
      const aktAnfangN = inhaltN.slice(0, ANFANG_LAENGE);
      if (
        anfangN.length >= 20 &&
        (inhaltN.includes(anfangN) || (aktAnfangN.length >= 20 && norm(text).includes(aktAnfangN)))
      ) {
        grund = `gleicher Textanfang in ${a.type} vom ${formatBerlinDateTime(a.createdAt)}`;
        break;
      }
    }

    ergebnisse.push({
      lead: lead.email,
      leadId: lead.id,
      datum,
      betreff: mail.subject,
      art: grund ? "duplikat" : "neu",
      grund,
      inhalt: grund ? undefined : aktivitaetsInhalt(mail, lead.email, text),
    });
  }

  ergebnisse.sort((a, b) => a.lead.localeCompare(b.lead) || a.datum.getTime() - b.datum.getTime());

  console.log(`\n${"Lead".padEnd(40)} ${"Datum".padEnd(17)} ${"Art".padEnd(9)} Betreff`);
  for (const e of ergebnisse) {
    console.log(
      `${e.lead.padEnd(40)} ${formatBerlinDateTime(e.datum).padEnd(17)} ${e.art.toUpperCase().padEnd(9)} ${e.betreff}`
    );
  }

  const duplikate = ergebnisse.filter((e) => e.art === "duplikat");
  const neu = ergebnisse.filter((e) => e.art === "neu");
  if (duplikate.length) {
    console.log(`\nDuplikate (werden nicht angelegt):`);
    for (const d of duplikate) {
      console.log(`- ${d.lead} | ${formatBerlinDateTime(d.datum)} | ${d.betreff} | ${d.grund}`);
    }
  }

  console.log(`\nResend-Mails gesamt:          ${mails.length}`);
  console.log(`  Empfaenger kein Lead:       ${ohneLead}`);
  console.log(`  Massenmail ignoriert:       ${massenmail}`);
  console.log(`  nicht zugestellt:           ${nichtZugestellt}`);
  console.log(`Kandidaten fuer Leads:        ${ergebnisse.length}`);
  console.log(`  neu:                        ${neu.length}`);
  console.log(`  Duplikat:                   ${duplikate.length}`);

  const csv = arg("csv");
  if (csv) {
    const zelle = (s: string) => `"${s.replace(/"/g, '""')}"`;
    writeFileSync(
      csv,
      ["Lead;Datum;Betreff;Art;Grund"]
        .concat(
          ergebnisse.map((e) =>
            [e.lead, formatBerlinDateTime(e.datum), e.betreff, e.art, e.grund ?? ""].map(zelle).join(";")
          )
        )
        .join("\n")
    );
    console.log(`CSV gespeichert: ${csv}`);
  }

  if (!AUSFUEHREN) {
    console.log(`\nProbelauf: nichts geschrieben. Mit --ausfuehren werden ${neu.length} Aktivitaeten angelegt.`);
    return;
  }

  await prisma.leadActivity.createMany({
    data: neu.map((e) => ({ leadId: e.leadId, type: "EMAIL" as const, content: e.inhalt!, createdAt: e.datum })),
  });
  console.log(`\n${neu.length} EMAIL-Aktivitaeten angelegt.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
