import Link from "next/link";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import LinkedInInsightTag from "@/components/LinkedInInsightTag";

export const metadata = {
  title: "Vielen Dank – Copilot Partner Masterclass",
  description:
    "Ihre Bewerbung für die Copilot Partner Masterclass ist eingegangen.",
  robots: { index: false, follow: false },
};

export default function DankePage() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: "#1A1A2E",
        fontFamily: "'Figtree', system-ui, sans-serif",
      }}
    >
      <section className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="container-main">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-8 rounded-full bg-[#00C896]/15 border border-[#00C896]/30">
              <CheckCircle2 className="w-10 h-10 text-[#00C896]" />
            </div>

            <h1
              className="text-4xl sm:text-5xl font-bold text-white mb-6"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Vielen Dank für Ihre Bewerbung!
            </h1>

            <p className="text-lg text-white/70 mb-4 leading-relaxed">
              Wir haben Ihre Anfrage erhalten und melden uns innerhalb von{" "}
              <span className="text-[#00C896] font-semibold">48 Stunden</span>{" "}
              persönlich bei Ihnen.
            </p>

            <p className="text-base text-white/50 mb-12 leading-relaxed">
              Bitte prüfen Sie auch Ihren Spam-Ordner, falls Sie keine
              Bestätigungs-E-Mail erhalten. Bei Fragen erreichen Sie uns
              jederzeit unter{" "}
              <a
                href="mailto:info@next-skills.de"
                className="text-[#00C896] hover:underline"
              >
                info@next-skills.de
              </a>
              .
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zur Startseite
            </Link>
          </div>
        </div>
      </section>

      <footer
        style={{ background: "#23233D" }}
        className="py-6 border-t border-white/5"
      >
        <div className="container-main">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <span>
              &copy; 2026 NextSkills GmbH &middot; Alle Rechte vorbehalten.
            </span>
            <div className="flex items-center gap-4">
              <Link
                href="/impressum"
                className="hover:text-white/70 transition-colors"
              >
                Impressum
              </Link>
              <Link
                href="/agb"
                className="hover:text-white/70 transition-colors"
              >
                AGB
              </Link>
              <Link
                href="/privacy"
                className="hover:text-white/70 transition-colors"
              >
                Datenschutz
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <LinkedInInsightTag />
    </main>
  );
}
