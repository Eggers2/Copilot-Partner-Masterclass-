import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBerlinDateTime } from "@/lib/datetime";
import { KEINE_MAILS_GRUND } from "@/lib/leads/keineMailsGruende";
import { turnstileSiteKey } from "@/lib/anmeldeschutz/turnstile";

// Bot-Schutz des Wartelisten-Formulars: Was wurde abgewiesen, was steht in
// der Prüfquarantäne. Datenquelle ist anmeldung_schutz_log (90 Tage).

export const dynamic = "force-dynamic";

const GRUND_TEXT: Record<string, string> = {
  rate_limit: "Rate Limit (mehr als 5 pro Stunde und IP)",
  honeypot: "Honeypot befüllt",
  zeitfalle_ungueltig: "Zeitfalle: Token fehlt oder gefälscht",
  zu_schnell: "Zeitfalle: unter 3 Sekunden",
  formular_abgelaufen: "Formular älter als 24 Stunden",
  pflichtfelder: "Name oder Firma fehlt",
  email_ungueltig: "E-Mail ungültig",
  wegwerf_domain: "Wegwerf-Domain",
  turnstile: "Turnstile fehlgeschlagen",
  turnstile_stoerung: "Turnstile-Störung (durchgelassen)",
  bereits_vorhanden: "Adresse schon im CRM (nichts geändert)",
  verdacht_quarantaene: "Verdacht, in Prüfquarantäne",
};

export default async function AnmeldeschutzPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const seit7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const seit24 = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [proGrund7, proGrund24, letzte, quarantaene] = await Promise.all([
    prisma.anmeldungSchutzLog.groupBy({ by: ["grund"], where: { createdAt: { gte: seit7 } }, _count: true }),
    prisma.anmeldungSchutzLog.groupBy({ by: ["grund"], where: { createdAt: { gte: seit24 } }, _count: true }),
    prisma.anmeldungSchutzLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.lead.findMany({
      where: { keineMailsGrund: KEINE_MAILS_GRUND.botVerdacht },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, company: true, notes: true, createdAt: true },
      take: 100,
    }),
  ]);

  const zahl24 = new Map(proGrund24.map((g) => [g.grund, g._count]));
  const gruende = proGrund7.sort((a, b) => b._count - a._count);
  const turnstileAktiv = !!turnstileSiteKey();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#030386]" />
          Anmeldeschutz Warteliste
        </h1>
        <p className="text-sm text-dark-slate-500 mt-1">
          Turnstile ist {turnstileAktiv ? "aktiv" : "nicht eingerichtet (TURNSTILE_SITE_KEY und TURNSTILE_SECRET_KEY fehlen)"}.
          Protokolleinträge bleiben 90 Tage.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-dark-slate-200 p-5">
        <h2 className="text-lg font-semibold text-dark-slate-900 mb-3">Gründe</h2>
        {gruende.length === 0 ? (
          <p className="text-sm text-dark-slate-500">In den letzten 7 Tagen nichts abgewiesen.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-dark-slate-500">
                <th className="py-1 font-medium">Grund</th>
                <th className="py-1 font-medium text-right">24 Stunden</th>
                <th className="py-1 font-medium text-right">7 Tage</th>
              </tr>
            </thead>
            <tbody>
              {gruende.map((g) => (
                <tr key={g.grund} className="border-t border-dark-slate-100">
                  <td className="py-1.5">{GRUND_TEXT[g.grund] ?? g.grund}</td>
                  <td className="py-1.5 text-right tabular-nums">{zahl24.get(g.grund) ?? 0}</td>
                  <td className="py-1.5 text-right tabular-nums">{g._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bg-white rounded-xl border border-dark-slate-200 p-5">
        <h2 className="text-lg font-semibold text-dark-slate-900 mb-3 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          Prüfquarantäne ({quarantaene.length})
        </h2>
        {quarantaene.length === 0 ? (
          <p className="text-sm text-dark-slate-500">Keine Anmeldungen in Prüfung.</p>
        ) : (
          <ul className="divide-y divide-dark-slate-100 text-sm">
            {quarantaene.map((l) => (
              <li key={l.id} className="py-2 flex flex-wrap items-baseline gap-x-3">
                <Link href={`/admin/leads/${l.id}`} className="font-medium text-[#030386] hover:underline">
                  {l.email}
                </Link>
                <span className="text-dark-slate-600">
                  {l.name ?? "ohne Name"} · {l.company ?? "ohne Firma"}
                </span>
                <span className="text-dark-slate-400">{formatBerlinDateTime(l.createdAt)}</span>
                {l.notes && <span className="w-full text-xs text-dark-slate-500 whitespace-pre-line">{l.notes}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-xl border border-dark-slate-200 p-5">
        <h2 className="text-lg font-semibold text-dark-slate-900 mb-3">Letzte 100 Einträge</h2>
        {letzte.length === 0 ? (
          <p className="text-sm text-dark-slate-500">Noch keine Einträge.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dark-slate-500">
                  <th className="py-1 pr-3 font-medium">Zeit</th>
                  <th className="py-1 pr-3 font-medium">Grund</th>
                  <th className="py-1 pr-3 font-medium">Domain</th>
                  <th className="py-1 pr-3 font-medium">IP-Hash</th>
                  <th className="py-1 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {letzte.map((e) => (
                  <tr key={e.id} className="border-t border-dark-slate-100 align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{formatBerlinDateTime(e.createdAt)}</td>
                    <td className="py-1.5 pr-3">{GRUND_TEXT[e.grund] ?? e.grund}</td>
                    <td className="py-1.5 pr-3">{e.emailDomain ?? ""}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-dark-slate-500">{e.ipHash?.slice(0, 10) ?? ""}</td>
                    <td className="py-1.5 text-dark-slate-500">{e.details ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
