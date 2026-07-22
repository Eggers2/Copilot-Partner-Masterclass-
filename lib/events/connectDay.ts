import { prisma } from "@/lib/prisma";
import { calculateMwst } from "@/lib/packages";
import type { Prisma } from "@prisma/client";

/**
 * Kernlogik für Event-Anmeldungen im Kundenportal (Connect Day).
 *
 * Kapazität wird NICHT per Count-then-Insert geprüft (TOCTOU-Race, vgl.
 * lib/klassen.ts), sondern über ein konditionales UPDATE auf den atomaren
 * Zähler `Event.seatsTaken`: parallele Anmeldungen serialisieren sich am
 * Row-Lock, der Verlierer bekommt `count === 0` und damit EventFullError.
 */

export const CONNECT_DAY_SLUG = "connect-day-2026";

export type RegisterErrorCode =
  | "event_not_found"
  | "event_closed"
  | "not_yet_open"
  | "deadline_passed"
  | "not_eligible"
  | "invalid_teilnehmer"
  | "too_many_persons"
  | "teilnehmer_already_registered"
  | "event_full";

export class RegisterError extends Error {
  constructor(public code: RegisterErrorCode) {
    super(code);
    this.name = "RegisterError";
  }
}

/** Wählbarer Teilnehmer (Masterclass-Platz der Bestellung) fürs Dropdown. */
export interface AuswahlTeilnehmer {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
}

function isAuswaehlbar(t: {
  vorname: string;
  nachname: string;
  email: string;
}): boolean {
  return (
    t.vorname.trim().length > 0 &&
    t.nachname.trim().length > 0 &&
    t.email.includes("@")
  );
}

/**
 * Lädt das Connect-Day-Event samt allem, was die Kundenportal-Seite braucht:
 * berechtigte Bestellungen (inkl. wählbarer Masterclass-Teilnehmer), alle
 * bestehenden Anmeldungen der Session-E-Mail (Nachmeldungen sind eigene
 * Anmeldungen mit eigener Rechnung) und den Belegungsstand.
 */
export async function getConnectDayContext(sessionEmail: string) {
  const event = await prisma.event.findUnique({
    where: { slug: CONNECT_DAY_SLUG },
  });
  if (!event) return null;

  const bestellungen = await prisma.bestellung.findMany({
    where: { email: sessionEmail },
    select: {
      id: true,
      bestellNr: true,
      firma: true,
      land: true,
      ustId: true,
      klasse: { select: { name: true, slug: true, teilnehmerSperre: true } },
      teilnehmer: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          vorname: true,
          nachname: true,
          email: true,
        },
      },
    },
    orderBy: { erstelltAm: "asc" },
  });

  const eligibleBestellungen = bestellungen
    .filter((b) => event.erlaubteKlassenSlugs.includes(b.klasse.slug))
    .map((b) => ({
      ...b,
      auswaehlbareTeilnehmer: b.teilnehmer.filter(isAuswaehlbar),
    }));

  const registrations = await prisma.eventRegistration.findMany({
    where: {
      eventId: event.id,
      status: "CONFIRMED",
      bestellung: { email: sessionEmail },
    },
    include: {
      teilnehmer: { orderBy: { position: "asc" } },
      bestellung: {
        select: { id: true, firma: true, bestellNr: true },
      },
    },
    orderBy: { erstelltAm: "asc" },
  });

  // Eigene Wartelisten-Einträge (WAITING = noch aktiv, PROMOTED = nachgerückt).
  // Ausgetragene (CANCELLED) Einträge werden nicht mehr angezeigt.
  const waitlist = await prisma.eventWaitlist.findMany({
    where: {
      eventId: event.id,
      status: { in: ["WAITING", "PROMOTED"] },
      bestellung: { email: sessionEmail },
    },
    include: {
      bestellung: { select: { id: true, firma: true, bestellNr: true } },
    },
    orderBy: { erstelltAm: "asc" },
  });

  // Firmen-Kontingent (maxProBestellung Personen pro Session-E-Mail) über
  // ALLE bestätigten Anmeldungen hinweg – daraus ergibt sich, wie viele
  // Personen noch nachgemeldet werden können.
  const personenAngemeldet = registrations.reduce(
    (sum, r) => sum + r.personen,
    0
  );
  const nachmeldeKontingent = Math.max(
    0,
    event.maxProBestellung - personenAngemeldet
  );
  // Bereits angemeldete Personen (über alle Anmeldungen) – für die Filterung
  // der Auswahllisten, damit niemand doppelt angemeldet werden kann.
  const angemeldeteTeilnehmerIds = registrations.flatMap((r) =>
    r.teilnehmer.map((t) => t.bestellungTeilnehmerId)
  );

  const seatsFrei = Math.max(0, event.capacity - event.seatsTaken);
  const now = new Date();

  return {
    event,
    eligibleBestellungen,
    registrations,
    waitlist,
    personenAngemeldet,
    nachmeldeKontingent,
    angemeldeteTeilnehmerIds,
    seatsFrei,
    isFull: seatsFrei <= 0,
    // Anmeldestart noch nicht erreicht? Der Admin-Schalter
    // `manuellFreigeschaltet` öffnet die Anmeldung vorab (Testmodus).
    notYetOpen: !isAnmeldestartErreicht(event),
    deadlinePassed: now > event.anmeldeschluss,
    isOpen: event.status === "OPEN",
  };
}

function isAnmeldestartErreicht(event: {
  anmeldestart: Date | null;
  manuellFreigeschaltet: boolean;
}): boolean {
  if (event.manuellFreigeschaltet) return true;
  if (!event.anmeldestart) return true;
  return new Date() >= event.anmeldestart;
}

export interface RegisterInput {
  sessionEmail: string;
  bestellungId: number;
  /** IDs der gewählten BestellungTeilnehmer (1..maxProBestellung, distinct) */
  teilnehmerIds: number[];
  /** optionale Hinweise (z.B. Ernährung) je Teilnehmer-ID */
  hinweise?: Record<number, string>;
}

/**
 * Validiert Berechtigung + Auswahl und legt die Anmeldung race-sicher an.
 * Wirft RegisterError mit maschinenlesbarem Code; die Server Action mappt
 * die Codes auf deutsche Fehlermeldungen.
 *
 * NACHMELDUNGEN: Eine Firma darf mehrere bestätigte Anmeldungen haben (jede
 * bekommt ihre eigene Rechnung), solange das Firmen-Kontingent
 * (event.maxProBestellung Personen über alle Anmeldungen der Session-E-Mail)
 * und die Event-Kapazität reichen. Dieselbe Person kann nur einmal
 * angemeldet werden.
 *
 * Gibt die ID der neuen EventRegistration zurück.
 */
export async function registerForConnectDay(
  input: RegisterInput
): Promise<string> {
  const event = await prisma.event.findUnique({
    where: { slug: CONNECT_DAY_SLUG },
  });
  if (!event) throw new RegisterError("event_not_found");
  if (event.status !== "OPEN") throw new RegisterError("event_closed");
  if (!isAnmeldestartErreicht(event)) throw new RegisterError("not_yet_open");
  if (new Date() > event.anmeldeschluss) {
    throw new RegisterError("deadline_passed");
  }

  const bestellung = await prisma.bestellung.findUnique({
    where: { id: input.bestellungId },
    select: {
      id: true,
      email: true,
      firma: true,
      land: true,
      ustId: true,
      klasse: { select: { slug: true } },
      teilnehmer: {
        select: { id: true, vorname: true, nachname: true, email: true },
      },
    },
  });
  if (
    !bestellung ||
    bestellung.email !== input.sessionEmail ||
    !event.erlaubteKlassenSlugs.includes(bestellung.klasse.slug)
  ) {
    throw new RegisterError("not_eligible");
  }

  // Teilnehmer-Auswahl: nur Masterclass-Teilnehmer DIESER Bestellung,
  // jede Person höchstens einmal, Name + E-Mail müssen gepflegt sein.
  const ids = input.teilnehmerIds;
  if (ids.length < 1 || new Set(ids).size !== ids.length) {
    throw new RegisterError("invalid_teilnehmer");
  }
  if (ids.length > event.maxProBestellung) {
    throw new RegisterError("too_many_persons");
  }
  const byId = new Map(bestellung.teilnehmer.map((t) => [t.id, t]));
  const gewaehlt = ids.map((id) => byId.get(id));
  if (gewaehlt.some((t) => !t || !isAuswaehlbar(t))) {
    throw new RegisterError("invalid_teilnehmer");
  }

  // Preis-Snapshot: Personenzahl × Netto-Preis, MwSt nach Land/USt-ID der
  // Bestellung (Präsenz-Event in DE → Hinweis in lib/events/connectDayInvoice.ts).
  const personen = ids.length;
  const preisNetto =
    Math.round(Number(event.preisNettoProPerson) * personen * 100) / 100;
  const mwst = calculateMwst(
    bestellung.land,
    bestellung.ustId ?? undefined,
    preisNetto
  );

  try {
    return await prisma.$transaction(async (tx) => {
      // Atomare Platz-Reservierung: nur wenn noch genug Plätze frei sind,
      // wird inkrementiert. Verlierer paralleler Anmeldungen: count === 0.
      const claimed = await tx.event.updateMany({
        where: {
          id: event.id,
          status: "OPEN",
          seatsTaken: { lte: event.capacity - personen },
        },
        data: { seatsTaken: { increment: personen } },
      });
      if (claimed.count === 0) throw new RegisterError("event_full");

      // Kontingent + Personen-Dedup NACH der Platz-Reservierung prüfen:
      // parallele Anmeldungen derselben Firma serialisieren sich am Row-Lock
      // der events-Zeile, die folgenden Reads sehen daher die committeten
      // Anmeldungen des Gewinners. Wirft die Prüfung, rollt die Transaktion
      // auch das Platz-Inkrement zurück.
      const bestehende = await tx.eventRegistration.findMany({
        where: {
          eventId: event.id,
          status: "CONFIRMED",
          bestellung: { email: input.sessionEmail },
        },
        select: {
          personen: true,
          teilnehmer: { select: { bestellungTeilnehmerId: true } },
        },
      });
      const bereitsAngemeldet = bestehende.reduce(
        (sum, r) => sum + r.personen,
        0
      );
      if (bereitsAngemeldet + personen > event.maxProBestellung) {
        throw new RegisterError("too_many_persons");
      }
      const angemeldeteIds = new Set(
        bestehende.flatMap((r) =>
          r.teilnehmer.map((t) => t.bestellungTeilnehmerId)
        )
      );
      if (ids.some((id) => angemeldeteIds.has(id))) {
        throw new RegisterError("teilnehmer_already_registered");
      }

      const registration = await tx.eventRegistration.create({
        data: {
          eventId: event.id,
          bestellungId: bestellung.id,
          personen,
          preisNetto,
          mwstSatz: mwst.mwstSatz,
          mwstBetrag: mwst.mwstBetrag,
          preisBrutto: mwst.preisBrutto,
          reverseCharge: mwst.reverseCharge,
          angemeldetVon: input.sessionEmail,
          teilnehmer: {
            create: gewaehlt.map((t, index) => ({
              position: index,
              bestellungTeilnehmerId: t!.id,
              vorname: t!.vorname.trim(),
              nachname: t!.nachname.trim(),
              email: t!.email.trim().toLowerCase(),
              hinweise: input.hinweise?.[t!.id]?.trim() || null,
            })),
          },
        },
        select: { id: true },
      });
      return registration.id;
    });
  } catch (err) {
    // Unique-Verletzung (P2002, z.B. event_teilnehmer) → als Doppelanmeldung
    // melden. Die Transaktion ist zurückgerollt, das Inkrement rückgängig.
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new RegisterError("teilnehmer_already_registered");
    }
    throw err;
  }
}

export interface UpdateTeilnehmerInput {
  sessionEmail: string;
  registrationId: string;
  /** neue Auswahl – muss exakt `personen` Einträge haben */
  teilnehmerIds: number[];
  hinweise?: Record<number, string>;
}

export type UpdateErrorCode =
  | "registration_not_found"
  | "event_started"
  | "invalid_teilnehmer"
  | "teilnehmer_already_registered"
  | "person_count_mismatch";

export class UpdateError extends Error {
  constructor(public code: UpdateErrorCode) {
    super(code);
    this.name = "UpdateError";
  }
}

/**
 * Teilnehmer-Tausch durch den Partner: die Personenzahl bleibt fix (die
 * Rechnung ist bereits über `personen` gestellt), nur WER kommt darf sich
 * ändern – erlaubt bis Eventbeginn, als Alternative zum Storno.
 */
export async function updateConnectDayTeilnehmer(
  input: UpdateTeilnehmerInput
): Promise<void> {
  const registration = await prisma.eventRegistration.findFirst({
    where: {
      id: input.registrationId,
      status: "CONFIRMED",
      bestellung: { email: input.sessionEmail },
    },
    select: {
      id: true,
      eventId: true,
      bestellungId: true,
      personen: true,
      event: { select: { startAt: true } },
      bestellung: {
        select: {
          teilnehmer: {
            select: { id: true, vorname: true, nachname: true, email: true },
          },
        },
      },
    },
  });
  if (!registration) throw new UpdateError("registration_not_found");
  if (new Date() > registration.event.startAt) {
    throw new UpdateError("event_started");
  }

  const ids = input.teilnehmerIds;
  if (ids.length !== registration.personen) {
    throw new UpdateError("person_count_mismatch");
  }
  if (new Set(ids).size !== ids.length) {
    throw new UpdateError("invalid_teilnehmer");
  }
  const byId = new Map(registration.bestellung.teilnehmer.map((t) => [t.id, t]));
  const gewaehlt = ids.map((id) => byId.get(id));
  if (gewaehlt.some((t) => !t || !isAuswaehlbar(t))) {
    throw new UpdateError("invalid_teilnehmer");
  }

  // Seit Nachmeldungen möglich sind, kann die Firma mehrere Anmeldungen
  // haben – niemand darf in eine Person getauscht werden, die bereits über
  // eine ANDERE Anmeldung derselben Bestellung angemeldet ist.
  const andereAnmeldungen = await prisma.eventRegistration.findMany({
    where: {
      eventId: registration.eventId,
      bestellungId: registration.bestellungId,
      status: "CONFIRMED",
      id: { not: registration.id },
    },
    select: {
      teilnehmer: { select: { bestellungTeilnehmerId: true } },
    },
  });
  const anderweitigAngemeldet = new Set(
    andereAnmeldungen.flatMap((r) =>
      r.teilnehmer.map((t) => t.bestellungTeilnehmerId)
    )
  );
  if (ids.some((id) => anderweitigAngemeldet.has(id))) {
    throw new UpdateError("teilnehmer_already_registered");
  }

  // Auswahl komplett neu schreiben (delete + create) – einfacher und robuster
  // als positionsweises Upserten, und die Snapshot-Daten sind so immer frisch.
  await prisma.$transaction(async (tx) => {
    await tx.eventTeilnehmer.deleteMany({
      where: { registrationId: registration.id },
    });
    await tx.eventTeilnehmer.createMany({
      data: gewaehlt.map((t, index) => ({
        registrationId: registration.id,
        position: index,
        bestellungTeilnehmerId: t!.id,
        vorname: t!.vorname.trim(),
        nachname: t!.nachname.trim(),
        email: t!.email.trim().toLowerCase(),
        hinweise: input.hinweise?.[t!.id]?.trim() || null,
      })),
    });
  });
}

export interface StornoResult {
  firma: string;
  bestellNr: string;
  personen: number;
  sevdeskInvoiceNr: string | null;
  teilnehmer: { vorname: string; nachname: string }[];
}

/**
 * Storno (Partner-Self-Service und Admin): setzt die Anmeldung auf CANCELLED
 * und gibt die Plätze atomar wieder frei. BEWUSST ohne automatische
 * Rechnungs-/Gutschriftslogik – die 399-€-Stornoabwicklung läuft manuell in
 * sevDesk (Ausnahme-Fall); der Betreiber wird per Mail benachrichtigt.
 *
 * Gibt null zurück, wenn die Anmeldung nicht (mehr) storniert werden kann.
 */
export async function cancelConnectDayRegistration(params: {
  registrationId: string;
  /** null = Admin-Storno (ohne Ownership-Prüfung) */
  sessionEmail: string | null;
  notiz?: string;
}): Promise<StornoResult | null> {
  const where: Prisma.EventRegistrationWhereInput = {
    id: params.registrationId,
    status: "CONFIRMED",
    ...(params.sessionEmail
      ? { bestellung: { email: params.sessionEmail } }
      : {}),
  };

  const registration = await prisma.eventRegistration.findFirst({
    where,
    select: {
      id: true,
      eventId: true,
      personen: true,
      sevdeskInvoiceNr: true,
      bestellung: { select: { firma: true, bestellNr: true } },
      teilnehmer: {
        orderBy: { position: "asc" },
        select: { vorname: true, nachname: true },
      },
    },
  });
  if (!registration) return null;

  const cancelled = await prisma.$transaction(async (tx) => {
    // Guard auf status=CONFIRMED macht den Storno idempotent: ein paralleler
    // zweiter Klick dekrementiert nicht doppelt.
    const updated = await tx.eventRegistration.updateMany({
      where: { id: registration.id, status: "CONFIRMED" },
      data: {
        status: "CANCELLED",
        stornoAm: new Date(),
        stornoNotiz: params.notiz?.trim() || null,
      },
    });
    if (updated.count === 0) return false;

    await tx.event.update({
      where: { id: registration.eventId },
      data: { seatsTaken: { decrement: registration.personen } },
    });
    return true;
  });

  if (!cancelled) return null;

  return {
    firma: registration.bestellung.firma,
    bestellNr: registration.bestellung.bestellNr,
    personen: registration.personen,
    sevdeskInvoiceNr: registration.sevdeskInvoiceNr,
    teilnehmer: registration.teilnehmer,
  };
}

// ---------------------------------------------------------------------------
// Warteliste
//
// Bewusst OHNE automatische Anmeldung/Rechnung und OHNE Auto-Versand: die
// Warteliste sammelt nur Interessenten, sobald das Event ausgebucht ist. Bei
// einem Storno rückt der Betreiber im Admin manuell nach (promote) und
// kontaktiert den Partner selbst – so bleibt die Kontrolle über die knappen
// Plätze beim Betreiber (vgl. die verbindliche 399-€-Buchung).
// ---------------------------------------------------------------------------

export type WaitlistErrorCode =
  | "event_not_found"
  | "not_eligible"
  | "invalid_input"
  | "too_many_persons"
  | "already_on_waitlist";

export class WaitlistError extends Error {
  constructor(public code: WaitlistErrorCode) {
    super(code);
    this.name = "WaitlistError";
  }
}

export interface JoinWaitlistInput {
  sessionEmail: string;
  bestellungId: number;
  kontaktName: string;
  kontaktEmail: string;
  personen: number;
  notiz?: string;
}

/**
 * Trägt eine Bestellung auf die Connect-Day-Warteliste ein. Prüft Berechtigung
 * (Klasse 1/2, Ownership über die Session-E-Mail) und begrenzt die gewünschte
 * Personenzahl auf das Firmen-Kontingent. Pro Bestellung ist höchstens EIN
 * aktiver (WAITING) Eintrag erlaubt – dagegen sichert zusätzlich der partielle
 * Unique-Index in der Migration (P2002 → already_on_waitlist).
 *
 * Gibt die ID des neuen Wartelisten-Eintrags zurück.
 */
export async function joinConnectDayWaitlist(
  input: JoinWaitlistInput
): Promise<string> {
  const event = await prisma.event.findUnique({
    where: { slug: CONNECT_DAY_SLUG },
  });
  if (!event) throw new WaitlistError("event_not_found");

  const kontaktName = input.kontaktName.trim();
  const kontaktEmail = input.kontaktEmail.trim().toLowerCase();
  if (
    kontaktName.length === 0 ||
    !kontaktEmail.includes("@") ||
    !Number.isInteger(input.personen)
  ) {
    throw new WaitlistError("invalid_input");
  }
  if (input.personen < 1 || input.personen > event.maxProBestellung) {
    throw new WaitlistError("too_many_persons");
  }

  const bestellung = await prisma.bestellung.findUnique({
    where: { id: input.bestellungId },
    select: { id: true, email: true, klasse: { select: { slug: true } } },
  });
  if (
    !bestellung ||
    bestellung.email !== input.sessionEmail ||
    !event.erlaubteKlassenSlugs.includes(bestellung.klasse.slug)
  ) {
    throw new WaitlistError("not_eligible");
  }

  const bestehend = await prisma.eventWaitlist.findFirst({
    where: {
      eventId: event.id,
      bestellungId: bestellung.id,
      status: "WAITING",
    },
    select: { id: true },
  });
  if (bestehend) throw new WaitlistError("already_on_waitlist");

  try {
    const entry = await prisma.eventWaitlist.create({
      data: {
        eventId: event.id,
        bestellungId: bestellung.id,
        angemeldetVon: input.sessionEmail,
        kontaktName,
        kontaktEmail,
        personen: input.personen,
        notiz: input.notiz?.trim() || null,
      },
      select: { id: true },
    });
    return entry.id;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new WaitlistError("already_on_waitlist");
    }
    throw err;
  }
}

/**
 * Selbst-Austragen aus der Warteliste (Kundenportal). Nur der eigene aktive
 * Eintrag (WAITING) darf ausgetragen werden; bereits nachgerückte (PROMOTED)
 * Einträge bleiben stehen. Gibt true zurück, wenn etwas geändert wurde.
 */
export async function leaveConnectDayWaitlist(params: {
  waitlistId: string;
  sessionEmail: string;
}): Promise<boolean> {
  const updated = await prisma.eventWaitlist.updateMany({
    where: {
      id: params.waitlistId,
      status: "WAITING",
      bestellung: { email: params.sessionEmail },
    },
    data: { status: "CANCELLED" },
  });
  return updated.count > 0;
}

/**
 * Admin: markiert einen Wartelisten-Eintrag als nachgerückt (PROMOTED). Das
 * ist bewusst nur eine Status-Markierung – es wird KEIN Platz reserviert, keine
 * Rechnung erzeugt und keine Mail verschickt. Der Betreiber kontaktiert den
 * Partner manuell; sobald (z.B. nach einem Storno) ein Platz frei ist, kann
 * dieser sich regulär im Portal anmelden. Idempotent über den WAITING-Guard.
 */
export async function promoteConnectDayWaitlist(
  waitlistId: string
): Promise<boolean> {
  const updated = await prisma.eventWaitlist.updateMany({
    where: { id: waitlistId, status: "WAITING" },
    data: { status: "PROMOTED", promotedAm: new Date() },
  });
  return updated.count > 0;
}

/**
 * Admin: nimmt ein Nachrücken wieder zurück (PROMOTED → WAITING), falls es doch
 * nicht klappt und der Eintrag wieder in die Warteschlange soll.
 */
export async function unpromoteConnectDayWaitlist(
  waitlistId: string
): Promise<boolean> {
  const updated = await prisma.eventWaitlist.updateMany({
    where: { id: waitlistId, status: "PROMOTED" },
    data: { status: "WAITING", promotedAm: null },
  });
  return updated.count > 0;
}

/**
 * Admin: entfernt einen Wartelisten-Eintrag (setzt ihn auf CANCELLED, bleibt
 * als Historie stehen). Für Einträge, die sich anderweitig erledigt haben.
 */
export async function removeConnectDayWaitlist(
  waitlistId: string
): Promise<boolean> {
  const updated = await prisma.eventWaitlist.updateMany({
    where: { id: waitlistId, status: { in: ["WAITING", "PROMOTED"] } },
    data: { status: "CANCELLED" },
  });
  return updated.count > 0;
}

// ---------------------------------------------------------------------------
// Wiedereröffnung / Schließen (Admin)
// ---------------------------------------------------------------------------

export type OeffnungErrorCode = "event_not_found" | "invalid_deadline";

export class OeffnungError extends Error {
  constructor(public code: OeffnungErrorCode) {
    super(code);
    this.name = "OeffnungError";
  }
}

/**
 * Öffnet oder schließt die Connect-Day-Anmeldung (Event.status). Beim Öffnen
 * kann zugleich ein neuer Anmeldeschluss gesetzt werden – nötig, wenn die alte
 * Frist bereits abgelaufen ist, denn `registerForConnectDay` prüft neben dem
 * Status auch `anmeldeschluss`. Der neue Anmeldeschluss muss in der Zukunft
 * liegen.
 */
export async function setConnectDayOeffnung(params: {
  open: boolean;
  anmeldeschluss?: Date;
}): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { slug: CONNECT_DAY_SLUG },
    select: { id: true },
  });
  if (!event) throw new OeffnungError("event_not_found");

  const data: Prisma.EventUpdateInput = {
    status: params.open ? "OPEN" : "CLOSED",
  };

  if (params.anmeldeschluss !== undefined) {
    if (
      Number.isNaN(params.anmeldeschluss.getTime()) ||
      params.anmeldeschluss.getTime() <= Date.now()
    ) {
      throw new OeffnungError("invalid_deadline");
    }
    data.anmeldeschluss = params.anmeldeschluss;
  }

  await prisma.event.update({ where: { id: event.id }, data });
}
