"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, DoorOpen, DoorClosed, CalendarClock } from "lucide-react";
import { setConnectDayOeffnungAction } from "@/app/admin/connect-day/actions";

/**
 * Admin-Steuerung: Anmeldung wieder öffnen (Status OPEN) bzw. schließen. Beim
 * Öffnen kann ein neuer Anmeldeschluss gesetzt werden – zwingend, wenn die
 * bisherige Frist abgelaufen ist (sonst greift `deadline_passed` weiter).
 */
export function ConnectDayOeffnung({
  status,
  anmeldeschlussLabel,
  deadlinePassed,
  defaultDeadlineLocal,
}: {
  status: string;
  anmeldeschlussLabel: string;
  deadlinePassed: boolean;
  /** Vorbefüllung fürs datetime-local-Feld (YYYY-MM-DDTHH:mm, Berlin). */
  defaultDeadlineLocal: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deadline, setDeadline] = useState(defaultDeadlineLocal);
  const [error, setError] = useState<string | null>(null);

  const isOpen = status === "OPEN";
  // Auch bei Status OPEN ist die Anmeldung faktisch zu, wenn die Frist vorbei
  // ist – dann muss beim Öffnen ein neuer Anmeldeschluss mit.
  const effektivOffen = isOpen && !deadlinePassed;

  const oeffnen = () => {
    setError(null);
    if (deadlinePassed && !deadline) {
      setError("Bitte einen neuen Anmeldeschluss wählen.");
      return;
    }
    startTransition(async () => {
      const res = await setConnectDayOeffnungAction({
        open: true,
        anmeldeschluss: deadline || undefined,
      });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  const schliessen = () => {
    setError(null);
    startTransition(async () => {
      const res = await setConnectDayOeffnungAction({ open: false });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div
      className={`rounded-2xl border shadow-sm p-4 ${
        effektivOffen
          ? "bg-green-50 border-green-200"
          : "bg-white border-dark-slate-100"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        {effektivOffen ? (
          <DoorOpen className="w-5 h-5 text-green-600 mt-0.5" />
        ) : (
          <DoorClosed className="w-5 h-5 text-dark-slate-400 mt-0.5" />
        )}
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-semibold text-dark-slate-900">
            {effektivOffen
              ? "Anmeldung ist offen"
              : "Anmeldung ist geschlossen"}
          </p>
          <p className="text-xs text-dark-slate-500 mt-0.5">
            Status: <span className="font-medium">{status}</span> ·
            Anmeldeschluss: {anmeldeschlussLabel}
            {deadlinePassed && (
              <span className="text-red-600 font-medium"> (abgelaufen)</span>
            )}
          </p>
        </div>

        {effektivOffen ? (
          <button
            onClick={schliessen}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-dark-slate-700 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DoorClosed className="w-4 h-4" />
            )}
            Anmeldung schließen
          </button>
        ) : null}
      </div>

      {!effektivOffen && (
        <div className="mt-3 pt-3 border-t border-dark-slate-100 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-dark-slate-600 mb-1">
              <CalendarClock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
              Neuer Anmeldeschluss
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="rounded-lg border border-dark-slate-200 px-3 py-2 text-sm text-dark-slate-900 focus:border-[#030386] focus:outline-none"
            />
          </div>
          <button
            onClick={oeffnen}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#030386] rounded-lg hover:bg-[#02026a] disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <DoorOpen className="w-4 h-4" />
            )}
            Anmeldung wieder öffnen
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
