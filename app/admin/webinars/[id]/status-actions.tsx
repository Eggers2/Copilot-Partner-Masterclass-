"use client";

import { useRouter } from "next/navigation";
import type { WebinarStatus } from "@prisma/client";
import { updateWebinarStatusAction } from "@/app/admin/actions";

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
}: {
  webinarId: string;
  currentStatus: WebinarStatus;
}) {
  const router = useRouter();
  const transitions = STATUS_TRANSITIONS[currentStatus];

  if (transitions.length === 0) return null;

  const handleStatusChange = async (newStatus: WebinarStatus) => {
    await updateWebinarStatusAction(webinarId, newStatus);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
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
    </div>
  );
}
