"use client";

import { useState, useEffect, useActionState } from "react";
import { X, Star, Mail, Send, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  saveFirstCallScoreAction,
  sendFirstCallEmailAction,
} from "@/app/admin/actions";
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
  description: string | null;
  painPoint: string | null;
  teamSize: string | null;
  recommendedPackage: string | null;
  objections: string | null;
  nextStep: string | null;
  followUpDate: string | null;
  contactSource: string | null;
  scoreReasoning?: Record<string, string> | null;
  transcriptFilename?: string | null;
  analyzedAt?: string | null;
  calledAt: string;
  updatedAt: string;
}

/** Frische KI-Auswertung (noch nicht gespeichert) – füllt das Formular vor. */
export interface FirstCallDraft {
  scores: Record<string, number>;
  reasoning: Record<string, string>;
  notes: {
    description: string;
    painPoint: string;
    teamSize: string;
    recommendedPackage: string;
    objections: string;
    nextStep: string;
    contactSource: string;
    deadlineDate: string | null;
    followUpDate: string | null;
  };
  email: { subject: string; body: string };
}

interface FirstCallModalProps {
  leadId: string;
  existingScore: SerializedFirstCallScore | null;
  draft?: FirstCallDraft | null;
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
  draft = null,
  onClose,
}: FirstCallModalProps) {
  const [state, formAction] = useActionState(saveFirstCallScoreAction, null);

  // Score-State initialisieren (KI-Entwurf > bestehender Score > Default 1)
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
    for (const c of FIRST_CALL_CRITERIA) {
      if (draft && typeof draft.scores[c.key] === "number") {
        defaults[c.key] = draft.scores[c.key];
      } else if (existingScore) {
        defaults[c.key] = existingScore[c.key];
      }
    }
    return defaults;
  });

  // Begründungen je Kriterium (frischer Entwurf > gespeicherte Begründung)
  const reasoning = draft?.reasoning ?? existingScore?.scoreReasoning ?? null;

  // E-Mail-Entwurf-State (nur nach frischer KI-Auswertung relevant)
  const [emailSubject, setEmailSubject] = useState(draft?.email.subject ?? "");
  const [emailBody, setEmailBody] = useState(draft?.email.body ?? "");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleSendEmail = async () => {
    setEmailSending(true);
    setEmailError("");
    try {
      const res = await sendFirstCallEmailAction(leadId, emailSubject, emailBody);
      if (res.error) setEmailError(res.error);
      else setEmailSent(true);
    } catch {
      setEmailError("E-Mail konnte nicht gesendet werden.");
    }
    setEmailSending(false);
  };

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
            {draft
              ? "🤖 First Call – KI-Auswertung"
              : existingScore
                ? "✏️ First Call bearbeiten"
                : "📞 First Call Scoring"}
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
                  <div key={c.key}>
                    <div className="flex items-center justify-between gap-4">
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
                    {reasoning?.[c.key] && (
                      <p className="mt-1 text-xs italic text-dark-slate-500">
                        {reasoning[c.key]}
                      </p>
                    )}
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
                {/* Kurzbeschreibung */}
                <div>
                  <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                    Kurzbeschreibung
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={draft?.notes.description || existingScore?.description || ""}
                    className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-none"
                    placeholder="Zusammenfassung des Gesprächs für den Follow-up Termin"
                  />
                </div>

                {/* Kernschmerz */}
                <div>
                  <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                    Kernschmerz
                  </label>
                  <textarea
                    name="painPoint"
                    rows={2}
                    defaultValue={draft?.notes.painPoint || existingScore?.painPoint || ""}
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
                    defaultValue={draft?.notes.teamSize || existingScore?.teamSize || ""}
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
                    defaultValue={draft?.notes.recommendedPackage || existingScore?.recommendedPackage || ""}
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
                    defaultValue={draft?.notes.objections || existingScore?.objections || ""}
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
                    defaultValue={draft?.notes.nextStep || existingScore?.nextStep || ""}
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
                      defaultValue={draft?.notes.followUpDate || existingScore?.followUpDate?.slice(0, 10) || ""}
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
                      defaultValue={draft?.notes.contactSource || existingScore?.contactSource || ""}
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

            {/* ─── Abschnitt C: E-Mail-Entwurf (nur nach KI-Auswertung) ─── */}
            {draft?.email && (
              <div>
                <h3 className="text-sm font-semibold text-dark-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Entscheidungs-Mail
                </h3>
                <p className="text-xs text-dark-slate-400 mb-4">
                  Entwurf prüfen, anpassen und per Resend senden. Der One Pager
                  wird automatisch als PDF angehängt.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                      Betreff
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      disabled={emailSent}
                      className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none disabled:bg-dark-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-slate-600 mb-1">
                      Nachricht
                    </label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={12}
                      disabled={emailSent}
                      className="w-full px-3 py-2 text-sm border border-dark-slate-200 rounded-lg focus:border-[#030386] focus:outline-none resize-y disabled:bg-dark-slate-50"
                    />
                  </div>

                  {emailError && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {emailError}
                    </div>
                  )}

                  {emailSent ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <Check className="w-4 h-4" />
                      E-Mail wurde versendet.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={
                        emailSending ||
                        !emailSubject.trim() ||
                        !emailBody.trim()
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors disabled:opacity-50"
                    >
                      {emailSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Wird gesendet…
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Per Resend senden
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
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
