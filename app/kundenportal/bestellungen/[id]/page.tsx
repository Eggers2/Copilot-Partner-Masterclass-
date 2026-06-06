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
    include: {
      teilnehmer: { orderBy: { position: "asc" } },
      klasse: { select: { name: true, teilnehmerSperre: true } },
    },
  });

  if (!bestellung || bestellung.email !== session.email) notFound();

  const paketInfo =
    PACKAGES[bestellung.paket as keyof typeof PACKAGES] ?? null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/kundenportal/bestellungen"
          className="inline-flex items-center gap-2 text-sm text-gray hover:text-green transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-xs font-mono text-gray mb-1">
          Bestell-Nr: {bestellung.bestellNr}
        </p>
        <h1 className="text-2xl font-bold text-slate font-heading">
          Meine Daten pflegen
        </h1>
        <p className="text-gray text-sm mt-1">
          Du kannst Kontaktdaten, Firmenadresse und Teilnehmer bearbeiten. Paket,
          Zahlungsvariante und Status werden vom Admin gepflegt.
        </p>
      </div>

      <section className="bg-cool/30 border border-cool rounded-2xl p-5 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray mb-3">
          Deine Buchung (nur Info)
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs text-gray">Paket</dt>
            <dd className="font-medium text-slate">
              {paketInfo?.label ?? bestellung.paket}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray">User</dt>
            <dd className="font-medium text-slate">
              {bestellung.userAnzahl}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray">Abrechnung</dt>
            <dd className="font-medium text-slate capitalize">
              {bestellung.zahlungsmodell}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray">Status</dt>
            <dd className="font-medium text-slate">
              {STATUS_LABELS[bestellung.status] ?? bestellung.status}
            </dd>
          </div>
          <div className="col-span-2 md:col-span-4 pt-3 border-t border-cool">
            <dt className="text-xs text-gray">Preis (Netto)</dt>
            <dd className="font-medium text-slate">
              {formatEuro(
                Number(bestellung.listPreisNetto ?? bestellung.preisNetto)
              )}
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
          klasseName: bestellung.klasse.name,
          teilnehmerSperre: bestellung.klasse.teilnehmerSperre,
        }}
      />
    </div>
  );
}
