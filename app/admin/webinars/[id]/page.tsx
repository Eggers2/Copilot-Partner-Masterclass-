import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Users, ExternalLink, Link2 } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { getWebinar } from "@/lib/db/webinars";
import { WebinarStatusBadge } from "@/components/admin/WebinarStatusBadge";
import { RegistrationTable } from "@/components/admin/RegistrationTable";
import { WebinarStatusActions } from "./status-actions";

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { id } = await params;
  const webinar = await getWebinar(id);

  if (!webinar) notFound();

  const serializedRegistrations = webinar.registrations.map((r) => ({
    ...r,
    registeredAt: r.registeredAt.toISOString(),
    attendedAt: r.attendedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/webinars"
          className="inline-flex items-center gap-1 text-sm text-dark-slate-500 hover:text-[#030386] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zu Webinare
        </Link>
      </div>

      {/* Webinar Info Card */}
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
            <Clock className="w-4 h-4 text-dark-slate-400" />
            {webinar.durationMin} Min.
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-dark-slate-400" />
            {webinar._count.registrations} / {webinar.maxAttendees} Teilnehmer
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {webinar.zoomLink && (
            <a
              href={webinar.zoomLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#030386] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Zoom-Link
            </a>
          )}
          <span className="flex items-center gap-1 text-dark-slate-400">
            <Link2 className="w-3.5 h-3.5" />
            /webinar/{webinar.slug}
          </span>
        </div>

        {/* Status Actions */}
        <div className="mt-4 pt-4 border-t border-dark-slate-100">
          <WebinarStatusActions
            webinarId={webinar.id}
            currentStatus={webinar.status}
          />
        </div>
      </div>

      {/* Registrations */}
      <h2 className="text-lg font-semibold text-dark-slate-900 mb-4">
        Anmeldungen
      </h2>
      <RegistrationTable
        registrations={serializedRegistrations}
        webinarId={webinar.id}
        webinarTitle={webinar.title}
      />
    </div>
  );
}
