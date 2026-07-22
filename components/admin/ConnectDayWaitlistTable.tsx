"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpCircle, Loader2, Trash2, Undo2, Clock } from "lucide-react";
import {
  promoteConnectDayWaitlistAction,
  unpromoteConnectDayWaitlistAction,
  removeConnectDayWaitlistAction,
} from "@/app/admin/connect-day/actions";

export interface WaitlistRow {
  id: string;
  firma: string;
  bestellNr: string;
  kontaktName: string;
  kontaktEmail: string;
  personen: number;
  notiz: string | null;
  status: string;
  promotedAm: string | null;
  erstelltAm: string;
}

/**
 * Admin-Warteliste zum Connect Day. Nachrücken ist bewusst manuell: der Button
 * markiert den Eintrag nur als nachgerückt (PROMOTED) – es wird kein Platz
 * reserviert, keine Rechnung erzeugt und keine Mail verschickt. Der Betreiber
 * kontaktiert den Partner selbst.
 */
export function ConnectDayWaitlistTable({ entries }: { entries: WaitlistRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setLoading(id);
    await fn();
    setLoading(null);
    setRemoveId(null);
    router.refresh();
  };

  const wartend = entries.filter((e) => e.status === "WAITING").length;

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm overflow-hidden mt-6">
      <div className="p-4 border-b border-dark-slate-100 flex items-center gap-2">
        <Clock className="w-4 h-4 text-dark-slate-400" />
        <p className="text-sm font-semibold text-dark-slate-900">Warteliste</p>
        <p className="text-sm text-dark-slate-500">
          {wartend} wartend
          {entries.length - wartend > 0 && ` · ${entries.length - wartend} nachgerückt`}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-dark-slate-400">
          Noch niemand auf der Warteliste. Sie füllt sich, sobald das Event
          ausgebucht ist.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-slate-50 border-b border-dark-slate-100">
                {["Firma", "Kontakt", "Plätze", "Notiz", "Status", "Eingetragen", "Aktionen"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-slate-50">
              {entries.map((e) => {
                const promoted = e.status === "PROMOTED";
                return (
                  <tr key={e.id} className="hover:bg-[#E3ECF8]/20">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-dark-slate-900">
                        {e.firma}
                      </p>
                      <p className="text-xs text-dark-slate-400">{e.bestellNr}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-600">
                      <p>{e.kontaktName}</p>
                      <p className="text-xs text-dark-slate-400">{e.kontaktEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-600">
                      {e.personen}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-500 max-w-xs whitespace-pre-wrap break-words">
                      {e.notiz || "–"}
                    </td>
                    <td className="px-4 py-3">
                      {promoted ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-50 text-green-700 border-green-200"
                          title={
                            e.promotedAm
                              ? `nachgerückt am ${new Date(e.promotedAm).toLocaleString("de-DE")}`
                              : undefined
                          }
                        >
                          Nachgerückt
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                          Wartet
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-400">
                      {new Date(e.erstelltAm).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {promoted ? (
                          <button
                            onClick={() =>
                              run(e.id, () => unpromoteConnectDayWaitlistAction(e.id))
                            }
                            disabled={loading === e.id}
                            className="p-1.5 rounded text-dark-slate-500 hover:bg-dark-slate-50 disabled:opacity-30"
                            title="Nachrücken zurücknehmen"
                          >
                            {loading === e.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Undo2 className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              run(e.id, () => promoteConnectDayWaitlistAction(e.id))
                            }
                            disabled={loading === e.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#030386] bg-[#E3ECF8]/60 border border-[#030386]/20 rounded-lg hover:bg-[#E3ECF8] disabled:opacity-50"
                            title="Als nachgerückt markieren (Partner selbst kontaktieren)"
                          >
                            {loading === e.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ArrowUpCircle className="w-3 h-3" />
                            )}
                            Nachrücken
                          </button>
                        )}

                        {removeId === e.id ? (
                          <span className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                run(e.id, () => removeConnectDayWaitlistAction(e.id))
                              }
                              disabled={loading === e.id}
                              className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Sicher?
                            </button>
                            <button
                              onClick={() => setRemoveId(null)}
                              className="px-2 py-1 text-xs text-dark-slate-500 hover:text-dark-slate-900"
                            >
                              Nein
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setRemoveId(e.id)}
                            disabled={loading === e.id}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 disabled:opacity-30"
                            title="Eintrag entfernen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
