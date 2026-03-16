"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";

interface Risk {
  id: number;
  risk: string;
  priority: string;
  mitigation: string;
  position: number;
}

const prioOptions = ["Hoch", "Mittel", "Niedrig"];

const prioIcon: Record<string, typeof ShieldAlert> = {
  Hoch: ShieldAlert,
  Mittel: AlertTriangle,
  Niedrig: ShieldCheck,
};

const prioColor: Record<string, { bg: string; text: string; badge: string }> = {
  Hoch: { bg: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700" },
  Mittel: { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  Niedrig: { bg: "bg-green-50", text: "text-green-700", badge: "bg-green-100 text-green-700" },
};

export default function RisksPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ risk: "", priority: "", mitigation: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ risk: "", priority: "Mittel", mitigation: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/tasks/api/risks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRisks(data);
      })
      .finally(() => setLoading(false));
  }, []);

  function startEdit(r: Risk) {
    setEditingId(r.id);
    setEditForm({ risk: r.risk, priority: r.priority, mitigation: r.mitigation });
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/tasks/api/risks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setRisks((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setEditingId(null);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/tasks/api/risks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRisks((prev) => prev.filter((r) => r.id !== id));
      setConfirmDeleteId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.risk || !createForm.mitigation) return;

    const res = await fetch("/tasks/api/risks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    if (res.ok) {
      const newRisk = await res.json();
      setRisks((prev) => [...prev, newRisk]);
      setCreateForm({ risk: "", priority: "Mittel", mitigation: "" });
      setShowCreate(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#3B3B39]">
            Risiken & Gegenmaßnahmen
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Identifizierte Risiken für den Launch am 5. Mai 2026
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 text-sm bg-[#030386] text-white px-4 py-2 rounded-lg hover:bg-[#05015B] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neues Risiko
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 space-y-3"
        >
          <input
            value={createForm.risk}
            onChange={(e) => setCreateForm({ ...createForm, risk: e.target.value })}
            placeholder="Risiko beschreiben..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
          />
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <select
              value={createForm.priority}
              onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
            >
              {prioOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              value={createForm.mitigation}
              onChange={(e) => setCreateForm({ ...createForm, mitigation: e.target.value })}
              placeholder="Gegenmaßnahme..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="text-sm bg-[#030386] text-white px-4 py-1.5 rounded-lg hover:bg-[#05015B]"
            >
              Hinzufügen
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm text-gray-500 px-4 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Laden...</p>
      ) : (
        <div className="space-y-4">
          {risks.map((r) => {
            const colors = prioColor[r.priority] || prioColor.Niedrig;
            const Icon = prioIcon[r.priority] || ShieldCheck;

            if (editingId === r.id) {
              return (
                <div key={r.id} className="bg-white rounded-xl border border-[#030386] shadow-sm p-5 space-y-3">
                  <input
                    value={editForm.risk}
                    onChange={(e) => setEditForm({ ...editForm, risk: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
                  />
                  <div className="grid grid-cols-[120px_1fr] gap-3">
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
                    >
                      {prioOptions.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <input
                      value={editForm.mitigation}
                      onChange={(e) => setEditForm({ ...editForm, mitigation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(r.id)}
                      className="flex items-center gap-1 text-sm bg-[#030386] text-white px-3 py-1.5 rounded-lg hover:bg-[#05015B]"
                    >
                      <Check className="w-3.5 h-3.5" /> Speichern
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={r.id} className={`${colors.bg} rounded-xl border border-gray-200 p-5 group`}>
                <div className="flex items-start gap-4">
                  <Icon className={`w-6 h-6 ${colors.text} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-[#3B3B39]">{r.risk}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-[#3B3B39]">Gegenmaßnahme: </span>
                      {r.mitigation}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(r)}
                      className="p-1.5 text-gray-400 hover:text-[#030386] hover:bg-white rounded transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === r.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-xs bg-red-600 text-white px-2 py-0.5 rounded"
                        >
                          Ja
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-gray-500 px-2 py-0.5 rounded border border-gray-300 bg-white"
                        >
                          Nein
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
