import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";

export const dynamic = "force-dynamic";

function addressKey(
  firma: string | null,
  plz: string | null,
  ort: string | null
): string {
  return [firma, plz, ort]
    .map((v) => (v ?? "").trim().toLowerCase())
    .join("|");
}

async function geocodeMissingPartners() {
  const partners = await prisma.lead.findMany({
    where: {
      status: "WON",
      latitude: null,
      street: { not: null },
      zip: { not: null },
      city: { not: null },
    },
    select: { id: true, street: true, zip: true, city: true },
  });

  for (const p of partners) {
    if (!p.street || !p.zip || !p.city) continue;
    const coords = await geocodeAddress(p.street, p.zip, p.city);
    if (coords) {
      await prisma.lead.update({
        where: { id: p.id },
        data: { latitude: coords.latitude, longitude: coords.longitude },
      });
    }
    // Rate limit: 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
  }
}

export async function GET() {
  try {
    // Geocode partners missing coordinates (runs only for those without coords)
    await geocodeMissingPartners();

    const optedOut = await prisma.bestellung.findMany({
      where: { showOnMap: false },
      select: { email: true, firma: true, plz: true, ort: true },
    });
    const optedOutEmails = new Set(optedOut.map((b) => b.email.toLowerCase()));
    const optedOutAddresses = new Set(
      optedOut.map((b) => addressKey(b.firma, b.plz, b.ort))
    );

    const partners = await prisma.lead.findMany({
      where: {
        status: "WON",
        showOnMap: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        company: true,
        email: true,
        street: true,
        zip: true,
        city: true,
        website: true,
        latitude: true,
        longitude: true,
      },
    });

    const result = partners
      .filter(
        (p) =>
          !optedOutEmails.has(p.email.toLowerCase()) &&
          !optedOutAddresses.has(addressKey(p.company, p.zip, p.city))
      )
      .map((p) => ({
        companyName: p.company,
        street: p.street,
        zip: p.zip,
        city: p.city,
        website: p.website,
        latitude: p.latitude,
        longitude: p.longitude,
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching partners:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
