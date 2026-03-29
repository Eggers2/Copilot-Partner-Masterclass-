import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getWebinars } from "@/lib/db/webinars";
import { WebinarCard } from "@/components/admin/WebinarCard";
import { CreateWebinarForm } from "@/components/admin/CreateWebinarForm";

export default async function WebinarsPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const webinars = await getWebinars();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate-900">Webinare</h1>
          <p className="text-dark-slate-500 text-sm mt-1">
            Webinar-Planung und -Verwaltung
          </p>
        </div>
        <CreateWebinarForm />
      </div>

      {webinars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dark-slate-100 p-12 shadow-sm text-center">
          <p className="text-dark-slate-500 text-sm">
            Noch keine Webinare angelegt. Erstelle dein erstes Webinar mit dem
            Button oben.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {webinars.map((webinar) => (
            <WebinarCard
              key={webinar.id}
              id={webinar.id}
              title={webinar.title}
              scheduledAt={webinar.scheduledAt}
              status={webinar.status}
              registrationCount={webinar._count.registrations}
              streamyardLink={webinar.streamyardLink}
            />
          ))}
        </div>
      )}
    </div>
  );
}
