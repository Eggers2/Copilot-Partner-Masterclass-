import { NextRequest, NextResponse } from "next/server";
import { geocodeQuery, haversineDistance } from "@/lib/geocode";
import { loadMapPartners } from "@/lib/db/mapPartners";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // Accept "q" (PLZ or city). Keep "zip" as a backwards-compatible alias.
  const query = (params.get("q") ?? params.get("zip"))?.trim();
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  const limit = Math.min(Number(params.get("limit")) || 5, 50);
  const radiusParam = Number(params.get("radius"));
  const radius = Number.isFinite(radiusParam) && radiusParam > 0 ? radiusParam : null;

  if (!query && !hasCoords) {
    return NextResponse.json({ error: "PLZ, Ort oder Koordinaten erforderlich" }, { status: 400 });
  }

  try {
    // Direct coordinates (e.g. "in meiner Nähe") skip the Nominatim round-trip.
    const zipCoords = hasCoords
      ? { latitude: lat, longitude: lng }
      : await geocodeQuery(query!);

    if (!zipCoords) {
      return NextResponse.json({ error: "Ort oder PLZ nicht gefunden" }, { status: 404 });
    }

    const partners = await loadMapPartners();

    let withDistance = partners
      .map((p) => ({
        ...p,
        distance: Math.round(
          haversineDistance(
            zipCoords.latitude,
            zipCoords.longitude,
            p.latitude,
            p.longitude
          )
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (radius) {
      withDistance = withDistance.filter((p) => p.distance <= radius);
    }
    withDistance = withDistance.slice(0, limit);

    return NextResponse.json({
      zipCoords,
      partners: withDistance,
    });
  } catch (error) {
    console.error("Error searching partners:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
