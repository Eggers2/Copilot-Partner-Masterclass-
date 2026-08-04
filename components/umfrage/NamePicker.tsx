"use client";

import { useState } from "react";
import UmfrageFormular from "./UmfrageFormular";

export interface NamePickerSlot {
  id: number;
  vorname: string;
  nachname: string;
  firma: string;
}

/**
 * Klassen-Weg (QR-Code auf der Folie): erst wählt der Teilnehmer seinen Platz,
 * dann folgt derselbe Fragebogen wie über den persönlichen Link. Bewusst ohne
 * Prefill vorhandener Antworten: der Klassen-Link ist für alle gleich, ein
 * Prefill würde fremde Antworten sichtbar machen.
 */
export default function NamePicker({
  token,
  klasseName,
  rotierenderInhalt,
  slots,
}: {
  token: string;
  klasseName: string;
  rotierenderInhalt: string;
  slots: NamePickerSlot[];
}) {
  const [gewaehlt, setGewaehlt] = useState<NamePickerSlot | null>(null);

  if (gewaehlt) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setGewaehlt(null)}
          className="text-sm text-gray hover:text-slate"
        >
          ← Anderen Namen wählen ({gewaehlt.vorname} {gewaehlt.nachname})
        </button>
        <UmfrageFormular
          token={token}
          teilnehmerId={gewaehlt.id}
          vorname={gewaehlt.vorname || "zusammen"}
          klasseName={klasseName}
          rotierenderInhalt={rotierenderInhalt}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray">Wer bist du? Wähle deinen Namen aus.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {slots.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setGewaehlt(s)}
            className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-green/60 transition-colors"
          >
            <span className="block text-sm font-semibold text-slate">
              {`${s.vorname} ${s.nachname}`.trim() || "Ohne Namen"}
            </span>
            <span className="block text-xs text-gray mt-0.5">{s.firma}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
