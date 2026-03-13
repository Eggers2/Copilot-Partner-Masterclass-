"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { LeadStatus, LeadSource } from "@prisma/client";
import { LeadStatusBadge } from "./LeadStatusBadge";
import {
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
} from "@/lib/constants/lead-config";

interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: LeadStatus;
  source: LeadSource;
  createdAt: string;
  _count: { activities: number };
}

interface LeadsTableProps {
  leads: Lead[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");

  const filtered = leads.filter((lead) => {
    if (statusFilter && lead.status !== statusFilter) return false;
    if (sourceFilter && lead.source !== sourceFilter) return false;
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-slate-50 border-b border-dark-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Firma
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Quelle
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Datum
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
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
                          <p className="text-xs text-dark-slate-400">
                            {lead.email}
                          </p>
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
                  <td className="px-6 py-4 text-sm text-dark-slate-500">
                    {LEAD_SOURCE_CONFIG[lead.source].label}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-slate-400">
                    {new Date(lead.createdAt).toLocaleDateString("de-DE")}
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
