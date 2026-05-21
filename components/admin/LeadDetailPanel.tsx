"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus, LeadSource, AdnChannel } from "@prisma/client";
import { Save, Trash2 } from "lucide-react";
import { LeadStatusBadge } from "./LeadStatusBadge";
import {
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
  ADN_CHANNEL_CONFIG,
} from "@/lib/constants/lead-config";
import { updateLeadAction, deleteLeadAction } from "@/app/admin/actions";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;
  status: LeadStatus;
  source: LeadSource;
  notes: string | null;
  score: number;
  revenue: number;
  followUpAt: string | null;
  createdAt: string;
  adnChannel: AdnChannel;
  klasseId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  landingPage: string | null;
  firstTouchAt: string | null;
}

export interface KlasseChoice {
  id: string;
  name: string;
  slug: string;
}

function AttributionField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-dark-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-dark-slate-700 break-all">
        {value ?? <span className="text-dark-slate-300">—</span>}
      </dd>
    </div>
  );
}

function AttributionBlock({ lead }: { lead: Lead }) {
  const hasAttribution =
    lead.utmSource ||
    lead.utmMedium ||
    lead.utmCampaign ||
    lead.utmContent ||
    lead.utmTerm ||
    lead.referrer ||
    lead.landingPage ||
    lead.firstTouchAt;

  if (!hasAttribution) return null;

  const firstTouchLabel = lead.firstTouchAt
    ? new Date(lead.firstTouchAt).toLocaleString("de-DE")
    : null;

  return (
    <div className="mt-6 pt-6 border-t border-dark-slate-100">
      <h3 className="text-sm font-semibold text-dark-slate-900 mb-3">
        Attribution
      </h3>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
        <AttributionField label="UTM Source" value={lead.utmSource} />
        <AttributionField label="UTM Medium" value={lead.utmMedium} />
        <AttributionField label="UTM Campaign" value={lead.utmCampaign} />
        <AttributionField label="UTM Content" value={lead.utmContent} />
        <AttributionField label="UTM Term" value={lead.utmTerm} />
        <AttributionField label="First Touch" value={firstTouchLabel} />
        <AttributionField label="Referrer" value={lead.referrer} />
        <AttributionField label="Landing Page" value={lead.landingPage} />
      </dl>
    </div>
  );
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

export function LeadDetailPanel({
  lead,
  klassen = [],
}: {
  lead: Lead;
  klassen?: KlasseChoice[];
}) {
  const [state, formAction] = useActionState(updateLeadAction, null);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>(lead.status);
  const [isDeleting, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    const displayName = lead.name || lead.email;
    if (!confirm(`Möchten Sie den Lead "${displayName}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    startTransition(async () => {
      await deleteLeadAction(lead.id);
      router.push("/admin");
    });
  };

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
              Straße + Hausnummer
            </label>
            <input
              name="street"
              defaultValue={lead.street ?? ""}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              PLZ
            </label>
            <input
              name="zip"
              defaultValue={lead.zip ?? ""}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Ort
            </label>
            <input
              name="city"
              defaultValue={lead.city ?? ""}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Website
            </label>
            <input
              name="website"
              type="url"
              defaultValue={lead.website ?? ""}
              placeholder="https://..."
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
              ADN-Kanal
            </label>
            <select
              name="adnChannel"
              defaultValue={lead.adnChannel}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            >
              {Object.entries(ADN_CHANNEL_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-slate-600 mb-1">
              Klasse
            </label>
            <select
              name="klasseId"
              defaultValue={lead.klasseId ?? ""}
              className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
            >
              <option value="">— keine —</option>
              {klassen.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
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

      <AttributionBlock lead={lead} />

      <div className="mt-6 pt-6 border-t border-dark-slate-100">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? "Wird gelöscht..." : "Lead löschen"}
        </button>
      </div>
    </div>
  );
}
