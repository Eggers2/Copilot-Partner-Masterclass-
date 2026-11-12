"use client";

import { useTransition } from "react";
import { MailX, ShieldAlert } from "lucide-react";
import {
  clearKeineMailsAction,
  freigebenBotPruefungAction,
  setKeineMailsAction,
} from "@/app/admin/actions";
import { KEINE_MAILS_GRUND } from "@/lib/leads/keineMailsGruende";
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

  if (keineMailsGrund === KEINE_MAILS_GRUND.botVerdacht) {
    return (
      <div role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
        <ShieldAlert className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-base font-bold text-amber-900 m-0">Anmeldung in Prüfung: Verdacht auf Bot</p>
          <p className="text-sm text-amber-900/90 mt-1 mb-0">
            Seit {formatBerlinDateTime(keineMailsAm)}. Den Grund findest du in der Notiz. Bisher ging keine Mail raus.
          </p>
          <p className="text-xs text-amber-900/70 mt-1 mb-0">
            Freigeben verschickt die Wartelisten-Bestätigung und startet die Follow-up-Sequenz.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Anmeldung freigeben? Der Lead bekommt die Bestätigung und die Follow-up-Mails.")) return;
            startTransition(() => freigebenBotPruefungAction(leadId));
          }}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
        >
          Freigeben
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
