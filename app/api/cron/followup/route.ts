import { NextRequest, NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import { berlinNow } from "@/lib/newsletter/schedule";
import { imSendefenster } from "@/lib/followup/sequenz";
import { runFollowupCron } from "@/lib/followup/versand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stündlicher Cron der Wartelisten-Sequenz (GitHub-Actions-Workflow
 * .github/workflows/followup-cron.yml), geschützt über `x-cron-secret`
 * (CRON_SECRET). Versendet fällige Follow-up-Mails nur werktags zwischen 8 und
 * 18 Uhr Europe/Berlin; die Zeitprüfung liegt hier, damit der UTC-Cron
 * Sommer-/Winterzeit automatisch korrekt abbildet. Jeder Schritt wird geclaimt,
 * überlappende Läufe senden also nie doppelt.
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
  if (!force && !imSendefenster(t)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Außerhalb des Sendefensters (Berlin: Wochentag ${t.weekday}, ${String(
        t.hour
      ).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}).`,
    });
  }

  try {
    const ergebnis = await runFollowupCron(await resolveAppBaseUrl());
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (err) {
    console.error("[cron/followup] Fehler:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
