"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Trash2 } from "lucide-react";
import type { KlasseStatus } from "@prisma/client";
import { createKlasseAction, updateKlasseAction } from "@/app/admin/actions";
import { KLASSE_STATUS_CONFIG } from "@/lib/constants/lead-config";
import type { TerminRegelMuster } from "@/lib/termine/regel";

const ORDINAL_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1." },
  { value: 2, label: "2." },
  { value: 3, label: "3." },
  { value: 4, label: "4." },
  { value: -1, label: "letzter" },
];
const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
  { value: 7, label: "Sonntag" },
];

const inputClass =
  "w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none";
const labelClass = "block text-sm font-medium text-dark-slate-600 mb-1";

interface KlasseValues {
  id?: string;
  name: string;
  slug: string;
  kickoffDate: string;
  startDate: string;
  endDate: string;
  capacity: number | null;
  status: KlasseStatus;
  teilnehmerSperre: boolean;
  teamsGroupId: string | null;
  description: string | null;
  curriculumStand: string | null;
  terminRegel: TerminRegelMuster[];
}

/** Editor für die Termin-Regel (n-ter Wochentag im Monat). Serialisiert nach JSON. */
function TerminRegelEditor({ initial }: { initial: TerminRegelMuster[] }) {
  const [rows, setRows] = useState<TerminRegelMuster[]>(initial);

  const update = (i: number, patch: Partial<TerminRegelMuster>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const add = () =>
    setRows((rs) => [...rs, { week: 1, weekday: 1, time: "16:00" }]);

  return (
    <div>
      <label className={labelClass}>Termin-Regel (automatische Terminerzeugung)</label>
      <input type="hidden" name="terminRegelJson" value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={r.week}
              onChange={(e) => update(i, { week: parseInt(e.target.value, 10) })}
              className={inputClass}
            >
              {ORDINAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={r.weekday}
              onChange={(e) => update(i, { weekday: parseInt(e.target.value, 10) })}
              className={inputClass}
            >
              {WEEKDAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={r.time}
              onChange={(e) => update(i, { time: e.target.value })}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              title="Muster entfernen"
              className="p-2 text-dark-slate-400 hover:text-red-600 rounded shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#030386] hover:underline"
      >
        <Plus className="w-4 h-4" />
        Muster hinzufügen
      </button>
      <p className="text-xs text-dark-slate-500 mt-1">
        Je Muster: n-ter Wochentag im Monat + Uhrzeit (z.B. „1. Montag 16:00“). Der Button
        „Nächste 2 Termine anlegen“ auf der Klassenseite erzeugt daraus automatisch Termine.
      </p>
    </div>
  );
}

function toInputDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function KlasseForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: KlasseValues;
}) {
  const router = useRouter();
  const action = mode === "create" ? createKlasseAction : updateKlasseAction;
  const [state, formAction] = useActionState(action, null);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        if (mode === "create") router.push("/admin/klassen");
      }}
      className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm space-y-4"
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Name *</label>
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="Klasse 3"
            className={inputClass}
          />
        </div>
        {mode === "create" && (
          <div>
            <label className={labelClass}>Slug (optional)</label>
            <input
              name="slug"
              defaultValue={initial?.slug ?? ""}
              placeholder="klasse-3"
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label className={labelClass}>Kickoff-Datum *</label>
          <input
            name="kickoffDate"
            type="date"
            required
            defaultValue={initial ? toInputDate(initial.kickoffDate) : ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            name="status"
            defaultValue={initial?.status ?? "PLANNED"}
            className={inputClass}
          >
            {Object.entries(KLASSE_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Programm-Start *</label>
          <input
            name="startDate"
            type="date"
            required
            defaultValue={initial ? toInputDate(initial.startDate) : ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Programm-Ende *</label>
          <input
            name="endDate"
            type="date"
            required
            defaultValue={initial ? toInputDate(initial.endDate) : ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Kapazität (leer = unbegrenzt)</label>
          <input
            name="capacity"
            type="number"
            min={0}
            defaultValue={initial?.capacity ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Curriculum-Stand bei Kickoff</label>
          <input
            name="curriculumStand"
            defaultValue={initial?.curriculumStand ?? ""}
            placeholder="z.B. M1-M4"
            className={inputClass}
          />
          <p className="text-xs text-dark-slate-500 mt-1">
            Welche Module beim Start der Klasse verfügbar waren. Störgröße für den
            Kohortenvergleich der Stand-Abfrage.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dark-slate-200 bg-dark-slate-50/50 p-4">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            name="teilnehmerSperre"
            defaultChecked={initial?.teilnehmerSperre ?? false}
            className="mt-0.5 w-4 h-4 accent-[#030386] cursor-pointer"
          />
          <span>
            <span className="block text-sm font-medium text-dark-slate-700">
              Teilnehmer-Sperre aktiv
            </span>
            <span className="block text-xs text-dark-slate-500 mt-0.5">
              Wenn aktiv, können Kunden im Kundenportal keine Teilnehmer mehr
              hinzufügen oder ändern. Stammdaten bleiben editierbar. Admin-Edits
              sind weiterhin möglich.
            </span>
          </span>
        </label>
      </div>

      <div>
        <label className={labelClass}>Teams-Team (M365-Group-ID)</label>
        <input
          name="teamsGroupId"
          defaultValue={initial?.teamsGroupId ?? ""}
          placeholder="z.B. 81beeeb8-3ef1-4715-98bd-dbcd7b823dd9"
          className={`${inputClass} font-mono`}
        />
        <p className="text-xs text-dark-slate-500 mt-1">
          GUID der M365-Gruppe (= Teams-Team) dieser Klasse. Bestimmt im Native-Modus,
          in welches Team neue Teilnehmer aufgenommen werden. Leer = Aufnahme wird
          übersprungen. (In Teams: Team → Link zum Team abrufen → Parameter{" "}
          <code>groupId</code>.)
        </p>
      </div>

      <TerminRegelEditor initial={initial?.terminRegel ?? []} />

      <div>
        <label className={labelClass}>Beschreibung</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {mode === "create" ? "Klasse anlegen" : "Speichern"}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-600">Gespeichert!</p>}
      </div>
    </form>
  );
}
