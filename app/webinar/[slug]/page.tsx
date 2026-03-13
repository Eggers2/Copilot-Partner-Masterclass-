import { notFound } from "next/navigation";
import { getWebinarBySlug } from "@/lib/db/webinars";
import { Calendar, Clock, Zap } from "lucide-react";
import { WebinarRegistrationForm } from "./registration-form";

export default async function WebinarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const webinar = await getWebinarBySlug(slug);

  if (!webinar) notFound();

  const isClosed = webinar.status !== "OPEN";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05015B] to-dark-slate-950">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-[#030386] rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-sm">NextSkills</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-12">
        {/* Webinar Info */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {webinar.title}
          </h1>
          {webinar.description && (
            <p className="text-[#DCDCEE] text-lg mb-6">
              {webinar.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-6 text-[#DCDCEE]">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {new Date(webinar.scheduledAt).toLocaleString("de-DE", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {webinar.durationMin} Minuten
            </span>
          </div>
        </div>

        {/* Registration Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {isClosed ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-dark-slate-900 mb-2">
                Anmeldung geschlossen
              </h2>
              <p className="text-dark-slate-500">
                Die Anmeldung für dieses Webinar ist derzeit nicht möglich.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-dark-slate-900 mb-6 text-center">
                Jetzt kostenlos anmelden
              </h2>
              <WebinarRegistrationForm slug={slug} />
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[#DCDCEE]/60 text-xs mt-8">
          © {new Date().getFullYear()} NextSkills GmbH · copilotberater.de
        </p>
      </main>
    </div>
  );
}
