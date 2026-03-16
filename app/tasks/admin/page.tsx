"use client";

import { useState, useEffect } from "react";
import { UserPlus, Shield, User } from "lucide-react";

interface TaskUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

export default function TasksAdminPage() {
  const [users, setUsers] = useState<TaskUser[]>([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "member",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // We don't have a GET users endpoint - that's fine, focus on creation
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-[#3B3B39] mb-6 flex items-center gap-2">
        <Shield className="w-6 h-6 text-[#030386]" />
        Benutzerverwaltung
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-[#3B3B39] mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Neuen Benutzer anlegen
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">
                Benutzername
              </label>
              <input
                value={form.username}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">
                Anzeigename
              </label>
              <input
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">
                Passwort
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#3B3B39] outline-none focus:ring-2 focus:ring-[#030386]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#3B3B39] mb-1">
                Rolle
              </label>
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

      {users.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-[#3B3B39] mb-4">
            Angelegte Benutzer
          </h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg"
              >
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-sm text-[#3B3B39]">
                  {u.displayName}
                </span>
                <span className="text-gray-500 text-sm">@{u.username}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === "admin"
                      ? "bg-[#030386] text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
