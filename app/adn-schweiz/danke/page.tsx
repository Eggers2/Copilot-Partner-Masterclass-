import type { Metadata } from "next";
import Link from "next/link";
import { ADN_SCHWEIZ_PDF_URL } from "@/lib/adn-schweiz/lead";

// Danke-Seite nach dem Formular auf /adn-schweiz mit dem Folien-Download.

export const metadata: Metadata = {
  title: "Vielen Dank | ADN Schweiz",
  description: "Download der Folien zum Vortrag bei ADN Schweiz.",
  robots: { index: false, follow: false },
};

export default function AdnSchweizDankePage() {
  return (
    <main className="min-h-screen bg-slate font-body flex flex-col">
      <header className="border-b border-slate-2">
        <div className="max-w-xl mx-auto px-4 sm:px-6 h-[56px] flex items-center">
          <Link href="/" className="font-heading font-bold text-white text-xl">
            Next<span className="text-green">Skills</span>
          </Link>
        </div>
      </header>

      <section className="flex-1 pt-10 pb-10">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
          <div>
            <p className="text-green text-sm font-semibold m-0 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green" aria-hidden="true" />
              Vielen Dank
            </p>
            <h1
              className="font-heading font-extrabold text-white leading-[1.1] mt-3 mb-0"
              style={{ fontSize: "clamp(30px, 8vw, 44px)", letterSpacing: "-0.02em", textWrap: "balance" }}
            >
              Ihre Folien stehen bereit
            </h1>
            <p className="text-white/70 text-base sm:text-lg mt-3 mb-0 leading-relaxed">
              Von Copilot-Hype zu nachhaltiger Wertschöpfung · ADN Schweiz, 28. Oktober 2026
            </p>
          </div>

          <a
            href={ADN_SCHWEIZ_PDF_URL}
            download
            className="btn-primary w-full text-xl py-5"
          >
            Folien herunterladen (PDF)
          </a>

          <div className="bg-ice rounded-[14px] p-5">
            <p className="text-slate text-sm leading-relaxed m-0">
              Sie möchten aus Copilot-Lizenzen bezahlte Beratung machen? Die{" "}
              <Link href="/" className="font-semibold text-slate underline decoration-green decoration-2 underline-offset-2">
                Copilot Partner Masterclass
              </Link>{" "}
              begleitet Microsoft-Partner zwölf Monate lang dabei.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-2 py-5">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex gap-5 text-sm text-white/45">
          <Link href="/impressum" className="hover:text-white">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
        </div>
      </footer>
    </main>
  );
}
