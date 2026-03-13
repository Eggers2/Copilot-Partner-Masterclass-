"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistrationStatus, LeadStatus } from "@prisma/client";
import { Check, X, Download, CheckSquare } from "lucide-react";
import { REGISTRATION_STATUS_CONFIG } from "@/lib/constants/lead-config";
import {
  markAttendanceAction,
  bulkMarkAttendanceAction,
} from "@/app/admin/actions";

interface Registration {
  id: string;
  status: RegistrationStatus;
  registeredAt: string;
  lead: {
    id: string;
    email: string;
    name: string | null;
    company: string | null;
    status: LeadStatus;
  };
}

export function RegistrationTable({
  registrations,
  webinarId,
  webinarTitle,
}: {
  registrations: Registration[];
  webinarId: string;
  webinarTitle: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  const toggleAll = () => {
    if (selected.size === registrations.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(registrations.map((r) => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleMark = async (registrationId: string, status: RegistrationStatus) => {
    setLoading(registrationId);
    const formData = new FormData();
    formData.set("registrationId", registrationId);
    formData.set("status", status);
    formData.set("webinarId", webinarId);
    await markAttendanceAction(null, formData);
    setLoading(null);
    router.refresh();
  };

  const handleBulk = async (status: RegistrationStatus) => {
    if (selected.size === 0) return;
    setLoading("bulk");
    const formData = new FormData();
    formData.set("webinarId", webinarId);
    formData.set("status", status);
    selected.forEach((id) => formData.append("registrationIds", id));
    await bulkMarkAttendanceAction(null, formData);
    setLoading(null);
    setSelected(new Set());
    router.refresh();
  };

  const downloadCSV = () => {
    const headers = ["Name", "E-Mail", "Firma", "Status", "Angemeldet am"];
    const rows = registrations.map((r) => [
      r.lead.name ?? "",
      r.lead.email,
      r.lead.company ?? "",
      REGISTRATION_STATUS_CONFIG[r.status].label,
      new Date(r.registeredAt).toLocaleString("de-DE"),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${webinarTitle.replace(/\s+/g, "-")}_teilnehmer.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm overflow-hidden">
      {/* Actions bar */}
      <div className="p-4 border-b border-dark-slate-100 flex flex-wrap items-center gap-3">
        {selected.size > 0 && (
          <>
            <span className="text-sm text-dark-slate-500">
              {selected.size} ausgewählt
            </span>
            <button
              onClick={() => handleBulk("ATTENDED")}
              disabled={loading === "bulk"}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              Alle erschienen
            </button>
            <button
              onClick={() => handleBulk("NO_SHOW")}
              disabled={loading === "bulk"}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              Alle No-Show
            </button>
          </>
        )}
        <div className="ml-auto">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-dark-slate-600 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-slate-50 border-b border-dark-slate-100">
              <th className="px-4 py-3 w-10">
                <button onClick={toggleAll} className="p-1">
                  <CheckSquare
                    className={`w-4 h-4 ${selected.size === registrations.length && registrations.length > 0 ? "text-[#030386]" : "text-dark-slate-300"}`}
                  />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Teilnehmer
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Firma
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Angemeldet
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-slate-50">
            {registrations.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-dark-slate-400 text-sm"
                >
                  Noch keine Anmeldungen.
                </td>
              </tr>
            ) : (
              registrations.map((reg) => {
                const statusConfig = REGISTRATION_STATUS_CONFIG[reg.status];
                return (
                  <tr key={reg.id} className="hover:bg-[#E3ECF8]/20">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(reg.id)}
                        onChange={() => toggleOne(reg.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-dark-slate-900">
                          {reg.lead.name || reg.lead.email}
                        </p>
                        {reg.lead.name && (
                          <p className="text-xs text-dark-slate-400">
                            {reg.lead.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-600">
                      {reg.lead.company || "–"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          color: statusConfig.color,
                          backgroundColor: statusConfig.bg,
                        }}
                      >
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-slate-400">
                      {new Date(reg.registeredAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleMark(reg.id, "ATTENDED")}
                          disabled={
                            loading === reg.id || reg.status === "ATTENDED"
                          }
                          className="p-1.5 rounded text-green-600 hover:bg-green-50 disabled:opacity-30 transition-colors"
                          title="Erschienen"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMark(reg.id, "NO_SHOW")}
                          disabled={
                            loading === reg.id || reg.status === "NO_SHOW"
                          }
                          className="p-1.5 rounded text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                          title="No-Show"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-dark-slate-50 border-t border-dark-slate-100">
        <p className="text-sm text-dark-slate-500">
          {registrations.length} Anmeldung
          {registrations.length !== 1 ? "en" : ""}
        </p>
      </div>
    </div>
  );
}
