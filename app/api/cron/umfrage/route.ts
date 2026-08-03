import { NextRequest, NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import { berlinNow } from "@/lib/newsletter/schedule";
import { runUmfrageCron } from "@/lib/umfrage/versand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Täglicher Cron der Stand-Abfrage (GitHub-Actions-Workflow
 * .github/workflows/umfrage-cron.yml), geschützt über `x-cron-secret`
 * (CRON_SECRET). Zielzeit 08:00 Europe/Berlin; die Zeitprüfung liegt hier,
 * damit der UTC-Cron Sommer-/Winterzeit automatisch korrekt abbildet.
 *
 * Ein Lauf: Runden anlegen (nur am ersten Werktag des Monats plus
 * Nachholfenster), Einladungen senden, genau eine Erinnerung nach 4 Tagen,
 * Lieferrisiko prüfen. Alle Schritte sind über Claims idempotent; das
 * Antwort-JSON protokolliert je Schritt, was passiert ist.
 *
 * Zum Testen überspringt `?force=1` die Zeitprüfung (weiterhin
 * secret-geschützt).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET ist nicht konfiguriert." },
      { status: 500 }
    );
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("force") === "1";
  const t = berlinNow();
  if (!force && t.hour !== 8) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Kein geplanter Lauf (Berlin: ${String(t.hour).padStart(2, "0")}:${String(
        t.minute
      ).padStart(2, "0")}, Ziel 08:00).`,
    });
  }

  try {
    const baseUrl = await resolveAppBaseUrl();
    const ergebnis = await runUmfrageCron(baseUrl);
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (err) {
    console.error("[cron/umfrage] Fehler:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
