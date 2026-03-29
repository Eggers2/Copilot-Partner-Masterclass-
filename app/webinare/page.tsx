export const dynamic = "force-dynamic";

import Link from "next/link";
import { getOpenWebinars } from "@/lib/db/webinars";
import { Calendar, Clock, ArrowRight, Users, Target, Zap, BookOpen, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Kostenlose Webinare – Copilot Partner Masterclass",
  description:
    "Erfahre in unseren kostenlosen Live-Webinaren, wie du als Microsoft Partner mit Copilot neue Umsatzpotenziale erschließt. Jetzt Termin sichern.",
};

export default async function WebinareLandingPage() {
  const webinars = await getOpenWebinars();

  return (
    <main
      className="min-h-screen"
      style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}
    >
      {/* ═══ HERO ═══ */}
      <section
        className="relative overflow-hidden"
        style={{ background: "#1A1A2E" }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Green glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{ background: "#00C896" }}
        />

        {/* Nav */}
        <nav className="relative z-10 py-6 px-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="text-white font-bold text-xl"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Next<span className="text-[#00C896]">Skills</span>
            </Link>
            <Link
              href="/"
              className="text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              Zur Hauptseite
            </Link>
          </div>
        </nav>

        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-20 text-center">
          <span
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-[#00C896]/30 text-[#00C896] mb-8"
            style={{ background: "rgba(0,200,150,.08)" }}
          >
            Kostenloses Live-Webinar
          </span>

          <h1
            className="text-white font-extrabold leading-[1.08] mb-6 max-w-[800px] mx-auto"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: "clamp(32px, 5vw, 56px)",
              letterSpacing: "-0.025em",
            }}
          >
            Copilot als Umsatzhebel für Microsoft Partner
          </h1>

          <p className="text-[#B0B0C8] text-lg md:text-xl max-w-[640px] mx-auto mb-8 leading-relaxed">
            Erfahre in 60 Minuten, wie du Microsoft Copilot als neues
            Geschäftsfeld positionierst, Kunden gewinnst und nachhaltig
            skalierst.
          </p>

          {webinars.length > 0 && (
            <a
              href="#termine"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[#1A1A2E] font-bold text-base transition-all duration-200 hover:scale-[1.03]"
              style={{ background: "#00C896" }}
            >
              Termin auswählen
              <ArrowRight className="w-5 h-5" />
            </a>
          )}
        </div>
      </section>

      {/* ═══ WAS DICH ERWARTET ═══ */}
      <section className="py-20 px-4" style={{ background: "#F8F8FC" }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-extrabold text-3xl md:text-4xl mb-4"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              color: "#1A1A2E",
            }}
          >
            Was dich im Webinar erwartet
          </h2>
          <p className="text-center text-[#6B6B8A] max-w-xl mx-auto mb-12">
            In 60 Minuten bekommst du einen klaren Fahrplan, wie du als
            Microsoft Partner mit Copilot durchstartest.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Target,
                title: "Marktchance verstehen",
                desc: "Warum Copilot der größte Wachstumshebel für Microsoft Partner ist.",
              },
              {
                icon: Users,
                title: "Kunden gewinnen",
                desc: "Praxiserprobte Strategien für Copilot-Vertrieb und Positionierung.",
              },
              {
                icon: BookOpen,
                title: "Adoption meistern",
                desc: "Der bewährte Adoption-Prozess für nachhaltige Kundenerfolge.",
              },
              {
                icon: Zap,
                title: "Masterclass kennenlernen",
                desc: "Einblick in unser 12-Monats-Enablement-Programm für Partner.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 border border-[#E5E5F0] hover:shadow-lg transition-shadow"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(0,200,150,.1)" }}
                >
                  <item.icon className="w-6 h-6 text-[#00C896]" />
                </div>
                <h3
                  className="font-bold text-lg mb-2"
                  style={{ color: "#1A1A2E" }}
                >
                  {item.title}
                </h3>
                <p className="text-[#6B6B8A] text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FÜR WEN ═══ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-extrabold text-3xl md:text-4xl mb-12"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              color: "#1A1A2E",
            }}
          >
            Für wen ist das Webinar?
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              "Geschäftsführer von Microsoft Partner-Unternehmen",
              "Vertriebsleiter, die Copilot ins Portfolio aufnehmen wollen",
              "Consultants & Pre-Sales mit M365-Fokus",
              "IT-Dienstleister, die neue Umsatzquellen suchen",
              "CSPs & Solutions Partner im DACH-Raum",
              "Alle, die Copilot-Adoption professionalisieren wollen",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 p-3">
                <CheckCircle2 className="w-5 h-5 text-[#00C896] flex-shrink-0 mt-0.5" />
                <span className="text-[#1A1A2E] text-sm font-medium">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TERMINE ═══ */}
      <section
        id="termine"
        className="py-20 px-4"
        style={{ background: "#1A1A2E" }}
      >
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-extrabold text-3xl md:text-4xl text-white mb-4"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Verfügbare Termine
          </h2>
          <p className="text-center text-[#B0B0C8] mb-12 max-w-lg mx-auto">
            Wähle einen passenden Termin und melde dich kostenlos über StreamYard
            an. Du erhältst anschließend eine Bestätigung per E-Mail.
          </p>

          {webinars.length === 0 ? (
            <div className="max-w-md mx-auto text-center bg-white/5 border border-white/10 rounded-2xl p-12">
              <Calendar className="w-12 h-12 text-[#B0B0C8] mx-auto mb-4" />
              <h3 className="text-white text-xl font-bold mb-3">
                Aktuell keine offenen Termine
              </h3>
              <p className="text-[#B0B0C8] text-sm mb-6">
                Momentan sind keine Webinar-Termine verfügbar. Trag dich auf
                unsere Warteliste ein und wir informieren dich, sobald neue
                Termine feststehen.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[#1A1A2E] font-bold text-sm"
                style={{ background: "#00C896" }}
              >
                Zur Warteliste
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {webinars.map((webinar) => (
                <div
                  key={webinar.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#00C896]/40 transition-colors"
                >
                  {/* Date header */}
                  <div
                    className="px-6 py-4"
                    style={{ background: "rgba(0,200,150,.1)" }}
                  >
                    <p className="text-[#00C896]/70 text-xs font-semibold uppercase tracking-wider">
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
                    <h3 className="text-white text-lg font-bold mb-3">
                      {webinar.title}
                    </h3>

                    {webinar.description && (
                      <p className="text-[#B0B0C8] text-sm mb-4 line-clamp-2">
                        {webinar.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-[#B0B0C8] mb-6">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {new Date(webinar.scheduledAt).toLocaleTimeString(
                          "de-DE",
                          { hour: "2-digit", minute: "2-digit" }
                        )}{" "}
                        Uhr
                      </span>
                    </div>

                    {webinar.streamyardLink ? (
                      <a
                        href={webinar.streamyardLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 rounded-xl text-[#1A1A2E] font-bold text-sm transition-all duration-200 hover:scale-[1.02]"
                        style={{ background: "#00C896" }}
                      >
                        Kostenlos anmelden
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="block text-center text-[#B0B0C8] text-sm py-3">
                        Anmeldung wird in Kürze freigeschaltet
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-8 px-4" style={{ background: "#151525" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            className="text-white font-bold text-lg"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Next<span className="text-[#00C896]">Skills</span>
          </Link>
          <p className="text-[#6B6B8A] text-xs">
            &copy; {new Date().getFullYear()} NextSkills GmbH &middot;
            copilotberater.de
          </p>
        </div>
      </footer>
    </main>
  );
}
