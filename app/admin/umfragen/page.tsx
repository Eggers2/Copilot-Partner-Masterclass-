import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import {
  BASELINE,
  getKohortenVergleich,
  getUmfrageUebersicht,
} from "@/lib/umfrage/auswertung";

export const dynamic = "force-dynamic";

const JAHRESZEIT_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  FERIENFENSTER: "Ferienfenster",
  JAHRESWECHSEL: "Jahreswechsel",
};

/**
 * Einstieg in die Stand-Abfrage: Übersicht aller Klassen mit letzter Runde
 * plus Kohortenvergleich. Verglichen wird ausschließlich Runde N gegen
 * Runde N, nie nach Kalenderdatum; divergierende Programmtage (> 14 Tage)
 * werden ausgewiesen. Die Baseline aus den alten Abfragen steht als
 * Untergrenze darunter.
 */
export default async function UmfragenPage({
  searchParams,
}: {
  searchParams: Promise<{ runde?: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const sp = await searchParams;
  const nummer = sp.runde ? Number.parseInt(sp.runde, 10) : null;
  const baseUrl = await resolveAppBaseUrl();

  const [uebersicht, vergleich] = await Promise.all([
    getUmfrageUebersicht(),
    getKohortenVergleich(Number.isInteger(nummer) ? nummer : null, baseUrl),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">Stand-Abfrage</h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Monatliche Abfrage der 90-Tage-Transformation-Roadmap je Klasse. Rücklauf ist
          keine Bindungskennzahl; Bindung kommt aus der Anwesenheit, Fortschritt aus
          der Abfrage.
        </p>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-4">
            Klassen im Überblick
          </h2>
          {uebersicht.length === 0 ? (
            <p className="text-sm text-dark-slate-400">Keine aktiven Klassen.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-dark-slate-500 border-b border-dark-slate-100">
                    <th className="py-2 pr-3 font-medium">Klasse</th>
                    <th className="py-2 pr-3 font-medium">Letzte Runde</th>
                    <th className="py-2 pr-3 font-medium">Programmtag</th>
                    <th className="py-2 pr-3 font-medium">Antworten</th>
                    <th className="py-2 pr-3 font-medium">Ausnahmeliste</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-slate-50">
                  {uebersicht.map((z) => (
                    <tr key={z.klasse.slug}>
                      <td className="py-2 pr-3 font-medium text-dark-slate-900">
                        {z.klasse.name}
                      </td>
                      <td className="py-2 pr-3 text-dark-slate-600">
                        {z.letzteRunde
                          ? `Runde ${z.letzteRunde.nummer} (${
                              z.letzteRunde.status === "OFFEN" ? "offen" : "abgeschlossen"
                            })`
                          : "Noch keine Runde"}
                      </td>
                      <td className="py-2 pr-3 text-dark-slate-600">
                        {z.letzteRunde ? `Tag ${z.letzteRunde.programmtag}` : "–"}
                      </td>
                      <td className="py-2 pr-3 text-dark-slate-600">
                        {z.letzteRunde ? `${z.antworten} von ${z.empfaenger}` : "–"}
                      </td>
                      <td className="py-2 pr-3">
                        {z.letzteRunde && z.ausnahmen > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {z.ausnahmen} anrufen
                          </span>
                        ) : (
                          <span className="text-dark-slate-400">–</span>
                        )}
                      </td>
                      <td className="py-2">
                        {z.letzteRunde && (
                          <Link
                            href={`/admin/umfragen/${z.klasse.slug}`}
                            className="text-xs font-semibold text-[#030386] hover:underline"
                          >
                            Auswertung
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-1">
            <h2 className="text-lg font-semibold text-dark-slate-900">
              Kohortenvergleich (Runde gegen Runde)
            </h2>
            {vergleich && vergleich.maxNummer > 1 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: vergleich.maxNummer }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={`/admin/umfragen?runde=${n}`}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      n === vergleich.nummer
                        ? "bg-[#030386] text-white"
                        : "bg-white border border-dark-slate-200 text-dark-slate-600 hover:border-[#030386]"
                    }`}
                  >
                    Runde {n}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-dark-slate-500 mb-4">
            Verglichen wird ausschließlich Runde N gegen Runde N, nie nach
            Kalenderdatum. Quoten erst ab 8 Firmen in einer Zelle. Weichen die
            Programmtage bei gleicher Rundennummer um mehr als 14 Tage ab, wird die
            Zeile markiert.
          </p>
          {!vergleich ? (
            <p className="text-sm text-dark-slate-400">
              Noch keine Runde vorhanden. Der Vergleich erscheint, sobald die erste
              Runde gelaufen ist.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-dark-slate-500 border-b border-dark-slate-100">
                    <th className="py-2 pr-3 font-medium">Klasse</th>
                    <th className="py-2 pr-3 font-medium">Programmtag</th>
                    <th className="py-2 pr-3 font-medium">Jahreszeit</th>
                    <th className="py-2 pr-3 font-medium">Curriculum</th>
                    <th className="py-2 pr-3 font-medium">Median Person</th>
                    <th className="py-2 pr-3 font-medium">Median Firma</th>
                    <th className="py-2 pr-3 font-medium">M1</th>
                    <th className="py-2 pr-3 font-medium">M2</th>
                    <th className="py-2 pr-3 font-medium">M3</th>
                    <th className="py-2 pr-3 font-medium">Anwendung</th>
                    <th className="py-2 font-medium">Rücklauf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-slate-50">
                  {vergleich.zeilen.map((z) => (
                    <tr key={z.klasse.slug} className={z.divergenz ? "bg-amber-50" : ""}>
                      <td className="py-2 pr-3 font-medium text-dark-slate-900">
                        <Link
                          href={`/admin/umfragen/${z.klasse.slug}?runde=${vergleich.nummer}`}
                          className="hover:text-[#030386] hover:underline"
                        >
                          {z.klasse.name}
                        </Link>
                        {z.divergenz && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"
                            title="Programmtag weicht bei gleicher Rundennummer um mehr als 14 Tage von den anderen Klassen ab"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Programmtag weicht ab
                          </span>
                        )}
                      </td>
                      {z.hatRunde ? (
                        <>
                          <td className="py-2 pr-3 text-dark-slate-600">Tag {z.programmtag}</td>
                          <td className="py-2 pr-3 text-dark-slate-600">
                            {z.jahreszeit ? JAHRESZEIT_LABEL[z.jahreszeit] : "–"}
                          </td>
                          <td className="py-2 pr-3 text-dark-slate-600">
                            {z.klasse.curriculumStand ?? "–"}
                          </td>
                          <td className="py-2 pr-3 font-mono text-dark-slate-900">
                            {z.medianPerson ?? "–"}
                          </td>
                          <td className="py-2 pr-3 font-mono text-dark-slate-900">
                            {z.medianFirma ?? "–"}
                          </td>
                          {z.meilensteine.map((m, i) => (
                            <td key={i} className="py-2 pr-3 font-mono text-dark-slate-600">
                              {m}
                            </td>
                          ))}
                          <td className="py-2 pr-3 font-mono text-dark-slate-600">
                            {z.anwendung ?? "–"}
                          </td>
                          <td className="py-2 font-mono text-dark-slate-600">{z.ruecklauf}</td>
                        </>
                      ) : (
                        <td colSpan={10} className="py-2 text-dark-slate-400">
                          Keine Runde {vergleich.nummer} für diese Klasse.
                        </td>
                      )}
                    </tr>
                  ))}
                  {BASELINE.map((b, i) => (
                    <tr key={`baseline-${i}`} className="bg-dark-slate-50/60">
                      <td className="py-2 pr-3 text-dark-slate-500 italic">
                        {b.label}
                      </td>
                      <td className="py-2 pr-3 text-dark-slate-500 italic">
                        Tag {b.programmtag}
                      </td>
                      <td className="py-2 pr-3 text-dark-slate-400">–</td>
                      <td className="py-2 pr-3 text-dark-slate-400">–</td>
                      <td className="py-2 pr-3 text-dark-slate-400">–</td>
                      <td className="py-2 pr-3 font-mono text-dark-slate-500 italic">
                        {b.medianFirma}
                      </td>
                      <td className="py-2 pr-3 font-mono text-dark-slate-500 italic">
                        {b.meilenstein1}
                      </td>
                      <td className="py-2 pr-3 text-dark-slate-400">–</td>
                      <td className="py-2 pr-3 font-mono text-dark-slate-500 italic">
                        {b.meilenstein3}
                      </td>
                      <td className="py-2 pr-3 text-dark-slate-400">–</td>
                      <td className="py-2 text-dark-slate-400">–</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
