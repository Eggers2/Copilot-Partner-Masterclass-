"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Search,
  Download,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Clock,
  CircleDot,
} from "lucide-react";
import {
  deleteBestellungAction,
  updateBestellungStatusAction,
} from "@/app/admin/actions";

interface Bestellung {
  id: number;
  bestellNr: string;
  paket: string;
  userAnzahl: number;
  zahlungsmodell: string;
  preisNetto: string;
  mwstBetrag: string;
  preisBrutto: string;
  reverseCharge: boolean;
  firma: string;
  land: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string | null;
  anmerkungen: string | null;
  status: string;
  erstelltAm: string;
}

type SortKey =
  | "bestellNr"
  | "firma"
  | "paket"
  | "preis"
  | "status"
  | "erstelltAm";
type SortDir = "asc" | "desc";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof CircleDot }
> = {
  neu: {
    label: "Neu",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: CircleDot,
  },
  bearbeitet: {
    label: "Bearbeitet",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  abgeschlossen: {
    label: "Abgeschlossen",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle,
  },
};

const STATUS_CYCLE = ["neu", "bearbeitet", "abgeschlossen"];

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: SortDir
): number {
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

export function BestellungenTable({
  bestellungen,
}: {
  bestellungen: Bestellung[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paketFilter, setPaketFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result = bestellungen.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (paketFilter && b.paket !== paketFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.bestellNr.toLowerCase().includes(q) ||
          b.firma.toLowerCase().includes(q) ||
          b.email.toLowerCase().includes(q) ||
          `${b.vorname} ${b.nachname}`.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal: string | number | null;
        let bVal: string | number | null;
        switch (sortKey) {
          case "bestellNr":
            aVal = a.bestellNr;
            bVal = b.bestellNr;
            break;
          case "firma":
            aVal = a.firma.toLowerCase();
            bVal = b.firma.toLowerCase();
            break;
          case "paket":
            aVal = a.paket;
            bVal = b.paket;
            break;
          case "preis":
            aVal = parseFloat(a.preisNetto);
            bVal = parseFloat(b.preisNetto);
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
          case "erstelltAm":
            aVal = a.erstelltAm;
            bVal = b.erstelltAm;
            break;
        }
        return compareValues(aVal, bVal, sortDir);
      });
    }

    return result;
  }, [bestellungen, statusFilter, paketFilter, search, sortKey, sortDir]);

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteBestellungAction(id);
      setDeleteConfirm(null);
    });
  };

  const handleStatusToggle = (id: number, currentStatus: string) => {
    const currentIdx = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    startTransition(async () => {
      await updateBestellungStatusAction(id, nextStatus);
    });
  };

  const downloadCSV = () => {
    const headers = [
      "Bestell-Nr",
      "Paket",
      "User",
      "Zahlungsmodell",
      "Netto",
      "MwSt",
      "Brutto",
      "Firma",
      "Land",
      "Vorname",
      "Nachname",
      "E-Mail",
      "Telefon",
      "Anmerkungen",
      "Status",
      "Erstellt am",
    ];
    const rows = filtered.map((b) => [
      b.bestellNr,
      b.paket,
      String(b.userAnzahl),
      b.zahlungsmodell,
      b.preisNetto,
      b.mwstBetrag,
      b.preisBrutto,
      b.firma,
      b.land,
      b.vorname,
      b.nachname,
      b.email,
      b.telefon ?? "",
      b.anmerkungen ?? "",
      b.status,
      new Date(b.erstelltAm).toLocaleString("de-DE"),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bestellungen-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniquePakete = [...new Set(bestellungen.map((b) => b.paket))];

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

  const thClass =
    "text-left px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-dark-slate-700 transition-colors";

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-dark-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-slate-400" />
          <input
            type="text"
            placeholder="Suche nach Bestell-Nr, Firma, E-Mail, Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
        >
          <option value="">Alle Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={paketFilter}
          onChange={(e) => setPaketFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
        >
          <option value="">Alle Pakete</option>
          {uniquePakete.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
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
              <th
                className={thClass}
                onClick={() => handleSort("bestellNr")}
              >
                Bestell-Nr <SortIcon column="bestellNr" />
              </th>
              <th className={thClass} onClick={() => handleSort("firma")}>
                Kunde <SortIcon column="firma" />
              </th>
              <th className={thClass} onClick={() => handleSort("paket")}>
                Paket <SortIcon column="paket" />
              </th>
              <th className={thClass} onClick={() => handleSort("preis")}>
                Netto <SortIcon column="preis" />
              </th>
              <th className={thClass} onClick={() => handleSort("status")}>
                Status <SortIcon column="status" />
              </th>
              <th
                className={thClass}
                onClick={() => handleSort("erstelltAm")}
              >
                Datum <SortIcon column="erstelltAm" />
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-dark-slate-400 text-sm"
                >
                  Keine Bestellungen gefunden.
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const statusConf =
                  STATUS_CONFIG[b.status] ?? STATUS_CONFIG["neu"];
                const StatusIcon = statusConf.icon;
                const isNew = b.status === "neu";

                return (
                  <tr
                    key={b.id}
                    className={`transition-colors ${
                      isNew
                        ? "bg-red-50/40 hover:bg-red-50/70"
                        : "hover:bg-[#E3ECF8]/30"
                    }`}
                  >
                    <td className="px-4 py-4">
                      <span
                        className={`text-sm font-mono font-semibold ${
                          isNew ? "text-red-700" : "text-dark-slate-900"
                        }`}
                      >
                        {b.bestellNr}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-dark-slate-900">
                          {b.firma}
                        </p>
                        <p className="text-xs text-dark-slate-500">
                          {b.vorname} {b.nachname} &middot; {b.email}
                        </p>
                        {b.anmerkungen && (
                          <p className="text-xs text-amber-600 mt-0.5 truncate max-w-[250px]">
                            {b.anmerkungen}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E3ECF8] text-[#030386]">
                        {b.paket.charAt(0).toUpperCase() + b.paket.slice(1)}
                      </span>
                      <p className="text-xs text-dark-slate-400 mt-0.5">
                        {b.zahlungsmodell === "jahresabo"
                          ? "Jahresabo"
                          : "Monatlich"}{" "}
                        &middot; {b.userAnzahl} User
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-dark-slate-900">
                        {parseFloat(b.preisNetto).toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        €
                      </p>
                      <p className="text-xs text-dark-slate-400">
                        Brutto:{" "}
                        {parseFloat(b.preisBrutto).toLocaleString("de-DE", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        €
                        {b.reverseCharge && (
                          <span className="ml-1 text-amber-600">RC</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleStatusToggle(b.id, b.status)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:shadow-sm ${statusConf.bg} ${statusConf.color}`}
                        title="Klicken um Status zu wechseln"
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConf.label}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-dark-slate-400">
                      {new Date(b.erstelltAm).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-4">
                      {deleteConfirm === b.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(b.id)}
                            disabled={isPending}
                            className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Ja, löschen
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-xs font-medium text-dark-slate-600 bg-dark-slate-100 rounded hover:bg-dark-slate-200 transition-colors"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(b.id)}
                          className="p-1.5 text-dark-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Bestellung löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-dark-slate-50 border-t border-dark-slate-100">
        <p className="text-sm text-dark-slate-500">
          {filtered.length} von {bestellungen.length} Bestellungen
        </p>
      </div>
    </div>
  );
}
