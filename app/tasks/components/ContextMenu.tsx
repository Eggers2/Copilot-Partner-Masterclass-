"use client";

import { useEffect, useRef } from "react";
import { Column } from "./KanbanBoard";
import { ArrowRight } from "lucide-react";

export default function ContextMenu({
  x,
  y,
  columns,
  currentColumnId,
  onMove,
  onClose,
}: {
  x: number;
  y: number;
  columns: Column[];
  currentColumnId: number;
  onMove: (colId: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Keep menu in viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 250);

  return (
    <div
      ref={ref}
      className="fixed z-[60] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-xs text-gray-500 font-medium uppercase tracking-wide">
        Verschieben nach
      </div>
      {columns
        .filter((c) => c.id !== currentColumnId)
        .map((col) => (
          <button
            key={col.id}
            onClick={() => onMove(col.id)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#3B3B39] hover:bg-[#E3ECF8] transition-colors text-left"
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: col.color || "#6b7280" }}
            />
            <span className="flex-1">{col.name}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </button>
        ))}
    </div>
  );
}
