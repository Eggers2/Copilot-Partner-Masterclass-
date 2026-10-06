"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save, UsersRound } from "lucide-react";
import {
  setTeamsAllgemeinGroupIdAction,
  starteBestandsaufnahmeAllgemeinAction,
} from "@/app/admin/actions";

/**
 * Klassenübergreifendes Teams-Team: Group-ID pflegen und den Bestand einmalig
 * aufnehmen. Neue Teilnehmer kommen automatisch dazu (siehe
 * lib/teams/dispatchTeamsGuest.ts).
 */
export function TeamsAllgemeinCard({
  initialGroupId,
  graphConfigured,
  offenAdressen,
  aufgenommenAdressen,
  laeuft,
}: {
  initialGroupId: string;
  graphConfigured: boolean;
  offenAdressen: number;
  aufgenommenAdressen: number;
  laeuft: boolean;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(initialGroupId);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isPending, start] = useTransition();
  const aktiv = !!initialGroupId;

  function handleSave() {
    setMsg(null);
    start(async () => {
      const res = await setTeamsAllgemeinGroupIdAction(groupId);
      if (res.ok) {
        setMsg({
          kind: "ok",
          text: groupId.trim()
            ? "Group-ID gespeichert."
            : "Group-ID entfernt, die Aufnahme ins allgemeine Team ist abgeschaltet.",
        });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: res.error ?? "Speichern fehlgeschlagen." });
      }
    });
  }

  function handleBestand() {
    if (
      !confirm(
        `${offenAdressen} Teilnehmer jetzt ins allgemeine Teams-Team aufnehmen? ` +
          "Es geht keine Mail raus. Das läuft einige Minuten im Hintergrund."
      )
    ) {
      return;
    }
    setMsg(null);
    start(async () => {
      const res = await starteBestandsaufnahmeAllgemeinAction();
      if (res.ok) {
        setMsg({
          kind: "ok",
          text:
            res.adressen === 0
              ? "Alle Teilnehmer sind bereits im allgemeinen Team."
              : `Aufnahme von ${res.adressen} Adressen gestartet. Seite in ein paar Minuten neu laden, um den Stand zu sehen.`,
        });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <div className="mb-6 bg-white rounded-2xl border border-dark-slate-100 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#030386]/10 flex items-center justify-center shrink-0">
          <UsersRound className="w-5 h-5 text-[#030386]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-dark-slate-900">Allgemeines Teams-Team</p>
          <p className="text-sm text-dark-slate-500">
            Jeder Teilnehmer kommt zusätzlich zum Team seiner Klasse in dieses Team. Ohne
            Microsoft-Einladungsmail, das Team erscheint einfach in Teams. Leeres Feld schaltet
            die Aufnahme ab.
          </p>

          <div className="flex gap-2 mt-3 flex-wrap">
            <input
              type="text"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              placeholder="Group-ID (GUID) des Teams"
              className="flex-1 min-w-[16rem] px-3 py-2 border border-dark-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#030386]/30"
            />
            <button
              onClick={handleSave}
              disabled={isPending || groupId.trim() === initialGroupId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-dark-slate-200 text-dark-slate-700 hover:bg-dark-slate-50 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              Speichern
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
            <p className="text-sm text-dark-slate-600">
              <span className="font-semibold text-dark-slate-900">{aufgenommenAdressen}</span>{" "}
              aufgenommen ·{" "}
              <span className="font-semibold text-dark-slate-900">{offenAdressen}</span> offen
              {laeuft && <span className="ml-2 text-amber-600">· Aufnahme läuft …</span>}
            </p>
            <button
              onClick={handleBestand}
              disabled={isPending || laeuft || !aktiv || !graphConfigured || offenAdressen === 0}
              title={
                !graphConfigured
                  ? "Microsoft Graph ist nicht konfiguriert (MS_GRAPH_*)"
                  : !aktiv
                    ? "Keine Group-ID hinterlegt"
                    : ""
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${laeuft ? "animate-spin" : ""}`} />
              Bestand ins allgemeine Team aufnehmen
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <p className={`text-sm mt-3 ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
