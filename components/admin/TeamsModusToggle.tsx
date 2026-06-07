"use client";

import { useState, useTransition } from "react";
import { Power, Users } from "lucide-react";
import { setTeamsAufnahmeModusAction } from "@/app/admin/actions";
import type { TeamsAufnahmeModus } from "@/lib/db/appSettings";

/**
 * Laufzeit-Schalter für die Teams-Aufnahme – analog zum Resend/n8n-Toggle bei
 * den E-Mails. Default ist n8n; „Nativ" ist nur aktivierbar, wenn Microsoft
 * Graph konfiguriert ist.
 */
export function TeamsModusToggle({
  initialModus,
  graphConfigured,
}: {
  initialModus: TeamsAufnahmeModus;
  graphConfigured: boolean;
}) {
  const [modus, setModus] = useState<TeamsAufnahmeModus>(initialModus);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isPending, start] = useTransition();
  const nativ = modus === "nativ";

  function handleToggle() {
    setMsg(null);
    const next: TeamsAufnahmeModus = nativ ? "n8n" : "nativ";
    start(async () => {
      const res = await setTeamsAufnahmeModusAction(next);
      if (res.ok) {
        setModus(next);
        setMsg({
          kind: "ok",
          text:
            next === "nativ"
              ? "Native Aufnahme aktiv – Teilnehmer kommen pro Klasse über Microsoft Graph ins Team."
              : "Zurück auf n8n – Aufnahme läuft wieder über den bisherigen Workflow.",
        });
      } else {
        setMsg({ kind: "err", text: res.error ?? "Umschalten fehlgeschlagen." });
      }
    });
  }

  return (
    <div className="mb-6 bg-white rounded-2xl border border-dark-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#030386]/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-[#030386]" />
          </div>
          <div>
            <p className="font-semibold text-dark-slate-900">Teams-Aufnahme</p>
            <p className="text-sm text-dark-slate-500">
              Steuert, wie neue Teilnehmer in die Teams-Teams aufgenommen werden. Im
              Native-Modus entscheidet die Group-ID je Klasse über das Ziel-Team.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              nativ ? "bg-green-100 text-green-700" : "bg-dark-slate-100 text-dark-slate-500"
            }`}
          >
            {nativ ? "Nativ (App, pro Klasse)" : "n8n (Workflow)"}
          </span>
          <button
            onClick={handleToggle}
            disabled={isPending || (!nativ && !graphConfigured)}
            title={!graphConfigured ? "Microsoft Graph ist nicht konfiguriert (MS_GRAPH_*)" : ""}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-dark-slate-200 text-dark-slate-700 hover:bg-dark-slate-50 disabled:opacity-50 transition-colors"
          >
            <Power className="w-4 h-4" />
            {nativ ? "Auf n8n zurückschalten" : "Native Aufnahme aktivieren"}
          </button>
        </div>
      </div>

      {!graphConfigured && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          Microsoft Graph ist nicht konfiguriert (MS_GRAPH_TENANT_ID / MS_GRAPH_CLIENT_ID /
          MS_GRAPH_CLIENT_SECRET). Bis dahin läuft die Aufnahme über n8n.
        </div>
      )}
      {msg && (
        <p className={`text-sm mt-3 ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
