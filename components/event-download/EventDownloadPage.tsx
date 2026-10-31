import type { Metadata } from "next";
import Link from "next/link";
import type { EventDownload } from "@/lib/event-download/events";
import { parseUtm } from "@/lib/event-download/lead";
import { EventDownloadForm } from "./EventDownloadForm";

// Seite für den Folien-Download einer Veranstaltung (lib/event-download).
// Erreichbar nur über den QR-Code auf der letzten Folie: noindex, nicht in
// Navigation oder Sitemap.

export function eventDownloadMetadata(event: EventDownload): Metadata {
  return {
    title: `${event.ueberschrift} | ${event.veranstalter}`,
    description: event.beschreibung,
    robots: { index: false, follow: false },
  };
}

export async function EventDownloadPage({
  event,
  searchParams,
}: {
  event: EventDownload;
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
              {event.ueberschrift}
            </h1>
            <p className="text-white/70 text-base sm:text-lg mt-3 mb-0 leading-relaxed">
              {event.unterzeile}
            </p>
          </div>

          <EventDownloadForm slug={event.slug} utm={utm} />

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
