"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket, TimerOff } from "lucide-react";
import { setConnectDayFreischaltungAction } from "@/app/admin/connect-day/actions";

/**
 * Admin-Schalter: öffnet die Kundenportal-Anmeldung vor dem offiziellen
 * Anmeldestart (Testmodus) bzw. sperrt sie wieder bis zum Anmeldestart.
 */
export function ConnectDayFreischaltung({
  manuellFreigeschaltet,
  anmeldestartLabel,
  startErreicht,
}: {
  manuellFreigeschaltet: boolean;
  anmeldestartLabel: string;
  startErreicht: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState(manuellFreigeschaltet);

  const toggle = (value: boolean) => {
    setChecked(value);
    startTransition(async () => {
      await setConnectDayFreischaltungAction(value);
      router.refresh();
    });
  };

  // Nach dem Anmeldestart hat der Schalter keine Wirkung mehr – nur Info zeigen.
  if (startErreicht) {
    return (
      <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-4 flex items-center gap-3">
        <Rocket className="w-5 h-5 text-green-600" />
        <p className="text-sm text-dark-slate-600">
          Anmeldestart ({anmeldestartLabel}) erreicht – die Anmeldung im
          Kundenportal ist regulär offen.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border shadow-sm p-4 flex flex-wrap items-center gap-3 ${
        checked
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-dark-slate-100"
      }`}
    >
      <TimerOff className={`w-5 h-5 ${checked ? "text-amber-600" : "text-dark-slate-400"}`} />
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-semibold text-dark-slate-900">
          Anmeldung im Kundenportal ist bis zum {anmeldestartLabel} gesperrt
        </p>
        <p className="text-xs text-dark-slate-500 mt-0.5">
          {checked
            ? "Manuell freigeschaltet (Testmodus) – Partner können sich JETZT schon anmelden!"
            : "Mit dem Schalter kannst du sie vorab manuell freischalten, solange du testest."}
        </p>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-dark-slate-400" />
        ) : (
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => toggle(e.target.checked)}
            className="w-4 h-4 rounded"
          />
        )}
        <span className="text-sm font-medium text-dark-slate-700">
          Manuell freischalten
        </span>
      </label>
    </div>
  );
}
