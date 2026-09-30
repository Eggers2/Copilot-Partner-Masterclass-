"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LeadStatus, LeadSource } from "@prisma/client";
import { Clock, Search, X } from "lucide-react";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LEAD_STATUS_CONFIG, LEAD_SOURCE_CONFIG } from "@/lib/constants/lead-config";
import { formatBerlinDate, diffBerlinTage } from "@/lib/datetime";

interface FollowUpLead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: LeadStatus;
  source: LeadSource;
  followUpAt: string | null;
}

export type Faelligkeit = "alle" | "ueberfaellig" | "heute" | "woche" | "spaeter";

const FAELLIGKEIT_OPTIONS: { value: Faelligkeit; label: string }[] = [
  { value: "alle", label: "Alle Termine" },
  { value: "ueberfaellig", label: "Überfällig" },
  { value: "heute", label: "Heute" },
  { value: "woche", label: "Nächste 7 Tage" },
  { value: "spaeter", label: "Später" },
];

function faelligkeitOf(followUp: Date, now: Date): Exclude<Faelligkeit, "alle"> {
  if (followUp < now) return "ueberfaellig";
  const tage = diffBerlinTage(now, followUp);
  if (tage === 0) return "heute";
  if (tage <= 7) return "woche";
  return "spaeter";
}

const selectClass =
  "px-3 py-2 text-sm border border-dark-slate-200 rounded-lg bg-white focus:border-[#030386] focus:outline-none";

export function FollowUpList({
  leads,
  initialFaelligkeit = "alle",
}: {
  leads: FollowUpLead[];
  initialFaelligkeit?: Faelligkeit;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [source, setSource] = useState<LeadSource | "">("");
  const [faelligkeit, setFaelligkeit] = useState<Faelligkeit>(initialFaelligkeit);

  const now = useMemo(() => new Date(), []);

  const rows = useMemo(
    () =>
      leads.map((lead) => {
        const followUp = lead.followUpAt ? new Date(lead.followUpAt) : null;
        return {
          ...lead,
          followUp,
          faelligkeit: followUp ? faelligkeitOf(followUp, now) : null,
        };
      }),
    [leads, now]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (source && r.source !== source) return false;
      if (faelligkeit !== "alle" && r.faelligkeit !== faelligkeit) return false;
      if (q) {
        const haystack = [r.name, r.email, r.company].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, source, faelligkeit]);

  const overdueCount = rows.filter((r) => r.faelligkeit === "ueberfaellig").length;
  const hasFilter = search !== "" || status !== "" || source !== "" || faelligkeit !== "alle";

  // Nur Status anbieten, die in der Liste überhaupt vorkommen
  const statusOptions = Object.entries(LEAD_STATUS_CONFIG).filter(([key]) =>
    rows.some((r) => r.status === key)
  );
  const sourceOptions = Object.entries(LEAD_SOURCE_CONFIG).filter(([key]) =>
    rows.some((r) => r.source === key)
  );

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setSource("");
    setFaelligkeit("alle");
  };

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-slate-900">
          <Clock className="w-5 h-5 inline mr-2 text-amber-500" />
          Follow-ups
        </h3>
        <p className="text-sm text-dark-slate-500">
          {filtered.length} von {rows.length}
          {overdueCount > 0 && (
            <span className="text-red-600"> · {overdueCount} überfällig</span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, E-Mail oder Firma"
            className="w-full pl-9 pr-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
          />
        </div>
        <select
          value={faelligkeit}
          onChange={(e) => setFaelligkeit(e.target.value as Faelligkeit)}
          className={selectClass}
          aria-label="Fälligkeit"
        >
          {FAELLIGKEIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus | "")}
          className={selectClass}
          aria-label="Status"
        >
          <option value="">Alle Status</option>
          {statusOptions.map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as LeadSource | "")}
          className={selectClass}
          aria-label="Quelle"
        >
          <option value="">Alle Quellen</option>
          {sourceOptions.map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-dark-slate-500 hover:text-[#030386]"
          >
            <X className="w-4 h-4" />
            Zurücksetzen
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-dark-slate-400 text-sm text-center py-6">
          {rows.length === 0
            ? "Keine anstehenden Follow-ups."
            : "Keine Follow-ups für diese Filter."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => {
            const isOverdue = lead.faelligkeit === "ueberfaellig";
            return (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[#E3ECF8]/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-dark-slate-900 truncate">
                    {lead.name || lead.email}
                  </p>
                  {lead.company && (
                    <p className="text-xs text-dark-slate-400">{lead.company}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <LeadStatusBadge status={lead.status} />
                  {lead.followUp && (
                    <span
                      className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-dark-slate-500"}`}
                    >
                      {formatBerlinDate(lead.followUp)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
