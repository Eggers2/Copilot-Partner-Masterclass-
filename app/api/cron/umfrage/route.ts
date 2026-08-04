import { NextRequest, NextResponse } from "next/server";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import { berlinNow } from "@/lib/newsletter/schedule";
import { runUmfrageCron } from "@/lib/umfrage/versand";
import { meldeCronLauf, meldeCronPing } from "@/lib/umfrage/cronStatus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Täglicher Cron der Stand-Abfrage (GitHub-Actions-Workflow
 * .github/workflows/umfrage-cron.yml), geschützt über `x-cron-secret`
 * (CRON_SECRET). Zielzeit 08:00 Europe/Berlin; die Zeitprüfung liegt hier,
 * damit der UTC-Cron Sommer-/Winterzeit automatisch korrekt abbildet.
 *
 * Ein Lauf macht genau zwei Dinge: genau eine Erinnerung 4 Tage nach dem
 * Versand (nur normale Runden) und die Lieferrisiko-Prüfung. Runden-Start und
 * Einladungsversand laufen MANUELL aus dem Admin (Klassenseite, Sektion
 * Stand-Abfrage). Alle Schritte sind über Claims idempotent; das Antwort-JSON
 * protokolliert, was passiert ist.
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

  // Lebenszeichen für die Anzeige im Admin (auch außerhalb der Zielstunde).
  await meldeCronPing().catch((err) =>
    console.error("[cron/umfrage] Ping konnte nicht gespeichert werden:", err)
  );

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
    await meldeCronLauf({
      zeit: new Date().toISOString(),
      erinnerungenRunden: ergebnis.erinnerungen.length,
      erinnerungenMails: ergebnis.erinnerungen.reduce((acc, e) => acc + e.gesendet, 0),
      lieferrisikoRunden: ergebnis.lieferrisiko.length,
      lieferrisikoMails: ergebnis.lieferrisiko.filter((l) => l.gesendet).length,
    }).catch((err) =>
      console.error("[cron/umfrage] Lauf-Status konnte nicht gespeichert werden:", err)
    );
    return NextResponse.json({ ok: true, ...ergebnis });
  } catch (err) {
    console.error("[cron/umfrage] Fehler:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
