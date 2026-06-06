import Link from "next/link";
import { Mail, ChevronRight } from "lucide-react";
import { requireCustomerSession } from "@/lib/auth/customer";
import { getSentNewsletters } from "@/lib/db/newsletters";

export default async function KundenportalNewsletterListPage() {
  await requireCustomerSession();

  const newsletters = await getSentNewsletters();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate font-heading">
          Newsletter-Archiv
        </h1>
        <p className="text-gray text-sm mt-1">
          Alle bisherigen Ausgaben des &bdquo;Copilot Insider Update&ldquo; – auch die vor deiner Teilnahme.
        </p>
      </div>

      {newsletters.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cool p-12 shadow-sm text-center">
          <Mail className="w-8 h-8 text-cool mx-auto mb-3" />
          <p className="text-gray text-sm">
            Noch keine Newsletter versandt. Sobald die erste Ausgabe raus ist,
            findest du sie hier.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((nl) => (
            <Link
              key={nl.id}
              href={`/kundenportal/newsletter/${nl.id}`}
              className="flex items-center justify-between bg-white rounded-2xl border border-cool p-5 shadow-sm hover:border-green/40 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green" />
                </div>
                <div>
                  <div className="text-xs text-gray font-semibold uppercase tracking-wide">
                    Ausgabe #{nl.ausgabeNr} · KW {nl.kw}/{nl.jahr}
                  </div>
                  <div className="text-base font-semibold text-slate mt-0.5">
                    {nl.titel}
                  </div>
                  {nl.subtitle && (
                    <div className="text-sm text-gray mt-0.5">
                      {nl.subtitle}
                    </div>
                  )}
                  {nl.gesendetAm && (
                    <div className="text-xs text-gray mt-1">
                      Versandt am{" "}
                      {new Date(nl.gesendetAm).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-cool" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
