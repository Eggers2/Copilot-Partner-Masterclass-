import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { syncOrderWithLead } from "@/lib/db/leads";
import {
  PACKAGES,
  isPaketKey,
  calculateMwst,
  validateUstId,
  type PaketKey,
} from "@/lib/packages";
import { fireBestellungWebhook } from "@/lib/webhooks/bestellung";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Rate limiting: 10 orders per IP per hour
    if (!checkRateLimit(ip, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Honeypot check - silently accept but don't process
    if (body.website && body.website.trim().length > 0) {
      return NextResponse.json(
        { success: true, bestellNr: "NS-0000-0000" },
        { status: 201 }
      );
    }

    const {
      paket,
      zahlungsmodell,
      firma,
      strasse,
      plz,
      ort,
      land,
      ustId,
      vorname,
      nachname,
      email,
      telefon,
      position,
      anmerkungen,
    } = body;

    // Validate required fields
    if (!isPaketKey(paket)) {
      return NextResponse.json(
        { error: "Ungültiges Paket gewählt." },
        { status: 400 }
      );
    }

    if (!zahlungsmodell || !["jahresabo", "monatlich"].includes(zahlungsmodell)) {
      return NextResponse.json(
        { error: "Ungültiges Zahlungsmodell." },
        { status: 400 }
      );
    }

    if (!firma || typeof firma !== "string" || firma.trim().length < 2) {
      return NextResponse.json(
        { error: "Firmenname ist erforderlich (min. 2 Zeichen)." },
        { status: 400 }
      );
    }

    if (!strasse || typeof strasse !== "string" || strasse.trim().length < 1) {
      return NextResponse.json(
        { error: "Straße + Hausnummer ist erforderlich." },
        { status: 400 }
      );
    }

    if (!plz || !/^\d{4,5}$/.test(plz.trim())) {
      return NextResponse.json(
        { error: "Bitte geben Sie eine gültige PLZ ein (4-5 Ziffern)." },
        { status: 400 }
      );
    }

    if (!ort || typeof ort !== "string" || ort.trim().length < 1) {
      return NextResponse.json(
        { error: "Ort ist erforderlich." },
        { status: 400 }
      );
    }

    if (!land || !["DE", "AT", "CH"].includes(land)) {
      return NextResponse.json(
        { error: "Ungültiges Land." },
        { status: 400 }
      );
    }

    // USt-IdNr validation
    const trimmedUstId = ustId?.trim() || "";
    if ((land === "AT" || land === "CH") && trimmedUstId.length === 0) {
      return NextResponse.json(
        {
          error:
            "Für die steuerfreie Abrechnung benötigen wir Ihre USt-IdNr.",
        },
        { status: 400 }
      );
    }

    if (trimmedUstId.length > 0 && !validateUstId(land, trimmedUstId)) {
      return NextResponse.json(
        { error: "Bitte geben Sie eine gültige USt-IdNr. ein." },
        { status: 400 }
      );
    }

    if (!vorname || typeof vorname !== "string" || vorname.trim().length < 1) {
      return NextResponse.json(
        { error: "Vorname ist erforderlich." },
        { status: 400 }
      );
    }

    if (!nachname || typeof nachname !== "string" || nachname.trim().length < 1) {
      return NextResponse.json(
        { error: "Nachname ist erforderlich." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }

    if (anmerkungen && typeof anmerkungen === "string" && anmerkungen.length > 500) {
      return NextResponse.json(
        { error: "Anmerkungen dürfen maximal 500 Zeichen lang sein." },
        { status: 400 }
      );
    }

    // Server-side price calculation (never trust client)
    const pkg = PACKAGES[paket as PaketKey];
    const preisNetto =
      zahlungsmodell === "jahresabo" ? pkg.yearly : pkg.monthly;

    const { mwstSatz, mwstBetrag, preisBrutto, reverseCharge, reverseChargeHinweis } =
      calculateMwst(land, trimmedUstId, preisNetto);

    // Generate bestellNr with retry for race conditions
    let bestellNr = "";
    let retries = 3;

    while (retries > 0) {
      try {
        const year = new Date().getFullYear();
        const prefix = `NS-${year}-`;

        const count = await prisma.bestellung.count({
          where: { bestellNr: { startsWith: prefix } },
        });

        bestellNr = `${prefix}${String(count + 1).padStart(4, "0")}`;

        await prisma.bestellung.create({
          data: {
            bestellNr,
            paket,
            userAnzahl: pkg.users,
            zahlungsmodell,
            preisNetto,
            mwstSatz,
            mwstBetrag,
            reverseCharge,
            reverseChargeHinweis: reverseChargeHinweis || null,
            preisBrutto,
            firma: firma.trim(),
            strasse: strasse.trim(),
            plz: plz.trim(),
            ort: ort.trim(),
            land,
            ustId: trimmedUstId || null,
            vorname: vorname.trim(),
            nachname: nachname.trim(),
            email: email.toLowerCase().trim(),
            telefon: telefon?.trim() || null,
            position: position?.trim() || null,
            anmerkungen: anmerkungen?.trim() || null,
          },
        });

        break; // Success
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          err.code === "P2002"
        ) {
          retries--;
          if (retries === 0) throw err;
          continue; // Retry with next number
        }
        throw err;
      }
    }

    // Lead-Datenbank Sync: fire-and-forget
    syncOrderWithLead({
      email: email.toLowerCase().trim(),
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      firma: firma.trim(),
      strasse: strasse.trim(),
      plz: plz.trim(),
      ort: ort.trim(),
      telefon: telefon?.trim() || null,
      position: position?.trim() || null,
      paket: pkg.label,
      zahlungsmodell,
      bestellNr,
      preisNetto,
    }).catch((err) =>
      console.error("[OrderSync] Lead-Sync fehlgeschlagen:", err)
    );

    // N8N Webhook: fire-and-forget
    fireBestellungWebhook({
      bestellNr,
      paket,
      userAnzahl: pkg.users,
      zahlungsmodell,
      preisNetto,
      preisBrutto,
      mwstSatz,
      mwstBetrag,
      reverseCharge,
      reverseChargeHinweis,
      firma: firma.trim(),
      strasse: strasse.trim(),
      plz: plz.trim(),
      ort: ort.trim(),
      land,
      ustId: trimmedUstId || "",
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      email: email.toLowerCase().trim(),
      telefon: telefon?.trim() || "",
      position: position?.trim() || "",
      anmerkungen: anmerkungen?.trim() || "",
      quelle: "copilotberater.de/bestellen",
      ip,
    });

    return NextResponse.json(
      { success: true, bestellNr },
      { status: 201 }
    );
  } catch (error) {
    console.error("Bestellung POST error:", error);
    return NextResponse.json(
      {
        error:
          "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.",
      },
      { status: 500 }
    );
  }
}
