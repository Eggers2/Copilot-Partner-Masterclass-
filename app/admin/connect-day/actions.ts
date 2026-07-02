"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { cancelConnectDayRegistration } from "@/lib/events/connectDay";
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
