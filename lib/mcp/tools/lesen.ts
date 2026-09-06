import { z } from "zod";
import { LeadSource, LeadStatus, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getKpiStats, getLeads } from "@/lib/db/leads";
import { getShopKpis } from "@/lib/db/bestellungen";
import { berlinDateString, parseBerlinDate } from "@/lib/datetime";
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, SCOPE_READ } from "../config";
import { defineTool, ToolError } from "./types";
import { activityOut, bestellungSummary, leadFull, leadSummary } from "./format";

/** Prisma-Enum-Objekt → zod-Enum. */
function enumOf<T extends Record<string, string>>(obj: T) {
  return z.enum(Object.values(obj) as [T[keyof T], ...T[keyof T][]]);
}

const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_LIST_LIMIT)
  .default(DEFAULT_LIST_LIMIT)
  .describe(`Maximale Anzahl Treffer (1 bis ${MAX_LIST_LIMIT}).`);

const BESTELLUNG_STATUS = ["neu", "bearbeitet", "abgeschlossen"] as const;

// ─── Leads ───────────────────────────────────────────────────────────────────

export const leadsSuchen = defineTool({
  name: "leads_suchen",
  title: "Leads suchen",
  scope: SCOPE_READ,
  description:
    "Sucht Leads im CRM (Warteliste, Interessenten, Kunden) nach Freitext, Status oder Quelle. " +
    "Liefert eine kompakte Liste, sortiert nach Erstelldatum absteigend. Für Details anschließend lead_details aufrufen.",
  schema: z.object({
    suche: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe("Freitext, wird gegen Name, Firma und E-Mail geprüft (Teilstring, Groß-/Kleinschreibung egal)."),
    status: enumOf(LeadStatus).optional().describe("Nur Leads mit diesem Status."),
    quelle: enumOf(LeadSource).optional().describe("Nur Leads aus dieser Quelle."),
    limit: limitSchema,
  }),
  async handler({ suche, status, quelle, limit }) {
    const leads = await getLeads({ search: suche, status, source: quelle, limit });
    return {
      anzahl: leads.length,
      hinweis:
        leads.length === limit
          ? `Es wurden genau ${limit} Treffer geliefert, möglicherweise gibt es weitere. Suche verfeinern oder limit erhöhen.`
          : undefined,
      leads: leads.map(leadSummary),
    };
  },
});

export const leadDetails = defineTool({
  name: "lead_details",
  title: "Lead-Details",
  scope: SCOPE_READ,
  description:
    "Liefert alle Daten zu einem Lead: Stammdaten, Notizen, die letzten 30 Aktivitäten, First-Call-Score, " +
    "Webinar-Anmeldungen und zugehörige Bestellungen (über die E-Mail-Adresse). Entweder id oder email angeben.",
  schema: z.object({
    id: z.string().uuid().optional().describe("Lead-ID (UUID)."),
    email: z.string().email().optional().describe("E-Mail-Adresse des Leads (Alternative zur ID)."),
    mitTracking: z
      .boolean()
      .default(false)
      .describe("UTM-Parameter, Referrer und Landingpage mit ausgeben (nur bei Bedarf)."),
  }),
  async handler({ id, email, mitTracking }) {
    if (!id && !email) throw new ToolError("Bitte id oder email angeben.");
    const lead = await prisma.lead.findFirst({
      where: id ? { id } : { email: { equals: email!, mode: "insensitive" } },
      include: {
        klasse: { select: { name: true, slug: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
        firstCallScore: true,
        webinarRegistrations: {
          include: { webinar: { select: { title: true, scheduledAt: true } } },
        },
      },
    });
    if (!lead) throw new ToolError("Lead nicht gefunden.");

    const bestellungen = await prisma.bestellung.findMany({
      where: { email: { equals: lead.email, mode: "insensitive" } },
      include: { klasse: { select: { name: true } } },
      orderBy: { erstelltAm: "desc" },
    });

    const fcs = lead.firstCallScore;
    return {
      lead: { ...leadFull(lead, mitTracking), klasse: lead.klasse ?? null },
      firstCallScore: fcs
        ? {
            gesamt: fcs.totalScore,
            kriterien: {
              copilotDemand: fcs.copilotDemand,
              currentOffer: fcs.currentOffer,
              teamCapacity: fcs.teamCapacity,
              decisionMaker: fcs.decisionMaker,
              budgetReadiness: fcs.budgetReadiness,
              urgency: fcs.urgency,
              mindset: fcs.mindset,
              msPartnerStatus: fcs.msPartnerStatus,
            },
            beschreibung: fcs.description,
            painPoint: fcs.painPoint,
            teamgroesse: fcs.teamSize,
            empfohlenesPaket: fcs.recommendedPackage,
            einwaende: fcs.objections,
            naechsterSchritt: fcs.nextStep,
            followUpDatum: fcs.followUpDate?.toISOString() ?? null,
            gespraechAm: fcs.calledAt.toISOString(),
          }
        : null,
      webinare: lead.webinarRegistrations.map((r) => ({
        webinar: r.webinar.title,
        termin: r.webinar.scheduledAt.toISOString(),
        status: r.status,
        angemeldetAm: r.registeredAt.toISOString(),
      })),
      bestellungen: bestellungen.map(bestellungSummary),
      aktivitaeten: lead.activities.map(activityOut),
    };
  },
});

export const leadsFaellig = defineTool({
  name: "leads_faellig",
  title: "Fällige Follow-ups",
  scope: SCOPE_READ,
  description:
    "Listet Leads, deren Follow-up-Datum erreicht oder überschritten ist (Status nicht WON/LOST). " +
    "Standard: alles, was bis heute (Berlin) fällig ist.",
  schema: z.object({
    bis: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Stichtag als YYYY-MM-DD. Es werden alle Follow-ups bis einschließlich dieses Tages geliefert."),
    status: enumOf(LeadStatus).optional().describe("Optional auf einen Status einschränken."),
    limit: limitSchema,
  }),
  async handler({ bis, status, limit }) {
    const tag = bis ?? berlinDateString(new Date());
    const stichtag = parseBerlinDate(`${tag}T23:59`);
    const leads = await prisma.lead.findMany({
      where: {
        followUpAt: { not: null, lte: stichtag },
        ...(status ? { status } : { status: { notIn: ["WON", "LOST"] } }),
      },
      orderBy: { followUpAt: "asc" },
      take: limit,
      include: {
        klasse: { select: { name: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    });
    const now = Date.now();
    return {
      stichtag: tag,
      anzahl: leads.length,
      leads: leads.map((l) => ({
        ...leadSummary(l),
        ueberfaelligTage: Math.max(
          0,
          Math.floor((now - (l.followUpAt?.getTime() ?? now)) / 86_400_000)
        ),
      })),
    };
  },
});

export const pipelineKennzahlen = defineTool({
  name: "pipeline_kennzahlen",
  title: "Pipeline-Kennzahlen",
  scope: SCOPE_READ,
  description:
    "Überblick über CRM und Shop: Leads je Status, Conversion, gewonnener Umsatz, neue Leads der letzten 7 und 30 Tage, " +
    "überfällige Follow-ups sowie Bestellungen je Status und Paket.",
  schema: z.object({}),
  async handler() {
    const now = new Date();
    const [kpi, shop, neu7, neu30, ueberfaellig] = await Promise.all([
      getKpiStats(),
      getShopKpis(),
      prisma.lead.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
      prisma.lead.count({ where: { createdAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } } }),
      prisma.lead.count({
        where: { followUpAt: { lt: now }, status: { notIn: ["WON", "LOST"] } },
      }),
    ]);
    return {
      leads: {
        gesamt: kpi.total,
        jeStatus: kpi.byStatus,
        aktiveFunnel: kpi.activeFunnel,
        gewonnen: kpi.won,
        conversionProzent: kpi.conversionRate,
        umsatzGewonnenEuro: Number(kpi.revenueTotal) / 100,
        neueLetzte7Tage: neu7,
        neueLetzte30Tage: neu30,
        ueberfaelligeFollowUps: ueberfaellig,
      },
      shop: {
        bestellungen: shop.total,
        neu: shop.neu,
        bearbeitet: shop.bearbeitet,
        abgeschlossen: shop.abgeschlossen,
        umsatzNettoEuro: shop.revenueNetto,
        jePaket: shop.byPaket,
        mitSonderpreis: shop.sonderpreisCount,
      },
      stand: now.toISOString(),
    };
  },
});

// ─── Bestellungen ────────────────────────────────────────────────────────────

export const bestellungenSuchen = defineTool({
  name: "bestellungen_suchen",
  title: "Bestellungen suchen",
  scope: SCOPE_READ,
  description:
    "Sucht Bestellungen aus dem Online-Shop nach Firma, Ansprechpartner, E-Mail oder Bestellnummer, optional gefiltert nach Status und Klasse.",
  schema: z.object({
    suche: z.string().trim().min(1).max(100).optional().describe("Freitext für Firma, Name, E-Mail oder Bestellnummer."),
    status: z.enum(BESTELLUNG_STATUS).optional().describe("Bestellstatus."),
    klasseSlug: z.string().optional().describe("Slug der Klasse, z.B. klasse-1."),
    limit: limitSchema,
  }),
  async handler({ suche, status, klasseSlug, limit }) {
    const bestellungen = await prisma.bestellung.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(klasseSlug ? { klasse: { slug: klasseSlug } } : {}),
        ...(suche
          ? {
              OR: [
                { firma: { contains: suche, mode: "insensitive" } },
                { vorname: { contains: suche, mode: "insensitive" } },
                { nachname: { contains: suche, mode: "insensitive" } },
                { email: { contains: suche, mode: "insensitive" } },
                { bestellNr: { contains: suche, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { klasse: { select: { name: true } } },
      orderBy: { erstelltAm: "desc" },
      take: limit,
    });
    return { anzahl: bestellungen.length, bestellungen: bestellungen.map(bestellungSummary) };
  },
});

export const bestellungDetails = defineTool({
  name: "bestellung_details",
  title: "Bestellungs-Details",
  scope: SCOPE_READ,
  description: "Liefert eine Bestellung mit Rechnungsadresse, Preisen, Klasse und gemeldeten Teilnehmern.",
  schema: z.object({
    id: z.number().int().positive().describe("Interne Bestellungs-ID (siehe bestellungen_suchen)."),
  }),
  async handler({ id }) {
    const b = await prisma.bestellung.findUnique({
      where: { id },
      include: {
        klasse: { select: { name: true, slug: true, status: true } },
        teilnehmer: { orderBy: { position: "asc" } },
      },
    });
    if (!b) throw new ToolError("Bestellung nicht gefunden.");
    return {
      ...bestellungSummary(b),
      klasse: b.klasse,
      rechnungsadresse: {
        firma: b.firma,
        strasse: b.strasse,
        plz: b.plz,
        ort: b.ort,
        land: b.land,
        ustId: b.ustId,
      },
      kontakt: {
        vorname: b.vorname,
        nachname: b.nachname,
        email: b.email,
        telefon: b.telefon,
        position: b.position,
        website: b.website,
      },
      preise: {
        listPreisNettoEuro: b.listPreisNetto != null ? Number(b.listPreisNetto) : null,
        sonderpreisNettoEuro: b.sonderpreisNetto != null ? Number(b.sonderpreisNetto) : null,
        preisNettoEuro: Number(b.preisNetto),
        mwstSatzProzent: Number(b.mwstSatz),
        mwstBetragEuro: Number(b.mwstBetrag),
        preisBruttoEuro: Number(b.preisBrutto),
        reverseCharge: b.reverseCharge,
      },
      anmerkungen: b.anmerkungen,
      groessenklasse: b.groessenklasse,
      teilnehmer: b.teilnehmer.map((t) => ({
        position: t.position,
        vorname: t.vorname,
        nachname: t.nachname,
        email: t.email,
        rolle: t.rolle,
        teamsEingeladenAm: t.teamsEingeladenAm?.toISOString() ?? null,
      })),
      aktualisiertAm: b.aktualisiertAm.toISOString(),
    };
  },
});

// ─── Webinare & Klassen ──────────────────────────────────────────────────────

export const webinareListe = defineTool({
  name: "webinare_liste",
  title: "Webinare",
  scope: SCOPE_READ,
  description: "Listet Webinare mit Termin, Status und Anmeldezahlen (angemeldet, teilgenommen, No-Show).",
  schema: z.object({
    nurKommende: z.boolean().default(false).describe("Nur Webinare, deren Termin in der Zukunft liegt."),
  }),
  async handler({ nurKommende }) {
    const webinare = await prisma.webinar.findMany({
      where: nurKommende ? { scheduledAt: { gte: new Date() } } : {},
      orderBy: { scheduledAt: "desc" },
      take: MAX_LIST_LIMIT,
      include: {
        klasse: { select: { name: true } },
        registrations: { select: { status: true } },
      },
    });
    const count = (regs: { status: RegistrationStatus }[], s: RegistrationStatus) =>
      regs.filter((r) => r.status === s).length;
    return {
      anzahl: webinare.length,
      webinare: webinare.map((w) => ({
        id: w.id,
        titel: w.title,
        termin: w.scheduledAt.toISOString(),
        status: w.status,
        klasse: w.klasse?.name ?? null,
        anmeldungen: {
          gesamt: w.registrations.length,
          angemeldet: count(w.registrations, "REGISTERED"),
          teilgenommen: count(w.registrations, "ATTENDED"),
          noShow: count(w.registrations, "NO_SHOW"),
          storniert: count(w.registrations, "CANCELLED"),
        },
      })),
    };
  },
});

export const webinarTeilnehmer = defineTool({
  name: "webinar_teilnehmer",
  title: "Webinar-Teilnehmer",
  scope: SCOPE_READ,
  description: "Listet die Anmeldungen eines Webinars mit Lead-Basisdaten, optional nach Anmeldestatus gefiltert.",
  schema: z.object({
    webinarId: z.string().min(1).describe("Webinar-ID (siehe webinare_liste)."),
    status: enumOf(RegistrationStatus).optional().describe("Nur Anmeldungen mit diesem Status."),
  }),
  async handler({ webinarId, status }) {
    const webinar = await prisma.webinar.findUnique({ where: { id: webinarId }, select: { title: true } });
    if (!webinar) throw new ToolError("Webinar nicht gefunden.");
    const regs = await prisma.webinarRegistration.findMany({
      where: { webinarId, ...(status ? { status } : {}) },
      include: {
        lead: { select: { id: true, name: true, company: true, email: true, status: true } },
      },
      orderBy: { registeredAt: "asc" },
      take: 200,
    });
    return {
      webinar: webinar.title,
      anzahl: regs.length,
      teilnehmer: regs.map((r) => ({
        leadId: r.lead.id,
        name: r.lead.name,
        firma: r.lead.company,
        email: r.lead.email,
        leadStatus: r.lead.status,
        anmeldestatus: r.status,
        angemeldetAm: r.registeredAt.toISOString(),
        teilgenommenAm: r.attendedAt?.toISOString() ?? null,
      })),
    };
  },
});

export const klassenListe = defineTool({
  name: "klassen_liste",
  title: "Klassen",
  scope: SCOPE_READ,
  description:
    "Listet die Masterclass-Klassen mit Status, Laufzeit, Kapazität, Anzahl Bestellungen und Teilnehmer sowie dem nächsten geplanten Termin.",
  schema: z.object({}),
  async handler() {
    const klassen = await prisma.klasse.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { bestellungen: true, leads: true } },
        bestellungen: { select: { userAnzahl: true, intern: true } },
        termine: {
          where: { status: "GEPLANT", datum: { gte: new Date() } },
          orderBy: { datum: "asc" },
          take: 1,
          select: { datum: true, thema: true },
        },
      },
    });
    return {
      anzahl: klassen.length,
      klassen: klassen.map((k) => ({
        id: k.id,
        name: k.name,
        slug: k.slug,
        status: k.status,
        kickoff: k.kickoffDate.toISOString(),
        start: k.startDate.toISOString(),
        ende: k.endDate.toISOString(),
        kapazitaet: k.capacity,
        teilnehmerSperre: k.teilnehmerSperre,
        bestellungen: k._count.bestellungen,
        gebuchtePlaetze: k.bestellungen
          .filter((b) => !b.intern)
          .reduce((sum, b) => sum + b.userAnzahl, 0),
        leads: k._count.leads,
        naechsterTermin: k.termine[0]
          ? { datum: k.termine[0].datum.toISOString(), thema: k.termine[0].thema }
          : null,
      })),
    };
  },
});

export const leseTools = [
  leadsSuchen,
  leadDetails,
  leadsFaellig,
  pipelineKennzahlen,
  bestellungenSuchen,
  bestellungDetails,
  webinareListe,
  webinarTeilnehmer,
  klassenListe,
];
