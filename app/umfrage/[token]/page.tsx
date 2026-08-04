import { prisma } from "@/lib/prisma";
import { resolveSlotToken } from "@/lib/umfrage/tokens";
import UmfrageFormular, { type VorhandeneAntwort } from "@/components/umfrage/UmfrageFormular";
import HinweisSeite from "../HinweisSeite";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stand-Abfrage | Copilot Partner Masterclass",
  robots: { index: false, follow: false },
};

/**
 * Persönlicher Umfrage-Link aus der E-Mail: das Token identifiziert Platz und
 * Runde, kein Login nötig. Eine vorhandene Antwort wird zur Korrektur
 * vorbefüllt (nur hier, nicht über den Klassen-Link).
 */
export default async function UmfrageSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const res = await resolveSlotToken(decodeURIComponent(token));

  if (!res.ok) {
    return <HinweisSeite grund={res.grund} />;
  }

  const antwort = await prisma.umfrageAntwort.findUnique({
    where: {
      rundeId_teilnehmerId: { rundeId: res.runde.id, teilnehmerId: res.teilnehmer.id },
    },
  });
  const vorhandeneAntwort: VorhandeneAntwort | null = antwort
    ? {
        rolle: antwort.rolle,
        stufe: antwort.stufe,
        techStufe: antwort.techStufe,
        blocker: antwort.blocker,
        blockerStufe: antwort.blockerStufe,
        blockerSuche: antwort.blockerSuche,
        rotierend: antwort.rotierend,
      }
    : null;

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
        <UmfrageFormular
          token={decodeURIComponent(token)}
          vorname={res.teilnehmer.vorname || "zusammen"}
          klasseName={res.runde.klasse.name}
          rotierenderInhalt={res.runde.rotierenderInhalt}
          vorbelegteRolle={res.teilnehmer.rolle}
          vorhandeneAntwort={vorhandeneAntwort}
        />
      </div>
    </div>
  );
}
