import type { Metadata } from "next";
import Link from "next/link";
import { OrderForm } from "./order-form";

export const metadata: Metadata = {
  title: "Bestellen – Microsoft Copilot Partner Masterclass | Next Skills",
  description:
    "Bestellen Sie die Microsoft Copilot Partner Masterclass für Ihr Team. Starter, Team oder Business Paket – jetzt verbindlich bestellen.",
};

export default function BestellenPage() {
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
            Jetzt bestellen
          </span>
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Microsoft Copilot Partner Masterclass
          </h1>
          <p className="text-gray text-lg max-w-2xl mx-auto">
            Wählen Sie Ihr Paket und bestellen Sie den Zugang für Ihr Team.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="py-8">
        <OrderForm />
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
