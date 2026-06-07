"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requestOtpCode,
  verifyOtpCode,
  requireCustomerSession,
  setCustomerSession,
  clearCustomerSession,
  setOtpPendingCookie,
  getOtpPendingEmail,
  clearOtpPendingCookie,
} from "@/lib/auth/customer";
import { dispatchTeamsGuestInvites } from "@/lib/teams/dispatchTeamsGuest";
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

export async function requestOtpCodeAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  if (!email.includes("@")) redirect("/kundenportal?error=invalid");

  const result = await requestOtpCode(email);
  if (!result.ok) {
    redirect(`/kundenportal?error=${result.reason}`);
  }

  // Pending-Cookie auch bei unbekannter E-Mail setzen — verhindert
  // Enumeration über das Verhalten der Folgeseite.
  await setOtpPendingCookie(email);
  redirect("/kundenportal/code");
}

export async function verifyOtpCodeAction(
  formData: FormData
): Promise<void> {
  const code = (formData.get("code") as string | null)?.replace(/\s+/g, "") ?? "";
  const email = await getOtpPendingEmail();
  if (!email) redirect("/kundenportal?error=expired");

  const result = await verifyOtpCode(email, code);
  if (!result.ok) {
    redirect(`/kundenportal/code?error=${result.reason}`);
  }

  await clearOtpPendingCookie();
  redirect("/kundenportal/bestellungen");
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
      klasse: { select: { name: true, teilnehmerSperre: true } },
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

  // Teilnehmer-Sperre: Wenn aktiv, dürfen Teilnehmer-Daten nicht abweichen
  // von dem, was bereits in der DB steht. Stammdaten bleiben editierbar.
  if (current.klasse.teilnehmerSperre) {
    const existing = await prisma.bestellungTeilnehmer.findMany({
      where: { bestellungId },
      select: { position: true, vorname: true, nachname: true, email: true },
    });
    const existingByPosition = new Map(existing.map((t) => [t.position, t]));
    const norm = (s: string) => s.trim().toLowerCase();

    for (let i = 0; i < slotCount; i++) {
      const submitted = input.teilnehmer.find((x) => x.position === i) ?? {
        position: i,
        vorname: "",
        nachname: "",
        email: "",
      };
      const stored = existingByPosition.get(i) ?? {
        position: i,
        vorname: "",
        nachname: "",
        email: "",
      };
      if (
        submitted.vorname.trim() !== stored.vorname.trim() ||
        submitted.nachname.trim() !== stored.nachname.trim() ||
        norm(submitted.email) !== norm(stored.email)
      ) {
        return {
          error: `Die Teilnehmerliste für ${current.klasse.name} ist gesperrt, da die Klasse bereits läuft. Bitte kontaktiere uns, um Änderungen vorzunehmen.`,
        };
      }
    }
  }

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
    select: {
      bestellNr: true,
      klasse: { select: { id: true, name: true, teamsGroupId: true } },
    },
  });
  const toInvite = await prisma.bestellungTeilnehmer.findMany({
    where: {
      bestellungId,
      teamsEingeladenAm: null,
      NOT: { email: "" },
    },
    select: { id: true, vorname: true, nachname: true, email: true },
  });
  if (bestellung && toInvite.length > 0) {
    await dispatchTeamsGuestInvites({
      participants: toInvite,
      klasse: bestellung.klasse,
      bestellNr: bestellung.bestellNr,
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
