"use client";

import { useState, useCallback, useRef } from "react";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import CreateTaskForm from "./CreateTaskForm";
import FilterBar from "./FilterBar";
import ContextMenu from "./ContextMenu";

export interface Tag {
  id: number;
  name: string;
  color: string;
  category: string | null;
}

export interface TaskTagAssignment {
  tagId: number;
  tag: Tag;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  columnId: number;
  position: number;
  workstream: string | null;
  responsible: string | null;
  priority: string | null;
  deadline: string | null;
  notes: string | null;
  weekLabel: string | null;
  tags: TaskTagAssignment[];
}

export interface Column {
  id: number;
  name: string;
  position: number;
  color: string | null;
  tasks: Task[];
}

interface Filters {
  workstream: string;
  responsible: string;
  priority: string;
  search: string;
}

export default function KanbanBoard({
  initialColumns,
  tags,
}: {
  initialColumns: Column[];
  tags: Tag[];
}) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [creatingInColumn, setCreatingInColumn] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    workstream: "",
    responsible: "",
    priority: "",
    search: "",
  });
  const [contextMenu, setContextMenu] = useState<{
    task: Task;
    x: number;
    y: number;
  } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const dragItem = useRef<{ taskId: number; columnId: number } | null>(null);
  const dragOverColumn = useRef<number | null>(null);
  const dragOverPosition = useRef<number>(0);

  // Filter tasks
  const filterTasks = useCallback(
    (tasks: Task[]) => {
      return tasks.filter((t) => {
        if (filters.workstream && t.workstream !== filters.workstream)
          return false;
        if (filters.responsible && t.responsible !== filters.responsible)
          return false;
        if (filters.priority && t.priority !== filters.priority) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if (
            !t.title.toLowerCase().includes(q) &&
            !(t.description || "").toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      });
    },
    [filters]
  );

  // Drag handlers
  function handleDragStart(taskId: number, columnId: number) {
    dragItem.current = { taskId, columnId };
  }

  function handleDragOver(e: React.DragEvent, columnId: number, position: number) {
    e.preventDefault();
    dragOverColumn.current = columnId;
    dragOverPosition.current = position;
  }

  async function handleDrop(e: React.DragEvent, targetColumnId: number) {
    e.preventDefault();
    if (!dragItem.current) return;

    const { taskId } = dragItem.current;
    const position = dragOverPosition.current || 1;

    // Optimistic update
    setColumns((prev) => {
      const newCols = prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }));

      const taskCol = prev.find((c) => c.tasks.some((t) => t.id === taskId));
      const task = taskCol?.tasks.find((t) => t.id === taskId);
      if (!task) return prev;

      const targetCol = newCols.find((c) => c.id === targetColumnId);
      if (!targetCol) return prev;

      const updatedTask = { ...task, columnId: targetColumnId, position };
      targetCol.tasks.splice(position - 1, 0, updatedTask);
      targetCol.tasks = targetCol.tasks.map((t, i) => ({ ...t, position: i + 1 }));

      return newCols;
    });

    dragItem.current = null;

    await fetch(`/tasks/api/tasks/${taskId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId: targetColumnId, position }),
    });
  }

  // Task CRUD callbacks
  async function handleTaskCreated(task: Task) {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === task.columnId ? { ...col, tasks: [...col.tasks, task] } : col
      )
    );
    setCreatingInColumn(null);
  }

  async function handleTaskUpdated(task: Task) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === task.id ? task : t)),
      }))
    );
    setSelectedTask(null);
  }

  async function handleTaskDeleted(taskId: number) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }))
    );
    setSelectedTask(null);
  }

  // Context menu: move to column
  async function handleQuickMove(taskId: number, targetColumnId: number) {
    setContextMenu(null);

    setColumns((prev) => {
      const newCols = prev.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }));
      const taskCol = prev.find((c) => c.tasks.some((t) => t.id === taskId));
      const task = taskCol?.tasks.find((t) => t.id === taskId);
      if (!task) return prev;
      const targetCol = newCols.find((c) => c.id === targetColumnId);
      if (!targetCol) return prev;
      targetCol.tasks.push({
        ...task,
        columnId: targetColumnId,
        position: targetCol.tasks.length + 1,
      });
      return newCols;
    });

    await fetch(`/tasks/api/tasks/${taskId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        columnId: targetColumnId,
        position: 999,
      }),
    });
  }

  // Bulk move
  async function handleBulkMove(targetColumnId: number) {
    const ids = Array.from(selectedTasks);
    for (const id of ids) {
      await handleQuickMove(id, targetColumnId);
    }
    setSelectedTasks(new Set());
    setBulkMode(false);
  }

  function toggleTaskSelection(taskId: number) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  return (
    <div
      className="flex flex-col h-[calc(100vh-56px)]"
      onClick={() => setContextMenu(null)}
    >
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        bulkMode={bulkMode}
        setBulkMode={setBulkMode}
        selectedCount={selectedTasks.size}
        columns={columns}
        onBulkMove={handleBulkMove}
      />

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-4 h-full min-w-max">
          {columns.map((col) => {
            const filtered = filterTasks(col.tasks);
            const isDoneColumn = col.name.includes("Erledigt");

            return (
              <div
                key={col.id}
                className="w-[300px] flex-shrink-0 flex flex-col bg-white/60 backdrop-blur rounded-xl shadow-sm border border-gray-200"
                onDragOver={(e) => handleDragOver(e, col.id, filtered.length + 1)}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column header */}
                <div
                  className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between rounded-t-xl"
                  style={{
                    backgroundColor: isDoneColumn
                      ? "#f0fdf4"
                      : col.color
                      ? `${col.color}20`
                      : "#f9fafb",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.color || "#6b7280" }}
                    />
                    <h3 className="font-semibold text-[#3B3B39] text-sm">
                      {col.name}
                    </h3>
                    <span className="bg-gray-200 text-gray-600 text-xs font-medium px-1.5 py-0.5 rounded-full">
                      {filtered.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setCreatingInColumn(col.id)}
                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#030386] hover:bg-white rounded transition-all text-lg leading-none"
                    title="Neue Aufgabe"
                  >
                    +
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
                  {creatingInColumn === col.id && (
                    <CreateTaskForm
                      columnId={col.id}
                      tags={tags}
                      onCreated={handleTaskCreated}
                      onCancel={() => setCreatingInColumn(null)}
                    />
                  )}
                  {filtered.map((task, idx) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id, col.id)}
                      onDragOver={(e) => handleDragOver(e, col.id, idx + 1)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ task, x: e.clientX, y: e.clientY });
                      }}
                    >
                      <TaskCard
                        task={task}
                        isDoneColumn={isDoneColumn}
                        onClick={() => setSelectedTask(task)}
                        bulkMode={bulkMode}
                        isSelected={selectedTasks.has(task.id)}
                        onToggleSelect={() => toggleTaskSelection(task.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          tags={tags}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          columns={columns}
          currentColumnId={contextMenu.task.columnId}
          onMove={(colId) => handleQuickMove(contextMenu.task.id, colId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
