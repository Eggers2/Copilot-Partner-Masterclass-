"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  requestMagicLink,
  requireCustomerSession,
  setCustomerSession,
  clearCustomerSession,
} from "@/lib/auth/customer";

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
  vorname: string;
  nachname: string;
  email: string;
  telefon: string | null;
  position: string | null;
  anmerkungen: string | null;
  teilnehmer: TeilnehmerInput[];
}

async function resolveBaseUrl(): Promise<string> {
  const envBase = process.env.APP_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function requestLinkAction(formData: FormData): Promise<void> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  if (!email) redirect("/kundenportal?error=invalid");

  const baseUrl = await resolveBaseUrl();
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
    select: { id: true, email: true, userAnzahl: true },
  });

  if (!current || current.email !== session.email) {
    return { error: "Bestellung nicht gefunden." };
  }

  if (!["DE", "AT", "CH"].includes(input.land)) {
    return { error: "Ungültiges Land." };
  }

  const newEmail = input.email.trim().toLowerCase();
  const slotCount = current.userAnzahl;

  await prisma.$transaction(async (tx) => {
    await tx.bestellung.update({
      where: { id: bestellungId },
      data: {
        firma: input.firma.trim(),
        strasse: input.strasse.trim(),
        plz: input.plz.trim(),
        ort: input.ort.trim(),
        land: input.land,
        ustId: input.ustId?.trim() || null,
        vorname: input.vorname.trim(),
        nachname: input.nachname.trim(),
        email: newEmail,
        telefon: input.telefon?.trim() || null,
        position: input.position?.trim() || null,
        anmerkungen: input.anmerkungen?.trim() || null,
      },
    });

    for (let i = 0; i < slotCount; i++) {
      const t = input.teilnehmer.find((x) => x.position === i) ?? {
        position: i,
        vorname: "",
        nachname: "",
        email: "",
      };
      await tx.bestellungTeilnehmer.upsert({
        where: {
          bestellungId_position: { bestellungId, position: i },
        },
        create: {
          bestellungId,
          position: i,
          vorname: t.vorname.trim(),
          nachname: t.nachname.trim(),
          email: t.email.trim().toLowerCase(),
        },
        update: {
          vorname: t.vorname.trim(),
          nachname: t.nachname.trim(),
          email: t.email.trim().toLowerCase(),
        },
      });
    }
  });

  if (newEmail !== session.email) {
    await setCustomerSession(newEmail);
  }

  revalidatePath("/kundenportal/bestellungen");
  revalidatePath(`/kundenportal/bestellungen/${bestellungId}`);
  revalidatePath("/admin/shop");
  revalidatePath(`/admin/shop/${bestellungId}`);

  return { success: true };
}
