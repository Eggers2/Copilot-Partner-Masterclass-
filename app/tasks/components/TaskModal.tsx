"use client";

import { useState } from "react";
import { Task, Tag } from "./KanbanBoard";
import { X, Trash2, Save } from "lucide-react";

const workstreams = [
  "Partnerschaften", "Plattform", "Funnel", "Content", "Marketing",
  "Sales Assets", "Webinar", "Launch", "ADN Events",
];
const responsibles = ["ALEX", "Katherina", "BEIDE"];
const priorities = ["SOFORT", "DIESE_WOCHE", "GEPLANT", "EVENT"];

export default function TaskModal({
  task,
  tags,
  onClose,
  onUpdated,
  onDeleted,
}: {
  task: Task;
  tags: Tag[];
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDeleted: (id: number) => void;
}) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || "",
    workstream: task.workstream || "",
    responsible: task.responsible || "",
    priority: task.priority || "",
    deadline: task.deadline ? task.deadline.split("T")[0] : "",
    notes: task.notes || "",
    weekLabel: task.weekLabel || "",
  });
  const [selectedTags, setSelectedTags] = useState<number[]>(
    task.tags.map((t) => t.tag.id)
  );
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/tasks/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        deadline: form.deadline || null,
        tagIds: selectedTags,
      }),
    });
    const updated = await res.json();
    setSaving(false);
    onUpdated(updated);
  }

  async function handleDelete() {
    await fetch(`/tasks/api/tasks/${task.id}`, { method: "DELETE" });
    onDeleted(task.id);
  }

  function toggleTag(tagId: number) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  const tagsByCategory: Record<string, Tag[]> = {};
  for (const tag of tags) {
    const cat = tag.category || "custom";
    if (!tagsByCategory[cat]) tagsByCategory[cat] = [];
    tagsByCategory[cat].push(tag);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#3B3B39]">
            Aufgabe bearbeiten
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#3B3B39] mb-1">
              Titel
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#3B3B39] mb-1">
              Beschreibung
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386] resize-y"
            />
          </div>

          {/* Grid of dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">
                Workstream
              </label>
              <select
                value={form.workstream}
                onChange={(e) =>
                  setForm({ ...form, workstream: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              >
                <option value="">—</option>
                {workstreams.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">
                Verantwortlich
              </label>
              <select
                value={form.responsible}
                onChange={(e) =>
                  setForm({ ...form, responsible: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              >
                <option value="">—</option>
                {responsibles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">
                Priorität
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              >
                <option value="">—</option>
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#3B3B39] mb-1">
              Notizen
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386] resize-y"
            />
          </div>

          {/* Week label */}
          <div>
            <label className="block text-sm font-medium text-[#3B3B39] mb-1">
              Wochen-Label
            </label>
            <input
              value={form.weekLabel}
              onChange={(e) =>
                setForm({ ...form, weekLabel: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              placeholder="z.B. WOCHE 1 — 14.–20. März"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#3B3B39] mb-2">
              Tags
            </label>
            {Object.entries(tagsByCategory).map(([cat, catTags]) => (
              <div key={cat} className="mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                  {cat === "workstream"
                    ? "Workstream"
                    : cat === "priority"
                    ? "Priorität"
                    : cat === "responsible"
                    ? "Verantwortlich"
                    : "Sonstige"}
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {catTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                        selectedTags.includes(tag.id)
                          ? "text-white border-transparent"
                          : "text-gray-600 border-gray-300 hover:border-gray-400"
                      }`}
                      style={
                        selectedTags.includes(tag.id)
                          ? { backgroundColor: tag.color }
                          : {}
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Löschen
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Wirklich löschen?</span>
              <button
                onClick={handleDelete}
                className="text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg"
              >
                Ja
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-lg border border-gray-300"
              >
                Nein
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm text-white bg-[#030386] hover:bg-[#05015B] px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
