"use client";

import { useState, useEffect } from "react";
import { UserPlus, Shield, User, Pencil, Trash2, Key, X, Check } from "lucide-react";

interface TaskUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

export default function TasksAdminPage() {
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "member",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", role: "", password: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/tasks/api/users")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.username || !form.password || !form.displayName) {
      setError("Alle Felder sind Pflicht.");
      return;
    }

    setSaving(true);
    const res = await fetch("/tasks/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Fehler beim Erstellen.");
      return;
    }

    setSuccess(`Benutzer "${data.displayName}" wurde angelegt.`);
    setForm({ username: "", password: "", displayName: "", role: "member" });
    setUsers((prev) => [...prev, data]);
  }

  function startEdit(user: TaskUser) {
    setEditingId(user.id);
    setEditForm({ displayName: user.displayName, role: user.role, password: "" });
  }

  async function saveEdit(userId: number) {
    const body: Record<string, string> = {};
    if (editForm.displayName) body.displayName = editForm.displayName;
    if (editForm.role) body.role = editForm.role;
    if (editForm.password) body.password = editForm.password;

    const res = await fetch(`/tasks/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
      setEditingId(null);
      setSuccess("Benutzer aktualisiert.");
    }
  }

  async function handleDelete(userId: number) {
    const res = await fetch(`/tasks/api/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setConfirmDeleteId(null);
      setSuccess("Benutzer gelöscht.");
    } else {
      const data = await res.json();
      setError(data.error || "Fehler beim Löschen.");
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-[#3B3B39] mb-6 flex items-center gap-2">
        <Shield className="w-6 h-6 text-[#030386]" />
        Benutzerverwaltung
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
          <button onClick={() => setError("")} className="float-right"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
          {success}
          <button onClick={() => setSuccess("")} className="float-right"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Existing users */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#3B3B39] mb-4">
          Benutzer
        </h2>
        {loading ? (
          <p className="text-gray-500 text-sm">Laden...</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Benutzer vorhanden.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="border border-gray-200 rounded-lg p-3">
                {editingId === u.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Anzeigename</label>
                        <input
                          value={editForm.displayName}
                          onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-[#3B3B39] outline-none focus:ring-1 focus:ring-[#030386]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Rolle</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-[#3B3B39] outline-none focus:ring-1 focus:ring-[#030386]"
                        >
                          <option value="member">Mitglied</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        <Key className="w-3 h-3 inline mr-1" />
                        Neues Passwort (leer lassen = unverändert)
                      </label>
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        placeholder="Neues Passwort..."
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-[#3B3B39] outline-none focus:ring-1 focus:ring-[#030386]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(u.id)}
                        className="flex items-center gap-1 text-xs bg-[#030386] text-white px-3 py-1.5 rounded-lg hover:bg-[#05015B]"
                      >
                        <Check className="w-3.5 h-3.5" /> Speichern
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-sm text-[#3B3B39]">{u.displayName}</span>
                      <span className="text-gray-500 text-sm">@{u.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === "admin" ? "bg-[#030386] text-white" : "bg-gray-200 text-gray-600"
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(u)}
                        className="p-1.5 text-gray-400 hover:text-[#030386] hover:bg-gray-100 rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === u.id ? (
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-xs text-red-600">Löschen?</span>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-xs bg-red-600 text-white px-2 py-0.5 rounded"
                          >
                            Ja
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-gray-500 px-2 py-0.5 rounded border border-gray-300"
                          >
                            Nein
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(u.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create new user */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-[#3B3B39] mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Neuen Benutzer anlegen
        </h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">Benutzername</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">Anzeigename</label>
              <input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">Passwort</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">Rolle</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              >
                <option value="member">Mitglied</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-[#030386] text-white rounded-lg font-semibold hover:bg-[#05015B] transition-colors disabled:opacity-50"
          >
            {saving ? "Wird angelegt..." : "Benutzer anlegen"}
          </button>
        </form>
      </div>
    </div>
  );
}
