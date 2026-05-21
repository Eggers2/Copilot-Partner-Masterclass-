"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Download, ChevronUp, ChevronDown, Plus } from "lucide-react";
import type { LeadStatus, LeadSource, AdnChannel } from "@prisma/client";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { FirstCallBadge } from "./FirstCallBadge";
import {
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
  ADN_CHANNEL_CONFIG,
} from "@/lib/constants/lead-config";


interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  street?: string | null;
  zip?: string | null;
  city?: string | null;
  website?: string | null;
  phone?: string | null;
  status: LeadStatus;
  source: LeadSource;
  adnChannel: AdnChannel;
  klasseName: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  score?: number;
  notes?: string | null;
  createdAt: string;
  followUpAt: string | null;
  lastActivityAt: string | null;
  _count: { activities: number };
  firstCallScore: { totalScore: number } | null;
}

type SortKey =
  | "lead"
  | "company"
  | "status"
  | "score"
  | "source"
  | "campaign"
  | "adnChannel"
  | "klasse"
  | "createdAt"
  | "lastActivityAt"
  | "followUpAt";
type SortDir = "asc" | "desc";

interface LeadsTableProps {
  leads: Lead[];
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined, dir: SortDir): number {
  const nullA = a == null || a === "";
  const nullB = b == null || b === "";
  if (nullA && nullB) return 0;
  if (nullA) return 1;
  if (nullB) return -1;
  if (typeof a === "string" && typeof b === "string") {
    const cmp = a.localeCompare(b, "de", { sensitivity: "base" });
    return dir === "asc" ? cmp : -cmp;
  }
  const cmp = (a as number) - (b as number);
  return dir === "asc" ? cmp : -cmp;
}

function getSortValue(lead: Lead, key: SortKey): string | number | null {
  switch (key) {
    case "lead":
      return (lead.name || lead.email).toLowerCase();
    case "company":
      return lead.company?.toLowerCase() ?? null;
    case "status":
      return LEAD_STATUS_CONFIG[lead.status].label;
    case "score":
      return lead.firstCallScore?.totalScore ?? null;
    case "source":
      return LEAD_SOURCE_CONFIG[lead.source].label;
    case "campaign":
      return lead.utmCampaign?.toLowerCase() ?? null;
    case "adnChannel":
      return ADN_CHANNEL_CONFIG[lead.adnChannel].label;
    case "klasse":
      return lead.klasseName?.toLowerCase() ?? null;
    case "createdAt":
      return lead.createdAt;
    case "lastActivityAt":
      return lead.lastActivityAt;
    case "followUpAt":
      return lead.followUpAt;
  }
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [adnFilter, setAdnFilter] = useState<AdnChannel | "">("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = leads.filter((lead) => {
      if (statusFilter && lead.status !== statusFilter) return false;
      if (sourceFilter && lead.source !== sourceFilter) return false;
      if (adnFilter && lead.adnChannel !== adnFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          lead.email.toLowerCase().includes(q) ||
          lead.name?.toLowerCase().includes(q) ||
          lead.company?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortKey) {
      result = [...result].sort((a, b) =>
        compareValues(getSortValue(a, sortKey), getSortValue(b, sortKey), sortDir)
      );
    }

    return result;
  }, [leads, statusFilter, sourceFilter, adnFilter, search, sortKey, sortDir]);

  const downloadCSV = () => {
    const headers = ["Name", "E-Mail", "Firma", "Straße", "PLZ", "Ort", "Website", "Telefon", "Status", "Quelle", "UTM Source", "UTM Campaign", "ADN-Kanal", "Klasse", "Score", "Notizen", "Erstellt am", "Letzte Aktivität", "Follow-up Datum"];
    const rows = filtered.map((lead) => [
      lead.name ?? "",
      lead.email,
      lead.company ?? "",
      lead.street ?? "",
      lead.zip ?? "",
      lead.city ?? "",
      lead.website ?? "",
      lead.phone ?? "",
      LEAD_STATUS_CONFIG[lead.status].label,
      LEAD_SOURCE_CONFIG[lead.source].label,
      lead.utmSource ?? "",
      lead.utmCampaign ?? "",
      ADN_CHANNEL_CONFIG[lead.adnChannel].label,
      lead.klasseName ?? "",
      String(lead.score ?? ""),
      lead.notes ?? "",
      new Date(lead.createdAt).toLocaleString("de-DE"),
      lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleString("de-DE") : "",
      lead.followUpAt ? new Date(lead.followUpAt).toLocaleString("de-DE") : "",
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return (
        <span className="inline-flex flex-col ml-1 opacity-30">
          <ChevronUp className="w-3 h-3 -mb-1" />
          <ChevronDown className="w-3 h-3" />
        </span>
      );
    }
    return sortDir === "asc" ? (
      <ChevronUp className="inline w-3 h-3 ml-1" />
    ) : (
      <ChevronDown className="inline w-3 h-3 ml-1" />
    );
  };

  const thClass = "text-left px-6 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-dark-slate-700 transition-colors";

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-dark-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail, Firma..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}
          className="px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
        >
          <option value="">Alle Status</option>
          {Object.entries(LEAD_STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as LeadSource | "")}
          className="px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
        >
          <option value="">Alle Quellen</option>
          {Object.entries(LEAD_SOURCE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={adnFilter}
          onChange={(e) => setAdnFilter(e.target.value as AdnChannel | "")}
          className="px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
        >
          <option value="">Alle ADN-Kanäle</option>
          {Object.entries(ADN_CHANNEL_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <Link
          href="/admin/leads/new"
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Lead anlegen
        </Link>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#030386] border border-[#030386] rounded-lg hover:bg-[#E3ECF8]/50 transition-colors"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-slate-50 border-b border-dark-slate-100">
              <th className={thClass} onClick={() => handleSort("lead")}>
                Lead <SortIcon column="lead" />
              </th>
              <th className={thClass} onClick={() => handleSort("company")}>
                Firma <SortIcon column="company" />
              </th>
              <th className={thClass} onClick={() => handleSort("status")}>
                Status <SortIcon column="status" />
              </th>
              <th className={thClass} onClick={() => handleSort("score")}>
                Score <SortIcon column="score" />
              </th>
              <th className={thClass} onClick={() => handleSort("source")}>
                Quelle <SortIcon column="source" />
              </th>
              <th className={thClass} onClick={() => handleSort("campaign")}>
                Kampagne <SortIcon column="campaign" />
              </th>
              <th className={thClass} onClick={() => handleSort("adnChannel")}>
                ADN <SortIcon column="adnChannel" />
              </th>
              <th className={thClass} onClick={() => handleSort("klasse")}>
                Klasse <SortIcon column="klasse" />
              </th>
              <th className={thClass} onClick={() => handleSort("createdAt")}>
                Datum <SortIcon column="createdAt" />
              </th>
              <th className={thClass} onClick={() => handleSort("lastActivityAt")}>
                Letzte Aktivität <SortIcon column="lastActivityAt" />
              </th>
              <th className={thClass} onClick={() => handleSort("followUpAt")}>
                Follow-up <SortIcon column="followUpAt" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-6 py-12 text-center text-dark-slate-400 text-sm"
                >
                  Keine Leads gefunden.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => router.push(`/admin/leads/${lead.id}`)}
                  className="hover:bg-[#E3ECF8]/30 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E3ECF8] flex items-center justify-center flex-shrink-0">
                        <span className="text-[#030386] text-xs font-bold">
                          {(lead.name?.[0] ?? lead.email[0]).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-slate-900">
                          {lead.name || lead.email}
                        </p>
                        {lead.name && (
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-[#030386] hover:underline"
                          >
                            {lead.email}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-slate-600">
                    {lead.company || "–"}
                  </td>
                  <td className="px-6 py-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="px-6 py-4">
                    <FirstCallBadge totalScore={lead.firstCallScore?.totalScore ?? null} />
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-slate-500">
                    {LEAD_SOURCE_CONFIG[lead.source].label}
                  </td>
                  <td className="px-6 py-4">
                    {lead.utmCampaign ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-dark-slate-700">
                          {lead.utmCampaign}
                        </span>
                        {lead.utmSource && (
                          <span className="text-xs text-dark-slate-400">
                            {lead.utmSource}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-dark-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {lead.adnChannel === "NONE" ? (
                      <span className="text-xs text-dark-slate-400">—</span>
                    ) : (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          color: ADN_CHANNEL_CONFIG[lead.adnChannel].color,
                          backgroundColor: ADN_CHANNEL_CONFIG[lead.adnChannel].bg,
                        }}
                      >
                        {ADN_CHANNEL_CONFIG[lead.adnChannel].short}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-slate-500">
                    {lead.klasseName ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-slate-400">
                    {new Date(lead.createdAt).toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-slate-400">
                    {lead.lastActivityAt
                      ? new Date(lead.lastActivityAt).toLocaleDateString("de-DE")
                      : "–"}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-slate-400">
                    {lead.followUpAt
                      ? new Date(lead.followUpAt).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "–"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-dark-slate-50 border-t border-dark-slate-100">
        <p className="text-sm text-dark-slate-500">
          {filtered.length} von {leads.length} Leads
        </p>
      </div>
    </div>
  );
}
