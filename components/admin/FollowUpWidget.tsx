import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { Clock, ArrowRight } from "lucide-react";
import { LeadStatusBadge } from "./LeadStatusBadge";

interface FollowUpLead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: LeadStatus;
  followUpAt: Date | string | null;
}

export function FollowUpWidget({
  leads,
  showAll = false,
}: {
  leads: FollowUpLead[];
  showAll?: boolean;
}) {
  const now = new Date();
  const displayed = showAll ? leads : leads.slice(0, 5);

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-dark-slate-900 mb-4">
          <Clock className="w-5 h-5 inline mr-2 text-amber-500" />
          Follow-ups
        </h3>
        <p className="text-dark-slate-400 text-sm text-center py-6">
          Keine anstehenden Follow-ups.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-slate-900">
          <Clock className="w-5 h-5 inline mr-2 text-amber-500" />
          Follow-ups
        </h3>
        {!showAll && leads.length > 5 && (
          <Link
            href="/admin/tasks"
            className="text-sm text-[#030386] hover:underline flex items-center gap-1"
          >
            Alle anzeigen <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {displayed.map((lead) => {
          const followUp = lead.followUpAt ? new Date(lead.followUpAt) : null;
          const isOverdue = followUp ? followUp < now : false;

          return (
            <Link
              key={lead.id}
              href={`/admin/leads/${lead.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[#E3ECF8]/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-dark-slate-900 truncate">
                  {lead.name || lead.email}
                </p>
                {lead.company && (
                  <p className="text-xs text-dark-slate-400">{lead.company}</p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <LeadStatusBadge status={lead.status} />
                {followUp && (
                  <span
                    className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-dark-slate-500"}`}
                  >
                    {followUp.toLocaleDateString("de-DE")}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
