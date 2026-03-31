import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { getWebinar } from "@/lib/db/webinars";
import { RegistrationTable } from "@/components/admin/RegistrationTable";
import { CsvUpload } from "@/components/admin/CsvUpload";
import { WebinarDetailClient } from "./webinar-detail-client";

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

      {/* Webinar Info Card (with edit/delete) */}
      <WebinarDetailClient
        webinar={{
          id: webinar.id,
          title: webinar.title,
          scheduledAt: webinar.scheduledAt.toISOString(),
          streamyardLink: webinar.streamyardLink,
          description: webinar.description,
          status: webinar.status,
          registrationCount: webinar._count.registrations,
        }}
      />

      {/* CSV Upload */}
      <div className="mb-6">
        <CsvUpload webinarId={webinar.id} />
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
