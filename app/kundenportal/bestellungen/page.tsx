import Link from "next/link";
import { Package, ChevronRight, Users, CalendarDays, CheckCircle2 } from "lucide-react";
import { requireCustomerSession } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { PACKAGES } from "@/lib/packages";
import { getConnectDayContext } from "@/lib/events/connectDay";

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

  const connectDay = await getConnectDayContext(session.email);
  const zeigeConnectDayTeaser =
    connectDay !== null &&
    connectDay.isOpen &&
    connectDay.eligibleBestellungen.length > 0;

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
      {zeigeConnectDayTeaser && connectDay && (
        <Link
          href="/kundenportal/connect-day"
          className="block mb-8 bg-slate rounded-2xl p-6 hover:ring-2 hover:ring-green/50 transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-green text-xs font-semibold uppercase tracking-wider mb-1">
                Exklusiv für Klasse 1 &amp; 2
              </p>
              <h2 className="text-xl font-bold text-white font-heading mb-1">
                Copilot Connect Day 2026
              </h2>
              <p className="text-white/70 text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-green" />
                10. &amp; 11. Dezember 2026 · nhow Hotel Frankfurt
              </p>
              {connectDay.personenAngemeldet > 0 ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-green">
                  <CheckCircle2 className="w-4 h-4" />
                  Ihr seid mit {connectDay.personenAngemeldet}{" "}
                  {connectDay.personenAngemeldet === 1 ? "Person" : "Personen"}{" "}
                  angemeldet
                  {connectDay.nachmeldeKontingent > 0 &&
                  !connectDay.notYetOpen &&
                  !connectDay.deadlinePassed &&
                  !connectDay.isFull
                    ? " · weitere Personen nachmelden möglich"
                    : ""}
                </p>
              ) : connectDay.notYetOpen ? (
                <p className="mt-3 text-sm font-medium text-white">
                  <span className="text-green font-bold">
                    Anmeldung öffnet am 07.07.2026
                  </span>{" "}
                  · nur 100 Plätze · First Come, First Serve
                </p>
              ) : connectDay.isFull ? (
                <p className="mt-3 text-sm font-medium text-red-400">Ausgebucht</p>
              ) : connectDay.deadlinePassed ? (
                <p className="mt-3 text-sm font-medium text-white/60">
                  Anmeldeschluss vorbei
                </p>
              ) : (
                <p className="mt-3 text-sm font-medium text-white">
                  <span className="text-green font-bold">
                    Nur noch {connectDay.seatsFrei}{" "}
                    {connectDay.seatsFrei === 1 ? "Platz" : "Plätze"} frei
                  </span>{" "}
                  · jetzt anmelden
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-white/40 flex-shrink-0 mt-1" />
          </div>
        </Link>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate font-heading">
          Meine Bestellungen
        </h1>
        <p className="text-gray text-sm mt-1">
          Wähle eine Bestellung, um Kontaktdaten, Firmenadresse und Teilnehmer
          zu pflegen.
        </p>
      </div>

      {bestellungen.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cool shadow-sm p-10 text-center">
          <Package className="w-10 h-10 text-cool mx-auto mb-3" />
          <p className="text-slate font-medium">
            Keine Bestellungen gefunden
          </p>
          <p className="text-gray text-sm mt-1">
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
                color: "bg-cool/40 text-gray border-cool",
              };
            return (
              <Link
                key={b.id}
                href={`/kundenportal/bestellungen/${b.id}`}
                className="block bg-white rounded-2xl border border-cool shadow-sm hover:border-green/40 hover:shadow-md transition-all p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray">
                        {b.bestellNr}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-slate truncate">
                      {b.firma}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {paketInfo?.label ?? b.paket}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {b.userAnzahl} User
                      </span>
                      <span className="text-xs text-gray">
                        bestellt am {formatDate(b.erstelltAm)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-cool flex-shrink-0 mt-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
