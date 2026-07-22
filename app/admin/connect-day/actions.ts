"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  cancelConnectDayRegistration,
  CONNECT_DAY_SLUG,
  promoteConnectDayWaitlist,
  unpromoteConnectDayWaitlist,
  removeConnectDayWaitlist,
  setConnectDayOeffnung,
  OeffnungError,
} from "@/lib/events/connectDay";
import { createAndSendConnectDayInvoice } from "@/lib/events/connectDayInvoice";
import {
  sendConnectDayEinladung,
  type EinladungTemplateKey,
  type SendEinladungResult,
} from "@/lib/events/connectDayInvite";

interface ActionResult {
  success?: boolean;
  error?: string;
}

/**
 * Stößt die sevDesk-Rechnung erneut an (idempotent: bereits erledigte
 * Schritte werden übersprungen, es entstehen keine Duplikat-Rechnungen).
 */
export async function retryConnectDayInvoiceAction(
  registrationId: string
): Promise<ActionResult> {
  await requireAuth();

  await createAndSendConnectDayInvoice(registrationId);
  revalidatePath("/admin/connect-day");
  return { success: true };
}

/**
 * Admin-Storno: gleiche Logik wie der Partner-Self-Service (Plätze werden
 * atomar frei), Rechnungs-/Stornoabwicklung bleibt manuell in sevDesk.
 */
export async function adminStornoConnectDayAction(
  registrationId: string,
  notiz?: string
): Promise<ActionResult> {
  await requireAuth();

  const result = await cancelConnectDayRegistration({
    registrationId,
    sessionEmail: null,
    notiz,
  });
  if (!result) {
    return { error: "Anmeldung nicht gefunden oder bereits storniert." };
  }

  revalidatePath("/admin/connect-day");
  revalidatePath("/kundenportal/connect-day");
  revalidatePath("/kundenportal/bestellungen");
  return { success: true };
}

/**
 * Zahlungseingang abhaken (oder wieder zurücknehmen). Erst mit gesetztem
 * Haken gilt der Platz als verbindlich bestätigt – so rutscht keiner durch.
 */
export async function markConnectDayBezahltAction(
  registrationId: string,
  bezahlt: boolean
): Promise<ActionResult> {
  await requireAuth();

  await prisma.eventRegistration.update({
    where: { id: registrationId },
    data: { bezahltAm: bezahlt ? new Date() : null },
  });

  revalidatePath("/admin/connect-day");
  revalidatePath("/kundenportal/connect-day");
  return { success: true };
}

/**
 * Manuelle Freischaltung der Anmeldung VOR dem Anmeldestart (07.07.2026) –
 * zum Testen im Kundenportal. Ausschalten sperrt wieder bis zum Anmeldestart.
 */
export async function setConnectDayFreischaltungAction(
  freigeschaltet: boolean
): Promise<ActionResult> {
  await requireAuth();

  await prisma.event.update({
    where: { slug: CONNECT_DAY_SLUG },
    data: { manuellFreigeschaltet: freigeschaltet },
  });

  revalidatePath("/admin/connect-day");
  revalidatePath("/kundenportal/connect-day");
  revalidatePath("/kundenportal/bestellungen");
  return { success: true };
}

/**
 * Öffnet die Anmeldung wieder (Status OPEN) bzw. schließt sie (CLOSED). Beim
 * Öffnen wird zugleich ein neuer Anmeldeschluss gesetzt, falls die alte Frist
 * abgelaufen ist (`anmeldeschluss` als ISO-/datetime-local-String).
 */
export async function setConnectDayOeffnungAction(input: {
  open: boolean;
  anmeldeschluss?: string;
}): Promise<ActionResult> {
  await requireAuth();

  let anmeldeschluss: Date | undefined;
  if (input.open && input.anmeldeschluss?.trim()) {
    anmeldeschluss = new Date(input.anmeldeschluss);
  }

  try {
    await setConnectDayOeffnung({ open: input.open, anmeldeschluss });
  } catch (err) {
    if (err instanceof OeffnungError) {
      return {
        error:
          err.code === "invalid_deadline"
            ? "Bitte einen gültigen Anmeldeschluss in der Zukunft wählen."
            : "Das Connect-Day-Event wurde nicht gefunden.",
      };
    }
    throw err;
  }

  revalidatePath("/admin/connect-day");
  revalidatePath("/kundenportal/connect-day");
  revalidatePath("/kundenportal/bestellungen");
  return { success: true };
}

/**
 * Warteliste: Eintrag als nachgerückt markieren, Nachrücken zurücknehmen oder
 * Eintrag entfernen. Alles rein manuell – kein Auto-Versand, keine automatische
 * Anmeldung.
 */
export async function promoteConnectDayWaitlistAction(
  waitlistId: string
): Promise<ActionResult> {
  await requireAuth();
  const ok = await promoteConnectDayWaitlist(waitlistId);
  if (!ok) {
    return { error: "Eintrag nicht gefunden oder nicht mehr auf der Warteliste." };
  }
  revalidatePath("/admin/connect-day");
  revalidatePath("/kundenportal/connect-day");
  return { success: true };
}

export async function unpromoteConnectDayWaitlistAction(
  waitlistId: string
): Promise<ActionResult> {
  await requireAuth();
  const ok = await unpromoteConnectDayWaitlist(waitlistId);
  if (!ok) {
    return { error: "Eintrag nicht gefunden oder nicht als nachgerückt markiert." };
  }
  revalidatePath("/admin/connect-day");
  revalidatePath("/kundenportal/connect-day");
  return { success: true };
}

export async function removeConnectDayWaitlistAction(
  waitlistId: string
): Promise<ActionResult> {
  await requireAuth();
  const ok = await removeConnectDayWaitlist(waitlistId);
  if (!ok) {
    return { error: "Eintrag nicht gefunden." };
  }
  revalidatePath("/admin/connect-day");
  revalidatePath("/kundenportal/connect-day");
  return { success: true };
}

/**
 * Versendet eine Connect-Day-Kampagnen-Mail (Einladung oder Start-Erinnerung).
 * `testEmail` gesetzt → nur Test-Mail an diese Adresse; sonst Vollversand an
 * alle Besteller/Koordinatoren von Klasse 1 & 2.
 */
export async function sendConnectDayEinladungAction(
  templateKey: EinladungTemplateKey,
  testEmail?: string
): Promise<SendEinladungResult> {
  await requireAuth();
  return sendConnectDayEinladung({
    templateKey,
    testTo: testEmail?.trim() || undefined,
  });
}
