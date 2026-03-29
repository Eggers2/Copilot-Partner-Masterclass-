"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Check, UserPlus, UserCheck, Eye, AlertCircle } from "lucide-react";
import {
  previewCsvAction,
  processCsvAction,
  type CsvPreviewEntry,
  type CsvParticipant,
} from "@/app/admin/actions";

export function CsvUpload({ webinarId }: { webinarId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<CsvPreviewEntry[] | null>(null);
  const [rawParticipants, setRawParticipants] = useState<CsvParticipant[]>([]);
  const [result, setResult] = useState<{ success: boolean; processed: number } | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setPreview(null);
    setResult(null);

    try {
      const text = await file.text();
      const { entries, error: csvError } = await previewCsvAction(text);

      if (csvError) {
        setError(csvError);
        setLoading(false);
        return;
      }

      setPreview(entries);
      // Store raw participants for later processing
      setRawParticipants(
        entries.map((e) => ({
          email: e.email,
          firstName: e.firstName,
          lastName: e.lastName,
          company: e.company,
          status: e.csvStatus,
        }))
      );
    } catch {
      setError("Fehler beim Lesen der CSV-Datei.");
    }

    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const res = await processCsvAction(webinarId, rawParticipants);
      if (res.error) {
        setError(res.error);
      } else {
        setResult({ success: true, processed: res.processed ?? 0 });
        setPreview(null);
        router.refresh();
      }
    } catch {
      setError("Fehler beim Speichern.");
    }

    setSaving(false);
  };

  const handleCancel = () => {
    setPreview(null);
    setRawParticipants([]);
    setError("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const newCount = preview?.filter((e) => e.isNew).length ?? 0;
  const existingCount = preview?.filter((e) => !e.isNew).length ?? 0;
  const attendedCount = preview?.filter((e) => e.attended).length ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm">
      <div className="p-6 border-b border-dark-slate-100">
        <h3 className="text-lg font-semibold text-dark-slate-900 mb-1">
          StreamYard CSV Import
        </h3>
        <p className="text-sm text-dark-slate-500">
          Lade die Teilnehmer-CSV von StreamYard hoch, um die Anmeldungen mit der Warteliste abzugleichen.
        </p>
      </div>

      <div className="p-6">
        {/* Success Message */}
        {result?.success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">
                Import erfolgreich!
              </p>
              <p className="text-sm text-green-700">
                {result.processed} Teilnehmer wurden verarbeitet.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* File Upload */}
        {!preview && (
          <label
            className={`flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              loading
                ? "border-dark-slate-200 bg-dark-slate-50"
                : "border-dark-slate-300 hover:border-[#030386] hover:bg-[#E3ECF8]/30"
            }`}
          >
            {loading ? (
              <>
                <div className="w-8 h-8 border-2 border-[#030386]/30 border-t-[#030386] rounded-full animate-spin" />
                <span className="text-sm text-dark-slate-500">CSV wird analysiert...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-dark-slate-400" />
                <div className="text-center">
                  <span className="text-sm font-semibold text-dark-slate-700">
                    CSV-Datei auswählen
                  </span>
                  <p className="text-xs text-dark-slate-400 mt-1">
                    StreamYard Export (.csv)
                  </p>
                </div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
              disabled={loading}
            />
          </label>
        )}

        {/* Preview */}
        {preview && preview.length > 0 && (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{preview.length}</p>
                <p className="text-xs text-blue-600">Gesamt</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{newCount}</p>
                <p className="text-xs text-green-600">Neu</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{existingCount}</p>
                <p className="text-xs text-amber-600">Bereits bekannt</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">{attendedCount}</p>
                <p className="text-xs text-purple-600">Teilgenommen</p>
              </div>
            </div>

            {/* Participant Table */}
            <div className="overflow-x-auto border border-dark-slate-100 rounded-xl mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-slate-50 border-b border-dark-slate-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-dark-slate-500 uppercase">
                      E-Mail
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-dark-slate-500 uppercase">
                      Name
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-dark-slate-500 uppercase">
                      Firma
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-dark-slate-500 uppercase">
                      Status
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-dark-slate-500 uppercase">
                      Warteliste
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-slate-50">
                  {preview.map((entry) => (
                    <tr key={entry.email} className="hover:bg-dark-slate-50/50">
                      <td className="px-4 py-2 text-dark-slate-700 font-mono text-xs">
                        {entry.email}
                      </td>
                      <td className="px-4 py-2 text-dark-slate-700">
                        {entry.firstName} {entry.lastName}
                      </td>
                      <td className="px-4 py-2 text-dark-slate-500">
                        {entry.company || "–"}
                      </td>
                      <td className="px-4 py-2">
                        {entry.attended ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-green-700 bg-green-100">
                            <Eye className="w-3 h-3" />
                            Teilgenommen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-blue-700 bg-blue-100">
                            <FileText className="w-3 h-3" />
                            Nur registriert
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {entry.isNew ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-100">
                            <UserPlus className="w-3 h-3" />
                            Neu
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-dark-slate-600 bg-dark-slate-100">
                            <UserCheck className="w-3 h-3" />
                            Bekannt
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-dark-slate-500 mb-4 p-3 bg-dark-slate-50 rounded-lg">
              <span><strong>Neu:</strong> Wird als neuer Lead in der Warteliste angelegt</span>
              <span><strong>Bekannt:</strong> Bereits in der Warteliste – Name/Firma werden ergänzt (falls leer)</span>
              <span><strong>Teilgenommen:</strong> Lead-Status wird auf &quot;Webinar besucht&quot; gesetzt</span>
              <span><strong>Nur registriert:</strong> Anmeldung wird in Aktivitäten vermerkt</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {preview.length} Teilnehmer importieren
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-dark-slate-600 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
