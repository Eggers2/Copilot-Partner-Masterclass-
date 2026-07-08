import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Unlock } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setKlasseStatusAction } from "@/app/admin/actions";
import { KlasseForm } from "../klasse-form";
import { KLASSE_STATUS_CONFIG } from "@/lib/constants/lead-config";
import { isGraphConfigured } from "@/lib/teams/graph";
import { TeamsTestInvite } from "@/components/admin/TeamsTestInvite";
import { KlasseTermine } from "@/components/admin/KlasseTermine";
import { KlasseAnwesenheitKpi } from "@/components/admin/KlasseAnwesenheitKpi";
import { TeilnehmerExportButton } from "@/components/admin/TeilnehmerExportButton";
import { parseTerminRegel } from "@/lib/termine/regel";
import { getKlasseAnwesenheitAuswertung } from "@/lib/db/anwesenheit";

export default async function KlasseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { slug } = await params;
  const klasse = await prisma.klasse.findUnique({
    where: { slug },
    include: {
      bestellungen: {
        select: {
          id: true,
          bestellNr: true,
          firma: true,
          email: true,
          paket: true,
          adnChannel: true,
        },
        orderBy: { erstelltAm: "desc" },
      },
      leads: {
        select: { id: true, email: true, name: true, company: true, adnChannel: true, status: true },
      },
      webinars: {
        select: { id: true, title: true, scheduledAt: true, status: true },
        orderBy: { scheduledAt: "asc" },
      },
      termine: {
        select: {
          id: true,
          datum: true,
          thema: true,
          notizen: true,
          status: true,
          videoUrl: true,
          teamsLink: true,
          zusammenfassung: true,
          protokoll: true,
          transkriptDateiname: true,
          protokollGesendetAm: true,
        },
        orderBy: { datum: "asc" },
      },
    },
  });

  if (!klasse) notFound();

  const anwesenheit = await getKlasseAnwesenheitAuswertung(klasse.id);
  const anwesenheitByTermin = new Map(
    anwesenheit.proTermin.map((t) => [t.terminId, t])
  );

  const terminRegel = parseTerminRegel(klasse.terminRegel);
  const conf = KLASSE_STATUS_CONFIG[klasse.status];
  const isOpen = klasse.status === "OPEN";
  const isClosed = klasse.status === "CLOSED";
  const graphConfigured = isGraphConfigured();

  async function toggleClosed() {
    "use server";
    if (!klasse) return;
    await setKlasseStatusAction(klasse.id, isClosed ? "OPEN" : "CLOSED");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/klassen"
          className="inline-flex items-center gap-1 text-sm text-dark-slate-500 hover:text-[#030386] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ color: conf.color, backgroundColor: conf.bg }}
        >
          {conf.label}
        </span>
      </div>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-slate-900">{klasse.name}</h1>
          <p className="text-dark-slate-400 text-xs font-mono mt-1">{klasse.slug}</p>
        </div>
        {(isOpen || isClosed) && (
          <form action={toggleClosed}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#030386] bg-white border border-[#030386] hover:bg-[#E3ECF8]/50 rounded-lg transition-colors"
            >
              {isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isClosed ? "Wieder öffnen" : "Schließen (voll)"}
            </button>
          </form>
        )}
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-3">
            Stammdaten
          </h2>
          <KlasseForm
            mode="edit"
            initial={{
              id: klasse.id,
              name: klasse.name,
              slug: klasse.slug,
              kickoffDate: klasse.kickoffDate.toISOString(),
              startDate: klasse.startDate.toISOString(),
              endDate: klasse.endDate.toISOString(),
              capacity: klasse.capacity,
              status: klasse.status,
              teilnehmerSperre: klasse.teilnehmerSperre,
              teamsGroupId: klasse.teamsGroupId,
              description: klasse.description,
              terminRegel,
            }}
          />
        </section>

        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Termine & Themen ({klasse.termine.length})
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Lege fest, welches Thema an welchem Termin behandelt wird. Termine sind nach
            Datum sortiert – erledigte als „durchgeführt“ markieren, um den Überblick zu
            behalten.
          </p>
          <KlasseTermine
            klasseId={klasse.id}
            hasRegel={terminRegel.length > 0}
            termine={klasse.termine.map((t) => {
              const a = anwesenheitByTermin.get(t.id);
              return {
                id: t.id,
                datum: t.datum.toISOString(),
                thema: t.thema,
                notizen: t.notizen,
                status: t.status,
                videoUrl: t.videoUrl,
                teamsLink: t.teamsLink,
                zusammenfassung: t.zusammenfassung,
                protokoll: t.protokoll,
                transkriptDateiname: t.transkriptDateiname,
                protokollGesendetAm: t.protokollGesendetAm
                  ? t.protokollGesendetAm.toISOString()
                  : null,
                anwesenheit: a
                  ? {
                      dateiname: a.dateiname,
                      importiertAm: a.importiertAm.toISOString(),
                      gesamt: a.gesamt,
                      registriert: a.registriert,
                      zeilen: a.zeilen,
                    }
                  : null,
              };
            })}
          />
        </section>

        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Anwesenheit &amp; KPI
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Auswertung der hochgeladenen Teams-Anwesenheitsberichte: Anwesende
            pro Termin, Abgleich mit der Teilnehmerübersicht aus dem Onlineshop
            und Rangliste der aktivsten bzw. inaktivsten Teilnehmer.
          </p>
          <KlasseAnwesenheitKpi auswertung={anwesenheit} />
        </section>

        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Teilnehmer-E-Mails exportieren
          </h2>
          <p className="text-sm text-dark-slate-500 mb-4">
            Gibt alle Teilnehmer-Adressen dieser Klasse semikolongetrennt aus – zum
            Einfügen in einen neuen Kalender- oder Teams-Termin.
          </p>
          <TeilnehmerExportButton klasseId={klasse.id} />
        </section>

        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-1">
            Teams-Aufnahme testen
          </h2>
          <p className="text-sm text-dark-slate-500 mb-3">
            Lädt eine Test-Adresse über den nativen Pfad in das Team dieser Klasse ein –
            zum Prüfen, bevor der Schalter auf Nativ gestellt wird.
          </p>
          <TeamsTestInvite
            klasseId={klasse.id}
            disabled={!graphConfigured || !klasse.teamsGroupId}
            hint={
              !graphConfigured
                ? "Microsoft Graph ist nicht konfiguriert (MS_GRAPH_*)."
                : !klasse.teamsGroupId
                  ? "Zuerst oben eine Teams-Group-ID speichern."
                  : undefined
            }
          />
        </section>

        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-3">
            Bestellungen ({klasse.bestellungen.length})
          </h2>
          {klasse.bestellungen.length === 0 ? (
            <p className="text-sm text-dark-slate-400">Noch keine Bestellungen in dieser Klasse.</p>
          ) : (
            <ul className="divide-y divide-dark-slate-50">
              {klasse.bestellungen.map((b) => (
                <li key={b.id} className="py-2 flex items-center justify-between">
                  <Link
                    href={`/admin/shop/${b.id}`}
                    className="text-sm text-dark-slate-800 hover:text-[#030386]"
                  >
                    <span className="font-mono text-xs text-dark-slate-400 mr-2">{b.bestellNr}</span>
                    {b.firma} <span className="text-dark-slate-500">· {b.email}</span>
                  </Link>
                  <span className="text-xs text-dark-slate-500">
                    {b.paket}
                    {b.adnChannel !== "NONE" && ` · ${b.adnChannel}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-3">
            Leads ({klasse.leads.length})
          </h2>
          {klasse.leads.length === 0 ? (
            <p className="text-sm text-dark-slate-400">Keine Leads dieser Klasse zugeordnet.</p>
          ) : (
            <ul className="divide-y divide-dark-slate-50">
              {klasse.leads.map((l) => (
                <li key={l.id} className="py-2 flex items-center justify-between">
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="text-sm text-dark-slate-800 hover:text-[#030386]"
                  >
                    {l.name ?? l.email} {l.company && <span className="text-dark-slate-500">· {l.company}</span>}
                  </Link>
                  <span className="text-xs text-dark-slate-500">
                    {l.status}
                    {l.adnChannel !== "NONE" && ` · ${l.adnChannel}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-dark-slate-900 mb-3">
            Webinare ({klasse.webinars.length})
          </h2>
          {klasse.webinars.length === 0 ? (
            <p className="text-sm text-dark-slate-400">
              Keine Webinare verknüpft. Webinare können nachträglich der Klasse zugeordnet werden.
            </p>
          ) : (
            <ul className="divide-y divide-dark-slate-50">
              {klasse.webinars.map((w) => (
                <li key={w.id} className="py-2 flex items-center justify-between">
                  <Link
                    href={`/admin/webinars/${w.id}`}
                    className="text-sm text-dark-slate-800 hover:text-[#030386]"
                  >
                    {w.title}
                  </Link>
                  <span className="text-xs text-dark-slate-500">
                    {new Date(w.scheduledAt).toLocaleDateString("de-DE")} · {w.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
