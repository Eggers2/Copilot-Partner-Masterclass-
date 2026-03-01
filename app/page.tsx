"use client";

import { useState, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  Brain,
  PlayCircle,
  Users,
  FileText,
  MessageSquare,
  Briefcase,
  Code,
  BarChart3,
  ChevronDown,
  Star,
  Shield,
  Zap,
  ArrowRight,
  Mail,
} from "lucide-react";

interface FormState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: "",
  });
  const waitlistRef = useRef<HTMLDivElement>(null);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setFormState({ status: "loading", message: "" });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setFormState({
          status: "success",
          message: data.message || "Erfolgreich eingetragen!",
        });
        setEmail("");
      } else {
        setFormState({
          status: "error",
          message: data.error || "Ein Fehler ist aufgetreten.",
        });
      }
    } catch {
      setFormState({
        status: "error",
        message: "Verbindungsfehler. Bitte versuche es erneut.",
      });
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        "@id": "https://copilot.next-skills.de/#course",
        name: "Microsoft Copilot Partner Masterclass",
        description:
          "Das 12-Monats-Programm für Microsoft Partner: Von der Copilot-Strategie bis zur skalierbaren Adoption. Für Geschäftsführer, Vertrieb und Consultants.",
        url: "https://copilot.next-skills.de",
        provider: {
          "@type": "Organization",
          name: "Next Skills",
          url: "https://copilot.next-skills.de",
        },
        inLanguage: "de",
        courseMode: "online",
        educationalLevel: "Professional",
        offers: {
          "@type": "Offer",
          price: "3900",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          url: "https://myablefy.com/s/nextskills/copilot-masterclass-5d493b90",
          validFrom: "2026-05-01",
        },
      },
      {
        "@type": "Organization",
        "@id": "https://copilot.next-skills.de/#organization",
        name: "Next Skills",
        url: "https://copilot.next-skills.de",
        logo: "https://copilot.next-skills.de/og-image.png",
        description:
          "Next Skills ist auf Microsoft Copilot Adoption und Partner-Enablement spezialisiert.",
      },
    ],
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-slate-900/95 backdrop-blur-sm border-b border-dark-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ms-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">Next Skills</span>
            </div>
            <button
              onClick={scrollToWaitlist}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-ms-blue-500 hover:bg-ms-blue-600 rounded-lg transition-all duration-200"
            >
              Warteliste beitreten
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════ */}
      <section className="relative bg-dark-slate-900 pt-16 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-ms-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-ms-blue-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-ms-blue-400/10 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-ms-blue-500/20 border border-ms-blue-400/30 rounded-full text-ms-blue-300 text-sm font-medium">
              <Star className="w-4 h-4" />
              Exklusives Programm für Microsoft Partner
            </span>
          </div>

          {/* Headline */}
          <div className="text-center max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
              Vom{" "}
              <span className="text-ms-blue-400">Lizenz-Schieber</span>
              <br />
              zum{" "}
              <span className="bg-gradient-to-r from-ms-blue-400 to-cyan-400 bg-clip-text text-transparent">
                KI-Strategen
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-dark-slate-300 mb-4 max-w-3xl mx-auto leading-relaxed">
              Die{" "}
              <strong className="text-white">
                Microsoft Copilot Partner Masterclass
              </strong>
              .
            </p>
            <p className="text-lg md:text-xl text-dark-slate-400 mb-12 max-w-2xl mx-auto">
              Deine Blaupause für Consulting, Strategie und Adoption.
            </p>

            {/* Waitlist Form */}
            <div ref={waitlistRef} className="max-w-xl mx-auto">
              {formState.status === "success" ? (
                <div className="flex flex-col items-center gap-4 p-8 bg-green-500/10 border border-green-500/30 rounded-2xl animate-fade-in">
                  <CheckCircle2 className="w-16 h-16 text-green-400" />
                  <div>
                    <p className="text-green-300 text-xl font-bold mb-1">
                      Du bist dabei! 🎉
                    </p>
                    <p className="text-green-400/80 text-sm">
                      {formState.message} Wir melden uns, sobald die
                      Anmeldung startet.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="deine@email.de"
                        required
                        disabled={formState.status === "loading"}
                        className="w-full pl-12 pr-4 py-4 bg-dark-slate-800 border border-dark-slate-600 focus:border-ms-blue-400 rounded-xl text-white placeholder-dark-slate-400 outline-none transition-colors text-base disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={formState.status === "loading" || !email.trim()}
                      className="whitespace-nowrap px-6 py-4 bg-ms-blue-500 hover:bg-ms-blue-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-ms-blue-500/25 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      {formState.status === "loading" ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Wird eingetragen...
                        </>
                      ) : (
                        <>
                          Auf die Warteliste
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>

                  {formState.status === "error" && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {formState.message}
                    </div>
                  )}

                  <p className="text-dark-slate-500 text-xs">
                    Kein Spam. Nur relevante Updates zum Programm-Start.
                    Jederzeit abmeldbar.
                  </p>

                  <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-dark-slate-700" />
                    <span className="text-dark-slate-500 text-xs">oder</span>
                    <div className="flex-1 h-px bg-dark-slate-700" />
                  </div>

                  <a
                    href="https://myablefy.com/s/nextskills/copilot-masterclass-5d493b90"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-ms-blue-400 hover:text-ms-blue-300 text-base font-semibold transition-colors"
                  >
                    Jetzt direkt kaufen mit 22% Rabatt – 3.900 €
                    <ArrowRight className="w-5 h-5" />
                  </a>
                </form>
              )}
            </div>

            {/* Social proof */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-dark-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-ms-blue-400" />
                <span>Microsoft zertifiziert</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-ms-blue-400" />
                <span>Für Microsoft Partner</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-ms-blue-400" />
                <span>Start: Mai 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center pb-8">
          <ChevronDown className="w-6 h-6 text-dark-slate-500 animate-bounce" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PROBLEM SECTION
      ═══════════════════════════════════════════════════ */}
      <section className="py-24 bg-dark-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-ms-blue-600 font-semibold text-sm uppercase tracking-wider">
              Das Problem
            </span>
            <h2 className="section-title mt-2">
              Kennst du das?
            </h2>
            <p className="section-subtitle">
              Die meisten Microsoft Partner kämpfen mit denselben drei
              Herausforderungen. Täglich.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Problem 1 */}
            <div className="card group hover:border-red-200 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-100 transition-colors">
                <TrendingDown className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-dark-slate-900 mb-3">
                Keine Adoption
              </h3>
              <p className="text-dark-slate-600 leading-relaxed">
                Deine Kunden kaufen Copilot-Lizenzen, aber nutzen sie kaum.
                Die Tools verstauben in der Schublade – und du weißt nicht,
                wie du das ändern sollst.
              </p>
              <div className="mt-6 p-4 bg-red-50 rounded-xl">
                <p className="text-red-700 text-sm font-medium italic">
                  &ldquo;Wir haben 100 Lizenzen, aber niemand nutzt sie
                  wirklich.&rdquo;
                </p>
              </div>
            </div>

            {/* Problem 2 */}
            <div className="card group hover:border-orange-200 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-100 transition-colors">
                <DollarSign className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-dark-slate-900 mb-3">
                Keine Marge
              </h3>
              <p className="text-dark-slate-600 leading-relaxed">
                Der reine Lizenzverkauf lohnt sich kaum noch. Margin-Druck
                von allen Seiten. Das eigentliche Geld liegt im Mehrwert –
                aber wie schaffst du ihn?
              </p>
              <div className="mt-6 p-4 bg-orange-50 rounded-xl">
                <p className="text-orange-700 text-sm font-medium italic">
                  &ldquo;Wir verkaufen Lizenzen, aber verdienen dabei
                  nichts.&rdquo;
                </p>
              </div>
            </div>

            {/* Problem 3 */}
            <div className="card group hover:border-yellow-200 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-yellow-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-yellow-100 transition-colors">
                <Brain className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-dark-slate-900 mb-3">
                Überforderung
              </h3>
              <p className="text-dark-slate-600 leading-relaxed">
                Zu viel Theorie, zu wenig Praxis. Unzählige Microsoft-Docs,
                widersprüchliche Infos, kein roter Faden. Du weißt nicht,
                wo du anfangen sollst.
              </p>
              <div className="mt-6 p-4 bg-yellow-50 rounded-xl">
                <p className="text-yellow-700 text-sm font-medium italic">
                  &ldquo;Ich weiß nicht, was ich meinen Kunden konkret
                  anbieten soll.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          SOLUTION / FEATURES SECTION
      ═══════════════════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-ms-blue-600 font-semibold text-sm uppercase tracking-wider">
              Die Lösung
            </span>
            <h2 className="section-title mt-2">
              Das 12-Monats-Programm
              <br />
              <span className="text-ms-blue-600">für deinen Erfolg</span>
            </h2>
            <p className="section-subtitle">
              Kein theoretisches Framework. Kein weiteres Webinar. Ein
              vollständiges Betriebssystem für dein Copilot-Business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="flex gap-6 p-8 rounded-2xl bg-gradient-to-br from-ms-blue-50 to-blue-50 border border-ms-blue-100 hover:shadow-lg transition-all duration-300">
              <div className="flex-shrink-0 w-14 h-14 bg-ms-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <PlayCircle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark-slate-900 mb-2">
                  Video Academy
                </h3>
                <p className="text-dark-slate-600 leading-relaxed">
                  Strukturierte Video-Kurse: Von der Copilot-Grundlage bis
                  zur fortgeschrittenen Adoption-Strategie. Lerne in deinem
                  eigenen Tempo – on demand, jederzeit verfügbar.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "50+ Lektionen",
                    "Praxisorientiert",
                    "Immer aktuell",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-dark-slate-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-ms-blue-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-6 p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 hover:shadow-lg transition-all duration-300">
              <div className="flex-shrink-0 w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark-slate-900 mb-2">
                  Live Coaching mit Alex Eggers
                </h3>
                <p className="text-dark-slate-600 leading-relaxed">
                  Monatliche Live-Sessions direkt mit Alex. Stelle deine
                  konkreten Fragen, erhalte persönliches Feedback und
                  profitiere vom Gruppen-Wissen.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "Monatliche Live-Calls",
                    "Direktes Feedback",
                    "Peer-Learning",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-dark-slate-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-6 p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 hover:shadow-lg transition-all duration-300">
              <div className="flex-shrink-0 w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark-slate-900 mb-2">
                  Done-for-you Sales Assets
                </h3>
                <p className="text-dark-slate-600 leading-relaxed">
                  Fertige Verkaufsunterlagen, Pitch-Decks, E-Mail-Vorlagen
                  und Angebots-Templates. Sofort einsetzbar – du musst das
                  Rad nicht neu erfinden.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "Pitch-Deck Templates",
                    "E-Mail-Sequenzen",
                    "Angebots-Vorlagen",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-dark-slate-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-6 p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 hover:shadow-lg transition-all duration-300">
              <div className="flex-shrink-0 w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark-slate-900 mb-2">
                  Community
                </h3>
                <p className="text-dark-slate-600 leading-relaxed">
                  Exklusiver Zugang zur Partner-Community. Tausche dich mit
                  Gleichgesinnten aus, teile Erfahrungen und bau dein
                  Netzwerk gezielt aus.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "Private Community",
                    "Partner-Netzwerk",
                    "Gegenseitiger Support",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-dark-slate-600"
                    >
                      <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TARGET AUDIENCE SECTION
      ═══════════════════════════════════════════════════ */}
      <section className="py-24 bg-dark-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-ms-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-ms-blue-400 font-semibold text-sm uppercase tracking-wider">
              Für wen ist das?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">
              Ein Ticket – 3 Profiteure
            </h2>
            <p className="text-dark-slate-400 text-lg max-w-2xl mx-auto">
              Die Masterclass ist so aufgebaut, dass das gesamte Team davon
              profitiert – von der Strategie bis zum Vertrieb.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Audience 1 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-ms-blue-500/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-8 rounded-3xl border border-dark-slate-700 bg-dark-slate-800/50 hover:border-ms-blue-500/50 transition-all duration-300">
                <div className="w-16 h-16 bg-ms-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-ms-blue-500/30 transition-colors">
                  <Briefcase className="w-8 h-8 text-ms-blue-400" />
                </div>
                <div className="inline-flex px-3 py-1 bg-ms-blue-500/20 rounded-full text-ms-blue-300 text-xs font-semibold mb-4">
                  Strategie
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Geschäftsführer
                </h3>
                <p className="text-dark-slate-400 leading-relaxed">
                  Entwickle eine klare KI-Strategie für dein Unternehmen.
                  Positioniere dich als strategischer Partner – nicht als
                  Reseller.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Klare Marktpositionierung",
                    "Neue Geschäftsmodelle",
                    "Skalierbare Angebote",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-dark-slate-300"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-ms-blue-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Audience 2 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-green-500/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-8 rounded-3xl border border-dark-slate-700 bg-dark-slate-800/50 hover:border-green-500/50 transition-all duration-300">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-500/30 transition-colors">
                  <BarChart3 className="w-8 h-8 text-green-400" />
                </div>
                <div className="inline-flex px-3 py-1 bg-green-500/20 rounded-full text-green-300 text-xs font-semibold mb-4">
                  Sales
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Vertrieb
                </h3>
                <p className="text-dark-slate-400 leading-relaxed">
                  Verkaufe Copilot nicht als Lizenz, sondern als Business
                  Value. Lerne, wie du Entscheider überzeugst und
                  langfristige Kundenbeziehungen aufbaust.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Value-based Selling",
                    "Entscheider-Gespräche",
                    "Langfristige Kundenbindung",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-dark-slate-300"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Audience 3 */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-8 rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-dark-slate-800/80 to-dark-slate-800/50 hover:border-cyan-400/60 transition-all duration-300">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/30 transition-colors">
                  <Code className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="inline-flex px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-300 text-xs font-semibold mb-4">
                  Tech
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Consultant
                </h3>
                <p className="text-dark-slate-400 leading-relaxed">
                  Lerne, Copilot technisch sauber einzuführen, Adoptionspläne
                  zu entwickeln und messbare Ergebnisse für Kunden zu
                  liefern.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Technische Tiefe",
                    "Adoption-Frameworks",
                    "Kundenprojekte skalieren",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-dark-slate-300"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PRICING SECTION
      ═══════════════════════════════════════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-ms-blue-600 font-semibold text-sm uppercase tracking-wider">
              Investition
            </span>
            <h2 className="section-title mt-2">
              Sichere dir den{" "}
              <span className="text-ms-blue-600">Early-Bird Preis</span>
            </h2>
            <p className="section-subtitle">
              Start: Mai 2026. Nur für frühe Anmelder: Spare über 20% und
              starte mit den besten Konditionen.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-stretch">
              {/* Regular Price */}
              <div className="card opacity-75 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-dark-slate-100 text-dark-slate-500 text-xs font-semibold rounded-full">
                    Regulär
                  </span>
                </div>
                <div className="mb-6">
                  <p className="text-dark-slate-400 text-sm mb-1">
                    Regulärer Preis ab Juni
                  </p>
                  <p className="text-5xl font-extrabold text-dark-slate-400 line-through decoration-2">
                    5.000 €
                  </p>
                  <p className="text-dark-slate-400 text-sm mt-1">
                    zzgl. MwSt. / 12 Monate
                  </p>
                </div>
                <ul className="space-y-3 text-dark-slate-500">
                  {[
                    "Video Academy",
                    "Live Coaching",
                    "Sales Assets",
                    "Community",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-dark-slate-300 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Early Bird Price */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-ms-blue-600 to-ms-blue-800" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-cyan-500/20" />

                {/* Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Early Bird
                  </span>
                </div>

                <div className="relative p-8">
                  <div className="mb-6">
                    <p className="text-ms-blue-200 text-sm mb-1">
                      Dein Preis bis zum Start
                    </p>
                    <p className="text-6xl font-extrabold text-white">
                      3.900 €
                    </p>
                    <p className="text-ms-blue-300 text-sm mt-1">
                      zzgl. MwSt. / 12 Monate
                    </p>
                  </div>

                  <div className="mb-6 p-3 bg-white/10 rounded-xl">
                    <p className="text-white text-sm font-semibold">
                      Du sparst:{" "}
                      <span className="text-yellow-300">1.100 €</span> (22%
                      Rabatt)
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {[
                      "Video Academy (50+ Lektionen)",
                      "Live Coaching mit Alex Eggers",
                      "Done-for-you Sales Assets",
                      "Exklusive Partner-Community",
                      "Early-Bird Bonus-Inhalte",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-3 text-sm text-white"
                      >
                        <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="https://myablefy.com/s/nextskills/copilot-masterclass-5d493b90"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 bg-white text-ms-blue-700 font-bold rounded-xl hover:bg-ms-blue-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                  >
                    Jetzt kaufen – 3.900 €
                    <ArrowRight className="w-5 h-5" />
                  </a>

                  <button
                    onClick={scrollToWaitlist}
                    className="w-full py-3 mt-3 border border-white/30 text-white/80 font-semibold rounded-xl hover:bg-white/10 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    Oder auf die Warteliste eintragen
                  </button>
                </div>
              </div>
            </div>

            {/* Guarantee */}
            <div className="mt-12 p-6 bg-dark-slate-50 rounded-2xl border border-dark-slate-100 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex-shrink-0 w-12 h-12 bg-ms-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-ms-blue-600" />
              </div>
              <div>
                <p className="font-bold text-dark-slate-900 mb-1">
                  Zwei Wege – du entscheidest
                </p>
                <p className="text-dark-slate-600 text-sm">
                  Kaufe jetzt sofort zum Sonderpreis und sichere dir deinen
                  Zugang. Oder trag dich kostenlos auf die Warteliste ein und
                  werde informiert, wenn die Anmeldung startet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FINAL CTA SECTION
      ═══════════════════════════════════════════════════ */}
      <section className="py-24 bg-gradient-to-b from-dark-slate-900 to-dark-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Zap className="w-12 h-12 text-ms-blue-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Bereit, zum KI-Strategen zu werden?
          </h2>
          <p className="text-dark-slate-400 text-lg mb-10">
            Trag dich jetzt auf die Warteliste ein – oder kaufe sofort zum Sonderpreis. Die Microsoft Copilot Partner Masterclass startet im Mai 2026.
          </p>

          <div className="max-w-lg mx-auto">
            {formState.status === "success" ? (
              <div className="flex flex-col items-center gap-4 p-8 bg-green-500/10 border border-green-500/30 rounded-2xl">
                <CheckCircle2 className="w-16 h-16 text-green-400" />
                <p className="text-green-300 text-xl font-bold">
                  Du bist bereits eingetragen!
                </p>
                <p className="text-green-400/80 text-sm">
                  Wir melden uns, sobald die Anmeldung startet.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="deine@email.de"
                      required
                      disabled={formState.status === "loading"}
                      className="w-full pl-12 pr-4 py-4 bg-dark-slate-800 border border-dark-slate-600 focus:border-ms-blue-400 rounded-xl text-white placeholder-dark-slate-400 outline-none transition-colors text-base disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={formState.status === "loading" || !email.trim()}
                    className="whitespace-nowrap px-6 py-4 bg-ms-blue-500 hover:bg-ms-blue-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-200 flex items-center gap-2"
                  >
                    {formState.status === "loading" ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Wird eingetragen...
                      </>
                    ) : (
                      <>
                        Auf die Warteliste
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>

                {formState.status === "error" && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {formState.message}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-px bg-dark-slate-700" />
                  <span className="text-dark-slate-500 text-xs">oder</span>
                  <div className="flex-1 h-px bg-dark-slate-700" />
                </div>

                <a
                  href="https://myablefy.com/s/nextskills/copilot-masterclass-5d493b90"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-ms-blue-400 hover:text-ms-blue-300 text-sm font-medium transition-colors"
                >
                  Jetzt direkt kaufen – 3.900 € (22% Rabatt)
                  <ArrowRight className="w-4 h-4" />
                </a>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════ */}
      <footer className="bg-dark-slate-950 py-8 border-t border-dark-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-ms-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-dark-slate-400 text-sm">
                © {new Date().getFullYear()} Next Skills. Alle Rechte
                vorbehalten.
              </span>
            </div>
            <div className="flex items-center gap-6 text-dark-slate-500 text-sm">
              <span>Microsoft Copilot Partner Masterclass</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
