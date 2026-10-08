"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { getGeschlosseneKlassenTeilnehmerEmailsAction } from "@/app/admin/actions";

/**
 * Kopiert die Teilnehmer-E-Mails aller geschlossenen Klassen, deren Programm
 * heute läuft, semikolongetrennt in die Zwischenablage.
 */
export function GeschlosseneKlassenEmailsButton() {
  const [result, setResult] = useState<{
    emails: string;
    count: number;
    klassen: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setCopied(false);
    startTransition(async () => {
      const res = await getGeschlosseneKlassenTeilnehmerEmailsAction();
      setResult(res);
      if (!res.emails) return;
      try {
        await navigator.clipboard.writeText(res.emails);
        setCopied(true);
      } catch {
        // Clipboard nicht verfügbar: Textarea dient als Fallback.
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        title="Kopiert die Teilnehmer-E-Mails aller geschlossenen Klassen, deren Programm heute läuft."
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors disabled:opacity-50"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {isPending ? "Wird geladen…" : copied ? "Kopiert!" : "Teilnehmer-E-Mails kopieren"}
      </button>
      {result && (
        <p className="text-xs text-dark-slate-500 text-right max-w-xs">
          {result.klassen.length === 0
            ? "Keine geschlossene Klasse mit laufendem Programm."
            : `${result.count} ${result.count === 1 ? "Adresse" : "Adressen"} aus ${result.klassen.join(", ")}`}
        </p>
      )}
      {result && result.emails && !copied && (
        <textarea
          readOnly
          value={result.emails}
          rows={3}
          onFocus={(e) => e.currentTarget.select()}
          className="w-80 px-3 py-2 text-xs font-mono border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
        />
      )}
    </div>
  );
}
