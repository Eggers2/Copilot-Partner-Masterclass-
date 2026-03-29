import Link from "next/link";
import type { WebinarStatus } from "@prisma/client";
import { Calendar, Users } from "lucide-react";
import { WebinarStatusBadge } from "./WebinarStatusBadge";

interface WebinarCardProps {
  id: string;
  title: string;
  scheduledAt: Date | string;
  status: WebinarStatus;
  registrationCount: number;
  streamyardLink: string | null;
}

export function WebinarCard({
  id,
  title,
  scheduledAt,
  status,
  registrationCount,
  streamyardLink,
}: WebinarCardProps) {
  return (
    <Link
      href={`/admin/webinars/${id}`}
      className="block bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-dark-slate-900">{title}</h3>
        <WebinarStatusBadge status={status} />
      </div>

      <div className="flex items-center gap-4 text-sm text-dark-slate-500 mb-4">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {new Date(scheduledAt).toLocaleString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          {registrationCount} Teilnehmer
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-dark-slate-400">
        {streamyardLink ? (
          <span className="text-green-600 font-medium">StreamYard verknüpft</span>
        ) : (
          <span className="text-amber-600 font-medium">Kein StreamYard-Link</span>
        )}
      </div>
    </Link>
  );
}
