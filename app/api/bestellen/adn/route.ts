import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createBestellung, OrderValidationError } from "@/lib/orders/createBestellung";
import { isAdnChannelKey } from "@/lib/packages";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    if (!checkRateLimit(ip, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
        { status: 429 }
      );
    }

    const body = await request.json();

    if (body.website && body.website.trim().length > 0) {
      return NextResponse.json(
        { success: true, bestellNr: "NS-0000-0000" },
        { status: 201 }
      );
    }

    if (!isAdnChannelKey(body.adnChannel) || body.adnChannel === "NONE") {
      return NextResponse.json(
        { error: "Bitte ADN-Modell wählen (ADN 50/50 oder ADN 85/15)." },
        { status: 400 }
      );
    }

    const result = await createBestellung(
      {
        paket: body.paket,
        zahlungsmodell: body.zahlungsmodell,
        firma: body.firma,
        strasse: body.strasse,
        plz: body.plz,
        ort: body.ort,
        land: body.land,
        ustId: body.ustId,
        vorname: body.vorname,
        nachname: body.nachname,
        email: body.email,
        telefon: body.telefon,
        position: body.position,
        anmerkungen: body.anmerkungen,
        adnChannel: body.adnChannel,
        klasseId: typeof body.klasseId === "string" ? body.klasseId : undefined,
      },
      { ip, quelle: `copilotberater.de/bestellen/adn (${body.adnChannel})` }
    );

    return NextResponse.json(
      { success: true, bestellNr: result.bestellNr },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("ADN-Bestellung POST error:", error);
    return NextResponse.json(
      {
        error:
          "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.",
      },
      { status: 500 }
    );
  }
}
