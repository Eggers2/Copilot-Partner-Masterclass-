import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatBerlinDateTime,
  formatCalendarDate,
  migrationWouldShiftDisplay,
  naiveReading,
} from "@/lib/datetime";

/**
 * Vorher-Nachher-Vergleich der Zeitzonen-Umstellung, direkt im Admin.
 *
 * Ein vorheriger Snapshot ist dafuer nicht noetig: die Sicherungstabelle
 * zeitzonen_migration_followup haelt je Lead den alten UND den neuen Wert.
 * Damit laesst sich beides nachtraeglich ausrechnen:
 *
 *   Anzeige vorher   = naiveReading(alt_wert)        – alter Code gab den
 *                      gespeicherten Wert roh als Ortszeit aus
 *   Anzeige nachher  = formatBerlinDateTime(neu_wert) – neuer Code rechnet
 *                      nach Europe/Berlin um
 *
 * Stimmen beide ueberein, hat sich im Portal keine Uhrzeit bewegt. Genau das
 * ist die Zusage der Umstellung, und diese Seite belegt sie Zeile fuer Zeile.
 */

export const dynamic = "force-dynamic";

interface Sicherung {
  lead_id: string;
  alt_wert: Date;
  neu_wert: Date;
  migriert_am: Date;
  email: string | null;
  aktuell: Date | null;
}

export default async function ZeitzonenPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  // Existiert die Sicherungstabelle schon? Vor dem ersten Deployment nicht.
  const [{ vorhanden }] = await prisma.$queryRawUnsafe<{ vorhanden: boolean }[]>(
    `SELECT to_regclass('public.zeitzonen_migration_followup') IS NOT NULL AS vorhanden`
  );

  const zeilen: Sicherung[] = vorhanden
    ? await prisma.$queryRawUnsafe<Sicherung[]>(
        `SELECT m."lead_id"::text AS lead_id, m."alt_wert", m."neu_wert", m."migriert_am",
                w."email", w."followUpAt" AS aktuell
         FROM "zeitzonen_migration_followup" m
         LEFT JOIN "waitlist" w ON w."id" = m."lead_id"
         ORDER BY m."neu_wert" ASC`
      )
    : [];

  // Leads mit Follow-up, die NICHT in der Sicherung stehen: entweder nach der
  // Migration neu gesetzt (dann schon korrekt) oder bewusst uebersprungen.
  const alleLeads = await prisma.lead.findMany({
    where: { followUpAt: { not: null } },
    select: { id: true, email: true, status: true, followUpAt: true },
    orderBy: { followUpAt: "asc" },
  });
  const migriert = new Set(zeilen.map((z) => z.lead_id));
  const uebersprungen = alleLeads.filter(
    (l) => !migriert.has(l.id) && migrationWouldShiftDisplay(l.followUpAt!)
  );
  const nachMigrationGesetzt = alleLeads.filter(
    (l) => !migriert.has(l.id) && !migrationWouldShiftDisplay(l.followUpAt!)
  );

  // Kernprüfung: stimmt die Anzeige vorher und nachher überein?
  const geprueft = zeilen.map((z) => {
    const vorher = naiveReading(z.alt_wert);
    const nachher = formatBerlinDateTime(z.aktuell ?? z.neu_wert);
    // Wurde der Wert nach der Migration von Hand geändert? Dann ist eine
    // Abweichung kein Fehler der Umstellung.
    const nachtraeglichGeaendert =
      z.aktuell != null && z.aktuell.getTime() !== z.neu_wert.getTime();
    return { ...z, vorher, nachher, ok: vorher === nachher, nachtraeglichGeaendert };
  });

  const abweichungen = geprueft.filter((z) => !z.ok && !z.nachtraeglichGeaendert);
  const geaendert = geprueft.filter((z) => z.nachtraeglichGeaendert);

  // Felder, die schon vorher korrekt in UTC standen: nur zur Kontrolle.
  const [webinare, termine] = await Promise.all([
    prisma.webinar.findMany({
      select: { id: true, title: true, scheduledAt: true },
      orderBy: { scheduledAt: "desc" },
      take: 10,
    }),
    prisma.klasseTermin.findMany({
      select: { id: true, datum: true, klasse: { select: { name: true } } },
      orderBy: { datum: "desc" },
      take: 10,
    }),
  ]);
  const klassen = await prisma.klasse.findMany({
    select: { id: true, name: true, kickoffDate: true, startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
  });

  const karte = "bg-white rounded-xl border border-dark-slate-100 p-6";
  const th = "text-left px-3 py-2 text-xs font-semibold text-dark-slate-500 uppercase tracking-wide";
  const td = "px-3 py-2 text-sm text-dark-slate-700 whitespace-nowrap";

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-dark-slate-500 hover:text-dark-slate-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück zum Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-dark-slate-900 mb-1">Zeitzonen-Umstellung</h1>
      <p className="text-sm text-dark-slate-500 mb-6">
        Prüft Zeile für Zeile, ob sich durch die Umstellung eine angezeigte Uhrzeit verschoben
        hat. Erwartet wird: keine einzige.
      </p>

      {!vorhanden ? (
        <div className={`${karte} flex items-start gap-3`}>
          <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-dark-slate-900">Migration noch nicht gelaufen</p>
            <p className="text-sm text-dark-slate-500 mt-1">
              Die Follow-up-Daten stehen noch als naive Ortszeit in der Datenbank. Die Migration
              läuft automatisch beim nächsten Deployment mit, danach steht hier das Ergebnis.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Gesamturteil ─────────────────────────────────────────────── */}
          <div
            className={`${karte} mb-6 flex items-start gap-3 ${
              abweichungen.length === 0
                ? "border-green-200 bg-green-50/40"
                : "border-red-200 bg-red-50/40"
            }`}
          >
            {abweichungen.length === 0 ? (
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-dark-slate-900">
                {abweichungen.length === 0
                  ? `Null Abweichungen. ${geprueft.length} Follow-up-Termine geprüft, alle zeigen dieselbe Uhrzeit wie vorher.`
                  : `${abweichungen.length} Abweichung(en) gefunden.`}
              </p>
              <p className="text-sm text-dark-slate-500 mt-1">
                {abweichungen.length === 0 ? (
                  <>
                    Verglichen wird die Anzeige vor der Umstellung (gespeicherter Wert roh als
                    Ortszeit gelesen) mit der Anzeige danach (gespeicherter UTC-Wert nach
                    Europe/Berlin umgerechnet).
                  </>
                ) : (
                  <>
                    Das Deployment sollte zurückgerollt werden. Die alten Werte stehen vollständig
                    in der Sicherungstabelle.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* ── Abweichungen zuerst ──────────────────────────────────────── */}
          {abweichungen.length > 0 && (
            <div className={`${karte} mb-6 border-red-200`}>
              <h2 className="font-semibold text-red-700 mb-3">Verschobene Termine</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-slate-100">
                    <th className={th}>Lead</th>
                    <th className={th}>Anzeige vorher</th>
                    <th className={th}>Anzeige jetzt</th>
                  </tr>
                </thead>
                <tbody>
                  {abweichungen.map((z) => (
                    <tr key={z.lead_id} className="border-b border-dark-slate-50">
                      <td className={td}>{z.email ?? z.lead_id}</td>
                      <td className={`${td} font-medium`}>{z.vorher}</td>
                      <td className={`${td} font-medium text-red-600`}>{z.nachher}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Übersprungene Datensätze ─────────────────────────────────── */}
          {uebersprungen.length > 0 && (
            <div className={`${karte} mb-6 border-amber-200 bg-amber-50/30`}>
              <h2 className="font-semibold text-amber-800 mb-2">
                {uebersprungen.length} Termin(e) brauchen deine Entscheidung
              </h2>
              <p className="text-sm text-dark-slate-600 mb-3">
                Die gespeicherte Uhrzeit fällt in die übersprungene Stunde der
                Frühjahrsumstellung. Diese Ortszeit existiert in Deutschland nicht, deshalb gibt
                es keine Umrechnung, die die Anzeige unverändert lässt. Die Werte wurden bewusst
                nicht angefasst.
              </p>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-amber-200">
                    <th className={th}>Lead</th>
                    <th className={th}>Status</th>
                    <th className={th}>gespeichert</th>
                    <th className={th}>zeigt jetzt</th>
                  </tr>
                </thead>
                <tbody>
                  {uebersprungen.map((l) => (
                    <tr key={l.id} className="border-b border-amber-100">
                      <td className={td}>
                        <Link href={`/admin/leads/${l.id}`} className="hover:underline">
                          {l.email}
                        </Link>
                      </td>
                      <td className={td}>{l.status}</td>
                      <td className={td}>{l.followUpAt!.toISOString()}</td>
                      <td className={`${td} font-medium`}>{formatBerlinDateTime(l.followUpAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Nachträglich geänderte Werte ─────────────────────────────── */}
          {geaendert.length > 0 && (
            <div className={`${karte} mb-6`}>
              <h2 className="font-semibold text-dark-slate-900 mb-2">
                {geaendert.length} Termin(e) wurden nach der Migration bearbeitet
              </h2>
              <p className="text-sm text-dark-slate-500">
                Hier weicht die Anzeige ab, weil der Termin inzwischen von Hand geändert wurde.
                Das ist kein Fehler der Umstellung.
              </p>
            </div>
          )}

          {/* ── Vollständige Liste ───────────────────────────────────────── */}
          <div className={`${karte} mb-6`}>
            <h2 className="font-semibold text-dark-slate-900 mb-3">
              Alle migrierten Follow-up-Termine ({geprueft.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-slate-100">
                    <th className={th}>Lead</th>
                    <th className={th}>gespeichert vorher</th>
                    <th className={th}>gespeichert jetzt</th>
                    <th className={th}>Anzeige vorher</th>
                    <th className={th}>Anzeige jetzt</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {geprueft.map((z) => (
                    <tr key={z.lead_id} className="border-b border-dark-slate-50">
                      <td className={td}>
                        <Link href={`/admin/leads/${z.lead_id}`} className="hover:underline">
                          {z.email ?? z.lead_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className={`${td} text-dark-slate-400 font-mono text-xs`}>
                        {z.alt_wert.toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className={`${td} text-dark-slate-400 font-mono text-xs`}>
                        {z.neu_wert.toISOString().slice(0, 16).replace("T", " ")}
                      </td>
                      <td className={td}>{z.vorher}</td>
                      <td className={td}>{z.nachher}</td>
                      <td className={td}>
                        {z.nachtraeglichGeaendert ? (
                          <span className="text-xs text-dark-slate-400">nachträglich geändert</span>
                        ) : z.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Nicht migrierte Felder, zur Kontrolle ────────────────────── */}
          <div className={karte}>
            <h2 className="font-semibold text-dark-slate-900 mb-1">Nicht migrierte Felder</h2>
            <p className="text-sm text-dark-slate-500 mb-4">
              Diese standen schon vorher korrekt in UTC und wurden nicht angefasst. Hier zur
              Sichtkontrolle, dass die Uhrzeiten stimmen.
            </p>

            <h3 className="text-sm font-semibold text-dark-slate-700 mt-4 mb-2">Webinare</h3>
            {webinare.length === 0 ? (
              <p className="text-sm text-dark-slate-400">Keine.</p>
            ) : (
              <ul className="text-sm text-dark-slate-600 space-y-1">
                {webinare.map((w) => (
                  <li key={w.id}>
                    {formatBerlinDateTime(w.scheduledAt)} · {w.title}
                  </li>
                ))}
              </ul>
            )}

            <h3 className="text-sm font-semibold text-dark-slate-700 mt-4 mb-2">Klassentermine</h3>
            {termine.length === 0 ? (
              <p className="text-sm text-dark-slate-400">Keine.</p>
            ) : (
              <ul className="text-sm text-dark-slate-600 space-y-1">
                {termine.map((t) => (
                  <li key={t.id}>
                    {formatBerlinDateTime(t.datum)} · {t.klasse.name}
                  </li>
                ))}
              </ul>
            )}

            <h3 className="text-sm font-semibold text-dark-slate-700 mt-4 mb-2">
              Klassen-Laufzeiten (Kalendertage, ohne Uhrzeit)
            </h3>
            <ul className="text-sm text-dark-slate-600 space-y-1">
              {klassen.map((k) => (
                <li key={k.id}>
                  {k.name}: Kickoff {formatCalendarDate(k.kickoffDate)}, Programm{" "}
                  {formatCalendarDate(k.startDate)} – {formatCalendarDate(k.endDate)}
                </li>
              ))}
            </ul>

            {nachMigrationGesetzt.length > 0 && (
              <p className="text-sm text-dark-slate-500 mt-4">
                {nachMigrationGesetzt.length} Follow-up-Termin(e) wurden nach der Migration neu
                gesetzt und stehen damit von Anfang an korrekt in UTC.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
