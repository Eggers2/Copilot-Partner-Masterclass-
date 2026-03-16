"use client";

import { Task } from "./KanbanBoard";
import { Calendar, StickyNote, MoreHorizontal } from "lucide-react";

function getDeadlineStatus(deadline: string | null, isDoneColumn: boolean) {
  if (!deadline || isDoneColumn) return "neutral";
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "ok";
}

const deadlineColors = {
  neutral: "",
  ok: "text-green-600",
  soon: "text-orange-500",
  overdue: "text-red-600 font-semibold",
};

const deadlineBorder = {
  neutral: "border-[#E3ECF8]",
  ok: "border-green-300",
  soon: "border-orange-300",
  overdue: "border-red-400",
};

export default function TaskCard({
  task,
  isDoneColumn,
  onClick,
  bulkMode,
  isSelected,
  onToggleSelect,
}: {
  task: Task;
  isDoneColumn: boolean;
  onClick: () => void;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const dlStatus = getDeadlineStatus(task.deadline, isDoneColumn);

  return (
    <div
      className={`bg-white rounded-lg border-l-[3px] ${deadlineBorder[dlStatus]} shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing active:opacity-70 active:scale-[0.98] group ${
        isSelected ? "ring-2 ring-[#030386]" : ""
      }`}
      onClick={(e) => {
        if (bulkMode) {
          e.stopPropagation();
          onToggleSelect();
        } else {
          onClick();
        }
      }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          {bulkMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="mt-0.5 mr-1.5 accent-[#030386]"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <h4
            className={`text-sm font-medium text-[#3B3B39] flex-1 leading-snug ${
              isDoneColumn ? "line-through opacity-60" : ""
            }`}
          >
            {task.title}
          </h4>
          <button
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity p-0.5"
            onClick={(e) => {
              e.stopPropagation();
              // Trigger context menu via right-click handler on parent
              const evt = new MouseEvent("contextmenu", {
                bubbles: true,
                clientX: e.clientX,
                clientY: e.clientY,
              });
              e.currentTarget.parentElement?.parentElement?.dispatchEvent(evt);
            }}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white leading-tight"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>

        {/* Bottom row: deadline + notes indicator */}
        <div className="flex items-center justify-between mt-2">
          {task.deadline ? (
            <div
              className={`flex items-center gap-1 text-xs ${deadlineColors[dlStatus]}`}
            >
              <Calendar className="w-3 h-3" />
              <span className={isDoneColumn ? "line-through" : ""}>
                {new Date(task.deadline).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              {dlStatus === "overdue" && !isDoneColumn && (
                <span className="bg-red-100 text-red-600 text-[10px] px-1 rounded">
                  Überfällig
                </span>
              )}
            </div>
          ) : (
            <span />
          )}
          {task.notes && (
            <StickyNote className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
}
