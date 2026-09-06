import { redirect } from "next/navigation";
import { CheckCircle2, Plug, ShieldCheck, Unplug, XCircle } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { getMcpUrls, SCOPE_WRITE } from "@/lib/mcp/config";
import { listAuditLogs, listConnections } from "@/lib/mcp/audit";
import { ALL_TOOLS } from "@/lib/mcp/tools";
import { revokeAllMcpTokensAction, revokeMcpTokenAction } from "./actions";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function McpAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [urls, connections, logs] = await Promise.all([
    getMcpUrls(),
    listConnections(),
    listAuditLogs(100),
  ]);
  const now = Date.now();
  const active = connections.filter((c) => !c.revokedAt && c.refreshExpiresAt.getTime() > now);
  const inactive = connections.filter((c) => c.revokedAt || c.refreshExpiresAt.getTime() <= now);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-dark-slate-900 flex items-center gap-2">
          <Plug className="w-6 h-6 text-[#030386]" /> Claude-Anbindung (MCP)
        </h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Claude Chat, Cowork und Claude Code greifen über diesen MCP-Server auf das CRM zu.
          Verbindungen werden per OAuth freigegeben, jeder Aufruf wird protokolliert.
        </p>
      </div>

      {/* Einrichtung */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-dark-slate-900 mb-3">Einrichtung</h2>
        <ol className="text-sm text-dark-slate-700 space-y-2 list-decimal list-inside">
          <li>
            In claude.ai unter <span className="font-medium">Einstellungen → Connectors → Custom Connector hinzufügen</span>{" "}
            diese URL eintragen (Cowork und die Desktop-App nutzen dieselben Connectors):
            <code className="block mt-1 px-3 py-2 bg-dark-slate-900 text-dark-slate-100 rounded-lg font-mono text-xs break-all">
              {urls.mcp}
            </code>
          </li>
          <li>
            Auf <span className="font-medium">Verbinden</span> klicken. Du wirst in den Admin geleitet,
            meldest dich ggf. an und bestätigst den Zugriff (Lesen, optional Schreiben).
          </li>
          <li>
            Für Claude Code:
            <code className="block mt-1 px-3 py-2 bg-dark-slate-900 text-dark-slate-100 rounded-lg font-mono text-xs break-all">
              claude mcp add --transport http masterclass-crm {urls.mcp}
            </code>
          </li>
        </ol>
        <p className="text-xs text-dark-slate-500 mt-4 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          Es gibt kein statisches Passwort oder API-Key. Zugriffs-Tokens laufen nach einer Stunde
          ab, die Verbindung insgesamt nach 30 Tagen. In der Datenbank liegen nur Hashes.
          Listen liefern maximal 50 Datensätze, Löschen ist nicht möglich.
        </p>
      </section>

      {/* Verbindungen */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-dark-slate-900">
            Aktive Verbindungen <span className="text-dark-slate-400 font-normal">({active.length})</span>
          </h2>
          {active.length > 0 && (
            <form action={revokeAllMcpTokensAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Unplug className="w-4 h-4" /> Alle trennen
              </button>
            </form>
          )}
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-dark-slate-500">Noch keine Verbindung. Folge der Einrichtung oben.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-dark-slate-400 border-b border-dark-slate-100">
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Rechte</th>
                  <th className="py-2 pr-4">Verbunden</th>
                  <th className="py-2 pr-4">Zuletzt genutzt</th>
                  <th className="py-2 pr-4">Gültig bis</th>
                  <th className="py-2 pr-4">Aufrufe</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {active.map((c) => (
                  <tr key={c.id} className="border-b border-dark-slate-50">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-dark-slate-900">{c.client.name ?? "Unbenannt"}</div>
                      <div className="text-xs text-dark-slate-400 font-mono">
                        {c.client.redirectUris.map((u) => new URL(u).host).join(", ")}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <ScopeBadges scope={c.scope} />
                    </td>
                    <td className="py-2 pr-4 text-dark-slate-600">{fmt.format(c.createdAt)}</td>
                    <td className="py-2 pr-4 text-dark-slate-600">
                      {c.lastUsedAt ? fmt.format(c.lastUsedAt) : "noch nie"}
                    </td>
                    <td className="py-2 pr-4 text-dark-slate-600">{fmt.format(c.refreshExpiresAt)}</td>
                    <td className="py-2 pr-4 text-dark-slate-600">{c._count.auditLogs}</td>
                    <td className="py-2 text-right">
                      <form action={revokeMcpTokenAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:underline"
                        >
                          Trennen
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {inactive.length > 0 && (
          <p className="text-xs text-dark-slate-400 mt-3">
            {inactive.length} getrennte oder abgelaufene Verbindung(en) werden nach 30 Tagen automatisch entfernt.
          </p>
        )}
      </section>

      {/* Werkzeuge */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-dark-slate-900 mb-3">Verfügbare Werkzeuge</h2>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {ALL_TOOLS.map((t) => (
            <div key={t.name} className="flex items-start gap-2">
              <span
                className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                  t.scope === SCOPE_WRITE
                    ? "bg-amber-100 text-amber-700"
                    : "bg-dark-slate-100 text-dark-slate-600"
                }`}
              >
                {t.scope === SCOPE_WRITE ? "schreiben" : "lesen"}
              </span>
              <div>
                <span className="font-mono text-xs text-dark-slate-800">{t.name}</span>
                <p className="text-xs text-dark-slate-500">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Audit-Log */}
      <section className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-dark-slate-900 mb-4">
          Protokoll <span className="text-dark-slate-400 font-normal">(letzte {logs.length} Aufrufe)</span>
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-dark-slate-500">Noch keine Aufrufe.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-dark-slate-400 border-b border-dark-slate-100">
                  <th className="py-2 pr-4">Zeit</th>
                  <th className="py-2 pr-4">Werkzeug</th>
                  <th className="py-2 pr-4">Argumente</th>
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Dauer</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-dark-slate-50 align-top">
                    <td className="py-2 pr-4 whitespace-nowrap text-dark-slate-600">{fmt.format(l.createdAt)}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-dark-slate-800">{l.tool}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-dark-slate-500 max-w-md break-all">
                      {JSON.stringify(l.args)}
                    </td>
                    <td className="py-2 pr-4 text-dark-slate-600">{l.token?.client.name ?? "–"}</td>
                    <td className="py-2 pr-4 text-dark-slate-600 whitespace-nowrap">{l.durationMs} ms</td>
                    <td className="py-2">
                      {l.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span className="max-w-xs truncate" title={l.error ?? ""}>{l.error}</span>
                        </span>
                      )}
                    </td>
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

function ScopeBadges({ scope }: { scope: string }) {
  const scopes = scope.split(" ");
  return (
    <div className="flex gap-1">
      <span className="px-2 py-0.5 rounded-full text-xs bg-dark-slate-100 text-dark-slate-600">Lesen</span>
      {scopes.includes(SCOPE_WRITE) && (
        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Schreiben</span>
      )}
    </div>
  );
}
