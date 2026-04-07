import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Impressum – Microsoft Copilot Partner Masterclass | NextSkills",
  description:
    "Impressum der NextSkills GmbH – Angaben gemäß § 5 TMG.",
};

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-ice">
      {/* Header */}
      <header className="bg-slate border-b border-slate-2">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span
              className="font-bold text-white text-xl"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Next<span className="text-green">Skills</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-slate py-16 text-center px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 50% 80%, rgba(0,200,150,.25) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <span className="inline-block text-green text-xs font-bold tracking-widest uppercase mb-4">
            Rechtsdokument
          </span>
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Impressum
          </h1>
          <p className="text-gray text-lg max-w-2xl mx-auto">
            Angaben gemäß § 5 TMG
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-cool p-6 md:p-10 space-y-10 text-slate text-sm leading-relaxed">
          {/* Angaben */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              NextSkills GmbH
            </h2>
            <p className="mb-1">Ostlandstraße 72</p>
            <p className="mb-4">31582 Nienburg/Weser</p>
            <p className="mb-1">
              <span className="font-semibold">Handelsregister:</span> HRB 209199
            </p>
            <p className="mb-4">
              <span className="font-semibold">Registergericht:</span> Amtsgericht Walsrode
            </p>
            <p className="font-semibold mb-1">Umsatzsteuer-ID:</p>
            <p className="mb-1">
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
            </p>
            <p className="mb-4">DE336339658</p>
            <p className="font-semibold mb-1">Vertreten durch:</p>
            <p>Katherina Nehr und Alexander Eggers</p>
          </section>

          {/* Kontakt */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Kontakt
            </h2>
            <p className="mb-1">
              <span className="font-semibold">E-Mail:</span>{" "}
              <a href="mailto:ae@nextvideo.de" className="text-green hover:underline">
                ae@nextvideo.de
              </a>
            </p>
            <p>
              <span className="font-semibold">Telefon:</span>{" "}
              <a href="tel:+4915118224446" className="text-green hover:underline">
                +49 151 18224446
              </a>
            </p>
          </section>

          {/* Verbraucherstreitbeilegung */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Verbraucherstreitbeilegung / Universalschlichtungsstelle
            </h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
              vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          {/* Verantwortlich */}
          <section>
            <h2
              className="text-xl font-bold text-slate mb-4"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h2>
            <p className="mb-1">NextSkills GmbH</p>
            <p className="mb-1">Ostlandstraße 72</p>
            <p>31582 Nienburg/Weser</p>
          </section>

          {/* Footer note */}
          <div className="pt-6 border-t border-cool text-xs text-gray text-center">
            NextSkills GmbH |{" "}
            <a href="https://next-skills.de" target="_blank" rel="noopener noreferrer" className="text-green hover:underline">
              next-skills.de
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate border-t border-slate-2 py-6 text-center text-sm text-gray">
        <p>
          © {new Date().getFullYear()} NextSkills GmbH · copilotberater.de ·{" "}
          <a href="mailto:info@next-skills.de" className="hover:text-green transition-colors">
            info@next-skills.de
          </a>
        </p>
      </footer>
    </div>
  );
}
