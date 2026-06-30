"use client";

import { useEffect, useState, useActionState, useTransition } from "react";
import { Plus, Pencil, Trash2, Save, CheckCircle2, Circle } from "lucide-react";
import type { TerminStatus } from "@prisma/client";
import {
  createTerminAction,
  updateTerminAction,
  setTerminStatusAction,
  deleteTerminAction,
} from "@/app/admin/actions";

export interface TerminView {
  id: string;
  datum: string; // ISO
  thema: string | null;
  notizen: string | null;
  status: TerminStatus;
}

const inputClass =
  "w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none";
const labelClass = "block text-sm font-medium text-dark-slate-600 mb-1";

/** ISO-Datum → "YYYY-MM-DDTHH:mm" in Europe/Berlin (für datetime-local). */
function toInputDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function formatDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TerminForm({
  klasseId,
  initial,
  onDone,
}: {
  klasseId: string;
  initial?: TerminView;
  onDone: () => void;
}) {
  const mode = initial ? "edit" : "create";
  const action = mode === "create" ? createTerminAction : updateTerminAction;
  const [state, formAction, isPending] = useActionState(action, null);

  // Bei Erfolg schließt sich das Formular; revalidatePath in der Action hat die
  // Liste der Termine bereits serverseitig aktualisiert.
  useEffect(() => {
    if (state?.success) onDone();
  }, [state?.success, onDone]);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-dark-slate-200 bg-dark-slate-50/50 p-4 space-y-3"
    >
      <input type="hidden" name="klasseId" value={klasseId} />
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Datum & Uhrzeit *</label>
          <input
            name="datum"
            type="datetime-local"
            required
            defaultValue={initial ? toInputDateTime(initial.datum) : ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            name="status"
            defaultValue={initial?.status ?? "GEPLANT"}
            className={inputClass}
          >
            <option value="GEPLANT">Geplant</option>
            <option value="DURCHGEFUEHRT">Durchgeführt</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Thema</label>
        <input
          name="thema"
          defaultValue={initial?.thema ?? ""}
          placeholder="z.B. Copilot in Excel – Formeln & Datenanalyse"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Notizen</label>
        <textarea
          name="notizen"
          rows={2}
          defaultValue={initial?.notizen ?? ""}
          placeholder="Optionale Notiz zum Termin…"
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {mode === "create" ? "Termin anlegen" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-2 text-sm font-medium text-dark-slate-500 hover:text-dark-slate-700"
        >
          Abbrechen
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && (
          <p className="text-sm text-green-600">Gespeichert! Liste wird aktualisiert…</p>
        )}
      </div>
    </form>
  );
}

function TerminRow({
  klasseId,
  termin,
}: {
  klasseId: string;
  termin: TerminView;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const done = termin.status === "DURCHGEFUEHRT";

  if (isEditing) {
    return (
      <li className="py-3">
        <TerminForm
          klasseId={klasseId}
          initial={termin}
          onDone={() => setIsEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="py-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-dark-slate-900">
            {formatDatum(termin.datum)}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              done
                ? "bg-green-100 text-green-700"
                : "bg-dark-slate-100 text-dark-slate-600"
            }`}
          >
            {done ? "Durchgeführt" : "Geplant"}
          </span>
        </div>
        <p className="text-sm text-dark-slate-700 mt-0.5">
          {termin.thema || (
            <span className="italic text-dark-slate-400">Kein Thema hinterlegt</span>
          )}
        </p>
        {termin.notizen && (
          <p className="text-xs text-dark-slate-500 mt-0.5 whitespace-pre-line">
            {termin.notizen}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          title={done ? "Als geplant markieren" : "Als durchgeführt markieren"}
          disabled={isPending}
          onClick={() =>
            startTransition(() =>
              setTerminStatusAction(
                termin.id,
                klasseId,
                done ? "GEPLANT" : "DURCHGEFUEHRT"
              )
            )
          }
          className="p-1.5 text-dark-slate-400 hover:text-green-600 rounded disabled:opacity-50"
        >
          {done ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
        <button
          title="Bearbeiten"
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-dark-slate-400 hover:text-[#030386] rounded"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          title="Löschen"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Diesen Termin wirklich löschen?")) return;
            startTransition(() => deleteTerminAction(termin.id, klasseId));
          }}
          className="p-1.5 text-dark-slate-400 hover:text-red-600 rounded disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

export function KlasseTermine({
  klasseId,
  termine,
}: {
  klasseId: string;
  termine: TerminView[];
}) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-4">
      {termine.length === 0 ? (
        <p className="text-sm text-dark-slate-400">
          Noch keine Termine angelegt. Lege den ersten Termin mit Datum und Thema an.
        </p>
      ) : (
        <ul className="divide-y divide-dark-slate-50">
          {termine.map((t) => (
            <TerminRow key={t.id} klasseId={klasseId} termin={t} />
          ))}
        </ul>
      )}

      {isAdding ? (
        <TerminForm klasseId={klasseId} onDone={() => setIsAdding(false)} />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Termin hinzufügen
        </button>
      )}
    </div>
  );
}
