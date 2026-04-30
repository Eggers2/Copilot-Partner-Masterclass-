import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdnOrderForm } from "./adn-order-form";

export const metadata: Metadata = {
  title: "ADN-Bestellung – Microsoft Copilot Partner Masterclass | Next Skills",
  description: "Bestellung über den ADN-Vertriebskanal.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdnBestellenPage() {
  const openKlassen = await prisma.klasse.findMany({
    where: { status: "OPEN" },
    orderBy: { kickoffDate: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      kickoffDate: true,
      startDate: true,
      endDate: true,
    },
  });

  const klassenForClient = openKlassen.map((k) => ({
    id: k.id,
    name: k.name,
    slug: k.slug,
    kickoffDate: k.kickoffDate.toISOString(),
    startDate: k.startDate.toISOString(),
    endDate: k.endDate.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-ice">
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
          <span className="text-xs text-white/60 uppercase tracking-widest">
            ADN-Vertriebskanal
          </span>
        </div>
      </header>

      <div className="bg-slate py-12 text-center px-4 relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-block text-green text-xs font-bold tracking-widest uppercase mb-4">
            ADN-Bestellung
          </span>
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Microsoft Copilot Partner Masterclass
          </h1>
          <p className="text-gray text-lg max-w-2xl mx-auto">
            Bestellung über den ADN-Vertriebskanal. Bitte ADN-Modell wählen.
          </p>
        </div>
      </div>

      <div className="py-8">
        <AdnOrderForm klassen={klassenForClient} />
      </div>

      <footer className="bg-slate border-t border-slate-2 py-6 text-center text-sm text-gray">
        <p>
          © {new Date().getFullYear()} NextSkills GmbH · ADN-Kanal ·{" "}
          <a href="mailto:info@next-skills.de" className="hover:text-green transition-colors">
            info@next-skills.de
          </a>
        </p>
      </footer>
    </div>
  );
}
