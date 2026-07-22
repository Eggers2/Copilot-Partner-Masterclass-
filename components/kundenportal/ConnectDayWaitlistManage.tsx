"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ClipboardList, CheckCircle2, X } from "lucide-react";
import { leaveWaitlistAction } from "@/app/kundenportal/connect-day/actions";

export interface WaitlistEntry {
  id: string;
  firma: string;
  personen: number;
  status: string;
}

/**
 * Zeigt die eigenen Wartelisten-Einträge im Kundenportal an. WAITING kann der
 * Partner selbst wieder austragen; PROMOTED (nachgerückt) bleibt stehen – der
 * Betreiber meldet sich dann persönlich.
 */
export function ConnectDayWaitlistManage({
  entries,
}: {
  entries: WaitlistEntry[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const leave = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      await leaveWaitlistAction({ waitlistId: id });
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {entries.map((e) => {
        const promoted = e.status === "PROMOTED";
        return (
          <div
            key={e.id}
            className={`rounded-2xl border shadow-sm p-5 flex flex-wrap items-center gap-3 ${
              promoted
                ? "bg-ice border-green/40"
                : "bg-white border-cool"
            }`}
          >
            {promoted ? (
              <CheckCircle2 className="w-5 h-5 text-green flex-shrink-0" />
            ) : (
              <ClipboardList className="w-5 h-5 text-gray flex-shrink-0" />
            )}
            <div className="flex-1 min-w-[220px]">
              <p className="text-sm font-semibold text-slate">
                {promoted
                  ? "Du bist nachgerückt!"
                  : "Du stehst auf der Warteliste"}
              </p>
              <p className="text-xs text-gray mt-0.5">
                {e.firma} · {e.personen}{" "}
                {e.personen === 1 ? "Platz" : "Plätze"} ·{" "}
                {promoted
                  ? "Wir melden uns bei dir, um die Anmeldung abzuschließen."
                  : "Sobald ein Platz frei wird, melden wir uns bei dir."}
              </p>
            </div>
            {!promoted && (
              <button
                type="button"
                onClick={() => leave(e.id)}
                disabled={isPending && busyId === e.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {isPending && busyId === e.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Austragen
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
