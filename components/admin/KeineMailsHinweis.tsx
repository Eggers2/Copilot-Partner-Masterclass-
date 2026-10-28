"use client";

import { useTransition } from "react";
import { MailX } from "lucide-react";
import { clearKeineMailsAction, setKeineMailsAction } from "@/app/admin/actions";
import { formatBerlinDateTime } from "@/lib/datetime";

// Feld "Keine E-Mails" am Lead: gesetzt als deutlicher roter Hinweis, damit
// niemand versehentlich manuell eine Mail schickt. Sonst nur ein kleiner
// Schalter zum Setzen.

export function KeineMailsHinweis({
  leadId,
  keineMailsAm,
  keineMailsGrund,
}: {
  leadId: string;
  keineMailsAm: string | null;
  keineMailsGrund: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (!keineMailsAm) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Lead als „Keine E-Mails“ markieren? Automatische Mails werden dann gestoppt.")) return;
            startTransition(() => setKeineMailsAction(leadId));
          }}
          className="inline-flex items-center gap-1.5 text-xs text-dark-slate-500 hover:text-red-700 disabled:opacity-50"
        >
          <MailX className="w-3.5 h-3.5" />
          Als „Keine E-Mails“ markieren
        </button>
      </div>
    );
  }

  return (
    <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4 flex items-start gap-3">
      <MailX className="w-6 h-6 text-red-700 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-base font-bold text-red-800 m-0">Keine E-Mails an diesen Lead</p>
        <p className="text-sm text-red-800/90 mt-1 mb-0">
          {keineMailsGrund ?? "Ohne Angabe"} · seit {formatBerlinDateTime(keineMailsAm)}
        </p>
        <p className="text-xs text-red-800/70 mt-1 mb-0">
          Automatische Mails sind gesperrt. Bitte auch keine manuellen Mails schicken.
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Markierung „Keine E-Mails“ wirklich entfernen? Nur tun, wenn der Lead ausdrücklich wieder Mails möchte.")) return;
          startTransition(() => clearKeineMailsAction(leadId));
        }}
        className="text-xs text-red-800 underline hover:text-red-900 disabled:opacity-50 whitespace-nowrap"
      >
        Markierung entfernen
      </button>
    </div>
  );
}
