import type { Metadata } from "next";
import Link from "next/link";
import { parseUtm } from "@/lib/adn-schweiz/lead";
import { AdnSchweizForm } from "./adn-schweiz-form";

// Folien-Download nach dem Vortrag bei ADN Schweiz (Opfikon, 28.10.2026).
// Erreichbar nur über den QR-Code auf der letzten Folie: noindex, nicht in
// Navigation oder Sitemap.

export const metadata: Metadata = {
  title: "Die Folien zum Vortrag | ADN Schweiz",
  description: "Folien zum Vortrag „Von Copilot-Hype zu nachhaltiger Wertschöpfung“ bei ADN Schweiz.",
  robots: { index: false, follow: false },
};

// Liest die UTM-Werte pro Request aus der URL → kein Static Render.
export const dynamic = "force-dynamic";

export default async function AdnSchweizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const utm = parseUtm(await searchParams);

  return (
    <main className="min-h-screen bg-slate font-body flex flex-col">
      <header className="border-b border-slate-2">
        <div className="max-w-xl mx-auto px-4 sm:px-6 h-[56px] flex items-center">
          <Link href="/" className="font-heading font-bold text-white text-xl">
            Next<span className="text-green">Skills</span>
          </Link>
        </div>
      </header>

      <section className="flex-1 pt-8 pb-10">
        <div className="max-w-xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
          <div>
            <h1
              className="font-heading font-extrabold text-white leading-[1.1] m-0"
              style={{ fontSize: "clamp(30px, 8vw, 44px)", letterSpacing: "-0.02em", textWrap: "balance" }}
            >
              Die Folien zum Vortrag
            </h1>
            <p className="text-white/70 text-base sm:text-lg mt-3 mb-0 leading-relaxed">
              Von Copilot-Hype zu nachhaltiger Wertschöpfung · ADN Schweiz, 28. Oktober 2026
            </p>
          </div>

          <AdnSchweizForm utm={utm} />

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
