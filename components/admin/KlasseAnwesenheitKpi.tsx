import { AlertTriangle, Building2, TrendingDown, TrendingUp } from "lucide-react";
import type {
  KlasseAnwesenheitAuswertung,
  RankingEintrag,
} from "@/lib/db/anwesenheit";
import { AnwesenheitIgnorierliste } from "./AnwesenheitIgnorierliste";
import { FirmenErinnerungButton } from "./FirmenErinnerung";

// Server-gerenderte KPI-Sektion der Klassen-Detailseite: Anwesenheit pro
// Termin, Abweichungs-Hinweis (Anwesende ohne Registrierung) und die
// Top-20-/Bottom-20-Rangliste der registrierten Teilnehmer.

function formatTermin(datum: Date): string {
  return datum.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function RankingTable({
  eintraege,
  berichte,
  variante,
}: {
  eintraege: RankingEintrag[];
  berichte: number;
  variante: "top" | "bottom";
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-dark-slate-700 mb-2 flex items-center gap-1.5">
        {variante === "top" ? (
          <TrendingUp className="w-4 h-4 text-green-600" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600" />
        )}
        {variante === "top"
          ? "Top 20 – am häufigsten dabei"
          : "Bottom 20 – am seltensten dabei"}
      </h3>
      {eintraege.length === 0 ? (
        <p className="text-sm text-dark-slate-400">Keine registrierten Teilnehmer.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dark-slate-400">
                <th className="py-1 pr-2 font-medium">#</th>
                <th className="py-1 pr-3 font-medium">Teilnehmer</th>
                <th className="py-1 pr-3 font-medium">Firma</th>
                <th className="py-1 font-medium whitespace-nowrap">Anwesenheit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-slate-50">
              {eintraege.map((e, i) => {
                const quote = berichte > 0 ? Math.round((e.anwesend / berichte) * 100) : 0;
                return (
                  <tr key={e.email}>
                    <td className="py-1.5 pr-2 text-xs text-dark-slate-400">{i + 1}</td>
                    <td className="py-1.5 pr-3">
                      <span className="text-dark-slate-800">{e.name}</span>
                      <span className="block font-mono text-xs text-dark-slate-400">
                        {e.email}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-dark-slate-600">{e.firma}</td>
                    <td className="py-1.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          quote >= 75
                            ? "bg-green-100 text-green-700"
                            : quote >= 40
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {e.anwesend}/{berichte} · {quote}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function KlasseAnwesenheitKpi({
  klasseId,
  klasseName,
  klasseSlug,
  auswertung,
}: {
  klasseId: string;
  klasseName: string;
  klasseSlug: string;
  auswertung: KlasseAnwesenheitAuswertung;
}) {
  const { berichte, proTermin, top, bottom, unbekannte, inaktiveFirmen, ignorierliste } =
    auswertung;

  if (berichte === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-dark-slate-400">
          Noch kein Anwesenheitsbericht hochgeladen. Lade bei einem Termin (oben
          unter „Termine &amp; Themen“) den Teams-Anwesenheitsbericht hoch, um die
          Auswertung zu sehen.
        </p>
        <AnwesenheitIgnorierliste klasseSlug={klasseSlug} emails={ignorierliste} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Deutlicher Hinweis auf Anwesende außerhalb der Teilnehmerübersicht */}
      {unbekannte.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {unbekannte.length}{" "}
            {unbekannte.length === 1 ? "Person" : "Personen"} in den
            Teams-Terminen, die nicht in der Onlineshop-Teilnehmerübersicht
            stehen:
          </p>
          <ul className="mt-2 space-y-0.5 text-sm text-red-700">
            {unbekannte.map((u, i) => (
              <li key={i}>
                {u.name}
                {" – "}
                <span className="font-mono text-xs">
                  {u.email || "keine E-Mail im Bericht"}
                </span>
                {" · "}
                {u.termine === 1 ? "1 Termin" : `${u.termine} Termine`}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-red-600">
            Möglicherweise wurde der Meeting-Link intern oder extern
            weitergegeben. Details stehen beim jeweiligen Termin. Bekannte
            Personen (gleiche Person, andere Adresse) werden über den Namen
            automatisch zugeordnet; Moderatoren/Sponsoren gehören auf die
            Ignorierliste unten.
          </p>
        </div>
      )}

      {/* Inaktive Firmen/Partner: Teilnahmequote unter 50 % */}
      {inaktiveFirmen.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-dark-slate-700 mb-2 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-amber-600" />
            Firmen mit unter 50 % Teilnahme
          </h3>
          <p className="text-xs text-dark-slate-500 mb-2">
            Teilnahmequote über alle Mitarbeiter der Firma (wahrgenommene ÷
            mögliche Termin-Teilnahmen) – zum schnellen Erkennen inaktiver
            Partner.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dark-slate-400">
                  <th className="py-1 pr-3 font-medium">Firma</th>
                  <th className="py-1 pr-3 font-medium">Teilnehmer</th>
                  <th className="py-1 pr-3 font-medium whitespace-nowrap">
                    Teilnahmen
                  </th>
                  <th className="py-1 pr-3 font-medium">Quote</th>
                  <th className="py-1 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-slate-50">
                {inaktiveFirmen.map((f) => (
                  <tr key={f.firma}>
                    <td className="py-1.5 pr-3 font-medium text-dark-slate-800">
                      {f.firma}
                    </td>
                    <td className="py-1.5 pr-3 text-dark-slate-600">
                      {f.teilnehmer}
                    </td>
                    <td className="py-1.5 pr-3 text-dark-slate-600 whitespace-nowrap">
                      {f.anwesend}/{f.moeglich}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          f.quote < 25
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {f.quote}%
                      </span>
                    </td>
                    <td className="py-1.5 whitespace-nowrap">
                      <FirmenErinnerungButton
                        klasseId={klasseId}
                        klasseName={klasseName}
                        berichte={berichte}
                        firma={f}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Anwesenheit pro Termin */}
      <div>
        <h3 className="text-sm font-semibold text-dark-slate-700 mb-2">
          Anwesenheit pro Termin ({berichte}{" "}
          {berichte === 1 ? "Bericht" : "Berichte"})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dark-slate-400">
                <th className="py-1 pr-3 font-medium">Termin</th>
                <th className="py-1 pr-3 font-medium">Thema</th>
                <th className="py-1 pr-3 font-medium">Anwesende</th>
                <th className="py-1 pr-3 font-medium">registriert</th>
                <th className="py-1 pr-3 font-medium">nicht registriert</th>
                <th className="py-1 font-medium">ignoriert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-slate-50">
              {proTermin.map((t) => (
                <tr key={t.terminId}>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-dark-slate-800">
                    {formatTermin(t.datum)}
                  </td>
                  <td className="py-1.5 pr-3 text-dark-slate-600">
                    {t.thema ?? <span className="italic text-dark-slate-400">–</span>}
                  </td>
                  <td className="py-1.5 pr-3 font-semibold text-dark-slate-800">
                    {t.gesamt}
                  </td>
                  <td className="py-1.5 pr-3 text-green-700">{t.registriert}</td>
                  <td className="py-1.5 pr-3">
                    {t.unbekannt.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        {t.unbekannt.length}
                      </span>
                    ) : (
                      <span className="text-dark-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-1.5 text-dark-slate-500">{t.ignoriert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rangliste */}
      <div className="grid lg:grid-cols-2 gap-6">
        <RankingTable eintraege={top} berichte={berichte} variante="top" />
        <RankingTable eintraege={bottom} berichte={berichte} variante="bottom" />
      </div>

      <AnwesenheitIgnorierliste klasseSlug={klasseSlug} emails={ignorierliste} />
    </div>
  );
}
