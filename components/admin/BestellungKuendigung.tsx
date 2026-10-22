"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Ban, RotateCcw } from "lucide-react";
import {
  kuendigungZuruecknehmenAction,
  setBestellungKuendigungAction,
} from "@/app/admin/actions";
import { formatCalendarDate } from "@/lib/datetime";

const inputClass =
  "w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none disabled:opacity-50 bg-white text-dark-slate-900";

const labelClass = "block text-xs font-medium text-dark-slate-600 mb-1";

/**
 * Kündigung des Systemhauses vermerken. Eine vermerkte Kündigung schließt die
 * automatische Verlängerung aus (lib/orders/vertrag.ts).
 */
export function BestellungKuendigung({
  bestellungId,
  gekuendigtAm,
  kuendigungZum,
  kuendigungNotiz,
  heute,
  vertragsendeVorschlag,
}: {
  bestellungId: number;
  /** Kalendertage als "YYYY-MM-DD", null = ungekündigt */
  gekuendigtAm: string | null;
  kuendigungZum: string | null;
  kuendigungNotiz: string | null;
  heute: string;
  /** Ende der Mindestlaufzeit ab Kickoff der Klasse, nur als Vorbelegung */
  vertragsendeVorschlag: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [eingang, setEingang] = useState(gekuendigtAm ?? heute);
  const [zum, setZum] = useState(kuendigungZum ?? vertragsendeVorschlag ?? "");
  const [notiz, setNotiz] = useState(kuendigungNotiz ?? "");

  const gekuendigt = gekuendigtAm != null;

  const speichern = () => {
    setError(null);
    startTransition(async () => {
      const result = await setBestellungKuendigungAction(bestellungId, {
        gekuendigtAm: eingang,
        kuendigungZum: zum,
        notiz,
      });
      if (result.error) setError(result.error);
      else setBearbeiten(false);
    });
  };

  const zuruecknehmen = () => {
    if (!confirm("Kündigung zurücknehmen? Der Vertrag verlängert sich dann wieder automatisch.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await kuendigungZuruecknehmenAction(bestellungId);
      if (result.error) setError(result.error);
      else {
        setEingang(heute);
        setZum(vertragsendeVorschlag ?? "");
        setNotiz("");
      }
    });
  };

  return (
    <section
      className={`mb-6 rounded-2xl border shadow-sm p-6 ${
        gekuendigt ? "bg-red-50 border-red-200" : "bg-white border-dark-slate-100"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-dark-slate-900 flex items-center gap-2">
            Vertrag &amp; Kündigung
            {gekuendigt ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <Ban className="w-3 h-3" />
                Gekündigt
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                Läuft, verlängert sich automatisch
              </span>
            )}
          </h2>
          {gekuendigt ? (
            <p className="text-sm text-red-800 mt-1">
              Kündigung eingegangen am {formatCalendarDate(gekuendigtAm)}, Vertrag endet zum{" "}
              <strong>{formatCalendarDate(kuendigungZum)}</strong>. Eine automatische
              Verlängerung findet nicht statt.
              {kuendigungNotiz && (
                <span className="block text-xs text-red-700 mt-1 whitespace-pre-line">
                  {kuendigungNotiz}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-dark-slate-500 mt-1">
              Kündigt das Systemhaus, hier vermerken. Der Vertrag verlängert sich dann
              nicht automatisch.
            </p>
          )}
        </div>
        {!bearbeiten && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setBearbeiten(true)}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <Ban className="w-4 h-4" />
              {gekuendigt ? "Kündigung ändern" : "Kündigung vermerken"}
            </button>
            {gekuendigt && (
              <button
                type="button"
                onClick={zuruecknehmen}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-dark-slate-700 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Zurücknehmen
              </button>
            )}
          </div>
        )}
      </div>

      {bearbeiten && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Kündigung eingegangen am *</label>
            <input
              type="date"
              value={eingang}
              onChange={(e) => setEingang(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Vertrag endet zum *</label>
            <input
              type="date"
              value={zum}
              onChange={(e) => setZum(e.target.value)}
              disabled={isPending}
              className={inputClass}
            />
            {vertragsendeVorschlag && !gekuendigt && (
              <p className="text-xs text-dark-slate-400 mt-1">
                Vorbelegt mit dem Ende der Mindestlaufzeit ab Kickoff der Klasse.
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Notiz (Grund, Kanal, Ansprechpartner)</label>
            <textarea
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              disabled={isPending}
              rows={2}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="button"
              onClick={speichern}
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Speichere…" : "Kündigung speichern"}
            </button>
            <button
              type="button"
              onClick={() => {
                setBearbeiten(false);
                setError(null);
              }}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-dark-slate-600 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50 disabled:opacity-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-700 mt-3">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </section>
  );
}
