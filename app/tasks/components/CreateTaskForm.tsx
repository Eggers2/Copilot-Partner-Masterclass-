"use client";

import { useState } from "react";
import { Tag, Task } from "./KanbanBoard";
import { X } from "lucide-react";

const workstreams = [
  "Partnerschaften", "Plattform", "Funnel", "Content", "Marketing",
  "Sales Assets", "Webinar", "Launch", "ADN Events",
];
const responsibles = ["ALEX", "Katherina", "BEIDE"];
const priorities = ["SOFORT", "DIESE_WOCHE", "GEPLANT", "EVENT"];

export default function CreateTaskForm({
  columnId,
  tags,
  onCreated,
  onCancel,
}: {
  columnId: number;
  tags: Tag[];
  onCreated: (task: Task) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [workstream, setWorkstream] = useState("");
  const [responsible, setResponsible] = useState("");
  const [priority, setPriority] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);

    // Auto-select matching tags
    const tagIds: number[] = [];
    if (workstream) {
      const wTag = tags.find(
        (t) => t.category === "workstream" && t.name === workstream
      );
      if (wTag) tagIds.push(wTag.id);
    }
    if (priority) {
      const pMap: Record<string, string> = {
        SOFORT: "🔴 SOFORT",
        DIESE_WOCHE: "🟡 DIESE WOCHE",
        GEPLANT: "🟢 GEPLANT",
        EVENT: "📅 EVENT",
      };
      const pTag = tags.find(
        (t) => t.category === "priority" && t.name === pMap[priority]
      );
      if (pTag) tagIds.push(pTag.id);
    }
    if (responsible) {
      const rMap: Record<string, string> = {
        ALEX: "💻 ALEX",
        Katherina: "🎨 Katherina",
        BEIDE: "🤝 BEIDE",
      };
      const rTag = tags.find(
        (t) => t.category === "responsible" && t.name === rMap[responsible]
      );
      if (rTag) tagIds.push(rTag.id);
    }

    const res = await fetch("/tasks/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        columnId,
        workstream: workstream || undefined,
        responsible: responsible || undefined,
        priority: priority || undefined,
        deadline: deadline || undefined,
        tagIds,
      }),
    });

    const task = await res.json();
    setSaving(false);
    onCreated(task);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-[#E3ECF8] shadow p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#030386] uppercase">
          Neue Aufgabe
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel eingeben..."
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-[#3B3B39] outline-none focus:ring-1 focus:ring-[#030386]"
      />

      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={workstream}
          onChange={(e) => setWorkstream(e.target.value)}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 text-[#3B3B39] outline-none"
        >
          <option value="">Workstream</option>
          {workstreams.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
        <select
          value={responsible}
          onChange={(e) => setResponsible(e.target.value)}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 text-[#3B3B39] outline-none"
        >
          <option value="">Verantwortlich</option>
          {responsibles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 text-[#3B3B39] outline-none"
        >
          <option value="">Priorität</option>
          {priorities.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 text-[#3B3B39] outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="w-full text-xs font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded py-1.5 disabled:opacity-50 transition-colors"
      >
        {saving ? "Erstellen..." : "Erstellen"}
      </button>
    </form>
  );
}
