import { NextRequest, NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import { berlinNow, runFridaySend, runThursdayDraft } from "@/lib/newsletter/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Von einem externen Scheduler (Railway-Cron-Service via scripts/trigger-cron.mjs)
 * angestoßener Endpoint. Geschützt über den Header `x-cron-secret` (CRON_SECRET).
 *
 * Die eigentliche Zeitentscheidung trifft `berlinNow()` gegen Europe/Berlin,
 * damit der UTC-laufende Cron Sommer-/Winterzeit automatisch korrekt abbildet:
 *   • Donnerstag 18:00 → Entwurf anlegen + Freigabe-Benachrichtigung
 *   • Freitag    09:00 → freigegebene Ausgabe versenden (sonst Erinnerung)
 *
 * Zum Testen kann mit `?force=thursday|friday` die Zeitprüfung übersprungen
 * werden (weiterhin secret-geschützt).
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

  const baseUrl = await resolveAppBaseUrl();
  const force = new URL(req.url).searchParams.get("force");
  const t = berlinNow();

  try {
    if (force === "thursday" || (t.weekday === 4 && t.hour === 18)) {
      return NextResponse.json({ ok: true, ...(await runThursdayDraft(baseUrl)) });
    }
    if (force === "friday" || (t.weekday === 5 && t.hour === 9)) {
      return NextResponse.json({ ok: true, ...(await runFridaySend(baseUrl)) });
    }
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Kein geplanter Lauf (Berlin: Wochentag ${t.weekday}, ${String(
        t.hour
      ).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}).`,
    });
  } catch (err) {
    console.error("[cron/newsletter] Fehler:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
