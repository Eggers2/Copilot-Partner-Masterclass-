import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const PACKAGES = {
  starter: { label: "Starter", users: 3, yearly: 8900, monthly: 890 },
  team: { label: "Team", users: 6, yearly: 9900, monthly: 1090 },
  business: { label: "Business", users: 15, yearly: 14900, monthly: 1490 },
} as const;

type PacketKey = keyof typeof PACKAGES;

function calculateMwst(
  land: string,
  ustId: string | undefined,
  preisNetto: number
): {
  mwstSatz: number;
  mwstBetrag: number;
  preisBrutto: number;
  reverseCharge: boolean;
  reverseChargeHinweis: string;
} {
  let mwstSatz = 19; // DE default
  let reverseCharge = false;
  let reverseChargeHinweis = "";

  if (land === "AT") {
    if (ustId && ustId.trim().length > 0) {
      mwstSatz = 0;
      reverseCharge = true;
      reverseChargeHinweis =
        "Reverse Charge gem. Art. 196 MwSt-Richtlinie – Steuerschuldnerschaft des Leistungsempfängers";
    } else {
      mwstSatz = 20;
    }
  } else if (land === "CH") {
    mwstSatz = 0;
    reverseChargeHinweis =
      "Leistung nicht im Inland steuerbar (Drittland)";
  }

  const mwstBetrag = Math.round(preisNetto * (mwstSatz / 100) * 100) / 100;
  const preisBrutto = preisNetto + mwstBetrag;

  return { mwstSatz, mwstBetrag, preisBrutto, reverseCharge, reverseChargeHinweis };
}

function validateUstId(land: string, ustId: string): boolean {
  if (land === "DE") return /^DE\d{9}$/.test(ustId);
  if (land === "AT") return /^ATU\d{8}$/.test(ustId);
  if (land === "CH") return /^CHE-\d{3}\.\d{3}\.\d{3}$/.test(ustId);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Rate limiting: 5 orders per IP per hour
    if (!checkRateLimit(ip, 5, 60 * 60 * 1000)) {
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
    if (!paket || !PACKAGES[paket as PacketKey]) {
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
    const pkg = PACKAGES[paket as PacketKey];
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

    // N8N Webhook: fire-and-forget
    const webhookUrl = process.env.N8N_WEBHOOK_URL_bestellen;
    if (webhookUrl) {
      const webhookPayload = {
        bestellung: {
          paket,
          user_anzahl: pkg.users,
          zahlungsmodell,
          preis_netto: preisNetto,
          preis_brutto: preisBrutto,
          mwst_satz: mwstSatz,
          mwst_betrag: mwstBetrag,
          reverse_charge: reverseCharge,
          reverse_charge_hinweis: reverseChargeHinweis,
          waehrung: "EUR",
        },
        unternehmen: {
          firma: firma.trim(),
          strasse: strasse.trim(),
          plz: plz.trim(),
          ort: ort.trim(),
          land,
          ust_id: trimmedUstId || "",
        },
        ansprechpartner: {
          vorname: vorname.trim(),
          nachname: nachname.trim(),
          email: email.toLowerCase().trim(),
          telefon: telefon?.trim() || "",
          position: position?.trim() || "",
        },
        anmerkungen: anmerkungen?.trim() || "",
        meta: {
          bestellt_am: new Date().toISOString(),
          quelle: "copilotberater.de/bestellen",
          bestell_nr: bestellNr,
          ip,
        },
      };

      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      })
        .then((res) => {
          if (!res.ok)
            console.error(`N8N Bestell-Webhook returned ${res.status}`);
        })
        .catch((err) =>
          console.error("N8N Bestell-Webhook delivery failed:", err)
        );
    }

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
