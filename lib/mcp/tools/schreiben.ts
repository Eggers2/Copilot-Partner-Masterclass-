import { z } from "zod";
import { ActivityType, LeadSource, LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addActivity, updateLead } from "@/lib/db/leads";
import { berlinDayToUtc, berlinInputToUtc, formatBerlinDateTime } from "@/lib/datetime";
import { SCOPE_WRITE } from "../config";
import { defineTool, ToolError } from "./types";
import { activityOut, leadFull } from "./format";

/**
 * Schreibende Werkzeuge. Bewusst eng gehalten:
 * - kein Löschen, kein Ändern von Umsatz oder Rechnungsdaten
 * - jede Änderung erzeugt wie im Admin eine LeadActivity, damit sie in der
 *   Timeline des Leads sichtbar ist
 * - zusätzlich landet jeder Aufruf im MCP-Audit-Log
 */

function enumOf<T extends Record<string, string>>(obj: T) {
  return z.enum(Object.values(obj) as [T[keyof T], ...T[keyof T][]]);
}

const leadIdSchema = z.string().uuid().describe("Lead-ID (UUID, siehe leads_suchen).");

async function requireLead(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new ToolError("Lead nicht gefunden.");
  return lead;
}

/**
 * Deutet die Eingabe als deutsche Ortszeit und gibt den UTC-Zeitpunkt zurück,
 * der in der Datenbank landet.
 *
 * Akzeptiert "YYYY-MM-DD" (wird auf 12:00 Berlin gesetzt), "YYYY-MM-DDTHH:mm"
 * (Berlin-Ortszeit) oder einen vollständigen ISO-Zeitstempel mit Offset.
 *
 * Ein expliziter Offset wird respektiert, ist aber nicht mehr nötig: die
 * Oberfläche rechnet den gespeicherten UTC-Wert für die Anzeige nach
 * Europe/Berlin zurück. Wer hier "+00:00" anhängt, um die Anzeige zu
 * korrigieren, verschiebt den Termin jetzt tatsächlich um zwei Stunden.
 */
export function parseFollowUp(value: string): Date {
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return berlinDayToUtc(value);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return berlinInputToUtc(value);
  } catch {
    throw new ToolError(`Ungültiges Datum: ${value}`);
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new ToolError(`Ungültiges Datum: ${value}`);
  return d;
}

export const leadStatusSetzen = defineTool({
  name: "lead_status_setzen",
  title: "Lead-Status setzen",
  scope: SCOPE_WRITE,
  description:
    "Ändert den Status eines Leads und protokolliert den Wechsel als Aktivität (wie im Admin). " +
    "Optional kann eine Notiz zum Grund mitgegeben werden. Umsatz wird hier nicht gesetzt.",
  schema: z.object({
    id: leadIdSchema,
    status: enumOf(LeadStatus).describe("Neuer Status."),
    notiz: z.string().trim().min(1).max(2000).optional().describe("Optionale Notiz, wird als NOTE-Aktivität gespeichert."),
  }),
  async handler({ id, status, notiz }) {
    const lead = await requireLead(id);
    if (lead.status === status) {
      return { geaendert: false, hinweis: `Lead hat bereits den Status ${status}.` };
    }
    await updateLead(id, { status });
    const activity = await addActivity(id, {
      type: "STATUS_CHANGE",
      content: `Status geändert: ${lead.status} → ${status}`,
      oldValue: lead.status,
      newValue: status,
    });
    const note = notiz ? await addActivity(id, { type: "NOTE", content: notiz }) : null;
    return {
      geaendert: true,
      vorher: lead.status,
      nachher: status,
      aktivitaeten: [activityOut(activity), ...(note ? [activityOut(note)] : [])],
    };
  },
});

export const leadFollowupSetzen = defineTool({
  name: "lead_followup_setzen",
  title: "Follow-up setzen",
  scope: SCOPE_WRITE,
  description:
    "Setzt oder entfernt das Follow-up-Datum eines Leads und protokolliert dies als FOLLOW_UP-Aktivität. " +
    "Datum als YYYY-MM-DD (dann 12:00 Uhr Berlin), YYYY-MM-DDTHH:mm (Berlin-Zeit) oder ISO mit Offset. " +
    "Zeiten ohne Offset gelten als deutsche Ortszeit und werden in UTC gespeichert; das Admin zeigt sie " +
    "wieder in deutscher Ortszeit an. Also die Uhrzeit angeben, die der Nutzer sieht und meint, " +
    "und keinen Offset zur Korrektur anhängen.",
  schema: z.object({
    id: leadIdSchema,
    followUpAt: z.string().optional().describe("Neues Follow-up-Datum. Weglassen und entfernen=true setzen, um es zu löschen."),
    entfernen: z.boolean().default(false).describe("Follow-up-Datum entfernen."),
    notiz: z.string().trim().max(500).optional().describe("Optionaler Zusatz für die Aktivität, z.B. 'Erinnerung gesendet'."),
  }),
  async handler({ id, followUpAt, entfernen, notiz }) {
    const lead = await requireLead(id);
    if (entfernen) {
      await updateLead(id, { followUpAt: null });
      const activity = await addActivity(id, {
        type: "FOLLOW_UP",
        content: notiz ? `Follow-up entfernt: ${notiz}` : "Follow-up entfernt",
        oldValue: lead.followUpAt?.toISOString() ?? null,
      });
      return { geaendert: true, followUpAt: null, aktivitaet: activityOut(activity) };
    }
    if (!followUpAt) throw new ToolError("followUpAt angeben oder entfernen=true setzen.");
    const date = parseFollowUp(followUpAt);
    await updateLead(id, { followUpAt: date });
    const activity = await addActivity(id, {
      type: "FOLLOW_UP",
      content: notiz
        ? `${notiz} – Follow-up gesetzt auf ${formatBerlinDateTime(date)}`
        : `Follow-up gesetzt auf ${formatBerlinDateTime(date)}`,
      oldValue: lead.followUpAt?.toISOString() ?? null,
      newValue: date.toISOString(),
    });
    return { geaendert: true, followUpAt: date.toISOString(), aktivitaet: activityOut(activity) };
  },
});

const ACTIVITY_TYPES = Object.values(ActivityType).filter((t) => t !== "STATUS_CHANGE") as [
  ActivityType,
  ...ActivityType[],
];

export const leadAktivitaetAnlegen = defineTool({
  name: "lead_aktivitaet_anlegen",
  title: "Aktivität anlegen",
  scope: SCOPE_WRITE,
  description:
    "Legt eine Aktivität in der Timeline eines Leads an, z.B. eine Notiz, eine gesendete E-Mail oder ein Telefonat. " +
    "Statuswechsel bitte über lead_status_setzen.",
  schema: z.object({
    id: leadIdSchema,
    typ: z.enum(ACTIVITY_TYPES).describe("Art der Aktivität."),
    inhalt: z.string().trim().min(1).max(4000).describe("Inhalt der Aktivität."),
  }),
  async handler({ id, typ, inhalt }) {
    await requireLead(id);
    const activity = await addActivity(id, { type: typ, content: inhalt });
    return { angelegt: true, aktivitaet: activityOut(activity) };
  },
});

export const leadAktualisieren = defineTool({
  name: "lead_aktualisieren",
  title: "Lead-Stammdaten aktualisieren",
  scope: SCOPE_WRITE,
  description:
    "Aktualisiert Stammdaten eines Leads (Name, Firma, Telefon, Website, Adresse, Notizen, Score, Quelle). " +
    "Nur übergebene Felder werden geändert; ein leerer String löscht ein Feld. Status, Umsatz und E-Mail sind hier bewusst nicht änderbar.",
  schema: z.object({
    id: leadIdSchema,
    name: z.string().trim().max(200).optional(),
    firma: z.string().trim().max(200).optional(),
    telefon: z.string().trim().max(50).optional(),
    website: z.string().trim().max(300).optional(),
    strasse: z.string().trim().max(200).optional(),
    plz: z.string().trim().max(20).optional(),
    ort: z.string().trim().max(120).optional(),
    notizen: z.string().max(10000).optional().describe("Ersetzt das Notizfeld vollständig. Bestehende Notizen vorher per lead_details lesen."),
    score: z.number().int().min(0).max(100).optional().describe("Lead-Score 0 bis 100."),
    quelle: enumOf(LeadSource).optional(),
  }),
  async handler({ id, name, firma, telefon, website, strasse, plz, ort, notizen, score, quelle }) {
    const lead = await requireLead(id);
    const opt = (v: string | undefined) => (v === undefined ? undefined : v === "" ? null : v);
    const data = {
      name: opt(name),
      company: opt(firma),
      phone: opt(telefon),
      website: opt(website),
      street: opt(strasse),
      zip: opt(plz),
      city: opt(ort),
      notes: opt(notizen),
      score,
      source: quelle,
    };
    const geaenderteFelder = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    if (geaenderteFelder.length === 0) throw new ToolError("Keine Felder zum Ändern übergeben.");

    const addressChanged =
      (data.street !== undefined && data.street !== lead.street) ||
      (data.zip !== undefined && data.zip !== lead.zip) ||
      (data.city !== undefined && data.city !== lead.city);

    const updated = await updateLead(id, {
      ...data,
      ...(addressChanged ? { latitude: null, longitude: null } : {}),
    });
    const activity = await addActivity(id, {
      type: "NOTE",
      content: `Stammdaten aktualisiert (${geaenderteFelder.join(", ")})`,
    });
    return { geaendert: true, felder: geaenderteFelder, lead: leadFull(updated, false), aktivitaet: activityOut(activity) };
  },
});

export const leadAnlegen = defineTool({
  name: "lead_anlegen",
  title: "Lead anlegen",
  scope: SCOPE_WRITE,
  description:
    "Legt einen neuen Lead an (Status NEW). Schlägt fehl, wenn die E-Mail-Adresse bereits existiert; dann stattdessen lead_details bzw. lead_aktualisieren nutzen.",
  schema: z.object({
    email: z.string().email().describe("E-Mail-Adresse (eindeutig)."),
    name: z.string().trim().max(200).optional(),
    firma: z.string().trim().max(200).optional(),
    telefon: z.string().trim().max(50).optional(),
    website: z.string().trim().max(300).optional(),
    quelle: enumOf(LeadSource).default("OTHER").describe("Herkunft des Leads."),
    notizen: z.string().max(10000).optional(),
    status: enumOf(LeadStatus).default("NEW").describe("Startstatus, normalerweise NEW."),
  }),
  async handler({ email, name, firma, telefon, website, quelle, notizen, status }) {
    const normalized = email.trim().toLowerCase();
    const existing = await prisma.lead.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      throw new ToolError(`Ein Lead mit dieser E-Mail existiert bereits (id ${existing.id}).`);
    }
    const lead = await prisma.lead.create({
      data: {
        email: normalized,
        name: name || null,
        company: firma || null,
        phone: telefon || null,
        website: website || null,
        source: quelle,
        notes: notizen || null,
        status,
      },
    });
    const activity = await addActivity(lead.id, {
      type: "NOTE",
      content: "Lead über Claude (MCP) angelegt",
    });
    return { angelegt: true, lead: leadFull(lead, false), aktivitaet: activityOut(activity) };
  },
});

export const bestellungStatusSetzen = defineTool({
  name: "bestellung_status_setzen",
  title: "Bestellstatus setzen",
  scope: SCOPE_WRITE,
  description: "Setzt den Bearbeitungsstatus einer Shop-Bestellung (neu, bearbeitet, abgeschlossen).",
  schema: z.object({
    id: z.number().int().positive().describe("Interne Bestellungs-ID."),
    status: z.enum(["neu", "bearbeitet", "abgeschlossen"]).describe("Neuer Status."),
  }),
  async handler({ id, status }) {
    const b = await prisma.bestellung.findUnique({ where: { id }, select: { status: true, bestellNr: true } });
    if (!b) throw new ToolError("Bestellung nicht gefunden.");
    if (b.status === status) return { geaendert: false, hinweis: `Bestellung ${b.bestellNr} hat bereits den Status ${status}.` };
    await prisma.bestellung.update({ where: { id }, data: { status } });
    return { geaendert: true, bestellNr: b.bestellNr, vorher: b.status, nachher: status };
  },
});

export const schreibTools = [
  leadStatusSetzen,
  leadFollowupSetzen,
  leadAktivitaetAnlegen,
  leadAktualisieren,
  leadAnlegen,
  bestellungStatusSetzen,
];
