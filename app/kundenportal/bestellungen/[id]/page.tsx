import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCustomerSession } from "@/lib/auth/customer";
import { prisma } from "@/lib/prisma";
import { KundeBestellungEditForm } from "@/components/kundenportal/KundeBestellungEditForm";
import { PACKAGES } from "@/lib/packages";

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

const STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  bearbeitet: "In Bearbeitung",
  abgeschlossen: "Abgeschlossen",
};

export default async function KundeBestellungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomerSession();

  const { id } = await params;
  const bestellungId = parseInt(id, 10);
  if (Number.isNaN(bestellungId)) notFound();

  const bestellung = await prisma.bestellung.findUnique({
    where: { id: bestellungId },
    include: { teilnehmer: { orderBy: { position: "asc" } } },
  });

  if (!bestellung || bestellung.email !== session.email) notFound();

  const paketInfo =
    PACKAGES[bestellung.paket as keyof typeof PACKAGES] ?? null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/kundenportal/bestellungen"
          className="inline-flex items-center gap-2 text-sm text-dark-slate-500 hover:text-[#030386] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-xs font-mono text-dark-slate-400 mb-1">
          Bestell-Nr: {bestellung.bestellNr}
        </p>
        <h1 className="text-2xl font-bold text-dark-slate-900">
          Meine Daten pflegen
        </h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Du kannst Kontaktdaten, Firmenadresse und Teilnehmer bearbeiten. Paket,
          Zahlungsvariante und Status werden vom Admin gepflegt.
        </p>
      </div>

      <section className="bg-dark-slate-50 border border-dark-slate-200 rounded-2xl p-5 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-dark-slate-500 mb-3">
          Deine Buchung (nur Info)
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs text-dark-slate-500">Paket</dt>
            <dd className="font-medium text-dark-slate-900">
              {paketInfo?.label ?? bestellung.paket}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-dark-slate-500">User</dt>
            <dd className="font-medium text-dark-slate-900">
              {bestellung.userAnzahl}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-dark-slate-500">Abrechnung</dt>
            <dd className="font-medium text-dark-slate-900 capitalize">
              {bestellung.zahlungsmodell}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-dark-slate-500">Status</dt>
            <dd className="font-medium text-dark-slate-900">
              {STATUS_LABELS[bestellung.status] ?? bestellung.status}
            </dd>
          </div>
          <div className="col-span-2 md:col-span-4 pt-3 border-t border-dark-slate-200">
            <dt className="text-xs text-dark-slate-500">Preis (Brutto)</dt>
            <dd className="font-medium text-dark-slate-900">
              {formatEuro(Number(bestellung.preisBrutto))}
              <span className="text-xs text-dark-slate-500 ml-2">
                ({formatEuro(Number(bestellung.preisNetto))} netto +{" "}
                {Number(bestellung.mwstSatz).toFixed(0)}% MwSt)
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <KundeBestellungEditForm
        bestellung={{
          id: bestellung.id,
          bestellNr: bestellung.bestellNr,
          userAnzahl: bestellung.userAnzahl,
          firma: bestellung.firma,
          strasse: bestellung.strasse,
          plz: bestellung.plz,
          ort: bestellung.ort,
          land: bestellung.land,
          ustId: bestellung.ustId,
          website: bestellung.website,
          vorname: bestellung.vorname,
          nachname: bestellung.nachname,
          email: bestellung.email,
          telefon: bestellung.telefon,
          position: bestellung.position,
          anmerkungen: bestellung.anmerkungen,
          teilnehmer: bestellung.teilnehmer.map((t) => ({
            position: t.position,
            vorname: t.vorname,
            nachname: t.nachname,
            email: t.email,
          })),
          showOnMap: bestellung.showOnMap,
        }}
      />
    </div>
  );
}
