import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireCustomerSession } from "@/lib/auth/customer";
import { getNewsletter, readContent } from "@/lib/db/newsletters";
import { renderNewsletterHtml } from "@/lib/newsletter/render";

export default async function KundenportalNewsletterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCustomerSession();
  const { id } = await params;
  const nl = await getNewsletter(id);
  if (!nl || nl.status !== "SENT") notFound();

  // Bevorzugt gespeichertes HTML, Fallback: live rendern
  const html =
    nl.html ??
    renderNewsletterHtml(readContent(nl), {
      ausgabeNr: nl.ausgabeNr,
      kw: nl.kw,
      jahr: nl.jahr,
      titel: nl.titel,
      subtitle: nl.subtitle,
      gesendetAm: nl.gesendetAm,
    });

  return (
    <div className="space-y-4">
      <Link
        href="/kundenportal/newsletter"
        className="inline-flex items-center gap-1.5 text-sm text-dark-slate-500 hover:text-dark-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zum Archiv
      </Link>

      <div>
        <div className="text-xs text-dark-slate-400 font-semibold uppercase tracking-wide">
          Ausgabe #{nl.ausgabeNr} · KW {nl.kw}/{nl.jahr}
        </div>
        <h1 className="text-2xl font-bold text-dark-slate-900 mt-1">
          {nl.titel}
        </h1>
        {nl.gesendetAm && (
          <p className="text-xs text-dark-slate-400 mt-1">
            Versandt am{" "}
            {new Date(nl.gesendetAm).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      <iframe
        srcDoc={html}
        title={`${nl.titel} – Ausgabe ${nl.ausgabeNr}`}
        sandbox="allow-same-origin"
        className="w-full border border-dark-slate-200 rounded-2xl bg-white"
        style={{ minHeight: "1200px" }}
      />
    </div>
  );
}
