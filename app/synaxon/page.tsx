import type { Metadata } from "next";
import Link from "next/link";
import LinkedInInsightTag from "@/components/LinkedInInsightTag";
import { parseSynaxonSrc } from "@/lib/synaxon/source";
import { SynaxonForm } from "./synaxon-form";

// ─── Konfiguration ───────────────────────────────────────────────────────────
// Microsoft-Bookings-Link für "Termin mit Alexander buchen". Solange die URL
// leer ist, führt der Button zum Formular weiter unten auf der Seite.
const BOOKINGS_URL = "";

// Buchung über die SYNAXON Akademie, zweiter Button im Abschlussbereich.
const AKADEMIE_URL =
  "https://synaxon.com/de-de/akademie/veranstaltung/microsoft-copilot-partner-masterclass-45924/";

// Kommunizierte Zahlen. Bewusst im Code, damit die Seite konsistent liest.
const PARTNER_TEXT = "Über 60 Systemhäuser bauen damit gerade ihr Copilot-Beratungsgeschäft auf.";
const NAECHSTE_KLASSE = "Kickoff am 28.09.2026, Start im Oktober.";
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.APP_BASE_URL ?? "https://www.copilotberater.de";
const PAGE_URL = `${BASE_URL}/synaxon`;
const TITLE = "Copilot Partner Masterclass für SYNAXON-Systemhäuser | NextSkills";
const DESCRIPTION =
  "Das 12-Monats-Programm, mit dem Systemhäuser aus Copilot-Lizenzen bezahlte Beratung machen. Für SYNAXON-Partner: Termin mit Alexander buchen oder Unterlagen anfordern.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: PAGE_URL,
    siteName: "NextSkills",
    locale: "de_DE",
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630, alt: "Copilot Partner Masterclass" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${BASE_URL}/og-image.png`],
  },
};

// Liest ?src= pro Request → kein Static Render.
export const dynamic = "force-dynamic";

const MOVES = [
  {
    zitat: "Wir haben die Lizenzen, aber keiner nutzt sie.",
    reflex: "Nachlizenzierung.",
    move: "Ein bezahlter Aktivierungstermin.",
  },
  {
    zitat: "Reicht nicht der kostenlose Copilot?",
    reflex: "Eine Preisdiskussion.",
    move: "Die Use-Case-Frage.",
  },
  {
    zitat: "Schult mal kurz unsere Leute.",
    reflex: "Ein Zwei-Stunden-Termin.",
    move: "Ein Adoptionsprogramm.",
  },
];

const INHALTE = [
  "Fertige Workshop-Formate für den Kundeneinsatz",
  "Vertriebsunterlagen, Angebotsvorlagen und Preislogik",
  "Zweimal im Monat Live-Austausch mit Alexander und den anderen Partnern",
  "Lernplattform mit allen Inhalten, Community in Microsoft Teams",
];

const bookingsHref = BOOKINGS_URL || "#unterlagen";
const bookingsExternal = BOOKINGS_URL.length > 0;

function BookingsButton({ block = false }: { block?: boolean }) {
  return (
    <a
      href={bookingsHref}
      className={`btn-primary${block ? " w-full" : ""}`}
      {...(bookingsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      Termin mit Alexander buchen
    </a>
  );
}

export default async function SynaxonPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string | string[] }>;
}) {
  const params = await searchParams;
  const src = parseSynaxonSrc(params.src);

  return (
    <main className="min-h-screen bg-white font-body">
      {/* Header, Muster von /bestellen */}
      <header className="bg-slate border-b border-slate-2">
        <div className="max-w-3xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <Link href="/" className="font-heading font-bold text-white text-xl">
            Next<span className="text-green">Skills</span>
          </Link>
          <Link href="/" className="text-sm text-white/60 hover:text-white transition-colors">
            copilotberater.de
          </Link>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="bg-slate pt-14 pb-16">
        <div className="max-w-3xl mx-auto px-6 flex flex-col items-start gap-5">
          <h1
            className="font-heading font-extrabold text-white leading-[1.1] m-0"
            style={{ fontSize: "clamp(30px, 6vw, 52px)", letterSpacing: "-0.02em", textWrap: "balance" }}
          >
            Microsoft zeigt, wie Copilot funktioniert. Wir, wie du damit Geld verdienst.
          </h1>
          <p className="text-white/70 text-lg m-0 max-w-[34ch]">
            Copilot Partner Masterclass. Das 12-Monats-Programm für Systemhäuser.
          </p>
          <p className="text-green text-sm font-semibold m-0 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green" aria-hidden="true" />
            Du kommst über SYNAXON? Dann bist du hier richtig.
          </p>
          <BookingsButton />
        </div>
      </section>

      {/* 2. Reseller-Reflex vs. Berater-Move */}
      <section className="bg-ice py-16">
        <div className="max-w-3xl mx-auto px-6">
          <span className="section-label">Aus dem Alltag im Systemhaus</span>
          <h2 className="section-title">Reseller-Reflex oder Berater-Move?</h2>
          <p className="text-gray text-[17px] leading-relaxed max-w-[58ch] mb-8">
            Drei Sätze, die du von Kunden kennst. Und zwei Arten, darauf zu reagieren.
          </p>

          <div className="grid gap-4">
            {MOVES.map((m) => (
              <article key={m.zitat} className="bg-white rounded-xl p-6 grid gap-4">
                <h3 className="font-heading font-bold text-slate text-[19px] leading-snug m-0">
                  <span className="text-green">„</span>
                  {m.zitat}
                  <span className="text-green">“</span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border-t-2 border-cool pt-3">
                    <span className="block text-xs font-bold tracking-[.1em] uppercase text-gray mb-1">Der Reflex</span>
                    <p className="m-0 text-gray">{m.reflex}</p>
                  </div>
                  <div className="border-t-2 border-green pt-3">
                    <span className="block text-xs font-bold tracking-[.1em] uppercase text-green mb-1">Der Move</span>
                    <p className="m-0 text-slate font-medium">{m.move}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p className="text-slate text-lg font-medium leading-relaxed max-w-[50ch] mt-7 mb-0">
            Genau diese Situationen trainieren wir. Zwölf Monate lang, mit fertigen Formaten, die du direkt
            beim Kunden einsetzt.
          </p>
        </div>
      </section>

      {/* 3. Was drin ist */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-6">
          <span className="section-label">Was drin ist</span>
          <h2 className="section-title">Kein Kurs zum Anschauen. Ein Baukasten zum Verkaufen.</h2>
          <ul className="list-none m-0 p-0 grid gap-3 sm:grid-cols-2">
            {INHALTE.map((text) => (
              <li key={text} className="bg-cool rounded-xl px-5 py-4 text-slate font-medium flex gap-3 items-start">
                <span className="flex-none w-2.5 h-2.5 mt-2 rounded-sm bg-green" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Social Proof */}
      <section className="bg-ice py-16">
        <div className="max-w-3xl mx-auto px-6 grid gap-5 sm:grid-cols-2">
          <div>
            <div
              className="font-heading font-extrabold text-green leading-none"
              style={{ fontSize: "56px", letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}
            >
              60+
            </div>
            <p className="text-slate font-medium text-[17px] max-w-[30ch] mt-2 mb-0">{PARTNER_TEXT}</p>
          </div>
          <div className="bg-white rounded-xl px-6 py-5">
            <span className="block text-xs font-bold tracking-[.1em] uppercase text-gray mb-1.5">Trainer</span>
            <strong className="block font-heading text-slate text-xl">Alexander Eggers</strong>
            <p className="text-gray text-[15px] mt-1 mb-0">
              7x Microsoft MVP für Office Apps &amp; Services und M365 Copilot.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Abschluss-CTA */}
      <section id="unterlagen" className="bg-slate py-16 scroll-mt-4">
        <div className="max-w-3xl mx-auto px-6 grid gap-7">
          <div>
            <p className="text-green font-semibold text-[15px] tracking-wide m-0 mb-1.5">Nächste Klasse</p>
            <h2 className="section-title !text-white !mb-0">{NAECHSTE_KLASSE}</h2>
          </div>

          <div className="grid gap-3">
            <BookingsButton block />
            <a
              href={AKADEMIE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost w-full"
            >
              Über die SYNAXON Akademie buchen
            </a>
          </div>

          <SynaxonForm src={src} />
        </div>
      </section>

      {/* Footer, Muster von /bestellen */}
      <footer className="bg-slate-2 py-7 text-[13px] text-white/50">
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap gap-x-5 gap-y-2 justify-between">
          <span>
            &copy; {new Date().getFullYear()} NextSkills GmbH &middot;{" "}
            <a href="mailto:info@next-skills.de" className="text-white/70 hover:text-green transition-colors">
              info@next-skills.de
            </a>
          </span>
          <nav className="flex gap-4 flex-wrap">
            <Link href="/impressum" className="text-white/70 hover:text-green transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="text-white/70 hover:text-green transition-colors">Datenschutz</Link>
            <Link href="/agb" className="text-white/70 hover:text-green transition-colors">AGB</Link>
          </nav>
        </div>
      </footer>

      <LinkedInInsightTag />
    </main>
  );
}
