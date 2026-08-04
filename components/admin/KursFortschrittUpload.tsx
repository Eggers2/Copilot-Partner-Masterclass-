"use client";

import { useRef, useState, useTransition } from "react";
import { MonitorPlay, Trash2, Upload } from "lucide-react";
import {
  deleteKursFortschrittAction,
  uploadKursFortschrittAction,
} from "@/app/admin/actions";
import { decodeAnwesenheitsdatei } from "@/lib/termine/anwesenheit";

/**
 * Upload des ablefy-Videokurs-Exports ("export course_sessions") mit dem
 * Fortschritt je Teilnehmer (Anteil gesehener Videos, 0–100 %). Der
 * Datenstand ist global – ein Videokurs für alle Klassen – und wird beim
 * Upload komplett ersetzt.
 */
export function KursFortschrittUpload({
  klasseId,
  info,
  zugeordnet,
  teilnehmerGesamt,
}: {
  klasseId: string;
  /** Metadaten des letzten Imports; null = noch kein Export hochgeladen. */
  info: { dateiname: string; importiertAmText: string; eintraege: number } | null;
  /** Kurs-Einträge, die Teilnehmern dieser Klasse zugeordnet werden konnten. */
  zugeordnet: number;
  teilnehmerGesamt: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      // Byte-genau lesen und die Kodierung selbst erkennen (UTF-8, nach
      // manuellem Re-Export aus Excel auch UTF-16).
      const buffer = await file.arrayBuffer();
      const text = decodeAnwesenheitsdatei(buffer);
      const res = await uploadKursFortschrittAction(klasseId, text, file.name);
      if (res.error) {
        setMsg({ kind: "err", text: res.error });
      } else {
        setMsg({
          kind: "ok",
          text: `${res.eintraege} Kurs-Einträge importiert · ${res.zugeordnet} Teilnehmern dieser Klasse zugeordnet.`,
        });
      }
    } catch {
      setMsg({ kind: "err", text: "Datei konnte nicht gelesen werden." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleDelete() {
    if (
      !confirm(
        "Videokurs-Datenstand wirklich entfernen? Das wirkt auf alle Klassen."
      )
    )
      return;
    setMsg(null);
    startTransition(async () => {
      const res = await deleteKursFortschrittAction(klasseId);
      if (res.error) setMsg({ kind: "err", text: res.error });
    });
  }

  return (
    <div className="rounded-lg border border-dark-slate-200 bg-dark-slate-50/40 p-3 space-y-2">
      <h3 className="text-sm font-semibold text-dark-slate-700 flex items-center gap-1.5">
        <MonitorPlay className="w-4 h-4" />
        Videokurs-Fortschritt (ablefy-Export)
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading
            ? "Wird importiert…"
            : info
              ? "Export ersetzen"
              : "Kurs-Export hochladen"}
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>
        {info && (
          <>
            <span className="text-xs text-dark-slate-500">
              {info.dateiname} · importiert am {info.importiertAmText} ·{" "}
              {info.eintraege} Einträge · {zugeordnet}/{teilnehmerGesamt}{" "}
              Teilnehmern dieser Klasse zugeordnet
            </span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="p-1.5 text-dark-slate-400 hover:text-red-600 rounded disabled:opacity-50"
              title="Videokurs-Datenstand entfernen (alle Klassen)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-dark-slate-500">
        CSV-Export der Kurs-Teilnehmer aus ablefy (Spalte FORTSCHRITT = Anteil
        gesehener Videos). Der Stand gilt für alle Klassen und wird beim Upload
        komplett ersetzt – einfach regelmäßig den aktuellen Export hochladen.
        Teilnehmer ohne Eintrag im Export werden als „ohne Kurs-Daten“ geführt.
      </p>

      {msg && (
        <p className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
