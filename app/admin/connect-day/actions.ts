"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  cancelConnectDayRegistration,
  CONNECT_DAY_SLUG,
} from "@/lib/events/connectDay";
import { createAndSendConnectDayInvoice } from "@/lib/events/connectDayInvoice";

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
