"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addActivityAction } from "@/app/admin/actions";

const ACTIVITY_TYPES = [
  { value: "NOTE", label: "Notiz" },
  { value: "EMAIL", label: "E-Mail" },
  { value: "CALL", label: "Anruf" },
  { value: "MEETING", label: "Meeting" },
  { value: "FOLLOW_UP", label: "Follow-up" },
];

export function AddActivityForm({ leadId }: { leadId: string }) {
  const [state, formAction, isPending] = useActionState(addActivityAction, null);

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-dark-slate-900 mb-4">
        Aktivität hinzufügen
      </h3>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="leadId" value={leadId} />
        <div className="flex gap-3">
          <select
            name="type"
            required
            className="px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            name="content"
            placeholder="Beschreibung..."
            required
            className="flex-1 px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Hinzufügen
          </button>
        </div>
        {state?.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
      </form>
    </div>
  );
}
