export const dynamic = "force-dynamic";

import Link from "next/link";
import { getOpenWebinars } from "@/lib/db/webinars";
import { Calendar, Clock, Users, Zap, ArrowRight } from "lucide-react";

export default async function WebinarOverviewPage() {
  const webinars = await getOpenWebinars();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05015B] to-dark-slate-950">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#030386] rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">Next Skills</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Unsere nächsten Webinare
          </h1>
          <p className="text-[#DCDCEE] text-lg max-w-2xl mx-auto">
            Wähle einen Termin und melde dich kostenlos an. Du erhältst
            anschließend eine Bestätigung mit dem Zoom-Link per E-Mail.
          </p>
        </div>

        {webinars.length === 0 ? (
          /* No open webinars */
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 bg-[#E3ECF8] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-8 h-8 text-[#030386]" />
            </div>
            <h2 className="text-xl font-bold text-dark-slate-900 mb-3">
              Aktuell keine offenen Termine
            </h2>
            <p className="text-dark-slate-500 mb-6">
              Momentan sind keine Webinar-Termine verfügbar. Trag dich auf
              unsere Warteliste ein und wir informieren dich, sobald neue
              Termine feststehen.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#030386] hover:bg-[#05015B] text-white font-semibold rounded-xl transition-all duration-200"
            >
              Zur Warteliste
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Webinar cards grid */
          <div className="grid sm:grid-cols-2 gap-6">
            {webinars.map((webinar) => {
              const spotsLeft =
                webinar.maxAttendees - webinar._count.registrations;
              const isFull = spotsLeft <= 0;

              return (
                <Link
                  key={webinar.id}
                  href={`/webinar/${webinar.slug}`}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
                >
                  {/* Date stripe */}
                  <div className="bg-[#030386] px-6 py-4">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                      {new Date(webinar.scheduledAt).toLocaleDateString(
                        "de-DE",
                        { weekday: "long" }
                      )}
                    </p>
                    <p className="text-white text-2xl font-bold">
                      {new Date(webinar.scheduledAt).toLocaleDateString(
                        "de-DE",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-dark-slate-900 mb-3 group-hover:text-[#030386] transition-colors">
                      {webinar.title}
                    </h3>

                    {webinar.description && (
                      <p className="text-dark-slate-500 text-sm mb-4 line-clamp-2">
                        {webinar.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-dark-slate-500 mb-4">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {new Date(webinar.scheduledAt).toLocaleTimeString(
                          "de-DE",
                          { hour: "2-digit", minute: "2-digit" }
                        )}{" "}
                        Uhr · {webinar.durationMin} Min.
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {isFull ? (
                          <span className="text-red-600 font-semibold">
                            Ausgebucht
                          </span>
                        ) : (
                          <>
                            Noch {spotsLeft} von {webinar.maxAttendees} Plätzen
                            frei
                          </>
                        )}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-dark-slate-100 rounded-full h-1.5 mb-4">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${Math.min(Math.round((webinar._count.registrations / webinar.maxAttendees) * 100), 100)}%`,
                          backgroundColor: isFull
                            ? "#dc2626"
                            : spotsLeft < 10
                              ? "#d97706"
                              : "#030386",
                        }}
                      />
                    </div>

                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#030386] group-hover:gap-2 transition-all">
                      {isFull
                        ? "Details anzeigen"
                        : "Jetzt Platz sichern"}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[#DCDCEE]/60 text-xs mt-12">
          © {new Date().getFullYear()} Next Skills · copilotberater.de
        </p>
      </main>
    </div>
  );
}
