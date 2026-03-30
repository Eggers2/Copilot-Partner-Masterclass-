"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WebinarStatus } from "@prisma/client";
import { Trash2, Pencil } from "lucide-react";
import {
  updateWebinarStatusAction,
  deleteWebinarAction,
} from "@/app/admin/actions";

const STATUS_TRANSITIONS: Record<
  WebinarStatus,
  { label: string; next: WebinarStatus }[]
> = {
  PLANNED: [
    { label: "Anmeldungen öffnen", next: "OPEN" },
    { label: "Absagen", next: "CANCELLED" },
  ],
  OPEN: [
    { label: "Anmeldungen schließen", next: "CLOSED" },
    { label: "Absagen", next: "CANCELLED" },
  ],
  CLOSED: [
    { label: "Als abgeschlossen markieren", next: "COMPLETED" },
    { label: "Anmeldungen wieder öffnen", next: "OPEN" },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export function WebinarStatusActions({
  webinarId,
  currentStatus,
  onEdit,
}: {
  webinarId: string;
  currentStatus: WebinarStatus;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const transitions = STATUS_TRANSITIONS[currentStatus];

  const handleStatusChange = async (newStatus: WebinarStatus) => {
    await updateWebinarStatusAction(webinarId, newStatus);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Webinar wirklich löschen? Alle Anmeldungen werden ebenfalls gelöscht.")) {
      return;
    }
    setDeleting(true);
    await deleteWebinarAction(webinarId);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {transitions.length > 0 && (
        <>
          <span className="text-sm text-dark-slate-500 mr-2">Status ändern:</span>
          {transitions.map((t) => (
            <button
              key={t.next}
              onClick={() => handleStatusChange(t.next)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                t.next === "CANCELLED"
                  ? "text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
                  : "text-[#030386] bg-[#E3ECF8] border border-[#DCDCEE] hover:bg-[#DCDCEE]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-dark-slate-600 bg-white border border-dark-slate-200 rounded-lg hover:bg-dark-slate-50 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Bearbeiten
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
          {deleting ? "Wird gelöscht..." : "Löschen"}
        </button>
      </div>
    </div>
  );
}
