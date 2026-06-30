"use client";

import { useState, useTransition } from "react";
import { Download, Copy, Check } from "lucide-react";
import { getKlasseTeilnehmerEmailsAction } from "@/app/admin/actions";

export function TeilnehmerExportButton({ klasseId }: { klasseId: string }) {
  const [emails, setEmails] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const res = await getKlasseTeilnehmerEmailsAction(klasseId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setEmails(res.emails);
      setCount(res.count);
      // Direkt in die Zwischenablage legen (Best-effort).
      try {
        await navigator.clipboard.writeText(res.emails);
        setCopied(true);
      } catch {
        // Clipboard nicht verfügbar – Textarea dient als Fallback.
      }
    });
  }

  async function handleCopy() {
    if (emails == null) return;
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isPending ? "Wird geladen…" : "Teilnehmer-E-Mails exportieren"}
        </button>
        {emails != null && (
          <span className="text-sm text-dark-slate-500">
            {count} {count === 1 ? "Adresse" : "Adressen"}
          </span>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {emails != null && (
        <div className="space-y-2">
          <textarea
            readOnly
            value={emails}
            rows={4}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="Keine Teilnehmer mit E-Mail in dieser Klasse."
            className="w-full px-3 py-2 text-sm font-mono border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-y"
          />
          <button
            onClick={handleCopy}
            disabled={!emails}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Kopiert!" : "In Zwischenablage kopieren"}
          </button>
        </div>
      )}
    </div>
  );
}
