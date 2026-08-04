"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  deleteUmfrageRundeAction,
  syncUmfrageRundenAction,
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
 * Runden-Tabelle der Stand-Abfrage auf der Klasse-Detailseite: Status, Versand,
 * Rücklauf, rotierender Inhalt (editierbar bis zum Versand), Klassen-Link für
 * den QR-Code und Link in die Auswertung.
 */
export function UmfrageRunden({
  klasseSlug,
  empfaengerGesamt,
  runden,
}: {
  klasseSlug: string;
  empfaengerGesamt: number;
  runden: UmfrageRundeView[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meldungen, setMeldungen] = useState<string[] | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await syncUmfrageRundenAction();
              setMeldungen(res.meldungen ?? (res.error ? [res.error] : []));
              router.refresh();
            })
          }
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          Runden jetzt prüfen
        </button>
        <span className="text-xs text-dark-slate-500">
          Prüft alle Klassen sofort (ohne auf den Cron um 08:00 zu warten). Der
          Mail-Versand läuft weiterhin über den Cron.
        </span>
      </div>

      {meldungen && meldungen.length > 0 && (
        <ul className="rounded-lg border border-dark-slate-200 bg-dark-slate-50/50 px-3 py-2 text-xs text-dark-slate-600 space-y-0.5">
          {meldungen.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}

      {runden.length === 0 ? (
        <p className="text-sm text-dark-slate-400">
          Noch keine Runde. Die erste Runde entsteht am ersten Werktag des Monats,
          nachdem ein Termin durchgeführt wurde.
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
