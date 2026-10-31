import { z } from "zod";
import { LeadSource, LeadStatus, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getKpiStats, getLeads } from "@/lib/db/leads";
import { getShopKpis } from "@/lib/db/bestellungen";
import { berlinDateString, berlinInputToUtc } from "@/lib/datetime";
import { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, SCOPE_READ } from "../config";
import { defineTool, ToolError } from "./types";
import { activityOut, bestellungSummary, leadFull, leadSummary, teilnehmerOut } from "./format";
import {
  domainPasst,
  istGemeldet,
  klassenZusammenfassung,
  normalisiereDomain,
  teilnehmerDomainWhere,
  teilnehmerSucheWhere,
} from "./teilnehmer";

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
    "Liefert eine kompakte Liste, sortiert nach Erstelldatum absteigend. Für Details anschließend lead_details aufrufen. " +
    "keineMails ungleich null heißt: diesem Lead keine E-Mail schicken.",
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
    const stichtag = berlinInputToUtc(`${tag}T23:59`);
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
    "Überblick über CRM und Shop: Leads je Status, Conversion, gewonnener Umsatz (gesamt und je Klasse), Kaltakquise-Kosten, neue Leads der letzten 7 und 30 Tage, " +
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
        umsatzJeKlasse: kpi.revenueByKlasse.map((k) => ({
          klasse: k.name,
          gewonnen: k.won,
          umsatzEuro: k.revenue / 100,
        })),
        kaltakquiseKostenEuro: kpi.coldOutreachCostTotal / 100,
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
    "Sucht Bestellungen aus dem Online-Shop, gedacht für Firmen und Ansprechpartner (Kontaktperson der Bestellung). " +
    "Die Suche prüft Firma, Ansprechpartner, Kontakt-E-Mail und Bestellnummer und zusätzlich Namen und E-Mails der gemeldeten Teilnehmer. " +
    "trefferInTeilnehmern=true heißt: mindestens ein gemeldeter Teilnehmer passt zur Suche. " +
    "Um eine einzelne Person einer Klasse zuzuordnen, besser teilnehmer_suchen verwenden, das liefert die Person direkt mit Bestellung und Klasse.",
  schema: z.object({
    suche: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "Freitext für Firma, Ansprechpartner, E-Mail oder Bestellnummer sowie Vorname, Nachname und E-Mail der gemeldeten Teilnehmer."
      ),
    status: z.enum(BESTELLUNG_STATUS).optional().describe("Bestellstatus."),
    klasseSlug: z.string().optional().describe("Slug der Klasse, z.B. klasse-1."),
    limit: limitSchema,
  }),
  async handler({ suche, status, klasseSlug, limit }) {
    const teilnehmerWhere = suche ? { ...teilnehmerSucheWhere(suche), NOT: { email: "" } } : null;
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
                { teilnehmer: { some: teilnehmerWhere! } },
              ],
            }
          : {}),
      },
      include: {
        klasse: { select: { name: true } },
        ...(teilnehmerWhere
          ? { teilnehmer: { where: teilnehmerWhere, select: { id: true }, take: 1 } }
          : {}),
      },
      orderBy: { erstelltAm: "desc" },
      take: limit,
    });
    return {
      anzahl: bestellungen.length,
      bestellungen: bestellungen.map((b) => ({
        ...bestellungSummary(b),
        trefferInTeilnehmern: "teilnehmer" in b && Array.isArray(b.teilnehmer) && b.teilnehmer.length > 0,
      })),
    };
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

// ─── Teilnehmer ──────────────────────────────────────────────────────────────

/** Teilnehmer-Listen dürfen größer sein als andere Listen (Abgleich mit Teams-Anwesenheit). */
const TEILNEHMER_MAX_LIMIT = 200;
const TEILNEHMER_DEFAULT_LIMIT = 50;
/** Sicherheitsgrenze für klassen_teilnehmer ohne Klassenfilter. */
const KLASSEN_TEILNEHMER_MAX = 1000;

const teilnehmerSelect = {
  vorname: true,
  nachname: true,
  email: true,
  teamsEingeladenAm: true,
  bestellung: {
    select: {
      id: true,
      bestellNr: true,
      firma: true,
      gekuendigtAm: true,
      intern: true,
      klasse: { select: { name: true, slug: true } },
    },
  },
} as const;

export const teilnehmerSuchen = defineTool({
  name: "teilnehmer_suchen",
  title: "Teilnehmer suchen",
  scope: SCOPE_READ,
  description:
    "Der richtige Weg, um eine Person einer Klasse zuzuordnen: durchsucht alle gemeldeten Teilnehmer aller Bestellungen " +
    "(auch nachgemeldete Kollegen, die nicht Ansprechpartner der Bestellung sind) und liefert je Treffer Person, Bestellung, Firma und Klasse. " +
    "suche prüft Vorname, Nachname und E-Mail (Teilstring, Groß-/Kleinschreibung egal; mehrere Wörter müssen alle passen, z.B. \"Christopher Frank\"). " +
    "domain filtert auf den Teil der E-Mail nach dem @ (exakt, Subdomains eingeschlossen). Mindestens suche oder domain angeben. " +
    "Leere Teilnehmer-Slots ohne E-Mail werden nicht ausgegeben. Für Firmen und Ansprechpartner von Bestellungen ist bestellungen_suchen gedacht.",
  schema: z.object({
    suche: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe("Teilstring für Vorname, Nachname oder E-Mail des Teilnehmers, z.B. \"iridon\" oder \"smart-net\"."),
    domain: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "E-Mail-Domain (Teil nach dem @), z.B. \"acp.de\". Exakter Abgleich; Subdomains wie muenchen.einsnulleins.de passen zu einsnulleins.de."
      ),
    klasseSlug: z.string().optional().describe("Nur Teilnehmer dieser Klasse, z.B. klasse-1."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(TEILNEHMER_MAX_LIMIT)
      .default(TEILNEHMER_DEFAULT_LIMIT)
      .describe(`Maximale Anzahl Treffer (1 bis ${TEILNEHMER_MAX_LIMIT}).`),
  }),
  async handler({ suche, domain, klasseSlug, limit }) {
    if (!suche && !domain) throw new ToolError("Bitte suche oder domain angeben.");
    if (domain !== undefined && !normalisiereDomain(domain)) throw new ToolError("Ungültige domain.");

    const rows = await prisma.bestellungTeilnehmer.findMany({
      where: {
        AND: [
          { NOT: { email: "" } },
          ...(suche ? [teilnehmerSucheWhere(suche)] : []),
          ...(domain ? [teilnehmerDomainWhere(domain)] : []),
          ...(klasseSlug ? [{ bestellung: { klasse: { slug: klasseSlug } } }] : []),
        ],
      },
      select: teilnehmerSelect,
      orderBy: [
        { bestellung: { klasse: { startDate: "asc" } } },
        { bestellung: { firma: "asc" } },
        { position: "asc" },
      ],
      // Ein Treffer mehr, um "es gibt weitere" erkennen zu können.
      take: limit + 1,
    });

    const passend = rows.filter((t) => istGemeldet(t) && (!domain || domainPasst(t.email, domain)));
    const mehr = passend.length > limit;
    const treffer = passend.slice(0, limit).map(teilnehmerOut);

    const jeKlasse = new Map<string, { klasse: { name: string; slug: string }; anzahl: number }>();
    for (const t of treffer) {
      const eintrag = jeKlasse.get(t.klasse.slug) ?? { klasse: t.klasse, anzahl: 0 };
      eintrag.anzahl += 1;
      jeKlasse.set(t.klasse.slug, eintrag);
    }

    return {
      anzahl: treffer.length,
      hinweis: mehr
        ? `Es gibt mehr als ${limit} Treffer. Suche verfeinern oder limit erhöhen (max. ${TEILNEHMER_MAX_LIMIT}).`
        : undefined,
      jeKlasse: [...jeKlasse.values()],
      teilnehmer: treffer,
    };
  },
});

export const klassenTeilnehmer = defineTool({
  name: "klassen_teilnehmer",
  title: "Teilnehmer je Klasse",
  scope: SCOPE_READ,
  description:
    "Liefert in einem Aufruf alle gemeldeten Teilnehmer (mit E-Mail) einer Klasse oder, ohne klasseSlug, aller Klassen, " +
    "mit Person, Bestellung, Firma und Klasse, plus Zusammenfassung je Klasse (Bestellungen, gebuchte Plätze, gemeldete Teilnehmer, freie Slots). " +
    "Gedacht für den Abgleich mit Teams-Anwesenheitslisten. Interne Bestellungen zählen wie in klassen_liste nicht zu Bestellungen und Plätzen, " +
    "ihre Teilnehmer stehen aber in der Liste (intern=true) und separat in der Zusammenfassung. Leere Slots ohne E-Mail werden nicht ausgegeben. " +
    "Um eine einzelne Person zu finden, teilnehmer_suchen verwenden.",
  schema: z.object({
    klasseSlug: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Slug der Klasse, z.B. klasse-1. Weglassen für alle Klassen."),
  }),
  async handler({ klasseSlug }) {
    const klassen = await prisma.klasse.findMany({
      where: klasseSlug ? { slug: klasseSlug } : {},
      orderBy: { startDate: "asc" },
      select: {
        name: true,
        slug: true,
        status: true,
        bestellungen: {
          orderBy: [{ firma: "asc" }, { id: "asc" }],
          select: {
            id: true,
            bestellNr: true,
            firma: true,
            gekuendigtAm: true,
            intern: true,
            userAnzahl: true,
            teilnehmer: {
              orderBy: { position: "asc" },
              select: { vorname: true, nachname: true, email: true, teamsEingeladenAm: true },
            },
          },
        },
      },
    });
    if (klasseSlug && klassen.length === 0) {
      throw new ToolError("Klasse nicht gefunden. Gültige Slugs liefert klassen_liste.");
    }

    const teilnehmer: ReturnType<typeof teilnehmerOut>[] = [];
    for (const k of klassen) {
      for (const b of k.bestellungen) {
        for (const t of b.teilnehmer) {
          if (!istGemeldet(t)) continue;
          teilnehmer.push(
            teilnehmerOut({
              ...t,
              bestellung: { ...b, klasse: { name: k.name, slug: k.slug } },
            })
          );
        }
      }
    }
    const gekuerzt = teilnehmer.length > KLASSEN_TEILNEHMER_MAX;

    return {
      klassen: klassen.map((k) => ({
        name: k.name,
        slug: k.slug,
        status: k.status,
        ...klassenZusammenfassung(k.bestellungen),
      })),
      anzahl: Math.min(teilnehmer.length, KLASSEN_TEILNEHMER_MAX),
      hinweis: gekuerzt
        ? `Mehr als ${KLASSEN_TEILNEHMER_MAX} Teilnehmer, Liste gekürzt. Bitte klasseSlug angeben.`
        : undefined,
      teilnehmer: teilnehmer.slice(0, KLASSEN_TEILNEHMER_MAX),
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
  teilnehmerSuchen,
  klassenTeilnehmer,
  webinareListe,
  webinarTeilnehmer,
  klassenListe,
];
