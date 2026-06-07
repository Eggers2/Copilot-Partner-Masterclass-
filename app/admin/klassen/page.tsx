import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Lock, Plus } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { listKlassenMitBelegung } from "@/lib/klassen";
import { KLASSE_STATUS_CONFIG } from "@/lib/constants/lead-config";
import { getTeamsAufnahmeModus } from "@/lib/db/appSettings";
import { isGraphConfigured } from "@/lib/teams/graph";
import { TeamsModusToggle } from "@/components/admin/TeamsModusToggle";

export default async function KlassenPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const klassen = await listKlassenMitBelegung();
  const teamsModus = await getTeamsAufnahmeModus();
  const graphConfigured = isGraphConfigured();

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-[#030386]" />
          <div>
            <h1 className="text-2xl font-bold text-dark-slate-900">Klassen</h1>
            <p className="text-dark-slate-500 text-sm mt-1">
              Kohorten der Microsoft Copilot Partner Masterclass
            </p>
          </div>
        </div>
        <Link
          href="/admin/klassen/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#030386] hover:bg-[#05015B] rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neue Klasse
        </Link>
      </div>

      <TeamsModusToggle initialModus={teamsModus} graphConfigured={graphConfigured} />

      <div className="grid md:grid-cols-2 gap-4">
        {klassen.map((k) => {
          const conf = KLASSE_STATUS_CONFIG[k.status];
          const capacityLabel =
            k.capacity == null
              ? `${k.belegung} Bestellungen`
              : `${k.belegung} / ${k.capacity} Plätze`;
          return (
            <Link
              key={k.id}
              href={`/admin/klassen/${k.slug}`}
              className="block bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-dark-slate-900">
                    {k.name}
                  </h2>
                  <p className="text-xs text-dark-slate-400 font-mono">{k.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {k.teilnehmerSperre && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700"
                      title="Teilnehmer-Sperre aktiv: Kunden können keine Teilnehmer im Kundenportal mehr ändern."
                    >
                      <Lock className="w-3 h-3" />
                      Teilnehmer gesperrt
                    </span>
                  )}
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ color: conf.color, backgroundColor: conf.bg }}
                  >
                    {conf.label}
                  </span>
                </div>
              </div>
              <div className="space-y-1 text-sm text-dark-slate-600">
                <p>
                  <span className="text-dark-slate-400">Kickoff:</span>{" "}
                  {k.kickoffDate.toLocaleDateString("de-DE")}
                </p>
                <p>
                  <span className="text-dark-slate-400">Programm:</span>{" "}
                  {k.startDate.toLocaleDateString("de-DE")} – {k.endDate.toLocaleDateString("de-DE")}
                </p>
                <p>
                  <span className="text-dark-slate-400">Belegung:</span>{" "}
                  <span className={k.isFull ? "text-amber-600 font-semibold" : ""}>
                    {capacityLabel}
                    {k.isFull ? " · voll" : ""}
                  </span>
                </p>
              </div>
            </Link>
          );
        })}

        {klassen.length === 0 && (
          <div className="md:col-span-2 bg-white rounded-2xl border border-dark-slate-100 p-12 text-center text-dark-slate-400">
            Noch keine Klassen angelegt.
          </div>
        )}
      </div>
    </div>
  );
}
