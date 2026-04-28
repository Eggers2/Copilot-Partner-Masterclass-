import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { geocodeZip, haversineDistance } from "@/lib/geocode";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip");
  if (!zip) {
    return NextResponse.json({ error: "PLZ parameter required" }, { status: 400 });
  }

  try {
    const zipCoords = await geocodeZip(zip);
    if (!zipCoords) {
      return NextResponse.json({ error: "PLZ nicht gefunden" }, { status: 404 });
    }

    const partners = await prisma.lead.findMany({
      where: {
        status: "WON",
        showOnMap: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        company: true,
        street: true,
        zip: true,
        city: true,
        website: true,
        latitude: true,
        longitude: true,
      },
    });

    const withDistance = partners
      .map((p) => ({
        companyName: p.company,
        street: p.street,
        zip: p.zip,
        city: p.city,
        website: p.website,
        latitude: p.latitude,
        longitude: p.longitude,
        distance: Math.round(
          haversineDistance(
            zipCoords.latitude,
            zipCoords.longitude,
            p.latitude!,
            p.longitude!
          )
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    return NextResponse.json({
      zipCoords,
      partners: withDistance,
    });
  } catch (error) {
    console.error("Error searching partners:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
