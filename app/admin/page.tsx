"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lock,
  LogOut,
  Users,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  Calendar,
  Mail,
  TrendingUp,
  Shield,
  Trash2,
} from "lucide-react";

interface WaitlistEntry {
  id: string;
  email: string;
  createdAt: string;
}

interface WaitlistData {
  total: number;
  entries: WaitlistEntry[];
}

type AuthState = "idle" | "loading" | "authenticated" | "error";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");

  const [data, setData] = useState<WaitlistData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (token: string) => {
      setDataLoading(true);
      setDataError("");
      try {
        const res = await fetch("/api/waitlist", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          setAuthState("idle");
          setAuthToken(null);
          setDataError("Session abgelaufen. Bitte erneut anmelden.");
          return;
        }
        if (!res.ok) throw new Error("Fehler beim Laden der Daten.");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setDataError(
          err instanceof Error ? err.message : "Unbekannter Fehler."
        );
      } finally {
        setDataLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (authState === "authenticated" && authToken) {
      fetchData(authToken);
    }
  }, [authState, authToken, fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setAuthState("loading");
    setAuthError("");

    // Verify by calling the API with the password
    try {
      const res = await fetch("/api/waitlist", {
        headers: { Authorization: `Bearer ${password}` },
      });

      if (res.ok) {
        setAuthToken(password);
        setAuthState("authenticated");
        setPassword("");
      } else if (res.status === 401) {
        setAuthError("Falsches Passwort. Bitte versuche es erneut.");
        setAuthState("error");
      } else {
        setAuthError("Fehler beim Anmelden. Bitte versuche es erneut.");
        setAuthState("error");
      }
    } catch {
      setAuthError("Verbindungsfehler. Bitte versuche es erneut.");
      setAuthState("error");
    }
  };

  const handleLogout = () => {
    setAuthState("idle");
    setAuthToken(null);
    setData(null);
    setPassword("");
    setAuthError("");
  };

  const downloadCSV = () => {
    if (!data) return;

    const headers = ["ID", "E-Mail", "Eingetragen am"];
    const rows = data.entries.map((entry) => [
      entry.id,
      entry.email,
      new Date(entry.createdAt).toLocaleString("de-DE"),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `warteliste_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/waitlist?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                total: prev.total - 1,
                entries: prev.entries.filter((e) => e.id !== id),
              }
            : prev
        );
      }
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── LOGIN SCREEN ──────────────────────────────────────
  if (authState !== "authenticated") {
    return (
      <div className="min-h-screen bg-dark-slate-950 flex items-center justify-center p-4">
        {/* Background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ms-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-ms-blue-500/20 border border-ms-blue-500/30 rounded-2xl mb-4">
              <Shield className="w-8 h-8 text-ms-blue-400" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 bg-ms-blue-500 rounded-md flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-dark-slate-400 text-sm">Next Skills</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Admin-Bereich</h1>
            <p className="text-dark-slate-400 text-sm mt-1">
              Copilot Partner Masterclass – Warteliste
            </p>
          </div>

          <div className="bg-dark-slate-800 border border-dark-slate-700 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-dark-slate-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-1.5" />
                  Admin-Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Passwort eingeben..."
                    required
                    disabled={authState === "loading"}
                    className="w-full px-4 py-3 pr-12 bg-dark-slate-900 border border-dark-slate-600 focus:border-ms-blue-400 rounded-xl text-white placeholder-dark-slate-500 outline-none transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-slate-400 hover:text-dark-slate-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {(authState === "error" || authError) && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authState === "loading" || !password.trim()}
                className="w-full py-3 bg-ms-blue-500 hover:bg-ms-blue-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                {authState === "loading" ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Anmelden...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Anmelden
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-dark-slate-600 text-xs mt-6">
            Geschützter Bereich. Nur für autorisierte Nutzer.
          </p>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-slate-50">
      {/* Header */}
      <header className="bg-dark-slate-900 border-b border-dark-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ms-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-sm">Next Skills</span>
                <span className="text-dark-slate-400 text-xs ml-2">
                  Admin-Dashboard
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-dark-slate-400 hover:text-white hover:bg-dark-slate-700 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-dark-slate-900">
            Warteliste – Übersicht
          </h1>
          <p className="text-dark-slate-500 text-sm mt-1">
            Microsoft Copilot Partner Masterclass
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-ms-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-ms-blue-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-3xl font-extrabold text-dark-slate-900">
              {dataLoading ? (
                <span className="inline-block w-12 h-8 bg-dark-slate-100 rounded animate-pulse" />
              ) : (
                data?.total ?? 0
              )}
            </p>
            <p className="text-dark-slate-500 text-sm mt-1">
              Anmeldungen gesamt
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-dark-slate-900">
              {dataLoading ? (
                <span className="inline-block w-12 h-8 bg-dark-slate-100 rounded animate-pulse" />
              ) : data?.entries.length ? (
                new Date(data.entries[0].createdAt).toLocaleDateString("de-DE")
              ) : (
                "–"
              )}
            </p>
            <p className="text-dark-slate-500 text-sm mt-1">
              Letzte Anmeldung
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-dark-slate-900">Mai 25</p>
            <p className="text-dark-slate-500 text-sm mt-1">
              Programm-Start
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-dark-slate-900">
            Alle Anmeldungen
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => authToken && fetchData(authToken)}
              disabled={dataLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-dark-slate-600 bg-white border border-dark-slate-200 hover:bg-dark-slate-50 rounded-lg transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`}
              />
              Aktualisieren
            </button>
            <button
              onClick={downloadCSV}
              disabled={!data || data.entries.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-ms-blue-500 hover:bg-ms-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
            >
              <Download className="w-4 h-4" />
              CSV exportieren
            </button>
          </div>
        </div>

        {/* Error State */}
        {dataError && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {dataError}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm overflow-hidden">
          {dataLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-dark-slate-300 animate-spin mx-auto mb-3" />
              <p className="text-dark-slate-400 text-sm">
                Daten werden geladen...
              </p>
            </div>
          ) : !data || data.entries.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-dark-slate-200 mx-auto mb-3" />
              <p className="text-dark-slate-500 font-medium">
                Noch keine Anmeldungen
              </p>
              <p className="text-dark-slate-400 text-sm mt-1">
                Wenn sich jemand einträgt, erscheint es hier.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-slate-50 border-b border-dark-slate-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                      E-Mail-Adresse
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider">
                      Eingetragen am
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-dark-slate-500 uppercase tracking-wider hidden md:table-cell">
                      ID
                    </th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-slate-50">
                  {data.entries.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-ms-blue-50/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-dark-slate-400 font-mono">
                        {data.total - index}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-ms-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-ms-blue-600 text-xs font-bold">
                              {entry.email[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-dark-slate-900">
                            {entry.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-slate-500">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-xs text-dark-slate-300 font-mono hidden md:table-cell">
                        {entry.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="p-1.5 rounded text-dark-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="Eintrag löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table footer */}
              <div className="px-6 py-4 bg-dark-slate-50 border-t border-dark-slate-100">
                <p className="text-sm text-dark-slate-500">
                  Gesamt:{" "}
                  <strong className="text-dark-slate-700">
                    {data.total} Anmeldung{data.total !== 1 ? "en" : ""}
                  </strong>
                  {" · "}
                  Sortiert nach: Neueste zuerst
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
