import Link from "next/link";
import type { WebinarStatus } from "@prisma/client";
import { Calendar, Users, ExternalLink } from "lucide-react";
import { WebinarStatusBadge } from "./WebinarStatusBadge";

interface WebinarCardProps {
  id: string;
  title: string;
  slug: string;
  scheduledAt: Date | string;
  status: WebinarStatus;
  maxAttendees: number;
  registrationCount: number;
}

export function WebinarCard({
  id,
  title,
  slug,
  scheduledAt,
  status,
  maxAttendees,
  registrationCount,
}: WebinarCardProps) {
  const progressPercent = Math.min(
    Math.round((registrationCount / maxAttendees) * 100),
    100
  );

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
          {registrationCount} / {maxAttendees}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-dark-slate-100 rounded-full h-2 mb-3">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${progressPercent}%`,
            backgroundColor:
              progressPercent >= 90
                ? "#dc2626"
                : progressPercent >= 60
                  ? "#d97706"
                  : "#030386",
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-dark-slate-400">
        <span>{progressPercent}% belegt</span>
        {status === "OPEN" && (
          <span className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            /webinar/{slug}
          </span>
        )}
      </div>
    </Link>
  );
}
