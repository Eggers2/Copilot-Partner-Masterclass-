import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BestellungEditForm } from "@/components/admin/BestellungEditForm";
import { SendCustomerMagicLinkButton } from "@/components/admin/SendCustomerMagicLinkButton";

export default async function BestellungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { id } = await params;
  const bestellungId = parseInt(id, 10);
  if (Number.isNaN(bestellungId)) notFound();

  const bestellung = await prisma.bestellung.findUnique({
    where: { id: bestellungId },
    include: {
      teilnehmer: { orderBy: { position: "asc" } },
    },
  });

  if (!bestellung) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/shop"
          className="inline-flex items-center gap-2 text-sm text-dark-slate-500 hover:text-[#030386] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-dark-slate-400 mb-1">
            Bestell-Nr: {bestellung.bestellNr}
          </p>
          <h1 className="text-2xl font-bold text-dark-slate-900">
            Bestellung bearbeiten
          </h1>
          <p className="text-dark-slate-500 text-sm mt-1">
            Alle Felder lassen sich anpassen. Je nach Paket können hier die
            Teilnehmer mit Namen und E-Mail eingetragen werden.
          </p>
        </div>
        <SendCustomerMagicLinkButton
          bestellungId={bestellung.id}
          kundenEmail={bestellung.email}
        />
      </div>

      <BestellungEditForm
        bestellung={{
          id: bestellung.id,
          bestellNr: bestellung.bestellNr,
          paket: bestellung.paket,
          userAnzahl: bestellung.userAnzahl,
          zahlungsmodell: bestellung.zahlungsmodell,
          firma: bestellung.firma,
          strasse: bestellung.strasse,
          plz: bestellung.plz,
          ort: bestellung.ort,
          land: bestellung.land,
          ustId: bestellung.ustId,
          vorname: bestellung.vorname,
          nachname: bestellung.nachname,
          email: bestellung.email,
          telefon: bestellung.telefon,
          position: bestellung.position,
          anmerkungen: bestellung.anmerkungen,
          status: bestellung.status,
          teilnehmer: bestellung.teilnehmer.map((t) => ({
            position: t.position,
            vorname: t.vorname,
            nachname: t.nachname,
            email: t.email,
          })),
        }}
      />
    </div>
  );
}
