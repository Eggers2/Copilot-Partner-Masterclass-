"use client";

import { useState } from "react";
import { Phone, Pencil } from "lucide-react";
import { FirstCallModal, type SerializedFirstCallScore } from "./FirstCallModal";
import { FirstCallBadge } from "./FirstCallBadge";

interface FirstCallSectionProps {
  leadId: string;
  existingScore: SerializedFirstCallScore | null;
}

/** Wrapper-Komponente für den First-Call-Button und das Modal */
export function FirstCallSection({ leadId, existingScore }: FirstCallSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-dark-slate-900">
              First Call
            </h3>
            {existingScore && (
              <FirstCallBadge totalScore={existingScore.totalScore} />
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
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
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
