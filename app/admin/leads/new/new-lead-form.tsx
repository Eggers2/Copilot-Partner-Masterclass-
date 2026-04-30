"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import type { LeadStatus, LeadSource, AdnChannel } from "@prisma/client";
import { createLeadAction } from "@/app/admin/actions";
import {
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
  ADN_CHANNEL_CONFIG,
} from "@/lib/constants/lead-config";

interface KlasseChoice {
  id: string;
  name: string;
  slug: string;
  status: string;
}

const inputClass =
  "w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none";
const labelClass = "block text-sm font-medium text-dark-slate-600 mb-1";

export function NewLeadForm({
  klassen,
  defaultAdnChannel,
  defaultSource,
}: {
  klassen: KlasseChoice[];
  defaultAdnChannel: AdnChannel;
  defaultSource: LeadSource;
}) {
  const [state, formAction] = useActionState(createLeadAction, null);

  return (
    <form
      action={formAction}
      className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClass}>E-Mail *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="kontakt@firma.de"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Name</label>
          <input name="name" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Firma</label>
          <input name="company" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Straße + Hausnummer</label>
          <input name="street" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>PLZ</label>
          <input name="zip" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ort</label>
          <input name="city" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Website</label>
          <input
            name="website"
            type="url"
            placeholder="https://..."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Telefon</label>
          <input name="phone" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select
            name="status"
            defaultValue={"NEW" as LeadStatus}
            className={inputClass}
          >
            {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Quelle</label>
          <select
            name="source"
            defaultValue={defaultSource}
            className={inputClass}
          >
            {Object.entries(LEAD_SOURCE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>ADN-Kanal</label>
          <select
            name="adnChannel"
            defaultValue={defaultAdnChannel}
            className={inputClass}
          >
            {Object.entries(ADN_CHANNEL_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Klasse</label>
          <select name="klasseId" defaultValue="" className={inputClass}>
            <option value="">— keine Zuordnung —</option>
            {klassen.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.status})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Score</label>
          <input
            name="score"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Follow-up Datum</label>
          <input name="followUpAt" type="datetime-local" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notizen</label>
        <textarea name="notes" rows={3} className={`${inputClass} resize-none`} />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          Lead anlegen
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
