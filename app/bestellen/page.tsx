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
    <div className="min-h-screen bg-ns-light">
      {/* Header */}
      <header className="bg-white border-b border-dark-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ns-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NS</span>
            </div>
            <span className="font-bold text-ns-text text-lg">Next Skills</span>
          </div>
          <Link
            href="/"
            className="text-sm text-ns-text/60 hover:text-ns-text transition-colors"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-b from-white to-ns-light py-12 text-center px-4">
        <h1 className="text-3xl md:text-4xl font-bold text-ns-text mb-3">
          Microsoft Copilot Partner Masterclass
        </h1>
        <p className="text-ns-text/70 text-lg max-w-2xl mx-auto">
          Wählen Sie Ihr Paket und bestellen Sie den Zugang für Ihr Team.
        </p>
      </div>

      {/* Form */}
      <div className="py-8">
        <OrderForm />
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-dark-slate-200 py-6 text-center text-sm text-ns-text/50">
        <p>
          © {new Date().getFullYear()} Next Skills GmbH · copilotberater.de ·{" "}
          <a href="mailto:info@next-skills.de" className="hover:text-ns-text">
            info@next-skills.de
          </a>
        </p>
      </footer>
    </div>
  );
}
