import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import { speichereAntwort } from "@/lib/umfrage/antworten";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Öffentlicher Submit der Stand-Abfrage (kein Login). Identifikation läuft
 * ausschließlich über das signierte Token im Body; alle Antworten werden
 * serverseitig validiert. Honeypot + Rate-Limit wie bei den übrigen
 * öffentlichen API-Routen.
 */
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(`umfrage:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuche es gleich noch einmal." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Honeypot: still akzeptieren, aber nichts speichern.
    if (typeof body.website === "string" && body.website.trim().length > 0) {
      return NextResponse.json({ ok: true, ergebnis: null });
    }

    if (typeof body.token !== "string" || !body.token) {
      return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
    }
    if (!checkRateLimit(`umfrage-token:${body.token.slice(0, 64)}`, 5, 60_000)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuche es gleich noch einmal." },
        { status: 429 }
      );
    }

    const baseUrl = await resolveAppBaseUrl();
    const result = await speichereAntwort(
      {
        token: body.token,
        teilnehmerId: body.teilnehmerId,
        rolle: body.rolle,
        stufe: body.stufe,
        techStufe: body.techStufe,
        blocker: body.blocker,
        blockerStufe: body.blockerStufe,
        blockerSuche: body.blockerSuche,
        rotierend: body.rotierend,
        anonym: body.anonym,
      },
      baseUrl
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, ergebnis: result.ergebnis });
  } catch (err) {
    console.error("[api/umfrage/antwort] Fehler:", err);
    return NextResponse.json(
      { error: "Da ist etwas schiefgelaufen. Bitte versuche es später noch einmal." },
      { status: 500 }
    );
  }
}
