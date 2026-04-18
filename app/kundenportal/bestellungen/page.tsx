import Link from "next/link";
import { Package, ChevronRight, Users } from "lucide-react";
import { requireCustomerSession } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { PACKAGES } from "@/lib/packages";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  neu: { label: "Neu", color: "bg-blue-50 text-blue-700 border-blue-200" },
  bearbeitet: {
    label: "In Bearbeitung",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  abgeschlossen: {
    label: "Abgeschlossen",
    color: "bg-green-50 text-green-700 border-green-200",
  },
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export default async function KundeBestellungenPage() {
  const session = await requireCustomerSession();

  const bestellungen = await prisma.bestellung.findMany({
    where: { email: session.email },
    orderBy: { erstelltAm: "desc" },
    select: {
      id: true,
      bestellNr: true,
      paket: true,
      userAnzahl: true,
      status: true,
      firma: true,
      erstelltAm: true,
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">
          Meine Bestellungen
        </h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Wähle eine Bestellung, um Kontaktdaten, Firmenadresse und Teilnehmer
          zu pflegen.
        </p>
      </div>

      {bestellungen.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-10 text-center">
          <Package className="w-10 h-10 text-dark-slate-300 mx-auto mb-3" />
          <p className="text-dark-slate-600 font-medium">
            Keine Bestellungen gefunden
          </p>
          <p className="text-dark-slate-400 text-sm mt-1">
            Zu dieser E-Mail ({session.email}) liegt keine Bestellung vor.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bestellungen.map((b) => {
            const paketInfo =
              PACKAGES[b.paket as keyof typeof PACKAGES] ?? null;
            const statusInfo =
              STATUS_LABELS[b.status] ?? {
                label: b.status,
                color: "bg-dark-slate-50 text-dark-slate-600 border-dark-slate-200",
              };
            return (
              <Link
                key={b.id}
                href={`/kundenportal/bestellungen/${b.id}`}
                className="block bg-white rounded-2xl border border-dark-slate-100 shadow-sm hover:border-[#030386]/30 hover:shadow-md transition-all p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-dark-slate-400">
                        {b.bestellNr}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-dark-slate-900 truncate">
                      {b.firma}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-dark-slate-500">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {paketInfo?.label ?? b.paket}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {b.userAnzahl} User
                      </span>
                      <span className="text-xs text-dark-slate-400">
                        bestellt am {formatDate(b.erstelltAm)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-dark-slate-300 flex-shrink-0 mt-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
