"use client";

import { STUFEN, TECH_STUFEN } from "@/lib/umfrage/fragen";

export interface ErgebnisView {
  technik: boolean;
  eigeneStufe: number;
  verteilung: number[];
  antwortenGesamt: number;
  naechsterSchrittSatz: string;
}

/**
 * Sofort-Rückgabe nach dem Absenden: eigene Stufe hervorgehoben in der
 * Klassenverteilung (CSS-Balken mit absoluten Zahlen, keine Quoten) plus der
 * Satz zum typischen ersten Schritt der nächsten Stufe.
 */
export default function ErgebnisAnzeige({
  ergebnis,
  klasseName,
}: {
  ergebnis: ErgebnisView;
  klasseName: string;
}) {
  const stufen = ergebnis.technik ? TECH_STUFEN : STUFEN;
  const max = Math.max(1, ...ergebnis.verteilung);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-green bg-green/10 px-4 py-3 text-sm text-slate font-semibold">
        Danke, deine Antwort ist gespeichert. Du kannst sie über deinen Link ändern, solange
        die Runde läuft.
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate">
          So steht die {klasseName} gerade da
        </h2>
        <p className="text-sm text-gray">
          {ergebnis.antwortenGesamt}{" "}
          {ergebnis.antwortenGesamt === 1 ? "Antwort" : "Antworten"} in dieser Runde
          {ergebnis.technik ? " auf der Technik-Leiter" : ""}. Deine Stufe ist markiert.
        </p>
        <div className="space-y-2">
          {stufen.map((s) => {
            const anzahl = ergebnis.verteilung[s.wert] ?? 0;
            const eigene = s.wert === ergebnis.eigeneStufe;
            return (
              <div
                key={s.wert}
                className={`rounded-lg border px-3 py-2 ${
                  eigene ? "border-green bg-green/10" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={eigene ? "font-bold text-slate" : "text-slate"}>
                    <span className="inline-block w-6 font-mono text-gray">{s.wert}</span>
                    {s.label}
                    {eigene ? <span className="ml-2 text-green font-bold">← du</span> : null}
                  </span>
                  <span className="font-mono text-gray shrink-0">{anzahl}</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100 overflow-hidden">
                  <div
                    className={`h-2 rounded ${eigene ? "bg-green" : "bg-slate-300"}`}
                    style={{ width: `${(anzahl / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-sm text-slate leading-relaxed">{ergebnis.naechsterSchrittSatz}</p>
      </section>
    </div>
  );
}
