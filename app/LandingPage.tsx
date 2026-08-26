"use client";

import { useState, useRef, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Mail,
  Layers,
  Box,
  Users,
  Activity,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import LinkedInInsightTag from "@/components/LinkedInInsightTag";
import { captureUtmData, getUtmData } from "@/lib/utm-tracker";

interface FormState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

interface LandingPageProps {
  partnerCount: number;
  klasse3Capacity: number;
  klasse3Belegt: number;
}

export default function LandingPage({ partnerCount, klasse3Capacity, klasse3Belegt }: LandingPageProps) {
  const percent = klasse3Capacity > 0 ? Math.min(100, (klasse3Belegt / klasse3Capacity) * 100) : 0;

  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: "",
  });
  const waitlistRef = useRef<HTMLDivElement>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToWaitlist = () => {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setFormState({ status: "loading", message: "" });

    const utm = getUtmData();

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...(utm ?? {}) }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = "/danke";
        return;
      }

      setFormState({
        status: "error",
        message: data.error || "Ein Fehler ist aufgetreten.",
      });
    } catch {
      setFormState({
        status: "error",
        message: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
      });
    }
  };

  // Capture UTM/referrer attribution once on mount
  useEffect(() => {
    captureUtmData();
  }, []);

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Smooth scroll for anchor links with 80px offset
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;
      e.preventDefault();
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
      setMobileMenuOpen(false);
    };
    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

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
          name: "NextSkills",
          url: "https://copilot.next-skills.de",
        },
        inLanguage: "de",
        courseMode: "online",
        educationalLevel: "Professional",
      },
      {
        "@type": "Organization",
        "@id": "https://copilot.next-skills.de/#organization",
        name: "NextSkills",
        url: "https://copilot.next-skills.de",
        logo: "https://copilot.next-skills.de/og-image.png",
        description:
          "NextSkills ist auf Microsoft Copilot Adoption und Partner-Enablement spezialisiert.",
      },
    ],
  };

  /* ── Reusable form renderer ── */
  const renderForm = (maxW: string = "max-w-[480px]") => (
    <div className={`${maxW} mx-auto w-full`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B8A]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              required
              disabled={formState.status === "loading"}
              className="w-full pl-12 pr-4 py-4 bg-[#2d2d48] border border-[#2d2d48] focus:border-[#00C896] rounded-[10px] text-white placeholder-[#6B6B8A] outline-none transition-colors text-base disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={formState.status === "loading" || !email.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {formState.status === "loading" ? (
              <>
                <div className="w-5 h-5 border-2 border-[#1A1A2E]/30 border-t-[#1A1A2E] rounded-full animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                Jetzt einen der {klasse3Capacity} Plätze sichern
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

        <p className="text-[#6B6B8A] text-xs text-center">
          Keine Verpflichtung · Persönliche Rückmeldung · Limitierte Plätze
        </p>
      </form>
    </div>
  );

  return (
    <main className="min-h-screen" style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ═══ 1. NAVBAR ═══ */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: navScrolled
            ? "rgba(26,26,46,.98)"
            : "rgba(26,26,46,.92)",
          backdropFilter: "blur(12px)",
          boxShadow: navScrolled ? "0 2px 20px rgba(0,0,0,.3)" : "none",
        }}
      >
        <div className="container-main">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="#" className="text-white font-bold text-xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Next<span className="text-[#00C896]">Skills</span>
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#solution" className="text-white/70 hover:text-white text-sm font-medium transition-colors">Programm</a>
              <a href="#included" className="text-white/70 hover:text-white text-sm font-medium transition-colors">Inhalte</a>
              <a href="#trainer" className="text-white/70 hover:text-white text-sm font-medium transition-colors">Trainer</a>
              <a href="#faq" className="text-white/70 hover:text-white text-sm font-medium transition-colors">FAQ</a>
              <button onClick={scrollToWaitlist} className="btn-primary !py-2.5 !px-5 !text-sm">
                Jetzt bewerben
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 flex flex-col gap-3">
              <a href="#solution" className="text-white/70 hover:text-white text-sm font-medium py-2">Programm</a>
              <a href="#included" className="text-white/70 hover:text-white text-sm font-medium py-2">Inhalte</a>
              <a href="#trainer" className="text-white/70 hover:text-white text-sm font-medium py-2">Trainer</a>
              <a href="#faq" className="text-white/70 hover:text-white text-sm font-medium py-2">FAQ</a>
              <button onClick={() => { scrollToWaitlist(); setMobileMenuOpen(false); }} className="btn-primary !py-2.5 !text-sm mt-2">
                Jetzt bewerben
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ═══ 2. HERO ═══ */}
      <section className="relative overflow-hidden" style={{ background: "#1A1A2E", minHeight: "100svh" }}>
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Green glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[120px] opacity-20" style={{ background: "#00C896" }} />

        <div className="relative container-main pt-32 pb-20 flex flex-col items-center text-center" style={{ minHeight: "100svh", justifyContent: "center" }}>
          {/* Urgency Badge */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold border border-[#00C896]/40 text-[#00C896]" style={{ background: "rgba(0,200,150,.10)" }}>
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: "#00C896" }} />
                <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: "#00C896" }} />
              </span>
              Klasse 1 &amp; 2 ausgebucht &middot; Bewerbung Klasse 3 offen
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-white font-extrabold leading-[1.05] mb-6 max-w-[900px]"
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: "clamp(40px, 5.5vw, 72px)",
              letterSpacing: "-0.025em",
            }}
          >
            Vom Lizenz-Reseller zum strategischen{" "}
            <span className="text-[#00C896]">KI-Berater.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-white/60 text-lg md:text-xl max-w-[600px] mb-10 leading-relaxed">
            Das einzige Copilot-Enablement-Programm für Microsoft-Partner im DACH-Raum. Über 50 Systemhäuser aus Klasse 1 und 2 sind bereits dabei.
          </p>

          {/* CTA – single primary + text link */}
          <div className="flex flex-col sm:flex-row items-center gap-5 mb-16">
            <button onClick={scrollToWaitlist} className="btn-primary text-base">
              Jetzt für Klasse 3 bewerben <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#solution" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm font-medium transition-colors">
              Programm kennenlernen <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex justify-center pb-8 relative">
          <ChevronDown className="w-6 h-6 text-white/30 animate-bounce" />
        </div>
      </section>

      {/* ═══ 2.1 SOCIAL PROOF BAR ═══ */}
      <section style={{ background: "#1A1A2E" }} className="border-t border-white/10 py-12">
        <div className="container-main">
          <div className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-y-8 gap-x-10 md:gap-x-12">
            {[
              { num: String(partnerCount), label: <>Systemhäuser<br />im Programm<br /><span className="text-white/35 text-[11px]">Klasse 1 &amp; 2</span></> },
              { num: "250+", label: <>Mitarbeiter<br />in Ausbildung<br /><span className="text-white/35 text-[11px]">über beide Klassen</span></> },
              { num: "2", label: <>Klassen<br />ausgebucht<br /><span className="text-white/35 text-[11px]">in unter 12 Monaten</span></> },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-10 md:gap-12">
                {i > 0 && <span className="hidden md:block w-px h-12 bg-white/10" />}
                <div className="flex items-center gap-4 text-left">
                  <span className="text-[#00C896] text-4xl md:text-5xl font-bold leading-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    {item.num}
                  </span>
                  <span className="text-white/60 text-sm leading-snug">{item.label}</span>
                </div>
              </div>
            ))}
            <span className="md:ml-2 inline-flex items-center px-4 py-2 rounded-full text-xs font-bold tracking-wider text-[#1A1A2E]" style={{ background: "#00C896" }}>
              ✦ KLASSE 1 &amp; 2 AUSGEBUCHT ✦
            </span>
          </div>
        </div>
      </section>

      {/* ═══ 2.5 KLASSEN-STATUS ═══ */}
      <section style={{ background: "#23233D" }} className="py-[80px]">
        <div className="container-main">
          <div className="text-center mb-12 reveal">
            <span className="section-label">Aktueller Status</span>
            <h2
              className="text-white font-bold mt-3"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(24px, 3vw, 36px)", letterSpacing: "-0.025em" }}
            >
              Zwei Klassen ausgebucht. <span className="text-[#00C896]">Jetzt startet Klasse 3.</span>
            </h2>
          </div>

          <div className="flex flex-col gap-6 max-w-[1100px] mx-auto reveal">
            {/* Karte 1 – Track-Record (Klasse 1 & 2 ausgebucht) */}
            <div
              className="relative rounded-2xl p-8 md:p-10 border border-white/10"
              style={{ background: "#1A1A2E" }}
            >
              <div className="mb-8">
                <span className="text-white/50 text-xs font-semibold tracking-wider uppercase block mb-4">
                  Der Track-Record
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-white/15 text-white/70" style={{ background: "rgba(255,255,255,.04)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Klasse 01 &middot; Mai 2026 &middot; Ausgebucht
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-white/15 text-white/70" style={{ background: "rgba(255,255,255,.04)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Klasse 02 &middot; Ausgebucht
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#00C896]" style={{ background: "rgba(0,200,150,.12)", border: "1px solid rgba(0,200,150,.45)" }}>
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: "#00C896" }} />
                      <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: "#00C896" }} />
                    </span>
                    Klasse 03 &middot; Bewerbung offen
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-[1.1fr_1fr] gap-8 md:gap-10 items-start">
                {/* Links – Screenshot */}
                <div>
                  <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: "#0f0f1a" }}>
                    <img
                      src="/klasse-1-kickoff.png"
                      alt="Kick-off der Copilot Partner Masterclass Klasse 1 am 22.05.2026 mit knapp 120 Teilnehmern live in Microsoft Teams"
                      className="w-full h-auto block"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-white/40 text-xs mt-3 text-center">
                    Kick-off Klasse 1 &middot; 22.05.2026 &middot; ~120 Teilnehmer live in Microsoft Teams
                  </p>
                </div>

                {/* Rechts – Story */}
                <div>
                  <h3
                    className="text-white font-bold mb-6"
                    style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(22px, 2.4vw, 30px)", letterSpacing: "-0.02em", lineHeight: 1.15 }}
                  >
                    Klasse 1 &amp; 2 sind <span className="text-[#00C896]">ausgebucht.</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                      { num: "52", label: "Systemhäuser" },
                      { num: "250+", label: "Mitarbeiter" },
                      { num: "2×", label: "ausgebucht" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: "#23233D" }}>
                        <div className="text-[#00C896] text-xl md:text-2xl font-bold leading-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                          {s.num}
                        </div>
                        <div className="text-white/50 text-[11px] leading-snug mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <blockquote className="border-l-2 border-[#00C896]/50 pl-4 mb-6">
                    <p className="text-white/75 text-sm md:text-[15px] leading-relaxed italic">
                      &bdquo;Gestern war es so weit: 31 Systemh&auml;user aus dem DACH-Raum sind in die erste Copilot Partner Masterclass gestartet. Knapp 120 Teilnehmer live im Kick-off, 150 registrierte Mitarbeiter in den kommenden Monaten &ndash; das ist erst der Anfang.&ldquo;
                    </p>
                    <footer className="text-white/40 text-xs mt-2">
                      — Alexander Eggers, Trainer &amp; 7× Microsoft MVP
                    </footer>
                  </blockquote>

                  <div>
                    <div className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-3">
                      Mit dabei (Auswahl aus Klasse 1 &amp; 2)
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "ACP Holding Deutschland GmbH",
                        "DATAGROUP Stuttgart GmbH",
                        "Henrichsen AG",
                        "Implement-IT GmbH",
                        "bitfire GmbH",
                        "Cloudtastic GmbH",
                        "connecT Systemhaus AG",
                        "Gme GmbH",
                        "GOESYS AG",
                        "GOHAN GmbH – Business Solutions",
                        "ke solutions",
                        "Know How! AG",
                        "noovic GmbH",
                      ].map((firma) => (
                        <span
                          key={firma}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium text-white/80 border border-white/10 transition-colors hover:bg-white/10"
                          style={{ background: "rgba(255,255,255,.05)" }}
                        >
                          {firma}
                        </span>
                      ))}
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium text-white/40">
                        … und 39 weitere
                      </span>
                    </div>

                    <a
                      href="/suche"
                      className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-[#00C896] hover:text-white transition-colors"
                    >
                      Alle 52 Copilot-Partner auf der Karte finden
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Karte 2 – Klasse 3 (Bewerbung offen) */}
            <div
              className="relative rounded-2xl p-8 border border-[#00C896]/40"
              style={{ background: "#1A1A2E", boxShadow: "0 0 40px rgba(0,200,150,.12)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[#00C896] text-xs font-semibold tracking-wider uppercase">
                  Klasse 03 &middot; Start vsl. Oktober 2026
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-[#1A1A2E]" style={{ background: "#00C896" }}>
                  Bewerbung offen
                </span>
              </div>

              <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <div className="mb-3 flex items-baseline justify-between">
                    <span className="text-white/80 text-sm font-medium">{klasse3Belegt} / {klasse3Capacity} Plätze vergeben</span>
                    <span className="text-white/40 text-sm">Start: Oktober 2026</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden mb-4 border border-[#00C896]/30" style={{ background: "rgba(0,200,150,.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${percent}%`, background: "#00C896" }} />
                  </div>
                  <p className="text-white/65 text-sm leading-relaxed">
                    Klasse 1 und 2 waren beide ausgebucht — Klasse 2 sogar schneller als Klasse 1. In Klasse 3 sind bereits {klasse3Belegt} der {klasse3Capacity} Plätze vergeben.
                  </p>
                </div>

                <button onClick={scrollToWaitlist} className="btn-primary justify-center whitespace-nowrap">
                  Jetzt für Klasse 3 bewerben <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 3. TRUST BAR ═══ */}
      <section style={{ background: "#23233D" }} className="py-5">
        <div className="container-main">
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-white/70 text-sm font-medium">
            {[
              "Microsoft Teams Community inklusive",
              "Live Q&A 2\u00D7 pro Monat",
              "Sofort einsetzbare Materialien",
              "Copilot-berater.de Zertifizierung",
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-3">
                {i > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#00C896] hidden sm:inline-block" />}
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. PAIN SECTION ═══ */}
      <section style={{ background: "#1A1A2E" }} className="py-[110px]">
        <div className="container-main">
          <div className="text-center mb-16 reveal">
            <span className="section-label">Die Realität im Systemhaus</span>
            <h2
              className="text-white font-bold mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.025em" }}
            >
              Kennen Sie das?
            </h2>
            <p className="text-white/50 text-lg max-w-[600px] mx-auto">
              Das sind keine Hypothesen – das sind Aussagen, die wir in Hunderten von Gesprächen mit Systemhaus-Geschäftsführern gehört haben.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              "\u201EUnsere Kunden fragen nach Copilot. Wir wissen nicht, was wir anbieten sollen.\u201C",
              "\u201EWir haben kein Workshop-Format, keine Demo-Umgebung, keinen Beratungsansatz.\u201C",
              "\u201EWir haben ein Jahr zugeschaut – jetzt kommen Kunden zu uns und wir sind nicht bereit.\u201C",
              "\u201EDie Marge bei Lizenzen sinkt. Aber wie der Weg zur Beratung geht, ist uns unklar.\u201C",
              "\u201EKeine Zeit, das alles selbst aufzubauen – das Tagesgeschäft frisst alles.\u201C",
            ].map((quote, i) => (
              <div
                key={i}
                className={`reveal reveal-delay-${(i % 3) + 1} p-8 rounded-[18px] border border-white/[0.06] hover:border-[#00C896]/40 transition-all duration-300`}
                style={{ background: "rgba(255,255,255,.03)", backdropFilter: "blur(8px)" }}
              >
                <p className="text-white/80 text-[15px] leading-relaxed italic">{quote}</p>
              </div>
            ))}

            {/* CTA Card */}
            <div
              className="reveal reveal-delay-3 p-8 rounded-[18px] flex flex-col justify-between"
              style={{ background: "rgba(0,200,150,.12)", border: "1px solid rgba(0,200,150,.3)" }}
            >
              <div>
                <h3
                  className="text-[#00C896] text-xl font-bold mb-3"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  Die Lösung existiert.
                </h3>
                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  Die Copilot Partner Masterclass schließt genau diese Lücke – strukturiert, praxisnah und in 90 Tagen.
                </p>
              </div>
              <a href="#solution" className="btn-primary !py-3 w-fit text-sm">
                Mehr erfahren <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 5. SOLUTION SECTION ═══ */}
      <section id="solution" style={{ background: "#EAF9F4" }} className="py-[110px]">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left column – text */}
            <div className="reveal">
              <span className="section-label">Das Programm</span>
              <h2 className="section-title">
                Das Betriebssystem für Ihr Copilot-Geschäft.
              </h2>
              <p className="text-[#6B6B8A] text-base leading-relaxed mb-8">
                Die Copilot Partner Masterclass ist kein Kurs – es ist das komplette Toolkit, um Copilot-Beratung als eigenständiges, margenstarkes Geschäftsfeld aufzubauen.
              </p>

              {/* Quote block */}
              <div className="border-l-4 border-[#00C896] pl-6 py-2">
                <p className="text-[#1A1A2E] text-base italic leading-relaxed mb-3">
                  &bdquo;Microsoft zeigt Ihnen, wie Copilot funktioniert. Wir zeigen Ihnen, wie Sie damit Geld verdienen.&ldquo;
                </p>
                <p className="text-[#6B6B8A] text-sm font-medium">
                  – Alexander Eggers, 7&times; Microsoft MVP
                </p>
              </div>
            </div>

            {/* Right column – 4 pillar cards */}
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  icon: <Layers className="w-6 h-6 text-[#00C896]" />,
                  title: "Strukturiertes Curriculum",
                  text: "50+ On-Demand-Videos von Discovery bis Skalierung – angepasst an die Systemhaus-Realität.",
                },
                {
                  icon: <Box className="w-6 h-6 text-[#00C896]" />,
                  title: "Fertige Vertriebstools",
                  text: "Pitch Decks, Angebotsvorlagen, Einwandbehandlung – sofort beim Kunden einsetzbar.",
                },
                {
                  icon: <Users className="w-6 h-6 text-[#00C896]" />,
                  title: "Exklusive Community",
                  text: "Peer-Netzwerk mit gleichgesinnten Systemhaus-GFs – in Microsoft Teams, kein neues Tool.",
                },
                {
                  icon: <Activity className="w-6 h-6 text-[#00C896]" />,
                  title: "Persönlicher MVP-Zugang",
                  text: "Direkter Draht zu Alexander Eggers – 2\u00D7 monatliche Live-Sessions und 1:1-Support.",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className={`reveal reveal-delay-${i + 1} bg-white p-6 rounded-[18px] border border-[#E8E8F0] hover:shadow-lg transition-all duration-300`}
                >
                  <div className="w-12 h-12 bg-[#EAF9F4] rounded-xl flex items-center justify-center mb-4">
                    {card.icon}
                  </div>
                  <h3 className="text-[#1A1A2E] font-bold text-base mb-2" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                    {card.title}
                  </h3>
                  <p className="text-[#6B6B8A] text-sm leading-relaxed">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 6. WAS IST ENTHALTEN ═══ */}
      <section id="included" style={{ background: "#FFFFFF" }} className="py-[110px]">
        <div className="container-main">
          <div className="text-center mb-16 reveal">
            <span className="section-label">Was enthalten ist</span>
            <h2 className="section-title">Alles, was Sie für den Start brauchen.</h2>
            <p className="section-subtitle mx-auto">
              Kein Eigenaufbau. Keine Recherche.<br />Keine Experimente auf Kosten Ihrer Kunden.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Curriculum & Content",
                items: [
                  "50+ On-Demand-Videos: Discovery bis Skalierung",
                  "Copilot Beratungs-Kompass (4-Schritte-Framework)",
                  "Demo-Umgebungen & praxisnahe Use Cases",
                  "Copilot-berater.de Zertifizierung",
                ],
              },
              {
                title: "Sales & Vertrieb",
                items: [
                  "Fertige Pitch Decks & Angebotsvorlagen",
                  "Einwandbehandlung & Gesprächsleitfäden",
                  "Workshop-Templates: Agenda, Folien, Handouts",
                  "Discovery-Fragebogen & Readiness-Checkliste",
                ],
              },
              {
                title: "Community & Live",
                items: [
                  "Microsoft Teams Community – kein neues Tool",
                  "Live Q&A Sessions 2\u00D7 pro Monat",
                  "Peer-Austausch mit anderen Systemhäusern",
                  "Onboarding-Session nach Paket",
                ],
              },
              {
                title: "Updates & Support",
                items: [
                  "Laufende Modul-Updates (Copilot entwickelt sich)",
                  "Persönlicher 1:1 Kontakt zu Alex Eggers",
                  "Neue Use Cases & Praxisbeispiele laufend",
                  "Direktzugang zur aktuellsten Copilot-Expertise",
                ],
              },
            ].map((col, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1}`}>
                <h3
                  className="text-[#1A1A2E] font-bold text-lg mb-5"
                  style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                >
                  {col.title}
                </h3>
                <ul className="space-y-3">
                  {col.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-[#6B6B8A] leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-[#00C896] flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. TRAINER SECTION ═══ */}
      <section id="trainer" style={{ background: "#EAF9F4" }} className="py-[110px]">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left – Photo + Credentials */}
            <div className="reveal">
              <div className="w-48 h-48 rounded-full overflow-hidden mx-auto lg:mx-0 mb-8">
                <img src="/trainer-alexander-eggers.png" alt="Alexander Eggers" className="w-full h-full object-cover" />
              </div>
              <div className="text-center lg:text-left mb-8">
                <h3 className="text-[#1A1A2E] text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Alexander Eggers</h3>
                <p className="text-[#6B6B8A] text-sm">Microsoft MVP | Copilot & M365</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { num: "7\u00D7", label: "Microsoft MVP in Folge" },
                  { num: "25+", label: "Jahre IT-Erfahrung" },
                  { num: "10k+", label: "YouTube-Abonnenten" },
                  { num: "15k+", label: "LinkedIn Follower" },
                ].map((c, i) => (
                  <div key={i} className="bg-white p-4 rounded-[10px] text-center">
                    <div className="text-[#00C896] text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{c.num}</div>
                    <div className="text-[#6B6B8A] text-xs mt-1">{c.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – Bio */}
            <div className="reveal reveal-delay-2">
              <span className="section-label">Ihr Trainer</span>
              <h2 className="section-title">Alexander Eggers – Microsoft MVP für Copilot & M365.</h2>
              <p className="text-[#6B6B8A] text-base leading-relaxed mb-6">
                Alexander Eggers ist einer der gefragtesten Microsoft-Copilot-Experten im deutschsprachigen Raum. Als Gesellschafter der ke solutions GmbH und Gründer der NextSkills GmbH verbindet er tiefes technisches Know-how mit dem Blick für Praxis und Umsatz.
              </p>
              <p className="text-[#6B6B8A] text-base leading-relaxed mb-6">
                Er ist einer von nur 4 Microsoft MVPs in Deutschland ausgezeichnet in den Kategorien &ldquo;M365&rdquo; und &ldquo;M365 Copilot&rdquo;. Regelmäßiger Speaker bei der Microsoft AI School und Inhaber eines YouTube-Kanals mit über 10.000 Abonnenten.
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {["Microsoft MVP", "M365 Copilot", "Copilot Studio & Agents", "Change Management", "Microsoft AI School"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-[#00C896]/10 text-[#00C896] rounded-full text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Testimonials */}
              <div className="space-y-4">
                <blockquote className="border-l-4 border-[#00C896] pl-4 text-sm text-[#6B6B8A] italic">
                  &bdquo;Vielen Dank! Sehr gut aufgesetzt, klarer Ablauf, viel Inhalt und Inspiration!&ldquo;
                  <footer className="text-xs mt-1 not-italic font-medium">– Teilnehmer, Workshop Microsoft Österreich</footer>
                </blockquote>
                <blockquote className="border-l-4 border-[#00C896] pl-4 text-sm text-[#6B6B8A] italic">
                  &bdquo;Noch mal ganz großes Lob – tolles Format, tolle Leute und viele wertvolle Informationen.&ldquo;
                  <footer className="text-xs mt-1 not-italic font-medium">– Feedback zur Show &bdquo;Alex & Ragnar&ldquo;</footer>
                </blockquote>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-16 lg:my-20 border-t border-[#00C896]/15 reveal"></div>

          {/* Co-Trainer – Michael Greth */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left – Bio */}
            <div className="reveal lg:order-2">
              <span className="section-label">Ihr Co-Trainer</span>
              <h2 className="section-title">Michael Greth – KI verstehen. Microsoft 365 wirksam nutzen.</h2>
              <p className="text-[#6B6B8A] text-base leading-relaxed mb-6">
                Michael Greth ist Berater, Speaker und Podcaster mit über 40 Jahren Erfahrung in der IT. Seit 27 Jahren ist er Microsoft MVP – ein Titel, der sein tiefes Engagement in der Community und das konsequente Mitgestalten eines offenen Austauschs rund um moderne IT widerspiegelt.
              </p>
              <p className="text-[#6B6B8A] text-base leading-relaxed mb-6">
                In der Masterclass unterstützt er das Team mit News und Updates zu den technischen Veränderungen des Copiloten, mit technisch geprägten Sessions in den Community-Terminen und mit Unterstützung im Community-Portal, um eure Fragen zu beantworten.
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {["Microsoft MVP (27 Jahre)", "M365 Copilot", "SharePoint", "Microsoft 365", "Microsoft Stream", "Community & Podcast"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-[#00C896]/10 text-[#00C896] rounded-full text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <a
                  href="https://www.linkedin.com/in/mgreth/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#00C896] hover:text-[#00A87D] transition-colors"
                >
                  Michael Greth auf LinkedIn
                  <span aria-hidden="true">→</span>
                </a>
                <a
                  href="https://podcast.yourcopilot.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#00C896] hover:text-[#00A87D] transition-colors"
                >
                  Zum Copilot-Podcast
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>

            {/* Right – Photo + Credentials */}
            <div className="reveal reveal-delay-2 lg:order-1">
              <div className="w-48 h-48 rounded-full overflow-hidden mx-auto lg:mx-0 mb-8">
                <img src="/trainer-michael-greth.png" alt="Michael Greth" className="w-full h-full object-cover" />
              </div>
              <div className="text-center lg:text-left mb-8">
                <h3 className="text-[#1A1A2E] text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Michael Greth</h3>
                <p className="text-[#6B6B8A] text-sm">Microsoft MVP | Berater, Speaker & Podcaster</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { num: "27×", label: "Microsoft MVP ausgezeichnet" },
                  { num: "40+", label: "Jahre IT-Erfahrung" },
                  { num: "M365", label: "Copilot & SharePoint" },
                  { num: "Podcast", label: "Speaker & Community-Host" },
                ].map((c, i) => (
                  <div key={i} className="bg-white p-4 rounded-[10px] text-center">
                    <div className="text-[#00C896] text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{c.num}</div>
                    <div className="text-[#6B6B8A] text-xs mt-1">{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 8. COMPARISON TABLE ═══ */}
      <section style={{ background: "#FFFFFF" }} className="py-[110px]">
        <div className="container-main">
          <div className="text-center mb-16 reveal">
            <span className="section-label">Warum Masterclass?</span>
            <h2 className="section-title">Kein vergleichbares Programm im DACH-Raum.</h2>
            <p className="section-subtitle mx-auto">
              Wir haben uns den Markt angesehen. Das hier gibt es so nicht noch einmal.
            </p>
          </div>

          <div className="reveal overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="text-left py-4 px-4 text-[#6B6B8A] font-semibold border-b border-[#E8E8F0]">Merkmal</th>
                  <th className="py-4 px-4 text-[#6B6B8A] font-semibold border-b border-[#E8E8F0]">Microsoft Learn</th>
                  <th className="py-4 px-4 text-[#6B6B8A] font-semibold border-b border-[#E8E8F0]">Einzeltrainer</th>
                  <th className="py-4 px-4 text-[#6B6B8A] font-semibold border-b border-[#E8E8F0]">Generische KI-Kurse</th>
                  <th className="py-4 px-4 font-bold border-b-2 border-[#00C896] text-[#1A1A2E]" style={{ background: "rgba(0,200,150,.04)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>Copilot Partner Masterclass</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Systemhaus-Fokus", cols: ["—", "—", "—", "Explizit"] },
                  { feature: "Fertige Vertriebstools", cols: ["—", "—", "—", "Inklusive"] },
                  { feature: "Copilot-Beratungsansatz", cols: ["—", "Teilweise", "—", "4-Schritte-Framework"] },
                  { feature: "Laufende Updates", cols: ["Ja", "—", "Selten", "Kontinuierlich"] },
                  { feature: "Community & Peers", cols: ["—", "—", "Begrenzt", "Exklusiv (Systemhäuser)"] },
                  { feature: "MVP-Zugang", cols: ["—", "—", "—", "Direkt"] },
                  { feature: "Kosten", cols: ["Kostenlos", "Tageshonorar", "Gering", "Auf Anfrage"] },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#E8E8F0]/60">
                    <td className="py-3.5 px-4 font-medium text-[#1A1A2E]">{row.feature}</td>
                    {row.cols.map((cell, j) => (
                      <td
                        key={j}
                        className={`py-3.5 px-4 text-center ${j === 3 ? "font-semibold text-[#1A1A2E]" : "text-[#6B6B8A]"}`}
                        style={j === 3 ? { background: "rgba(0,200,150,.04)" } : {}}
                      >
                        {j === 3 && cell !== "Auf Anfrage" ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-[#00C896]" />
                            {cell}
                          </span>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ 9. FAQ ═══ */}
      <section id="faq" style={{ background: "#E8E8F0" }} className="py-[110px]">
        <div className="container-main max-w-[800px]">
          <div className="text-center mb-16 reveal">
            <span className="section-label">Häufige Fragen</span>
            <h2 className="section-title">Einwände kennen wir. Antworten auch.</h2>
          </div>

          <div className="space-y-4 reveal">
            {[
              {
                q: "Wir haben keine Zeit für ein weiteres Programm.",
                a: "Die Masterclass ist bewusst neben dem Tagesgeschäft konzipiert. Alle Videos sind on demand abrufbar – zwischen Projekten, abends, im eigenen Tempo. Es gibt keine Pflicht-Termine außer den optionalen Live-Sessions. Nicht handeln kostet mehr Zeit: Kunden, die jetzt zu besser positionierten Wettbewerbern abwandern, müssen erst wieder zurückgewonnen werden.",
              },
              {
                q: "Das ist uns zu teuer.",
                a: "Ein einziger Copilot-Beratungstag bringt zwischen \u20AC 1.200 und \u20AC 2.500. Das Programm amortisiert sich also nach dem ersten abgerechneten Copilot Adoption Kunden. Die eigentliche Frage ist: Können Sie es sich leisten, es nicht zu tun – während Ihre Kunden aktiv nach Copilot-Beratung fragen?",
              },
              {
                q: "Wir schauen noch, der Markt ist noch nicht reif.",
                a: "Das Zeitfenster schließt sich in 12–18 Monaten. Wer sich jetzt positioniert, dominiert seinen regionalen Markt. Über 50 Systemhäuser in unseren ersten beiden Klassen haben diesen Moment bereits erkannt – beide Klassen sind ausgebucht. Wer wartet, verkauft weiterhin nur Lizenzen mit sinkenden Margen – und erklärt seinen Kunden, warum der Wettbewerber schon liefern kann.",
              },
              {
                q: "Das können wir auch selbst aufbauen.",
                a: "Natürlich. Der Eigenaufbau dauert erfahrungsgemäß 6–12 Monate: Curriculum entwickeln, Demo-Umgebungen bauen, Vertriebsmaterialien erstellen, Beratungsansatz testen. In dieser Zeit fragen Ihre Kunden. Jetzt. Heute. Die Masterclass liefert alles fertig – sofort einsetzbar, aus echter Systemhaus-Praxis.",
              },
              {
                q: "Für wen ist das Programm geeignet?",
                a: "Die Masterclass richtet sich an Geschäftsführer und Vertriebsleiter von Microsoft-Partnern (Systemhäuser) im DACH-Raum, die Copilot-Beratung als eigenständiges Geschäftsfeld aufbauen wollen. Technische Berater, die beim Kunden vor Ort sind, profitieren ebenfalls direkt von den fertigen Frameworks und Templates.",
              },
              {
                q: "Was passiert nach meiner Bewerbung?",
                a: "Alexander Eggers oder ein Teammitglied meldet sich persönlich innerhalb von 24 Stunden. Direkter Austausch — kein CRM-Prozess.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group bg-white rounded-[10px] overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-[#1A1A2E] font-semibold text-[15px] list-none [&::-webkit-details-marker]:hidden" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-[#6B6B8A] flex-shrink-0 ml-4 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 text-[#6B6B8A] text-sm leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>

          {/* FAQ CTA */}
          <div className="reveal mt-8 text-center rounded-2xl p-8 md:p-10" style={{ background: "#1A1A2E" }}>
            <h3 className="text-white font-bold text-xl md:text-2xl mb-3" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Ihr nächster Schritt dauert 3 Minuten
            </h3>
            <p className="text-white/60 text-sm md:text-base mb-6 leading-relaxed">
              Kein Verkaufsgespräch. Kein automatisierter Funnel.<br />
              Alexander Eggers oder sein Team melden sich persönlich.
            </p>
            <button onClick={scrollToWaitlist} className="btn-primary">
              Bewerbung starten <ArrowRight className="w-5 h-5" />
            </button>
            <ul className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mt-6 text-white/50 text-xs">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C896] flex-shrink-0" /> Persönliche Rückmeldung innerhalb von 24 Stunden
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C896] flex-shrink-0" /> Kein Kaufzwang · Kein automatisiertes E-Mail-Karussell
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ 10. FORM SECTION ═══ */}
      <section ref={waitlistRef} className="relative overflow-hidden py-[110px]" style={{ background: "#1A1A2E" }}>
        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Green glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full blur-[120px] opacity-15" style={{ background: "#00C896" }} />

        <div className="relative container-main text-center">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-[#00C896]/30 text-[#00C896] mb-8" style={{ background: "rgba(0,200,150,.08)" }}>
              Bewerbung Klasse 3 &middot; Start vsl. Oktober 2026
            </span>

            <h2
              className="text-white font-bold mb-4 max-w-[700px] mx-auto"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.025em" }}
            >
              {klasse3Capacity} Plätze.<br /><span className="text-[#00C896]">Klasse 3 startet im Oktober 2026.</span>
            </h2>

            <div className="text-white/50 text-lg max-w-[560px] mx-auto mb-10 leading-relaxed">
              <p className="text-white/75 font-medium mb-1">Klasse 1 &amp; 2: ausgebucht. Über 50 Systemhäuser sind bereits dabei.</p>
              <p className="text-[#00C896] font-medium mb-5">Klasse 3: {klasse3Belegt} von {klasse3Capacity} Plätzen bereits vergeben.</p>
              <p>
                Sie entscheiden, ob Ihr Systemhaus in 12 Monaten als führender Copilot-Partner in Ihrer Region positioniert ist — oder ob ein Wettbewerber diesen Platz einnimmt.
              </p>
            </div>

            {renderForm()}
          </div>
        </div>
      </section>

      {/* ═══ 11. FOOTER ═══ */}
      <footer style={{ background: "#23233D" }} className="pt-16 pb-8">
        <div className="container-main">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Col 1 – Brand */}
            <div>
              <span className="text-white font-bold text-xl block mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Next<span className="text-[#00C896]">Skills</span>
              </span>
              <p className="text-white/50 text-sm leading-relaxed">
                Das erste spezialisierte 12-Monats-Enablement-Programm für Microsoft-Partner im DACH-Raum. Vom Lizenz-Reseller zum strategischen KI-Berater.
              </p>
            </div>

            {/* Col 2 – Programm */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Programm</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#solution" className="text-white/50 hover:text-[#00C896] transition-colors">Das Programm</a></li>
                <li><a href="#included" className="text-white/50 hover:text-[#00C896] transition-colors">Was enthalten ist</a></li>
                <li><a href="#trainer" className="text-white/50 hover:text-[#00C896] transition-colors">Über den Trainer</a></li>
                <li><a href="#faq" className="text-white/50 hover:text-[#00C896] transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Col 3 – Kontakt */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:info@next-skills.de" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#00C896] transition-colors">info@next-skills.de</a></li>
                <li><a href="https://www.copilotberater.de" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#00C896] transition-colors">copilotberater.de</a></li>
                <li><a href="https://next-skills.de" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#00C896] transition-colors">next-skills.de</a></li>
                <li><a href="https://www.linkedin.com/in/teams-pro/" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#00C896] transition-colors">LinkedIn</a></li>
                <li><a href="https://www.youtube.com/@alexandereggers" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-[#00C896] transition-colors">YouTube</a></li>
                <li><a href="/impressum" className="text-white/50 hover:text-[#00C896] transition-colors">Impressum</a></li>
                <li><a href="/agb" className="text-white/50 hover:text-[#00C896] transition-colors">AGB</a></li>
              </ul>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <span>
              &copy; 2026 NextSkills GmbH &middot; Alexander Eggers | Katherina Nehr &middot; Alle Rechte vorbehalten.
            </span>
            <span className="flex items-center gap-2">
              <span className="px-2 py-0.5 border border-white/20 rounded text-[10px] font-semibold text-white/60">MVP</span>
              Microsoft Most Valuable Professional – M365 Copilot &amp; Office Apps
            </span>
          </div>
        </div>
      </footer>

      <LinkedInInsightTag />
    </main>
  );
}
