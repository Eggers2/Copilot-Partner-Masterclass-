"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Plus, Send, Trash2 } from "lucide-react";
import {
  deleteUmfrageRundeAction,
  sendeUmfrageEinladungenAction,
  starteUmfrageRundeAction,
  updateRundeInhaltAction,
} from "@/app/admin/actions";

export interface UmfrageRundeView {
  id: string;
  nummer: number;
  status: "OFFEN" | "ABGESCHLOSSEN";
  stichtag: string; // ISO
  programmtag: number;
  jahreszeit: "NORMAL" | "FERIENFENSTER" | "JAHRESWECHSEL";
  rotierenderInhalt: string;
  versandAm: string | null; // ISO
  erinnerungAm: string | null; // ISO
  antworten: number;
  klassenLink: string;
}

const JAHRESZEIT_LABEL: Record<UmfrageRundeView["jahreszeit"], string> = {
  NORMAL: "Normal",
  FERIENFENSTER: "Ferienfenster",
  JAHRESWECHSEL: "Jahreswechsel",
};

function formatTag(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function CopyButton({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Zwischenablage nicht verfügbar (http) – Link steht als title bereit.
        }
      }}
      className="p-1.5 text-dark-slate-400 hover:text-[#030386] rounded"
    >
      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function InhaltZelle({ runde }: { runde: UmfrageRundeView }) {
  const [editing, setEditing] = useState(false);
  const [wert, setWert] = useState(runde.rotierenderInhalt);
  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const editierbar = !runde.versandAm;

  if (!editing) {
    return (
      <div className="flex items-start gap-1">
        <span className="text-xs text-dark-slate-600">{runde.rotierenderInhalt}</span>
        {editierbar && (
          <button
            type="button"
            title="Rotierenden Inhalt anpassen (bis zum Versand)"
            onClick={() => setEditing(true)}
            className="p-1 text-dark-slate-400 hover:text-[#030386] rounded shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <textarea
        value={wert}
        onChange={(e) => setWert(e.target.value)}
        rows={2}
        className="w-full px-2 py-1 text-xs border border-dark-slate-200 rounded focus:border-[#030386] focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateRundeInhaltAction(runde.id, wert);
              if (res.error) setFehler(res.error);
              else setEditing(false);
            })
          }
          className="text-xs font-semibold text-[#030386] hover:underline disabled:opacity-50"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={() => {
            setWert(runde.rotierenderInhalt);
            setEditing(false);
            setFehler(null);
          }}
          className="text-xs text-dark-slate-500 hover:underline"
        >
          Abbrechen
        </button>
      </div>
      {fehler && <p className="text-xs text-red-600">{fehler}</p>}
    </div>
  );
}

/**
 * Runden-Tabelle der Stand-Abfrage auf der Klasse-Detailseite. Ablauf ist
 * manuell: Runde starten, bei Bedarf die rotierende Frage anpassen, dann
 * Einladungen senden. Die Erinnerung nach 4 Tagen übernimmt der Cron.
 */
export function UmfrageRunden({
  klasseId,
  klasseSlug,
  empfaengerGesamt,
  runden,
}: {
  klasseId: string;
  klasseSlug: string;
  empfaengerGesamt: number;
  runden: UmfrageRundeView[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meldung, setMeldung] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function starteRunde() {
    startTransition(async () => {
      let res = await starteUmfrageRundeAction(klasseId);
      if (res.brauchtBestaetigung && res.error) {
        if (!confirm(res.error)) return;
        res = await starteUmfrageRundeAction(klasseId, true);
      }
      if (res.error) {
        setMeldung({ kind: "err", text: res.error });
      } else {
        setMeldung({
          kind: "ok",
          text: `Runde ${res.nummer} ist angelegt. Passe bei Bedarf die rotierende Frage an und sende dann die Einladungen.`,
        });
      }
      router.refresh();
    });
  }

  function sendeEinladungen(runde: UmfrageRundeView) {
    if (
      !confirm(
        `Einladungen für Runde ${runde.nummer} jetzt an ${empfaengerGesamt} belegte Plätze senden?`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await sendeUmfrageEinladungenAction(runde.id);
      if (res.error) {
        setMeldung({ kind: "err", text: res.error });
      } else {
        setMeldung({
          kind: "ok",
          text: `Einladungen gesendet: ${res.gesendet} von ${res.empfaenger}${
            res.fehler ? `, ${res.fehler} Fehler (siehe E-Mail-Log)` : ""
          }.`,
        });
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={starteRunde}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Neue Runde starten
        </button>
        <span className="text-xs text-dark-slate-500">
          Legt die Runde nur an, es wird noch nichts versendet. Die vorherige Runde
          wird dabei abgeschlossen (alte Links verfallen).
        </span>
      </div>

      {meldung && (
        <p
          className={`rounded-lg border px-3 py-2 text-xs ${
            meldung.kind === "ok"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {meldung.text}
        </p>
      )}

      {runden.length === 0 ? (
        <p className="text-sm text-dark-slate-400">
          Noch keine Runde. Starte die erste Runde über den Button oben.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-dark-slate-500 border-b border-dark-slate-100">
                <th className="py-2 pr-3 font-medium">Runde</th>
                <th className="py-2 pr-3 font-medium">Stichtag</th>
                <th className="py-2 pr-3 font-medium">Programmtag</th>
                <th className="py-2 pr-3 font-medium">Jahreszeit</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Versand / Erinnerung</th>
                <th className="py-2 pr-3 font-medium">Antworten</th>
                <th className="py-2 pr-3 font-medium">Rotierende Frage (Inhalt)</th>
                <th className="py-2 font-medium">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-slate-50">
              {runden.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="py-2 pr-3 font-semibold text-dark-slate-900">{r.nummer}</td>
                  <td className="py-2 pr-3 text-dark-slate-600">{formatTag(r.stichtag)}</td>
                  <td className="py-2 pr-3 text-dark-slate-600">Tag {r.programmtag}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.jahreszeit === "NORMAL"
                          ? "bg-dark-slate-100 text-dark-slate-600"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {JAHRESZEIT_LABEL[r.jahreszeit]}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === "OFFEN"
                          ? "bg-green-100 text-green-700"
                          : "bg-dark-slate-100 text-dark-slate-600"
                      }`}
                    >
                      {r.status === "OFFEN" ? "Offen" : "Abgeschlossen"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-xs text-dark-slate-600">
                    {formatTag(r.versandAm)} / {formatTag(r.erinnerungAm)}
                  </td>
                  <td className="py-2 pr-3 text-dark-slate-600 whitespace-nowrap">
                    {r.antworten} von {empfaengerGesamt}
                  </td>
                  <td className="py-2 pr-3 max-w-xs">
                    <InhaltZelle runde={r} />
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      {r.status === "OFFEN" && !r.versandAm && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => sendeEinladungen(r)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Einladungen senden
                        </button>
                      )}
                      <CopyButton
                        text={r.klassenLink}
                        title="Klassen-Link kopieren (für den QR-Code auf der Folie)"
                      />
                      <Link
                        href={`/admin/umfragen/${klasseSlug}?runde=${r.nummer}`}
                        className="text-xs font-semibold text-[#030386] hover:underline"
                      >
                        Auswertung
                      </Link>
                      {r.status === "OFFEN" && !r.versandAm && r.antworten === 0 && (
                        <button
                          type="button"
                          title="Runde löschen (nur ohne Versand und ohne Antworten)"
                          disabled={isPending}
                          onClick={() => {
                            if (!confirm("Diese Runde wirklich löschen?")) return;
                            startTransition(async () => {
                              await deleteUmfrageRundeAction(r.id);
                              router.refresh();
                            });
                          }}
                          className="p-1.5 text-dark-slate-400 hover:text-red-600 rounded disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
