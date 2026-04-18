"use client";

import { useState } from "react";
import Link from "next/link";
import { Play, Zap, AlertTriangle, Check, RefreshCw } from "lucide-react";

type Confidence = "high" | "medium" | "low" | "ambiguous";

interface Evidence {
  source: "email" | "note-call" | "first-call-score" | "lead-notes";
  snippet: string;
  createdAt: string;
  paket: string | null;
  zahlungsmodell: string | null;
}

interface Row {
  leadId: string;
  email: string;
  name: string | null;
  status: "created" | "skipped" | "review" | "error";
  bestellNr?: string;
  paket?: string | null;
  zahlungsmodell?: string | null;
  confidence?: Confidence;
  placeholders?: string[];
  evidence?: Evidence[];
  message?: string;
}

interface Report {
  apply: boolean;
  total: number;
  created: number;
  skipped: number;
  review: number;
  errors: number;
  placeholders: number;
  rows: Row[];
}

const CONFIDENCE_CLASS: Record<Confidence, string> = {
  high: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-orange-100 text-orange-800",
  ambiguous: "bg-rose-100 text-rose-800",
};

const STATUS_CLASS: Record<Row["status"], string> = {
  created: "bg-emerald-100 text-emerald-800",
  skipped: "bg-dark-slate-100 text-dark-slate-700",
  review: "bg-amber-100 text-amber-800",
  error: "bg-rose-100 text-rose-800",
};

const STATUS_LABEL: Record<Row["status"], string> = {
  created: "Erstellt",
  skipped: "Übersprungen",
  review: "Review",
  error: "Fehler",
};

export function BackfillPanel() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingApply, setConfirmingApply] = useState(false);

  async function run(apply: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/shop/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apply }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Unbekannter Fehler.");
      } else {
        setReport(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
    setConfirmingApply(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-dark-slate-900">
          Lead → Bestellung Backfill
        </h2>
        <p className="text-sm text-dark-slate-500 mt-1">
          Legt retroaktiv Shop-Bestellungen für alle Leads mit Status WON an.
          Paket und Abo-Modell werden aus Emails, Notizen und der First-Call-Empfehlung
          ermittelt. Nur Kandidaten mit hoher Sicherheit werden automatisch übernommen;
          unklare Fälle landen im Review-Bucket und müssen im Lead-Detail einzeln
          bestätigt werden.
        </p>

        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => run(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg disabled:opacity-50"
          >
            {loading && !report ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Dry-Run analysieren
          </button>
          {report && !report.apply && report.created > 0 && (
            <button
              type="button"
              onClick={() => setConfirmingApply(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {report.created} Bestellungen jetzt anlegen
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>

      {report && (
        <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            {report.apply ? (
              <Check className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <h3 className="text-base font-semibold text-dark-slate-900">
              {report.apply ? "Ausgeführt" : "Dry-Run Report"}
            </h3>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="WON-Leads" value={report.total} />
            <Stat
              label={report.apply ? "Erstellt" : "Würden erstellt"}
              value={report.created}
              color="text-emerald-700"
            />
            <Stat label="Übersprungen" value={report.skipped} color="text-dark-slate-500" />
            <Stat label="Review nötig" value={report.review} color="text-amber-700" />
            <Stat label="Fehler" value={report.errors} color="text-rose-700" />
          </div>

          {report.placeholders > 0 && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              {report.placeholders} Bestellung(en) enthalten Platzhalter für fehlende
              Pflichtfelder. Diese später in der Bestelldetail-Ansicht ergänzen.
            </p>
          )}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-dark-slate-500 border-b border-dark-slate-100">
                <tr>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2 pr-3">Lead</th>
                  <th className="text-left py-2 pr-3">Paket / Abo</th>
                  <th className="text-left py-2 pr-3">Sicherheit</th>
                  <th className="text-left py-2 pr-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.leadId} className="border-b border-dark-slate-50">
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${STATUS_CLASS[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/admin/leads/${r.leadId}`}
                        className="text-[#030386] hover:underline"
                      >
                        {r.email}
                      </Link>
                      {r.name && (
                        <span className="text-dark-slate-400 ml-2 text-xs">({r.name})</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-dark-slate-700">
                      {r.paket ?? "—"} / {r.zahlungsmodell ?? "—"}
                      {r.bestellNr && (
                        <span className="text-dark-slate-400 ml-2 text-xs">
                          → {r.bestellNr}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {r.confidence && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${CONFIDENCE_CLASS[r.confidence]}`}
                        >
                          {r.confidence}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-dark-slate-500">
                      {r.placeholders && r.placeholders.length > 0 && (
                        <div className="text-amber-700">
                          Platzhalter: {r.placeholders.join(", ")}
                        </div>
                      )}
                      {r.message && <div>{r.message}</div>}
                      {r.status === "review" && (
                        <Link
                          href={`/admin/leads/${r.leadId}`}
                          className="text-[#030386] hover:underline"
                        >
                          Im Lead-Detail bestätigen →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmingApply && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl p-6">
            <h3 className="text-lg font-semibold text-dark-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Backfill bestätigen
            </h3>
            <p className="text-sm text-dark-slate-600 mt-3">
              Es werden <strong>{report.created}</strong> Bestellungen angelegt. Für jede
              wird der n8n-Webhook ausgelöst (erzeugt Email-Drafts zur manuellen Freigabe).
              Dieser Schritt ist nicht automatisch reversibel.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingApply(false)}
                className="px-4 py-2 text-sm text-dark-slate-600 hover:bg-dark-slate-50 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => run(true)}
                disabled={loading}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {loading ? "Läuft…" : "Ja, jetzt ausführen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-dark-slate-50 rounded-lg p-3">
      <div className="text-xs text-dark-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${color ?? "text-dark-slate-900"}`}>{value}</div>
    </div>
  );
}
