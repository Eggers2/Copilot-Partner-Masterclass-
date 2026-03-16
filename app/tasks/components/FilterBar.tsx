"use client";

import { Search, X, CheckSquare } from "lucide-react";
import { Column } from "./KanbanBoard";

interface Filters {
  workstream: string;
  responsible: string;
  priority: string;
  search: string;
}

const workstreams = [
  "Partnerschaften",
  "Plattform",
  "Funnel",
  "Content",
  "Marketing",
  "Sales Assets",
  "Webinar",
  "Launch",
  "ADN Events",
];

const responsibles = ["ALEX", "Katherina", "BEIDE"];
const priorities = ["SOFORT", "DIESE_WOCHE", "GEPLANT", "EVENT"];

export default function FilterBar({
  filters,
  setFilters,
  bulkMode,
  setBulkMode,
  selectedCount,
  columns,
  onBulkMove,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  bulkMode: boolean;
  setBulkMode: (v: boolean) => void;
  selectedCount: number;
  columns: Column[];
  onBulkMove: (colId: number) => void;
}) {
  const hasFilters =
    filters.workstream || filters.responsible || filters.priority || filters.search;

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Suchen..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#030386] focus:border-transparent outline-none w-48 text-[#3B3B39]"
          />
        </div>

        {/* Dropdowns */}
        <select
          value={filters.workstream}
          onChange={(e) => setFilters({ ...filters, workstream: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
        >
          <option value="">Alle Workstreams</option>
          {workstreams.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>

        <select
          value={filters.responsible}
          onChange={(e) =>
            setFilters({ ...filters, responsible: e.target.value })
          }
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
        >
          <option value="">Alle Verantwortlichen</option>
          {responsibles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
        >
          <option value="">Alle Prioritäten</option>
          {priorities.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() =>
              setFilters({
                workstream: "",
                responsible: "",
                priority: "",
                search: "",
              })
            }
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            <X className="w-3 h-3" />
            Filter zurücksetzen
          </button>
        )}

        <div className="flex-1" />

        {/* Bulk mode toggle */}
        <button
          onClick={() => setBulkMode(!bulkMode)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            bulkMode
              ? "bg-[#030386] text-white"
              : "text-gray-500 hover:bg-gray-100"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Mehrfachauswahl
        </button>

        {/* Bulk move */}
        {bulkMode && selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#030386] font-medium">
              {selectedCount} ausgewählt →
            </span>
            {columns.map((col) => (
              <button
                key={col.id}
                onClick={() => onBulkMove(col.id)}
                className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 text-[#3B3B39] transition-colors"
              >
                {col.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active filter badges */}
      {hasFilters && (
        <div className="flex gap-1.5 mt-2">
          {filters.workstream && (
            <FilterBadge
              label={`Workstream: ${filters.workstream}`}
              onRemove={() => setFilters({ ...filters, workstream: "" })}
            />
          )}
          {filters.responsible && (
            <FilterBadge
              label={`Verantwortlich: ${filters.responsible}`}
              onRemove={() => setFilters({ ...filters, responsible: "" })}
            />
          )}
          {filters.priority && (
            <FilterBadge
              label={`Priorität: ${filters.priority}`}
              onRemove={() => setFilters({ ...filters, priority: "" })}
            />
          )}
          {filters.search && (
            <FilterBadge
              label={`Suche: "${filters.search}"`}
              onRemove={() => setFilters({ ...filters, search: "" })}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 bg-[#E3ECF8] text-[#030386] text-xs px-2 py-0.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-red-600">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
