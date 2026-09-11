import type { Lead, LeadActivity, Bestellung } from "@prisma/client";
import { formatBerlinDateTime } from "@/lib/datetime";

/**
 * Kompakte Darstellungen für Tool-Antworten. Tracking-Felder (UTM, Referrer,
 * Koordinaten) werden nur auf ausdrücklichen Wunsch ausgegeben.
 *
 * Zeitstempel gehen doppelt raus: `*At` als ISO-8601 in UTC für Vergleiche und
 * Sortierung, `*Lokal` als deutsche Ortszeit für Texte gegenüber dem Nutzer.
 * Das ist der Grund, hier nicht selbst zu rechnen – wer den UTC-Wert in einen
 * Bestätigungstext schreibt, nennt eine Uhrzeit, die das Admin nicht anzeigt.
 */

export function leadSummary(
  lead: Lead & {
    klasse?: { name: string } | null;
    _count?: { activities: number };
    firstCallScore?: { totalScore: number } | null;
    activities?: Pick<LeadActivity, "createdAt">[];
  }
) {
  return {
    id: lead.id,
    name: lead.name,
    firma: lead.company,
    email: lead.email,
    telefon: lead.phone,
    status: lead.status,
    quelle: lead.source,
    score: lead.score,
    firstCallScore: lead.firstCallScore?.totalScore ?? null,
    followUpAt: lead.followUpAt?.toISOString() ?? null,
    followUpLokal: lead.followUpAt ? formatBerlinDateTime(lead.followUpAt) : null,
    klasse: lead.klasse?.name ?? null,
    aktivitaeten: lead._count?.activities ?? undefined,
    letzteAktivitaet: lead.activities?.[0]?.createdAt.toISOString() ?? null,
    erstelltAm: lead.createdAt.toISOString(),
  };
}

export function leadFull(lead: Lead, mitTracking: boolean) {
  const base = {
    id: lead.id,
    name: lead.name,
    firma: lead.company,
    email: lead.email,
    telefon: lead.phone,
    website: lead.website,
    adresse: {
      strasse: lead.street,
      plz: lead.zip,
      ort: lead.city,
    },
    status: lead.status,
    quelle: lead.source,
    score: lead.score,
    umsatzEuro: lead.status === "WON" ? lead.revenue / 100 : null,
    notizen: lead.notes,
    followUpAt: lead.followUpAt?.toISOString() ?? null,
    followUpLokal: lead.followUpAt ? formatBerlinDateTime(lead.followUpAt) : null,
    adnChannel: lead.adnChannel,
    webinarRegistriert: lead.webinarRegistered,
    erstelltAm: lead.createdAt.toISOString(),
    aktualisiertAm: lead.updatedAt.toISOString(),
  };
  if (!mitTracking) return base;
  return {
    ...base,
    tracking: {
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmContent: lead.utmContent,
      utmTerm: lead.utmTerm,
      referrer: lead.referrer,
      landingPage: lead.landingPage,
      firstTouchAt: lead.firstTouchAt?.toISOString() ?? null,
    },
  };
}

export function activityOut(a: LeadActivity) {
  return {
    id: a.id,
    typ: a.type,
    inhalt: a.content,
    alterWert: a.oldValue,
    neuerWert: a.newValue,
    am: a.createdAt.toISOString(),
    amLokal: formatBerlinDateTime(a.createdAt),
  };
}

export function bestellungSummary(b: Bestellung & { klasse?: { name: string } | null }) {
  return {
    id: b.id,
    bestellNr: b.bestellNr,
    status: b.status,
    firma: b.firma,
    ansprechpartner: `${b.vorname} ${b.nachname}`.trim(),
    email: b.email,
    paket: b.paket,
    userAnzahl: b.userAnzahl,
    zahlungsmodell: b.zahlungsmodell,
    preisNettoEuro: Number(b.preisNetto),
    sonderpreis: b.sonderpreisNetto != null,
    adnChannel: b.adnChannel,
    intern: b.intern,
    klasse: b.klasse?.name ?? null,
    erstelltAm: b.erstelltAm.toISOString(),
  };
}
