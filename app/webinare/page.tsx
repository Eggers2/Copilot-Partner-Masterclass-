export const dynamic = "force-dynamic";

import Link from "next/link";
import { getOpenWebinars } from "@/lib/db/webinars";
import {
  Calendar,
  Clock,
  ArrowRight,
  Users,
  Target,
  Zap,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Play,
  Award,
  MessageSquare,
  Video,
  BarChart3,
} from "lucide-react";

export const metadata = {
  title: "Pre-Info Webinar – Copilot Partner Masterclass | copilotberater.de",
  description:
    "In 30 Minuten erfahrt ihr, warum Copilot-Beratung das größte Geschäftsfeld seit dem Cloud-Shift ist – und wie ihr in 90 Tagen vom Lizenzverkäufer zum KI-Berater werdet.",
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
            <Play className="w-4 h-4" />
            Kostenlose Aufzeichnung &middot; ca. 30 Minuten
          </span>

          <h1
            className="text-white font-extrabold leading-[1.08] mb-6 max-w-[850px] mx-auto"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: "clamp(32px, 5vw, 56px)",
              letterSpacing: "-0.025em",
            }}
          >
            Copilot-Beratung aufbauen &ndash; Das Pre-Info Webinar zur
            Masterclass
          </h1>

          <p className="text-[#B0B0C8] text-lg md:text-xl max-w-[680px] mx-auto mb-8 leading-relaxed">
            In 30 Minuten erfahrt ihr, warum Copilot-Beratung das gr&ouml;&szlig;te
            Gesch&auml;ftsfeld seit dem Cloud-Shift ist &ndash; und wie ihr in 90
            Tagen vom Lizenzverk&auml;ufer zum strategischen KI-Berater werdet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {webinars.length > 0 ? (
              <a
                href="#termine"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[#1A1A2E] font-bold text-base transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "#00C896" }}
              >
                Jetzt anmelden &amp; Video ansehen
                <ArrowRight className="w-5 h-5" />
              </a>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-[#1A1A2E] font-bold text-base transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "#00C896" }}
              >
                Auf die Warteliste eintragen
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </div>

          {/* Speaker Mini */}
          <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-[#00C896]/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#00C896]" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Alexander Eggers</p>
              <p className="text-[#B0B0C8] text-xs">
                6x Microsoft MVP &middot; MCT &middot; 25+ Jahre M365
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WAS IHR LERNT ═══ */}
      <section className="py-20 px-4" style={{ background: "#F8F8FC" }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-extrabold text-3xl md:text-4xl mb-4"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              color: "#1A1A2E",
            }}
          >
            Was ihr in diesem Video lernt
          </h2>
          <p className="text-center text-[#6B6B8A] max-w-xl mx-auto mb-12">
            Drei Kernthemen in 30 Minuten &ndash; mit konkreten Zahlen, einem
            Praxisbeispiel und einem klaren Fahrplan.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E5F0] hover:shadow-lg transition-shadow">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(0,200,150,.1)" }}
              >
                <TrendingUp className="w-6 h-6 text-[#00C896]" />
              </div>
              <h3
                className="font-bold text-lg mb-3"
                style={{ color: "#1A1A2E" }}
              >
                Die Marktchance ist riesig
              </h3>
              <ul className="text-[#6B6B8A] text-sm leading-relaxed space-y-2">
                <li>15 Mio. bezahlte Copilot-Seats weltweit</li>
                <li>Nur 3,3% der M365-Basis nutzt Copilot &ndash; 96,7% sind noch unber&uuml;hrt</li>
                <li>160% Seat-Wachstum Jahr &uuml;ber Jahr</li>
                <li>Microsoft hat Partner-Incentives um ~50% erh&ouml;ht</li>
                <li>3,2 Mrd. &euro; Microsoft-Investition in deutsche KI-Infrastruktur</li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E5F0] hover:shadow-lg transition-shadow">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(0,200,150,.1)" }}
              >
                <Target className="w-6 h-6 text-[#00C896]" />
              </div>
              <h3
                className="font-bold text-lg mb-3"
                style={{ color: "#1A1A2E" }}
              >
                Das 90-Tage-Framework
              </h3>
              <p className="text-[#6B6B8A] text-sm leading-relaxed mb-3">
                Vom Lizenzverk&auml;ufer zum strategischen KI-Berater &ndash; mit dem
                &bdquo;Copilot Beratungs-Kompass&ldquo; und drei parallelen Tracks:
              </p>
              <ul className="text-[#6B6B8A] text-sm leading-relaxed space-y-2">
                <li><strong className="text-[#1A1A2E]">Tag 30:</strong> Angebot steht (Website, Pitch-Deck, Preisliste)</li>
                <li><strong className="text-[#1A1A2E]">Tag 60:</strong> Erster Discovery-Workshop gebucht (3.500 &euro;)</li>
                <li><strong className="text-[#1A1A2E]">Tag 90:</strong> Erster Beratungsumsatz generiert (18.000 &euro;)</li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-6 border border-[#E5E5F0] hover:shadow-lg transition-shadow">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(0,200,150,.1)" }}
              >
                <BookOpen className="w-6 h-6 text-[#00C896]" />
              </div>
              <h3
                className="font-bold text-lg mb-3"
                style={{ color: "#1A1A2E" }}
              >
                Die Copilot Partner Masterclass
              </h3>
              <ul className="text-[#6B6B8A] text-sm leading-relaxed space-y-2">
                <li>12-Monats-Enablement f&uuml;r Microsoft Partner</li>
                <li>6 Module, 28+ Lektionen, 7+ Stunden Video</li>
                <li>10 App-Deep-Dives f&uuml;r Copilot in der Praxis</li>
                <li>2x monatlich Live Q&amp;A mit Alexander Eggers</li>
                <li>Fertige Vertriebstools: Pitch-Decks, Vorlagen, Templates</li>
                <li>Community auf Microsoft Teams</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MARKTZAHLEN ═══ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-extrabold text-3xl md:text-4xl mb-12"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              color: "#1A1A2E",
            }}
          >
            Die Zahlen sprechen f&uuml;r sich
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: "96,7%", label: "der M365-Basis noch ohne Copilot" },
              { value: "160%", label: "Seat-Wachstum pro Jahr" },
              { value: "36%", label: "der dt. Unternehmen nutzen KI (Bitkom 2025)" },
              { value: "39.000\u00A0\u20AC+", label: "Jahresumsatz pro Kunde (Beispiel)" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-2xl border border-[#E5E5F0]"
              >
                <p
                  className="text-3xl md:text-4xl font-extrabold mb-2"
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    color: "#00C896",
                  }}
                >
                  {stat.value}
                </p>
                <p className="text-[#6B6B8A] text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROI-RECHNUNG ═══ */}
      <section className="py-20 px-4" style={{ background: "#F8F8FC" }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-center font-extrabold text-3xl md:text-4xl mb-4"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              color: "#1A1A2E",
            }}
          >
            Was ein einzelner Kunde bringt
          </h2>
          <p className="text-center text-[#6B6B8A] max-w-lg mx-auto mb-12">
            Eine realistische Rechnung aus dem Video &ndash; basierend auf
            typischen Copilot-Beratungsprojekten.
          </p>

          <div className="bg-white rounded-2xl border border-[#E5E5F0] overflow-hidden">
            <div className="divide-y divide-[#E5E5F0]">
              {[
                { item: "Discovery-Workshop (halber Tag)", value: "3.500 \u20AC" },
                { item: "Copilot-Rollout-Auftrag", value: "15.000\u201325.000 \u20AC" },
                { item: "Adoption-Retainer (monatlich)", value: "1.500\u20133.000 \u20AC" },
                { item: "Copilot-Beratungstag", value: "1.200\u20132.500 \u20AC" },
              ].map((row) => (
                <div
                  key={row.item}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <span className="text-[#1A1A2E] text-sm font-medium">
                    {row.item}
                  </span>
                  <span className="text-[#00C896] font-bold text-sm">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ background: "rgba(0,200,150,.06)" }}
            >
              <span className="text-[#1A1A2E] font-bold">
                Ein Kunde im ersten Jahr
              </span>
              <span
                className="text-xl font-extrabold"
                style={{ color: "#00C896" }}
              >
                39.000 &euro;+ Umsatz
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SPRECHER ═══ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-center font-extrabold text-3xl md:text-4xl mb-12"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              color: "#1A1A2E",
            }}
          >
            Euer Sprecher
          </h2>

          <div className="bg-[#F8F8FC] rounded-2xl p-8 border border-[#E5E5F0]">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-[#1A1A2E] flex items-center justify-center flex-shrink-0">
                <Award className="w-10 h-10 text-[#00C896]" />
              </div>
              <div>
                <h3
                  className="text-xl font-bold mb-1"
                  style={{ color: "#1A1A2E" }}
                >
                  Alexander Eggers
                </h3>
                <p className="text-[#00C896] text-sm font-semibold mb-4">
                  Mitgr&uuml;nder, NextSkills GmbH
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    "6x Microsoft MVP (Office Apps & Services + M365 Copilot)",
                    "Microsoft Certified Trainer",
                    "25+ Jahre im Microsoft-&Ouml;kosystem",
                    "10.000+ YouTube-Abonnenten, 400+ Videos",
                    "Regelm&auml;&szlig;iger Speaker bei der Microsoft AI School",
                    "Copilot-Experte f&uuml;r den Microsoft Partner-Kanal",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00C896] flex-shrink-0 mt-0.5" />
                      <span
                        className="text-[#6B6B8A] text-sm"
                        dangerouslySetInnerHTML={{ __html: item }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FÜR WEN ═══ */}
      <section className="py-20 px-4" style={{ background: "#F8F8FC" }}>
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-extrabold text-3xl md:text-4xl mb-12"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              color: "#1A1A2E",
            }}
          >
            F&uuml;r wen ist dieses Video?
          </h2>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              "Microsoft Systemhaus-Partner im DACH-Raum",
              "CSP-Partner, die aktuell hauptsächlich Lizenzen verkaufen",
              "Systemhäuser, deren Kunden nach Copilot/KI fragen",
              "IT-Dienstleister, die ein Beratungs-Geschäftsfeld aufbauen wollen",
              "Geschäftsführer und Vertriebsleiter bei Microsoft Partnern",
              "Consultants & Pre-Sales mit M365-Fokus",
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

      {/* ═══ TERMINE / CTA ═══ */}
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
            Jetzt Video ansehen
          </h2>
          <p className="text-center text-[#B0B0C8] mb-12 max-w-lg mx-auto">
            Meldet euch kostenlos an und schaut euch die Aufzeichnung direkt an.
            Ihr erhaltet anschlie&szlig;end eine Best&auml;tigung per E-Mail.
          </p>

          {webinars.length === 0 ? (
            <div className="max-w-md mx-auto text-center bg-white/5 border border-white/10 rounded-2xl p-12">
              <Video className="w-12 h-12 text-[#B0B0C8] mx-auto mb-4" />
              <h3 className="text-white text-xl font-bold mb-3">
                Aktuell kein Termin verf&uuml;gbar
              </h3>
              <p className="text-[#B0B0C8] text-sm mb-6">
                Tragt euch auf unsere Warteliste ein &ndash; wir informieren euch,
                sobald das Video freigeschaltet wird.
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
                        ca. 30 Minuten &middot; Aufzeichnung
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
                        Anmeldung wird in K&uuml;rze freigeschaltet
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Secondary CTAs */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href="https://outlook.office.com/bookwithme/user/4b050f737ab34ce585384802dacd4143@nextvideo.de"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-[#00C896]/40 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#00C896]/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#00C896]" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold group-hover:text-[#00C896] transition-colors">
                    Pers&ouml;nliches Gespr&auml;ch buchen
                  </p>
                  <p className="text-[#B0B0C8] text-xs">
                    20 Min. per Video &ndash; kostenlos &amp; unverbindlich
                  </p>
                </div>
              </a>
              <Link
                href="/"
                className="flex items-center gap-3 p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-[#00C896]/40 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#00C896]/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-[#00C896]" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold group-hover:text-[#00C896] transition-colors">
                    Auf die Warteliste eintragen
                  </p>
                  <p className="text-[#B0B0C8] text-xs">
                    100+ Systemh&auml;user bereits dabei &middot; Launch Mai 2026
                  </p>
                </div>
              </Link>
            </div>
          </div>
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
