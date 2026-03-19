"use client";

import { useState, useEffect, useActionState } from "react";
import { X, Star } from "lucide-react";
import { saveFirstCallScoreAction } from "@/app/admin/actions";
import {
  FIRST_CALL_CRITERIA,
  getScoreTier,
} from "@/lib/constants/lead-config";

/** Serialisierter First-Call-Score (Datumswerte als ISO-String) */
export interface SerializedFirstCallScore {
  id: string;
  leadId: string;
  copilotDemand: number;
  currentOffer: number;
  teamCapacity: number;
  decisionMaker: number;
  budgetReadiness: number;
  urgency: number;
  mindset: number;
  msPartnerStatus: number;
  totalScore: number;
  painPoint: string | null;
  teamSize: string | null;
  recommendedPackage: string | null;
  objections: string | null;
  nextStep: string | null;
  followUpDate: string | null;
  contactSource: string | null;
  calledAt: string;
  updatedAt: string;
}

interface FirstCallModalProps {
  leadId: string;
  existingScore: SerializedFirstCallScore | null;
  onClose: () => void;
}

/** Sternebewertung (1–5) für ein einzelnes Kriterium */
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="focus:outline-none transition-colors"
          title={`${n} Punkt${n > 1 ? "e" : ""}`}
        >
          <Star
            className={`w-5 h-5 ${
              n <= value
                ? "fill-[#030386] text-[#030386]"
                : "fill-none text-dark-slate-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

type ScoreKey = (typeof FIRST_CALL_CRITERIA)[number]["key"];

/** Modal für die First-Call Qualifikations-Scorecard und Gesprächsnotizen */
export function FirstCallModal({
  leadId,
  existingScore,
  onClose,
}: FirstCallModalProps) {
  const [state, formAction] = useActionState(saveFirstCallScoreAction, null);

  // Score-State initialisieren (aus bestehendem Score oder Default 1)
  const [scores, setScores] = useState<Record<ScoreKey, number>>(() => {
    const defaults: Record<ScoreKey, number> = {
      copilotDemand: 1,
      currentOffer: 1,
      teamCapacity: 1,
      decisionMaker: 1,
      budgetReadiness: 1,
      urgency: 1,
      mindset: 1,
      msPartnerStatus: 1,
    };
    if (existingScore) {
      for (const c of FIRST_CALL_CRITERIA) {
        defaults[c.key] = existingScore[c.key];
      }
    }
    return defaults;
  });

  // Gesamt-Score live berechnen
  const totalScore = Object.values(scores).reduce((sum, v) => sum + v, 0);
  const tier = getScoreTier(totalScore);

  // Modal schließen bei erfolgreichem Speichern
  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const updateScore = (key: ScoreKey, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Hintergrund-Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal-Inhalt */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-dark-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-dark-slate-900">
            {existingScore ? "✏️ First Call bearbeiten" : "📞 First Call Scoring"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-dark-slate-500" />
          </button>
        </div>

        <form action={formAction}>
          <input type="hidden" name="leadId" value={leadId} />

          {/* Versteckte Inputs für Score-Werte */}
          {FIRST_CALL_CRITERIA.map((c) => (
            <input key={c.key} type="hidden" name={c.key} value={scores[c.key]} />
          ))}

          <div className="px-6 py-5 space-y-6">
            {/* ─── Abschnitt A: Qualifikations-Scorecard ─── */}
            <div>
              <h3 className="text-sm font-semibold text-dark-slate-900 uppercase tracking-wider mb-4">
                Qualifikations-Scorecard
              </h3>

              {/* Live-Score-Anzeige */}
              <div
                className="mb-5 p-3 rounded-lg text-center text-sm font-semibold"
                style={{
                  color: tier?.color ?? "#6B7280",
                  backgroundColor: tier?.bg ?? "#F3F4F6",
                }}
              >
                Score: {totalScore}/40
                {tier && ` – ${tier.emoji} ${tier.label}`}
              </div>

              <div className="space-y-4">
                {FIRST_CALL_CRITERIA.map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-slate-800">
                        {c.label}
                      </p>
                      <p className="text-xs text-dark-slate-400 truncate">
                        {c.hint}
                      </p>
                    </div>
                    <StarRating
                      value={scores[c.key]}
                      onChange={(v) => updateScore(c.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ─── Abschnitt B: Gesprächsnotizen ─── */}
            <div>
              <h3 className="text-sm font-semibold text-dark-slate-900 uppercase tracking-wider mb-4">
                Gesprächsnotizen
              </h3>

              <div className="space-y-4">
                {/* Kernschmerz */}
                <div>
                  <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                    Kernschmerz
                  </label>
                  <textarea
                    name="painPoint"
                    rows={2}
                    defaultValue={existingScore?.painPoint ?? ""}
                    className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-none"
                    placeholder="Was ist das größte Problem des Kunden?"
                  />
                </div>

                {/* Teamgröße */}
                <div>
                  <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                    Teamgröße für Masterclass
                  </label>
                  <input
                    name="teamSize"
                    type="text"
                    defaultValue={existingScore?.teamSize ?? ""}
                    className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
                    placeholder="z.B. 10 Personen"
                  />
                </div>

                {/* Empfohlenes Paket */}
                <div>
                  <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                    Empfohlenes Paket
                  </label>
                  <select
                    name="recommendedPackage"
                    defaultValue={existingScore?.recommendedPackage ?? ""}
                    className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
                  >
                    <option value="">– Bitte wählen –</option>
                    <option value="Starter">Starter</option>
                    <option value="Team">Team</option>
                    <option value="Business">Business</option>
                  </select>
                </div>

                {/* Einwände */}
                <div>
                  <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                    Einwände
                  </label>
                  <textarea
                    name="objections"
                    rows={2}
                    defaultValue={existingScore?.objections ?? ""}
                    className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-none"
                    placeholder="Welche Bedenken hat der Kunde?"
                  />
                </div>

                {/* Nächster Schritt */}
                <div>
                  <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                    Nächster Schritt
                  </label>
                  <textarea
                    name="nextStep"
                    rows={2}
                    defaultValue={existingScore?.nextStep ?? ""}
                    className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-none"
                    placeholder="Was wurde als nächster Schritt vereinbart?"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Follow-up Datum */}
                  <div>
                    <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                      Follow-up Datum
                    </label>
                    <input
                      name="followUpDate"
                      type="date"
                      defaultValue={existingScore?.followUpDate?.slice(0, 10) ?? ""}
                      className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
                    />
                  </div>

                  {/* Kontaktweg */}
                  <div>
                    <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                      Kontaktweg
                    </label>
                    <select
                      name="contactSource"
                      defaultValue={existingScore?.contactSource ?? ""}
                      className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none"
                    >
                      <option value="">– Bitte wählen –</option>
                      <option value="ADN">ADN</option>
                      <option value="Warteliste">Warteliste</option>
                      <option value="Training">Training</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Sonstiges">Sonstiges</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-dark-slate-100 px-6 py-4 flex items-center justify-between rounded-b-2xl">
            <div>
              {state?.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-dark-slate-600 border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
