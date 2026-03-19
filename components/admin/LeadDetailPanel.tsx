"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { LeadStatus, LeadSource } from "@prisma/client";
import { Save } from "lucide-react";
import { LeadStatusBadge } from "./LeadStatusBadge";
import {
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
} from "@/lib/constants/lead-config";
import { updateLeadAction } from "@/app/admin/actions";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  source: LeadSource;
  notes: string | null;
  score: number;
  revenue: number;
  followUpAt: string | null;
  createdAt: string;
}

function SubmitButton() {
  return (
    <button
      type="submit"
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
    >
      <Save className="w-4 h-4" />
      Speichern
    </button>
  );
}

export function LeadDetailPanel({ lead }: { lead: Lead }) {
  const [state, formAction] = useActionState(updateLeadAction, null);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(lead.status);

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-dark-slate-900">
            {lead.name || lead.email}
          </h2>
          <a href={`mailto:${lead.email}`} className="text-[#030386] text-sm hover:underline">{lead.email}</a>
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={lead.id} />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Name
            </label>
            <input
              name="name"
              defaultValue={lead.name ?? ""}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Firma
            </label>
            <input
              name="company"
              defaultValue={lead.company ?? ""}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Telefon
            </label>
            <input
              name="phone"
              defaultValue={lead.phone ?? ""}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Score
            </label>
            <input
              name="score"
              type="number"
              min={0}
              max={100}
              defaultValue={lead.score}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={lead.status}
              onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            >
              {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Quelle
            </label>
            <select
              name="source"
              defaultValue={lead.source}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            >
              {Object.entries(LEAD_SOURCE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Follow-up Datum
            </label>
            <input
              name="followUpAt"
              type="datetime-local"
              defaultValue={
                lead.followUpAt
                  ? new Date(lead.followUpAt).toISOString().slice(0, 16)
                  : ""
              }
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          {selectedStatus === "WON" && (
            <div>
              <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                Umsatz (€)
              </label>
              <input
                name="revenue"
                type="number"
                min={0}
                step={1}
                defaultValue={lead.revenue > 0 ? lead.revenue / 100 : ""}
                placeholder="0,00"
                className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-slate-600 mb-1">
            Notizen
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={lead.notes ?? ""}
            className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <SubmitButton />
          {state?.success && (
            <p className="text-sm text-green-600">Gespeichert!</p>
          )}
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
        </div>
      </form>
    </div>
  );
}
