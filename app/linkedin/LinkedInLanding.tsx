"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Mail } from "lucide-react";
import LinkedInInsightTag from "@/components/LinkedInInsightTag";
import { captureUtmData, getUtmData } from "@/lib/utm-tracker";
import { PARTNER_VIDEOS, STIMME_HIGHLIGHT, STIMMEN } from "@/lib/landing/inhalte";

// Ziel für "Lieber direkt sprechen? Termin buchen". Platzhalter, bis das
// endgültige Ziel feststeht.
const TERMIN_BUCHEN_URL = "mailto:info@next-skills.de?subject=Termin%20zur%20Copilot%20Partner%20Masterclass";

const HEADING_FONT = { fontFamily: "'Bricolage Grotesque', sans-serif" };

type FormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; email: string };

interface Props {
  klasseName: string;
  startMonat: string;
}

export default function LinkedInLanding({ klasseName, startMonat }: Props) {
  const [email, setEmail] = useState("");
  const [firma, setFirma] = useState("");
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const heroFormRef = useRef<HTMLDivElement>(null);
  const endFormRef = useRef<HTMLDivElement>(null);
  const [heroFormPassed, setHeroFormPassed] = useState(false);
  const [endFormReached, setEndFormReached] = useState(false);
  const showStickyCta = heroFormPassed && !endFormReached && formState.status !== "success";

  useEffect(() => {
    captureUtmData();
  }, []);

  // Mobiler Sticky-Button, Logik wie auf der Startseite: sichtbar, sobald das
  // Hero-Formular oben aus dem Bild ist, ausgeblendet, sobald das Formular am
  // Seitenende im Bild ist oder schon passiert wurde.
  useEffect(() => {
    const heroForm = heroFormRef.current;
    const endForm = endFormRef.current;
    if (!heroForm || !endForm) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === heroForm) {
          setHeroFormPassed(!e.isIntersecting && e.boundingClientRect.top < 0);
        } else if (e.target === endForm) {
          setEndFormReached(e.isIntersecting || e.boundingClientRect.top < 0);
        }
      });
    });
    observer.observe(heroForm);
    observer.observe(endForm);
    document.body.classList.add("has-sticky-cta");
    return () => {
      observer.disconnect();
      document.body.classList.remove("has-sticky-cta");
    };
  }, []);

  const scrollToHeroForm = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = heroFormRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Werte direkt aus dem Formular lesen: iOS-Autofill löst nicht immer onChange aus.
    const data = new FormData(e.currentTarget);
    const emailValue = String(data.get("email") ?? email).trim();
    const firmaValue = String(data.get("firma") ?? firma).trim();
    const website = String(data.get("website") ?? "");
    if (!emailValue) {
      setFormState({ status: "error", message: "Bitte geben Sie Ihre E-Mail-Adresse ein." });
      return;
    }
    setEmail(emailValue);
    setFirma(firmaValue);
    setFormState({ status: "loading" });

    try {
      const response = await fetch("/api/onepager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, firma: firmaValue, website, ...(getUtmData() ?? {}) }),
      });
      if (response.ok) {
        setFormState({ status: "success", email: emailValue.toLowerCase() });
        return;
      }
      const json = await response.json().catch(() => ({}));
      setFormState({
        status: "error",
        message:
          json.error ||
          "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal oder schreiben Sie an info@next-skills.de.",
      });
    } catch {
      setFormState({
        status: "error",
        message: "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal oder schreiben Sie an info@next-skills.de.",
      });
    }
  };

  const inputClass =
    "w-full pl-12 pr-4 py-4 bg-[#2d2d48] border border-[#2d2d48] focus:border-[#00C896] rounded-[10px] text-white placeholder-[#6B6B8A] outline-none transition-colors text-base disabled:opacity-50";

  const renderForm = (id: string) => {
    if (formState.status === "success") {
      return (
        <div
          className="rounded-[14px] p-6 border border-[#00C896]/45 text-left animate-fade-in"
          style={{ background: "rgba(0,200,150,.08)" }}
          role="status"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-[#00C896] flex-shrink-0 mt-0.5" />
            <p className="text-white text-base leading-relaxed">
              Der One-Pager ist unterwegs an <b className="font-semibold break-all">{formState.email}</b>. Bitte schauen Sie auch im Spam-Ordner nach.
            </p>
          </div>
          <a
            href={TERMIN_BUCHEN_URL}
            className="inline-flex items-center gap-1.5 mt-5 text-sm font-semibold text-white/70 hover:text-[#00C896] transition-colors"
          >
            Lieber direkt sprechen? Termin buchen <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      );
    }

    const loading = formState.status === "loading";
    return (
      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <div className="relative">
          <label htmlFor={`${id}-email`} className="sr-only">E-Mail-Adresse</label>
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B8A]" />
          <input
            id={`${id}-email`}
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ihre@email.de"
            autoComplete="email"
            inputMode="email"
            required
            disabled={loading}
            className={inputClass}
          />
        </div>
        <div className="relative">
          <label htmlFor={`${id}-firma`} className="sr-only">Firma (optional)</label>
          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B8A]" />
          <input
            id={`${id}-firma`}
            type="text"
            name="firma"
            value={firma}
            onChange={(e) => setFirma(e.target.value)}
            placeholder="Firma (optional)"
            autoComplete="organization"
            disabled={loading}
            className={inputClass}
          />
        </div>
        {/* Honeypot: für Menschen unsichtbar, Bots füllen es aus. */}
        <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
          <label htmlFor={`${id}-website`}>Website</label>
          <input id={`${id}-website`} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-[#1A1A2E]/30 border-t-[#1A1A2E] rounded-full animate-spin" />
              Wird gesendet...
            </>
          ) : (
            <>
              One-Pager per E-Mail erhalten
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {formState.status === "error" && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {formState.message}
          </div>
        )}

        <p className="text-white/70 text-[13px] leading-snug pt-1">
          Kein Newsletter. Alexander Eggers meldet sich persönlich, wenn es passt.
        </p>
        <p className="text-[#8A8AA6] text-xs leading-snug">
          Mit dem Absenden erhalten Sie den One-Pager per E-Mail. Wir speichern Ihre Angaben, um Ihnen den One-Pager zu senden und Sie persönlich zur Masterclass zu kontaktieren. Details in der{" "}
          <a href="/datenschutz" className="underline hover:text-[#00C896]">Datenschutzerklärung</a>.
        </p>
      </form>
    );
  };

  const fakten = [
    { titel: "12 Monate Begleitung", text: "Zwei Live-Sessions pro Monat mit Microsoft MVPs" },
    { titel: "Fertige Vertriebsunterlagen", text: "Pitch Decks, Angebotsvorlagen, Einwandbehandlung" },
    { titel: `${klasseName} startet im ${startMonat}`, text: "Online in Microsoft Teams" },
  ];

  return (
    <main className="min-h-screen" style={{ fontFamily: "'Figtree', system-ui, sans-serif", background: "#1A1A2E" }}>
      {/* ═══ LOGO ═══ */}
      <header className="container-main h-14 flex items-center">
        <span className="text-white font-bold text-xl" style={HEADING_FONT}>
          Next<span className="text-[#00C896]">Skills</span>
        </span>
      </header>

      {/* ═══ HERO MIT FORMULAR ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[360px] rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: "#00C896" }} />
        <div className="relative container-main pt-4 pb-14 md:pt-12 md:pb-20 grid md:grid-cols-[1.1fr_1fr] gap-6 md:gap-14 items-center">
          <div>
            <span className="section-label">Bevor Sie sich bewerben:</span>
            <h1
              className="text-white font-extrabold leading-[1.12] mt-2 mb-3"
              style={{ ...HEADING_FONT, fontSize: "clamp(25px, 4vw, 48px)", letterSpacing: "-0.02em" }}
            >
              Programm, Pakete und Preise der <span className="text-[#00C896]">Copilot Partner Masterclass</span> auf einer Seite.
            </h1>
            <p className="text-white/65 text-[15px] md:text-lg leading-relaxed">
              Der One-Pager kommt sofort per E-Mail. Danach entscheiden Sie in Ruhe, ob die Masterclass zu Ihrem Systemhaus passt.
            </p>
          </div>
          <div id="onepager" ref={heroFormRef} className="w-full max-w-[480px] md:justify-self-end">
            {renderForm("hero")}
          </div>
        </div>
      </section>

      {/* ═══ STIMMEN DER PARTNER ═══ */}
      <section style={{ background: "#23233D" }} className="py-14 md:py-20">
        <div className="container-main">
          <span className="section-label">Stimmen der Partner</span>
          <h2 className="text-white font-bold mt-2 mb-2" style={{ ...HEADING_FONT, fontSize: "clamp(22px, 3vw, 36px)", letterSpacing: "-0.02em" }}>
            Partner erzählen, was die Masterclass verändert hat.
          </h2>
          <p className="text-white/60 mb-8">Vier Systemhäuser aus den ersten beiden Klassen. Jeweils unter einer Minute.</p>

          {/* Mobil wischbar, Desktop vier Spalten. preload="none": Video lädt erst beim Tippen. */}
          <div className="-mx-6 px-6 md:mx-0 md:px-0 flex md:grid md:grid-cols-4 gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]">
            {PARTNER_VIDEOS.map((v) => (
              <figure key={v.slug} className="snap-start shrink-0 w-[78%] sm:w-[45%] md:w-auto flex flex-col gap-3">
                <video
                  className="w-full aspect-square rounded-[14px] border border-white/10 bg-black"
                  controls
                  preload="none"
                  playsInline
                  poster={`/videos/${v.slug}.jpg`}
                  aria-label={`Video: ${v.name}, ${v.firma}, über die Copilot Partner Masterclass`}
                >
                  <source src={`/videos/${v.slug}.mp4`} type="video/mp4" />
                </video>
                <figcaption className="flex flex-col gap-1">
                  <span className="text-white font-bold leading-snug" style={HEADING_FONT}>{v.titel}</span>
                  <span className="text-white/55 text-[13px]">
                    <b className="text-white/90 font-semibold">{v.name}</b> &middot; {v.firma} &middot; {v.klasse}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Zitate aus den Klassen */}
          <figure
            className="rounded-[14px] p-6 md:p-8 mt-10 mb-4 border border-[#00C896]/45"
            style={{ background: "rgba(0,200,150,.06)" }}
          >
            <div className="flex items-center gap-4 flex-wrap mb-4">
              <div className="flex flex-col">
                <span className="text-[#00C896] font-bold leading-tight text-[26px]" style={HEADING_FONT}>{STIMME_HIGHLIGHT.vorher}</span>
                <span className="text-white/50 text-xs">{STIMME_HIGHLIGHT.vorherLabel}</span>
              </div>
              <span className="text-white/35 text-2xl" aria-hidden="true">→</span>
              <div className="flex flex-col">
                <span className="text-[#00C896] font-bold leading-tight text-[26px]" style={HEADING_FONT}>{STIMME_HIGHLIGHT.nachher}</span>
                <span className="text-white/50 text-xs">{STIMME_HIGHLIGHT.nachherLabel}</span>
              </div>
            </div>
            <blockquote className="text-white/90 text-base leading-relaxed mb-3">&bdquo;{STIMME_HIGHLIGHT.zitat}&ldquo;</blockquote>
            <figcaption className="text-white/55 text-[13px]">
              <b className="text-white font-semibold">{STIMME_HIGHLIGHT.name}</b> &middot; {STIMME_HIGHLIGHT.firma} &middot; {STIMME_HIGHLIGHT.klasse}
            </figcaption>
          </figure>

          <div className="-mx-6 px-6 md:mx-0 md:px-0 flex md:grid md:grid-cols-3 gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]">
            {STIMMEN.map((s) => (
              <figure
                key={s.name}
                className="snap-start shrink-0 w-[85%] sm:w-[48%] md:w-auto rounded-[14px] p-6 flex flex-col justify-between gap-4 border border-white/10"
                style={{ background: "rgba(255,255,255,.03)" }}
              >
                <blockquote className="text-white/80 text-[15px] leading-relaxed">&bdquo;{s.zitat}&ldquo;</blockquote>
                <figcaption className="text-white/55 text-[13px]">
                  <b className="text-white font-semibold">{s.name}</b> &middot; {s.firma} &middot; {s.klasse}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DREI FAKTEN ═══ */}
      <section className="py-12 md:py-16">
        <div className="container-main">
          <dl className="grid sm:grid-cols-3 gap-3">
            {fakten.map((f) => (
              <div key={f.titel} className="rounded-[12px] px-5 py-4 border border-white/[0.08]" style={{ background: "rgba(255,255,255,.04)" }}>
                <dt className="text-white font-bold text-lg leading-snug" style={HEADING_FONT}>{f.titel}</dt>
                <dd className="text-white/55 text-sm mt-1">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ═══ TRAINER ═══ */}
      <section style={{ background: "#EAF9F4" }} className="py-12 md:py-16">
        <div className="container-main flex flex-col sm:flex-row items-center sm:items-start gap-6 max-w-[860px]">
          <div className="w-32 h-32 rounded-full overflow-hidden shrink-0">
            <img
              src="/trainer-alexander-eggers.png"
              alt="Alexander Eggers, Microsoft MVP für M365 und M365 Copilot, Trainer der Copilot Partner Masterclass"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="text-center sm:text-left">
            <span className="section-label">Ihr Trainer</span>
            <h2 className="text-[#1A1A2E] text-xl font-bold mt-1" style={HEADING_FONT}>Alexander Eggers</h2>
            <p className="text-[#6B6B8A] text-sm mb-3">Microsoft MVP | Copilot & M365</p>
            <p className="text-[#4A4A66] text-base leading-relaxed">
              Alexander Eggers ist einer der gefragtesten Microsoft-Copilot-Experten im deutschsprachigen Raum. Er ist einer von nur 4 Microsoft MVPs in Deutschland ausgezeichnet in den Kategorien &bdquo;M365&ldquo; und &bdquo;M365 Copilot&ldquo;.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FORMULAR AM SEITENENDE ═══ */}
      <section className="py-14 md:py-20">
        <div className="container-main max-w-[560px] text-center">
          <h2 className="text-white font-bold mb-2" style={{ ...HEADING_FONT, fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-0.02em" }}>
            Programm, Pakete und Preise auf einer Seite.
          </h2>
          <p className="text-white/60 mb-6">Der One-Pager kommt sofort per E-Mail.</p>
          <div ref={endFormRef}>{renderForm("ende")}</div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: "#23233D" }} className="py-7 text-[13px] text-white/50">
        <div className="container-main flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; 2026 NextSkills GmbH</span>
          <span className="flex gap-5">
            <a href="/impressum" className="text-white/70 hover:text-[#00C896] transition-colors">Impressum</a>
            <a href="/datenschutz" className="text-white/70 hover:text-[#00C896] transition-colors">Datenschutz</a>
          </span>
        </div>
      </footer>

      <LinkedInInsightTag />

      {/* ═══ MOBILER STICKY-BUTTON ═══ */}
      <div
        className={`sticky-cta md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pt-3 transition-all duration-300 ${showStickyCta ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(26,26,46,.96)", backdropFilter: "blur(12px)", boxShadow: "0 -2px 20px rgba(0,0,0,.3)" }}
        aria-hidden={!showStickyCta}
      >
        <a href="#onepager" onClick={scrollToHeroForm} tabIndex={showStickyCta ? 0 : -1} className="btn-primary w-full !py-3.5">
          One-Pager erhalten <ArrowRight className="w-5 h-5" />
        </a>
      </div>
    </main>
  );
}
