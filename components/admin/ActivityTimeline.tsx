import type { ActivityType } from "@prisma/client";
import {
  FileText,
  Mail,
  Phone,
  Users,
  ArrowRightLeft,
  Clock,
  Calendar,
} from "lucide-react";

const ACTIVITY_ICONS: Record<ActivityType, typeof FileText> = {
  NOTE: FileText,
  EMAIL: Mail,
  CALL: Phone,
  MEETING: Users,
  STATUS_CHANGE: ArrowRightLeft,
  FOLLOW_UP: Clock,
  WEBINAR: Calendar,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  NOTE: "Notiz",
  EMAIL: "E-Mail",
  CALL: "Anruf",
  MEETING: "Meeting",
  STATUS_CHANGE: "Statusänderung",
  FOLLOW_UP: "Follow-up",
  WEBINAR: "Webinar",
};

const ACTIVITY_COLORS: Record<ActivityType, { icon: string; bg: string }> = {
  NOTE: { icon: "text-[#3B3B39]", bg: "bg-gray-100" },
  EMAIL: { icon: "text-green-600", bg: "bg-green-50" },
  CALL: { icon: "text-orange-600", bg: "bg-orange-50" },
  MEETING: { icon: "text-[#030386]", bg: "bg-[#E3ECF8]" },
  STATUS_CHANGE: { icon: "text-[#030386]", bg: "bg-[#E3ECF8]" },
  FOLLOW_UP: { icon: "text-amber-600", bg: "bg-amber-50" },
  WEBINAR: { icon: "text-indigo-600", bg: "bg-indigo-50" },
};

interface Activity {
  id: string;
  type: ActivityType;
  content: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string | Date;
}

export function ActivityTimeline({
  activities,
}: {
  activities: Activity[];
}) {
  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-dark-slate-900 mb-4">
          Aktivitäten
        </h3>
        <p className="text-dark-slate-400 text-sm text-center py-8">
          Noch keine Aktivitäten vorhanden.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-dark-slate-900 mb-4">
        Aktivitäten
      </h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type];
          const colors = ACTIVITY_COLORS[activity.type];
          return (
            <div key={activity.id} className="flex gap-3">
              <div
                className={`flex-shrink-0 w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center`}
              >
                <Icon className={`w-4 h-4 ${colors.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-semibold ${colors.icon}`}>
                    {ACTIVITY_LABELS[activity.type]}
                  </span>
                  <span className="text-xs text-dark-slate-400">
                    {new Date(activity.createdAt).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-dark-slate-700">
                  {activity.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
