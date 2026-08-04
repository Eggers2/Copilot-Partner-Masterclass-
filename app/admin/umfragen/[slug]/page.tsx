import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, AlertTriangle, Phone } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { resolveAppBaseUrl } from "@/lib/auth/customer";
import { getRundenAuswertung } from "@/lib/umfrage/auswertung";
import { MEILENSTEINE, STUFEN, TECH_STUFEN, rotierendeFrage } from "@/lib/umfrage/fragen";
import { KopierLink } from "@/components/admin/umfrage/KopierLink";

export const dynamic = "force-dynamic";

const JAHRESZEIT_LABEL: Record<string, string> = {
  NORMAL: "Normal",
  FERIENFENSTER: "Ferienfenster",
  JAHRESWECHSEL: "Jahreswechsel",
};

function formatTag(d: Date | null): string {
  if (!d) return "–";
  return d.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Balken({ anzahl, max, hervorgehoben = false }: { anzahl: number; max: number; hervorgehoben?: boolean }) {
  return (
    <div className="h-2 rounded bg-dark-slate-100 overflow-hidden min-w-[120px]">
      <div
        className={`h-2 rounded ${hervorgehoben ? "bg-[#030386]" : "bg-dark-slate-300"}`}
        style={{ width: `${max > 0 ? (anzahl / max) * 100 : 0}%` }}
      />
    </div>
  );
}

/**
 * Auswertung einer Stand-Abfrage-Runde je Klasse. Reihenfolge = Wichtigkeit:
 * die Ausnahmeliste (Anrufliste) steht ganz oben, danach Verteilung, Bewegung,
 * Firmen (Lieferrisiko), Blocker, Rollen, Anwendungsquote, anonymes Feedback.
 * Rücklauf wird angezeigt, aber nie mit Anwesenheit zu einer Ampel kombiniert.
 */
export default async function UmfrageAuswertungPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ runde?: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { slug } = await params;
  const sp = await searchParams;
  const nummer = sp.runde ? Number.parseInt(sp.runde, 10) : null;

  const baseUrl = await resolveAppBaseUrl();
  const a = await getRundenAuswertung(
    slug,
    Number.isInteger(nummer) ? nummer : null,
    baseUrl
  );

  if (!a) {
    return (
      <div>
        <Link
          href="/admin/umfragen"
          className="inline-flex items-center gap-1 text-sm text-dark-slate-500 hover:text-[#030386]"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
        <p className="mt-6 text-sm text-dark-slate-500">
          Für diese Klasse gibt es noch keine Umfrage-Runde.
        </p>
      </div>
    );
  }
  if (!a.klasse) notFound();

  const kernMax = Math.max(1, ...a.kern.verteilung);
  const technikMax = Math.max(1, ...a.technik.verteilung);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/umfragen"
          className="inline-flex items-center gap-1 text-sm text-dark-slate-500 hover:text-[#030386]"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
        <div className="flex items-center gap-1">
          {a.rundenNummern.map((n) => (
            <Link
              key={n}
              href={`/admin/umfragen/${a.klasse.slug}?runde=${n}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                n === a.runde.nummer
                  ? "bg-[#030386] text-white"
                  : "bg-white border border-dark-slate-200 text-dark-slate-600 hover:border-[#030386]"
              }`}
            >
              Runde {n}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">
          Stand-Abfrage {a.klasse.name}, Runde {a.runde.nummer}
        </h1>
        <p className="text-sm text-dark-slate-500 mt-1">
          Stichtag {formatTag(a.runde.stichtag)} · Programmtag {a.runde.programmtag} ·
          Jahreszeit {JAHRESZEIT_LABEL[a.runde.jahreszeit]}
          {a.klasse.curriculumStand ? ` · Curriculum bei Kickoff: ${a.klasse.curriculumStand}` : ""}
          {" "}· Versand {formatTag(a.runde.versandAm)} · Erinnerung {formatTag(a.runde.erinnerungAm)}
        </p>
        <p className="text-sm text-dark-slate-500 mt-1">
          Rücklauf: {a.antwortenGesamt} von {a.empfaengerGesamt} Plätzen. Rücklauf ist
          keine Bindungskennzahl und wird nicht mit der Anwesenheit verrechnet.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Ausnahmeliste */}
        <section className="bg-white rounded-2xl border-2 border-red-300 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-700 mb-1 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Ausnahmeliste ({a.ausnahmeliste.length})
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Kein Fragebogen eingegangen. Bitte anrufen, keine weitere Mail.
          </p>
          {a.ausnahmeliste.length === 0 ? (
            <p className="text-sm text-dark-slate-400">Alle Plätze haben geantwortet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-dark-slate-500 border-b border-dark-slate-100">
                    <th className="py-2 pr-3 font-medium">Name</th>
                    <th className="py-2 pr-3 font-medium">Firma</th>
                    <th className="py-2 pr-3 font-medium">E-Mail</th>
                    <th className="py-2 pr-3 font-medium">Telefon</th>
                    <th className="py-2 font-medium">Persönlicher Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-slate-50">
                  {a.ausnahmeliste.map((e) => (
                    <tr key={e.teilnehmerId}>
                      <td className="py-2 pr-3 font-medium text-dark-slate-900">{e.name}</td>
                      <td className="py-2 pr-3 text-dark-slate-600">{e.firma}</td>
                      <td className="py-2 pr-3 text-dark-slate-600">{e.email}</td>
                      <td className="py-2 pr-3 text-dark-slate-600">{e.telefon ?? "–"}</td>
                      <td className="py-2">
                        <KopierLink link={e.link} title="Persönlichen Link kopieren" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 2. Kernstufen-Verteilung */}
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            90-Tage-Transformation-Roadmap ({a.kern.gesamt} Antworten)
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Median: {a.kern.median ?? "–"}. Meilensteine bei Stufe 2, 5 und 7.
          </p>
          <div className="space-y-1.5">
            {STUFEN.map((s) => (
              <div key={s.wert} className="flex items-center gap-3 text-sm">
                <span className="w-6 font-mono text-dark-slate-400 shrink-0">{s.wert}</span>
                <span className="w-72 text-dark-slate-700 shrink-0 truncate" title={s.label}>
                  {s.label}
                  {(MEILENSTEINE as readonly number[]).includes(s.wert) && (
                    <span className="ml-1 text-xs font-semibold text-[#030386]">M</span>
                  )}
                </span>
                <Balken
                  anzahl={a.kern.verteilung[s.wert]}
                  max={kernMax}
                  hervorgehoben={(MEILENSTEINE as readonly number[]).includes(s.wert)}
                />
                <span className="w-8 text-right font-mono text-dark-slate-600 shrink-0">
                  {a.kern.verteilung[s.wert]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Meilensteine */}
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Meilensteine (Firmenebene, {a.firmen.length} Firmen mit Antwort)
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Anteil der Firmen, deren höchste Stufe den Meilenstein erreicht. Quoten
            erscheinen erst ab 8 Firmen, darunter die absolute Zahl.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {a.meilensteine.map((m, i) => (
              <div key={m.stufe} className="rounded-xl border border-dark-slate-200 p-4">
                <p className="text-xs text-dark-slate-500">
                  Meilenstein {i + 1} (Stufe {m.stufe} erreicht)
                </p>
                <p className="text-2xl font-bold text-dark-slate-900 mt-1">{m.quote}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Bewegung vs Vorrunde */}
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Bewegung gegenüber der Vorrunde
          </h2>
          {!a.bewegung ? (
            <p className="text-sm text-dark-slate-400 mt-2">
              Keine Vorrunde vorhanden. Die Bewegung erscheint ab Runde 2.
            </p>
          ) : a.bewegung.vergleichbar === 0 ? (
            <p className="text-sm text-dark-slate-400 mt-2">
              Keine vergleichbaren Antworten (gleicher Platz in beiden Runden mit Kernstufe).
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                <div className="rounded-xl border border-dark-slate-200 p-4">
                  <p className="text-xs text-dark-slate-500">Vorwärts</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    {a.bewegung.vor} von {a.bewegung.vergleichbar}
                  </p>
                </div>
                <div className="rounded-xl border border-dark-slate-200 p-4">
                  <p className="text-xs text-dark-slate-500">Unverändert</p>
                  <p className="text-2xl font-bold text-dark-slate-900 mt-1">
                    {a.bewegung.gleich} von {a.bewegung.vergleichbar}
                  </p>
                </div>
                <div className="rounded-xl border border-dark-slate-200 p-4">
                  <p className="text-xs text-dark-slate-500">Zurück</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">
                    {a.bewegung.zurueck} von {a.bewegung.vergleichbar}
                  </p>
                </div>
              </div>
              {a.bewegung.rueckschritte.length > 0 && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700 mb-2">
                    Rückschritte (in der Regel ein verlorenes Angebot, bitte anrufen):
                  </p>
                  <ul className="space-y-1 text-sm text-dark-slate-700">
                    {a.bewegung.rueckschritte.map((r, i) => (
                      <li key={i}>
                        <span className="font-medium">{r.name}</span> ({r.firma}): Stufe {r.alt} zu {r.neu}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

        {/* 5. Firmen-Tabelle */}
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Firmenebene ({a.firmen.length})
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Höchste Stufe aller Plätze der Firma plus Spannweite (höchste minus
            niedrigste, ab 2 Antworten). Eine Spannweite über 4 bedeutet: verkauft,
            aber noch nicht lieferbar (Lieferrisiko).
          </p>
          {a.firmen.length === 0 ? (
            <p className="text-sm text-dark-slate-400">Noch keine Kernstufen-Antworten.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-dark-slate-500 border-b border-dark-slate-100">
                    <th className="py-2 pr-3 font-medium">Firma</th>
                    <th className="py-2 pr-3 font-medium">Antworten</th>
                    <th className="py-2 pr-3 font-medium">Max-Stufe</th>
                    <th className="py-2 font-medium">Spannweite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-slate-50">
                  {a.firmen.map((f) => (
                    <tr key={f.firma} className={f.lieferrisiko ? "bg-red-50" : ""}>
                      <td className="py-2 pr-3 font-medium text-dark-slate-900">
                        {f.firma}
                        {f.lieferrisiko && (
                          <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            Lieferrisiko
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-dark-slate-600">{f.antworten}</td>
                      <td className="py-2 pr-3 font-mono text-dark-slate-900">{f.maxStufe}</td>
                      <td className="py-2 font-mono text-dark-slate-600">
                        {f.spannweite ?? "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 6. Blocker */}
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-4">
            Blocker (was bremst gerade am stärksten)
          </h2>
          <div className="space-y-1.5">
            {a.blocker.map((b) => {
              const max = Math.max(1, ...a.blocker.map((x) => x.anzahl));
              return (
                <div key={b.wert} className="flex items-center gap-3 text-sm">
                  <span className="w-72 text-dark-slate-700 shrink-0 truncate" title={b.label}>
                    {b.label}
                  </span>
                  <Balken anzahl={b.anzahl} max={max} />
                  <span className="w-8 text-right font-mono text-dark-slate-600 shrink-0">
                    {b.anzahl}
                  </span>
                </div>
              );
            })}
          </div>
          {a.blockerStufen.some((s) => s.anzahl > 0) && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-dark-slate-900 mb-2">
                Stillstandsort bei Blocker Zeit (welcher Schritt liegen blieb)
              </h3>
              <div className="space-y-1.5">
                {a.blockerStufen
                  .filter((s) => s.anzahl > 0)
                  .map((s) => (
                    <div key={s.wert} className="flex items-center gap-3 text-sm">
                      <span className="w-6 font-mono text-dark-slate-400 shrink-0">{s.wert}</span>
                      <span className="w-72 text-dark-slate-700 shrink-0 truncate" title={s.label}>
                        {s.label}
                      </span>
                      <span className="font-mono text-dark-slate-600">{s.anzahl}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {a.blockerSuchen.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-dark-slate-900 mb-2">
                Gesuchtes Material (Blocker Material, Freitexte)
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-dark-slate-700">
                {a.blockerSuchen.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 7. Rollen */}
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-4">Rollen</h2>
          <div className="space-y-1.5">
            {a.rollen.map((r) => (
              <div key={r.wert} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-72 shrink-0 ${
                    r.istAlarm && r.anzahl > 0
                      ? "font-semibold text-red-700"
                      : "text-dark-slate-700"
                  }`}
                >
                  {r.label}
                </span>
                <span className="font-mono text-dark-slate-600">{r.anzahl}</span>
              </div>
            ))}
          </div>
          {a.alarmPersonen.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Alarm: &quot;Das weiß ich nicht&quot; ist keine Antwort. Bitte nachfassen:
              </p>
              <ul className="space-y-1 text-sm text-dark-slate-700">
                {a.alarmPersonen.map((p, i) => (
                  <li key={i}>
                    <span className="font-medium">{p.name}</span> ({p.firma})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.technik.gesamt > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-dark-slate-900 mb-2">
                Technische Lieferfähigkeit ({a.technik.gesamt} Antworten)
              </h3>
              <div className="space-y-1.5">
                {TECH_STUFEN.map((s) => (
                  <div key={s.wert} className="flex items-center gap-3 text-sm">
                    <span className="w-6 font-mono text-dark-slate-400 shrink-0">{s.wert}</span>
                    <span className="w-72 text-dark-slate-700 shrink-0 truncate" title={s.label}>
                      {s.label}
                    </span>
                    <Balken anzahl={a.technik.verteilung[s.wert]} max={technikMax} />
                    <span className="w-8 text-right font-mono text-dark-slate-600 shrink-0">
                      {a.technik.verteilung[s.wert]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 8. Anwendungsquote */}
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Anwendungsquote der rotierenden Frage (Zeitreihe)
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Anteil &quot;Ja&quot; je Runde. Quote erst ab 8 antwortenden Firmen, sonst absolut.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dark-slate-500 border-b border-dark-slate-100">
                  <th className="py-2 pr-3 font-medium">Runde</th>
                  <th className="py-2 pr-3 font-medium">Frage</th>
                  <th className="py-2 font-medium">Angewendet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-slate-50">
                {a.anwendungsquote.map((z) => (
                  <tr key={z.nummer} className={z.nummer === a.runde.nummer ? "bg-[#E3ECF8]/40" : ""}>
                    <td className="py-2 pr-3 font-semibold text-dark-slate-900">{z.nummer}</td>
                    <td className="py-2 pr-3 text-dark-slate-600">{rotierendeFrage(z.inhalt)}</td>
                    <td className="py-2 font-mono text-dark-slate-900">{z.quote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 9. Anonymes Feedback */}
        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Anonymes Feedback ({a.anonym.length})
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Anonym, nicht zuordenbar. Nur Klasse und Runde sind bekannt.
          </p>
          {a.anonym.length === 0 ? (
            <p className="text-sm text-dark-slate-400">Kein anonymes Feedback in dieser Runde.</p>
          ) : (
            <ul className="space-y-3">
              {a.anonym.map((text, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-dark-slate-200 bg-dark-slate-50/50 px-4 py-3 text-sm text-dark-slate-700 whitespace-pre-line"
                >
                  {text}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
