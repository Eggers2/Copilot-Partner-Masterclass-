"use client";

import { useState, useRef } from "react";
import { Phone, Pencil, Upload, Loader2, AlertCircle } from "lucide-react";
import {
  FirstCallModal,
  type SerializedFirstCallScore,
  type FirstCallDraft,
} from "./FirstCallModal";
import { FirstCallBadge } from "./FirstCallBadge";
import { analyzeFirstCallTranscriptAction } from "@/app/admin/actions";

interface FirstCallSectionProps {
  leadId: string;
  existingScore: SerializedFirstCallScore | null;
}

/** Wrapper-Komponente für VTT-Auswertung, First-Call-Button und das Modal */
export function FirstCallSection({ leadId, existingScore }: FirstCallSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<FirstCallDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const openManual = () => {
    setDraft(null);
    setError("");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setDraft(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setError("");
    try {
      const text = await file.text();
      const res = await analyzeFirstCallTranscriptAction(leadId, text, file.name);
      if (res.error || !res.analysis) {
        setError(res.error ?? "Auswertung fehlgeschlagen.");
      } else {
        setDraft(res.analysis);
        setIsOpen(true);
      }
    } catch {
      setError("Die Datei konnte nicht gelesen werden.");
    }
    setAnalyzing(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-dark-slate-900">
              First Call
            </h3>
            {existingScore && (
              <FirstCallBadge totalScore={existingScore.totalScore} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* VTT-Transkript hochladen & mit Claude auswerten */}
            <label
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                analyzing
                  ? "border-dark-slate-200 text-dark-slate-400 bg-dark-slate-50 cursor-wait"
                  : "border-[#030386] text-[#030386] hover:bg-[#E3ECF8]/40 cursor-pointer"
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird ausgewertet…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  VTT auswerten
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".vtt,text/vtt"
                className="hidden"
                onChange={handleFileSelect}
                disabled={analyzing}
              />
            </label>

            <button
              type="button"
              onClick={openManual}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
            >
              {existingScore ? (
                <>
                  <Pencil className="w-4 h-4" />
                  Call bearbeiten
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  First Call
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <p className="mt-2 text-xs text-dark-slate-400">
          VTT-Transkript hochladen → Claude füllt Scorecard, Gesprächsnotizen und
          einen E-Mail-Entwurf automatisch vor (zum Prüfen & Anpassen).
        </p>

        {/* Zusammenfassung anzeigen, wenn Score vorhanden */}
        {existingScore && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-dark-slate-400">Score:</span>{" "}
              <span className="font-medium text-dark-slate-800">
                {existingScore.totalScore}/40
              </span>
            </div>
            {existingScore.recommendedPackage && (
              <div>
                <span className="text-dark-slate-400">Paket:</span>{" "}
                <span className="font-medium text-dark-slate-800">
                  {existingScore.recommendedPackage}
                </span>
              </div>
            )}
            {existingScore.contactSource && (
              <div>
                <span className="text-dark-slate-400">Kontaktweg:</span>{" "}
                <span className="font-medium text-dark-slate-800">
                  {existingScore.contactSource}
                </span>
              </div>
            )}
            {existingScore.followUpDate && (
              <div>
                <span className="text-dark-slate-400">Follow-up:</span>{" "}
                <span className="font-medium text-dark-slate-800">
                  {new Date(existingScore.followUpDate).toLocaleDateString("de-DE")}
                </span>
              </div>
            )}
            {existingScore.description && (
              <div className="col-span-2">
                <span className="text-dark-slate-400">Kurzbeschreibung:</span>{" "}
                <span className="text-dark-slate-700">{existingScore.description}</span>
              </div>
            )}
            {existingScore.painPoint && (
              <div className="col-span-2">
                <span className="text-dark-slate-400">Kernschmerz:</span>{" "}
                <span className="text-dark-slate-700">{existingScore.painPoint}</span>
              </div>
            )}
            {existingScore.nextStep && (
              <div className="col-span-2">
                <span className="text-dark-slate-400">Nächster Schritt:</span>{" "}
                <span className="text-dark-slate-700">{existingScore.nextStep}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <FirstCallModal
          leadId={leadId}
          existingScore={existingScore}
          draft={draft}
          onClose={handleClose}
        />
      )}
    </>
  );
}
