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
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        message: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
      });
    }
  };

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
      {formState.status === "success" ? (
        <div className="flex flex-col items-center gap-4 p-8 bg-[#00C896]/10 border border-[#00C896]/30 rounded-2xl animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-[#00C896]" />
          <div className="text-center">
            <p className="text-[#00C896] text-xl font-bold mb-1">
              Ihre Bewerbung ist eingegangen!
            </p>
            <p className="text-[#00C896]/70 text-sm">
              Wir melden uns persoenlich bei Ihnen.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
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
                  Jetzt Platz sichern
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
            Keine Verpflichtung. Wir melden uns persoenlich.
          </p>
        </form>
      )}
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
          {/* Badge */}
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-[#00C896]/30 text-[#00C896]" style={{ background: "rgba(0,200,150,.08)" }}>
              <span className="w-2 h-2 rounded-full bg-[#00C896] inline-block" />
              12-Monats-Enablement &middot; DACH &middot; Launch Mai 2026
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
          <p className="text-white/60 text-lg md:text-xl max-w-[560px] mb-10 leading-relaxed">
            Das erste spezialisierte Copilot-Programm fuer Microsoft-Partner im DACH-Raum. In 90 Tagen Ihren ersten Beratungsauftrag – mit fertigen Templates, Demo-Umgebungen und persoenlichem MVP-Zugang.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <button onClick={scrollToWaitlist} className="btn-primary text-base">
              Jetzt Platz sichern <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#solution" className="btn-ghost text-base">
              Programm entdecken
            </a>
          </div>

          {/* Stats row */}
          <div className="w-full border-t border-white/10 pt-10 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-[800px]">
            {[
              { num: "60+", label: "Systemhaeuser auf der Warteliste" },
              { num: "6\u00D7", label: "Microsoft MVP Alexander Eggers" },
              { num: "90", label: "Tage bis zum ersten Auftrag" },
              { num: "25+", label: "Jahre Microsoft-Erfahrung" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[#00C896] text-3xl md:text-4xl font-bold mb-1" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{s.num}</div>
                <div className="text-white/50 text-xs leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center pb-8 relative">
          <ChevronDown className="w-6 h-6 text-white/30 animate-bounce" />
        </div>
      </section>

      {/* ═══ 3. TRUST BAR ═══ */}
      <section style={{ background: "#23233D" }} className="py-5">
        <div className="container-main">
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-white/70 text-sm font-medium">
            {[
              "Microsoft-zertifiziertes Curriculum",
              "Microsoft Teams Community inklusive",
              "Live Q&A 2\u00D7 pro Monat",
              "Sofort einsetzbare Materialien",
              "6\u00D7 Microsoft MVP Trainer",
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
            <span className="section-label">Die Realitaet im Systemhaus</span>
            <h2
              className="text-white font-bold mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.025em" }}
            >
              Kennen Sie das?
            </h2>
            <p className="text-white/50 text-lg max-w-[600px] mx-auto">
              Das sind keine Hypothesen – das sind Aussagen, die wir in Hunderten von Gespraechen mit Systemhaus-Geschaeftsfuehrern gehoert haben.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              "\u201EUnsere Kunden fragen nach Copilot. Wir wissen nicht, was wir anbieten sollen.\u201C",
              "\u201EWir haben kein Workshop-Format, keine Demo-Umgebung, keinen Beratungsansatz.\u201C",
              "\u201EWir haben ein Jahr zugeschaut – jetzt kommen Kunden zu uns und wir sind nicht bereit.\u201C",
              "\u201EDie Marge bei Lizenzen sinkt. Aber wie der Weg zur Beratung geht, ist uns unklar.\u201C",
              "\u201EKeine Zeit, das alles selbst aufzubauen – das Tagesgeschaeft frisst alles.\u201C",
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
                  Die Loesung existiert.
                </h3>
                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  Die Copilot Partner Masterclass schliesst genau diese Luecke – strukturiert, praxisnah und in 90 Tagen.
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
                Das Betriebssystem fuer Ihr Copilot-Geschaeft.
              </h2>
              <p className="text-[#6B6B8A] text-base leading-relaxed mb-8">
                Die Copilot Partner Masterclass ist kein Kurs – es ist das komplette Toolkit, um Copilot-Beratung als eigenstaendiges, margenstarkes Geschaeftsfeld aufzubauen.
              </p>

              {/* Quote block */}
              <div className="border-l-4 border-[#00C896] pl-6 py-2">
                <p className="text-[#1A1A2E] text-base italic leading-relaxed mb-3">
                  &bdquo;Microsoft zeigt Ihnen, wie Copilot funktioniert. Wir zeigen Ihnen, wie Sie damit Geld verdienen.&ldquo;
                </p>
                <p className="text-[#6B6B8A] text-sm font-medium">
                  – Alexander Eggers, 6&times; Microsoft MVP
                </p>
              </div>
            </div>

            {/* Right column – 4 pillar cards */}
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  icon: <Layers className="w-6 h-6 text-[#00C896]" />,
                  title: "Strukturiertes Curriculum",
                  text: "50+ On-Demand-Videos von Discovery bis Skalierung – angepasst an die Systemhaus-Realitaet.",
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
                  title: "Persoenlicher MVP-Zugang",
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
            <h2 className="section-title">Alles, was Sie fuer den Start brauchen.</h2>
            <p className="section-subtitle mx-auto">
              Kein Eigenaufbau. Keine Recherche. Keine Experimente auf Kosten Ihrer Kunden.
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
                  "Lernpfade on demand – neben dem Tagesgeschaeft",
                ],
              },
              {
                title: "Sales & Vertrieb",
                items: [
                  "Fertige Pitch Decks & Angebotsvorlagen",
                  "Einwandbehandlung & Gespraechsleitfaeden",
                  "Workshop-Templates: Agenda, Folien, Handouts",
                  "Discovery-Fragebogen & Readiness-Checkliste",
                ],
              },
              {
                title: "Community & Live",
                items: [
                  "Microsoft Teams Community – kein neues Tool",
                  "Live Q&A Sessions 2\u00D7 pro Monat",
                  "Peer-Austausch mit anderen Systemhaeusern",
                  "Onboarding-Session nach Paket",
                ],
              },
              {
                title: "Updates & Support",
                items: [
                  "Laufende Modul-Updates (Copilot entwickelt sich)",
                  "Persoenlicher 1:1 Kontakt zu Alex Eggers",
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
              <div className="w-48 h-48 rounded-full bg-[#23233D] flex items-center justify-center mx-auto lg:mx-0 mb-8">
                <span className="text-[#00C896] text-5xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>AE</span>
              </div>
              <div className="text-center lg:text-left mb-8">
                <h3 className="text-[#1A1A2E] text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Alexander Eggers</h3>
                <p className="text-[#6B6B8A] text-sm">Microsoft MVP | Copilot & M365</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { num: "6\u00D7", label: "Microsoft MVP ausgezeichnet" },
                  { num: "25+", label: "Jahre IT-Erfahrung" },
                  { num: "9k+", label: "YouTube-Abonnenten" },
                  { num: "~160", label: "MVPs gesamt in Deutschland" },
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
              <h2 className="section-title">Alexander Eggers – Microsoft MVP fuer Copilot & M365.</h2>
              <p className="text-[#6B6B8A] text-base leading-relaxed mb-6">
                Alexander Eggers ist einer der gefragtesten Microsoft-Copilot-Experten im deutschsprachigen Raum. Als geschaeftsfuehrender Gesellschafter der ke solutions GmbH und Gruender der NextSkills GmbH verbindet er tiefes technisches Know-how mit dem Blick fuer Praxis und Umsatz.
              </p>
              <p className="text-[#6B6B8A] text-base leading-relaxed mb-6">
                Er ist einer von nur ~160 Microsoft MVPs in Deutschland – ausgezeichnet in den Kategorien Office Apps &amp; Services und M365 Copilot. Regelmaessiger Speaker bei der Microsoft AI School und Inhaber eines YouTube-Kanals mit ueber 9.000 Abonnenten.
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
                  <footer className="text-xs mt-1 not-italic font-medium">– Teilnehmer, Workshop Microsoft Oesterreich</footer>
                </blockquote>
                <blockquote className="border-l-4 border-[#00C896] pl-4 text-sm text-[#6B6B8A] italic">
                  &bdquo;Noch mal ganz grosses Lob – tolles Format, tolle Leute und viele wertvolle Informationen.&ldquo;
                  <footer className="text-xs mt-1 not-italic font-medium">– Feedback zur Show &bdquo;Alex & Ragnar&ldquo;</footer>
                </blockquote>
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
                  { feature: "Community & Peers", cols: ["—", "—", "Begrenzt", "Exklusiv (Systemhaeuser)"] },
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
            <span className="section-label">Haeufige Fragen</span>
            <h2 className="section-title">Einwaende kennen wir. Antworten auch.</h2>
          </div>

          <div className="space-y-4 reveal">
            {[
              {
                q: "Wir haben keine Zeit fuer ein weiteres Programm.",
                a: "Die Masterclass ist bewusst neben dem Tagesgeschaeft konzipiert. Alle Videos sind on demand abrufbar – zwischen Projekten, abends, im eigenen Tempo. Es gibt keine Pflicht-Termine ausser den optionalen Live-Sessions. Nicht handeln kostet mehr Zeit: Kunden, die jetzt zu besser positionierten Wettbewerbern abwandern, muessen erst wieder zurueckgewonnen werden.",
              },
              {
                q: "Das ist uns zu teuer.",
                a: "Ein einziger Copilot-Beratungstag bringt zwischen \u20AC 1.200 und \u20AC 2.500. Das Programm amortisiert sich also nach dem ersten abgerechneten Workshop. Die eigentliche Frage ist: Koennen Sie es sich leisten, es nicht zu tun – waehrend Ihre Kunden aktiv nach Copilot-Beratung fragen?",
              },
              {
                q: "Wir schauen noch, der Markt ist noch nicht reif.",
                a: "Das Zeitfenster schliesst sich in 12–18 Monaten. Wer sich jetzt positioniert, dominiert seinen regionalen Markt. Die Systemhaeuser, die heute auf unserer Warteliste stehen, haben diesen Moment bereits erkannt. Wer wartet, verkauft weiterhin nur Lizenzen mit sinkenden Margen – und erklaert seinen Kunden, warum der Wettbewerber schon liefern kann.",
              },
              {
                q: "Das koennen wir auch selbst aufbauen.",
                a: "Natuerlich. Der Eigenaufbau dauert erfahrungsgemaess 6–12 Monate: Curriculum entwickeln, Demo-Umgebungen bauen, Vertriebsmaterialien erstellen, Beratungsansatz testen. In dieser Zeit fragen Ihre Kunden. Jetzt. Heute. Die Masterclass liefert alles fertig – sofort einsetzbar, aus echter Systemhaus-Praxis.",
              },
              {
                q: "Fuer wen ist das Programm geeignet?",
                a: "Die Masterclass richtet sich an Geschaeftsfuehrer und Vertriebsleiter von Microsoft-Partnern (Systemhaeuser) im DACH-Raum, die Copilot-Beratung als eigenstaendiges Geschaeftsfeld aufbauen wollen. Technische Berater, die beim Kunden vor Ort sind, profitieren ebenfalls direkt von den fertigen Frameworks und Templates.",
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
              Launch Mai 2026 &middot; Plaetze begrenzt
            </span>

            <h2
              className="text-white font-bold mb-4 max-w-[700px] mx-auto"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.025em" }}
            >
              Sichern Sie <span className="text-[#00C896]">Ihren Platz.</span> Bevor es Ihr Wettbewerber tut.
            </h2>

            <p className="text-white/50 text-lg max-w-[520px] mx-auto mb-10">
              20+ Systemhaeuser stehen bereits auf der Warteliste. Tragen Sie sich jetzt ein und sichern Sie Ihren Zugang.
            </p>

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
                Das erste spezialisierte 12-Monats-Enablement-Programm fuer Microsoft-Partner im DACH-Raum. Vom Lizenz-Reseller zum strategischen KI-Berater.
              </p>
            </div>

            {/* Col 2 – Programm */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Programm</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#solution" className="text-white/50 hover:text-[#00C896] transition-colors">Das Programm</a></li>
                <li><a href="#included" className="text-white/50 hover:text-[#00C896] transition-colors">Was enthalten ist</a></li>
                <li><a href="#trainer" className="text-white/50 hover:text-[#00C896] transition-colors">Ueber den Trainer</a></li>
                <li><a href="#faq" className="text-white/50 hover:text-[#00C896] transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Col 3 – Kontakt */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-white/50">info@next-skills.de</span></li>
                <li><span className="text-white/50">copilotberater.de</span></li>
                <li><span className="text-white/50">next-skills.de</span></li>
                <li><span className="text-white/50">LinkedIn</span></li>
                <li><span className="text-white/50">YouTube</span></li>
              </ul>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <span>
              &copy; 2026 NextSkills GmbH &middot; Alexander Eggers | Katharina Nehr &middot; Alle Rechte vorbehalten.
            </span>
            <span className="flex items-center gap-2">
              <span className="px-2 py-0.5 border border-white/20 rounded text-[10px] font-semibold text-white/60">MVP</span>
              Microsoft Most Valuable Professional – M365 Copilot &amp; Office Apps
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
