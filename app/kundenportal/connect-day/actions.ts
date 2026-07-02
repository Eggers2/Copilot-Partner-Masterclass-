"use server";

import { revalidatePath } from "next/cache";
import { requireCustomerSession } from "@/lib/auth/customer";
import {
  cancelConnectDayRegistration,
  registerForConnectDay,
  RegisterError,
  updateConnectDayTeilnehmer,
  UpdateError,
  type RegisterErrorCode,
  type UpdateErrorCode,
} from "@/lib/events/connectDay";
import { createAndSendConnectDayInvoice } from "@/lib/events/connectDayInvoice";
import { sendConnectDayStornoIntern } from "@/lib/email/sendConnectDay";

const REGISTER_ERRORS: Record<RegisterErrorCode, string> = {
  event_not_found: "Das Event wurde nicht gefunden.",
  event_closed: "Die Anmeldung ist geschlossen.",
  not_yet_open: "Die Anmeldung öffnet erst am 07.07.2026 um 0 Uhr.",
  deadline_passed: "Der Anmeldeschluss (17.07.2026) ist leider vorbei.",
  not_eligible:
    "Diese Bestellung ist nicht berechtigt – der Connect Day ist für Klasse 1 und 2.",
  invalid_teilnehmer:
    "Bitte wähle gültige Teilnehmer aus – jede Person nur einmal, und nur Masterclass-Teilnehmer deiner Bestellung.",
  too_many_persons: "Maximal 3 Personen pro Firma.",
  already_registered:
    "Für deine Firma existiert bereits eine Anmeldung zum Connect Day.",
  event_full:
    "Der Connect Day ist leider ausgebucht – alle 100 Plätze sind vergeben.",
};

const UPDATE_ERRORS: Record<UpdateErrorCode, string> = {
  registration_not_found: "Anmeldung nicht gefunden.",
  event_started: "Das Event hat bereits begonnen – Änderungen sind nicht mehr möglich.",
  invalid_teilnehmer:
    "Bitte wähle gültige Teilnehmer aus – jede Person nur einmal, und nur Masterclass-Teilnehmer deiner Bestellung.",
  person_count_mismatch:
    "Die Personenzahl kann nicht geändert werden – nur die Teilnehmer selbst. Für weniger Plätze bitte stornieren.",
};

interface ActionResult {
  success?: boolean;
  error?: string;
}

export async function registerConnectDayAction(input: {
  bestellungId: number;
  teilnehmerIds: number[];
  hinweise?: Record<number, string>;
}): Promise<ActionResult> {
  const session = await requireCustomerSession();

  let registrationId: string;
  try {
    registrationId = await registerForConnectDay({
      sessionEmail: session.email,
      bestellungId: input.bestellungId,
      teilnehmerIds: input.teilnehmerIds,
      hinweise: input.hinweise,
    });
  } catch (err) {
    if (err instanceof RegisterError) {
      return { error: REGISTER_ERRORS[err.code] };
    }
    console.error("[ConnectDay] Anmeldung fehlgeschlagen:", err);
    return { error: "Anmeldung fehlgeschlagen. Bitte versuche es erneut." };
  }

  // Anmeldung ist committet – die EINE Bestätigungs-/Rechnungs-Mail (mit
  // PDF-Anhang) verschickt der Orchestrator fehlerisoliert hinterher; ein
  // sevDesk-/Mail-Fehler macht die Anmeldung nicht kaputt (Admin-Retry).
  await createAndSendConnectDayInvoice(registrationId);

  revalidatePath("/kundenportal/connect-day");
  revalidatePath("/kundenportal/bestellungen");
  revalidatePath("/admin/connect-day");
  return { success: true };
}

export async function updateConnectDayTeilnehmerAction(input: {
  registrationId: string;
  teilnehmerIds: number[];
  hinweise?: Record<number, string>;
}): Promise<ActionResult> {
  const session = await requireCustomerSession();

  try {
    await updateConnectDayTeilnehmer({
      sessionEmail: session.email,
      registrationId: input.registrationId,
      teilnehmerIds: input.teilnehmerIds,
      hinweise: input.hinweise,
    });
  } catch (err) {
    if (err instanceof UpdateError) {
      return { error: UPDATE_ERRORS[err.code] };
    }
    console.error("[ConnectDay] Teilnehmer-Änderung fehlgeschlagen:", err);
    return { error: "Änderung fehlgeschlagen. Bitte versuche es erneut." };
  }

  revalidatePath("/kundenportal/connect-day");
  revalidatePath("/admin/connect-day");
  return { success: true };
}

export async function stornoConnectDayAction(input: {
  registrationId: string;
}): Promise<ActionResult> {
  const session = await requireCustomerSession();

  const result = await cancelConnectDayRegistration({
    registrationId: input.registrationId,
    sessionEmail: session.email,
  });
  if (!result) {
    return { error: "Anmeldung nicht gefunden oder bereits storniert." };
  }

  // Bewusst KEINE automatische Rechnungs-/Gutschriftslogik: der Storno ist
  // die Ausnahme und wird manuell in sevDesk abgewickelt. Der Betreiber
  // bekommt dafür eine interne Benachrichtigung.
  await sendConnectDayStornoIntern({
    firma: result.firma,
    bestellNr: result.bestellNr,
    personen: result.personen,
    teilnehmerListe: result.teilnehmer
      .map((t) => `${t.vorname} ${t.nachname}`)
      .join(", "),
    rechnungNr: result.sevdeskInvoiceNr,
  });

  revalidatePath("/kundenportal/connect-day");
  revalidatePath("/kundenportal/bestellungen");
  revalidatePath("/admin/connect-day");
  return { success: true };
}
