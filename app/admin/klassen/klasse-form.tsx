"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { KlasseStatus } from "@prisma/client";
import { createKlasseAction, updateKlasseAction } from "@/app/admin/actions";
import { KLASSE_STATUS_CONFIG } from "@/lib/constants/lead-config";

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
