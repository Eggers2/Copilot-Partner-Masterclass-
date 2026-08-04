import { prisma } from "@/lib/prisma";
import { resolveKlasseToken } from "@/lib/umfrage/tokens";
import NamePicker from "@/components/umfrage/NamePicker";
import HinweisSeite from "../../HinweisSeite";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stand-Abfrage | Copilot Partner Masterclass",
  robots: { index: false, follow: false },
};

/**
 * Klassen-Link für den QR-Code auf der Folie in der Live-Session: für alle
 * gleich, der Teilnehmer wählt seinen Namen aus den belegten Plätzen der
 * Klasse. Schreibt in dieselbe Runde wie der persönliche Link (Upsert).
 */
export default async function KlassenUmfrageSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const res = await resolveKlasseToken(decodeURIComponent(token));

  if (!res.ok) {
    return <HinweisSeite grund={res.grund} />;
  }

  const slots = await prisma.bestellungTeilnehmer.findMany({
    where: {
      email: { not: "" },
      bestellung: { klasseId: res.runde.klasseId, intern: false },
    },
    select: {
      id: true,
      vorname: true,
      nachname: true,
      bestellung: { select: { firma: true } },
    },
    orderBy: [{ vorname: "asc" }, { nachname: "asc" }],
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-green">
            Copilot Partner Masterclass · {res.runde.klasse.name}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate">
            Monatliche Stand-Abfrage, Runde {res.runde.nummer}
          </h1>
        </header>
        <NamePicker
          token={decodeURIComponent(token)}
          klasseName={res.runde.klasse.name}
          rotierenderInhalt={res.runde.rotierenderInhalt}
          slots={slots.map((s) => ({
            id: s.id,
            vorname: s.vorname,
            nachname: s.nachname,
            firma: s.bestellung.firma.trim(),
          }))}
        />
      </div>
    </div>
  );
}
