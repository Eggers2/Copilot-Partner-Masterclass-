"use client";

import { useState } from "react";
import type { WebinarStatus } from "@prisma/client";
import { Calendar, Users, ExternalLink, Link2 } from "lucide-react";
import { WebinarStatusBadge } from "@/components/admin/WebinarStatusBadge";
import { EditWebinarForm } from "@/components/admin/EditWebinarForm";
import { WebinarStatusActions } from "./status-actions";

interface WebinarDetailClientProps {
  webinar: {
    id: string;
    title: string;
    slug: string;
    scheduledAt: string;
    streamyardLink: string | null;
    description: string | null;
    status: WebinarStatus;
    registrationCount: number;
  };
}

export function WebinarDetailClient({ webinar }: WebinarDetailClientProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditWebinarForm
        webinar={webinar}
        onClose={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate-900">
            {webinar.title}
          </h1>
          {webinar.description && (
            <p className="text-dark-slate-500 text-sm mt-1">
              {webinar.description}
            </p>
          )}
        </div>
        <WebinarStatusBadge status={webinar.status} />
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm text-dark-slate-600 mb-4">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-dark-slate-400" />
          {new Date(webinar.scheduledAt).toLocaleString("de-DE", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-dark-slate-400" />
          {webinar.registrationCount} Teilnehmer
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {webinar.streamyardLink && (
          <a
            href={webinar.streamyardLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[#030386] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            StreamYard Anmeldung
          </a>
        )}
        <span className="flex items-center gap-1 text-dark-slate-400">
          <Link2 className="w-3.5 h-3.5" />
          /webinare (Landingpage)
        </span>
      </div>

      {/* Status Actions + Edit/Delete */}
      <div className="mt-4 pt-4 border-t border-dark-slate-100">
        <WebinarStatusActions
          webinarId={webinar.id}
          currentStatus={webinar.status}
          onEdit={() => setEditing(true)}
        />
      </div>
    </div>
  );
}
