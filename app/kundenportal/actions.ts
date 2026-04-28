"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requestMagicLink,
  requireCustomerSession,
  resolveAppBaseUrl,
  setCustomerSession,
  clearCustomerSession,
} from "@/lib/auth/customer";
import { fireTeamsGuestWebhook } from "@/lib/webhooks/teamsGuest";
import { geocodeAddress } from "@/lib/geocode";

interface TeilnehmerInput {
  position: number;
  vorname: string;
  nachname: string;
  email: string;
}

interface UpdateKundeBestellungInput {
  firma: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  ustId: string | null;
  website: string | null;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string | null;
  position: string | null;
  anmerkungen: string | null;
  teilnehmer: TeilnehmerInput[];
  showOnMap: boolean;
}

export async function requestLinkAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  if (!email) redirect("/kundenportal?error=invalid");

  const baseUrl = await resolveAppBaseUrl();
  await requestMagicLink(email, baseUrl);
  redirect("/kundenportal/check-email");
}

export async function logoutCustomerAction(): Promise<void> {
  await clearCustomerSession();
  redirect("/kundenportal");
}

export async function updateKundeBestellungAction(
  bestellungId: number,
  input: UpdateKundeBestellungInput
): Promise<{ success?: boolean; error?: string }> {
  const session = await requireCustomerSession();

  if (!input.firma?.trim() || !input.email?.trim()) {
    return { error: "Firma und E-Mail sind erforderlich." };
  }

  const current = await prisma.bestellung.findUnique({
    where: { id: bestellungId },
    select: {
      id: true,
      email: true,
      userAnzahl: true,
      strasse: true,
      plz: true,
      ort: true,
    },
  });

  if (!current || current.email !== session.email) {
    return { error: "Bestellung nicht gefunden." };
  }

  if (!["DE", "AT", "CH"].includes(input.land)) {
    return { error: "Ungültiges Land." };
  }

  const newEmail = input.email.trim().toLowerCase();
  const slotCount = current.userAnzahl;
  const newStrasse = input.strasse.trim();
  const newPlz = input.plz.trim();
  const newOrt = input.ort.trim();
  const addressChanged =
    newStrasse !== current.strasse.trim() ||
    newPlz !== current.plz.trim() ||
    newOrt !== current.ort.trim();

  await prisma.$transaction(async (tx) => {
    await tx.bestellung.update({
      where: { id: bestellungId },
      data: {
        firma: input.firma.trim(),
        strasse: newStrasse,
        plz: newPlz,
        ort: newOrt,
        land: input.land,
        ustId: input.ustId?.trim() || null,
        website: input.website?.trim() || null,
        vorname: input.vorname.trim(),
        nachname: input.nachname.trim(),
        email: newEmail,
        telefon: input.telefon?.trim() || null,
        position: input.position?.trim() || null,
        anmerkungen: input.anmerkungen?.trim() || null,
        showOnMap: input.showOnMap,
        // Adressänderung → Geokoordinaten verwerfen, werden beim nächsten
        // Map-Fetch neu aus der aktualisierten Adresse geocodet.
        ...(addressChanged ? { latitude: null, longitude: null } : {}),
      },
    });

    // Karten-Sichtbarkeit zusätzlich am verknüpften Lead spiegeln (best-effort,
    // matcht nicht zwingend, daher ist die Bestellung die Quelle der Wahrheit).
    const leadEmails = Array.from(new Set([current.email, newEmail]));
    await tx.lead.updateMany({
      where: { email: { in: leadEmails } },
      data: { showOnMap: input.showOnMap },
    });

    const existingTeilnehmer = await tx.bestellungTeilnehmer.findMany({
      where: { bestellungId },
      select: { position: true, email: true },
    });
    const existingEmailByPosition = new Map(
      existingTeilnehmer.map((e) => [e.position, e.email])
    );

    for (let i = 0; i < slotCount; i++) {
      const t = input.teilnehmer.find((x) => x.position === i) ?? {
        position: i,
        vorname: "",
        nachname: "",
        email: "",
      };
      const newTeilnehmerEmail = t.email.trim().toLowerCase();
      const previousEmail = existingEmailByPosition.get(i);
      const emailChanged =
        previousEmail !== undefined && previousEmail !== newTeilnehmerEmail;

      await tx.bestellungTeilnehmer.upsert({
        where: {
          bestellungId_position: { bestellungId, position: i },
        },
        create: {
          bestellungId,
          position: i,
          vorname: t.vorname.trim(),
          nachname: t.nachname.trim(),
          email: newTeilnehmerEmail,
        },
        update: {
          vorname: t.vorname.trim(),
          nachname: t.nachname.trim(),
          email: newTeilnehmerEmail,
          // E-Mail-Wechsel setzt den Einladungsstatus zurück, damit der
          // n8n-Webhook die neue Adresse erneut als Teams-Gast einlädt.
          ...(emailChanged ? { teamsEingeladenAm: null } : {}),
        },
      });
    }
  });

  const bestellung = await prisma.bestellung.findUnique({
    where: { id: bestellungId },
    select: { bestellNr: true },
  });
  const toInvite = await prisma.bestellungTeilnehmer.findMany({
    where: {
      bestellungId,
      teamsEingeladenAm: null,
      NOT: { email: "" },
    },
    select: { id: true, vorname: true, nachname: true, email: true },
  });
  for (const t of toInvite) {
    fireTeamsGuestWebhook({
      teilnehmerId: t.id,
      bestellNr: bestellung?.bestellNr ?? "",
      vorname: t.vorname,
      nachname: t.nachname,
      email: t.email,
    });
  }

  if (newEmail !== session.email) {
    await setCustomerSession(newEmail);
  }

  // Bei Adressänderung sofort neu geocoden, damit der Partner nicht in der Zeit
  // bis zum nächsten /api/partners-Aufruf ohne Koordinaten auf der Karte fehlt.
  // Best-effort: Fehler nicht propagieren – /api/partners holt das später nach.
  if (addressChanged) {
    try {
      const coords = await geocodeAddress(newStrasse, newPlz, newOrt);
      if (coords) {
        await prisma.bestellung.update({
          where: { id: bestellungId },
          data: { latitude: coords.latitude, longitude: coords.longitude },
        });
      }
    } catch (err) {
      console.error("[Kundenportal] Re-Geocoding fehlgeschlagen:", err);
    }
  }

  revalidatePath("/kundenportal/bestellungen");
  revalidatePath(`/kundenportal/bestellungen/${bestellungId}`);
  revalidatePath("/admin/shop");
  revalidatePath(`/admin/shop/${bestellungId}`);
  revalidatePath("/suche");

  return { success: true };
}
