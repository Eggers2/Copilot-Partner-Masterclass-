import { redirect } from "next/navigation";
import { AlertCircle, Eye, PencilLine, Shield } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { SCOPE_WRITE } from "@/lib/mcp/config";
import { OAuthError, validateAuthorizeRequest } from "@/lib/mcp/oauth";
import { ALL_TOOLS } from "@/lib/mcp/tools";
import { decideMcpAuthorizationAction } from "../actions";

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/**
 * OAuth-Freigabeseite: Claude leitet hierher, sobald ein Nutzer den Connector
 * verbindet. Nur wer im Admin eingeloggt ist, kann den Zugriff erteilen.
 */
export default async function McpAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;

  if (!(await isAuthenticated())) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      const val = first(v);
      if (val) qs.set(k, val);
    }
    redirect(`/admin/login?next=${encodeURIComponent(`/admin/mcp/authorize?${qs.toString()}`)}`);
  }

  const fehler = first(params.fehler);
  if (fehler) return <ErrorCard message={fehler} />;

  let validated: Awaited<ReturnType<typeof validateAuthorizeRequest>>;
  try {
    validated = await validateAuthorizeRequest({
      response_type: first(params.response_type),
      client_id: first(params.client_id),
      redirect_uri: first(params.redirect_uri),
      code_challenge: first(params.code_challenge),
      code_challenge_method: first(params.code_challenge_method),
      scope: first(params.scope),
      state: first(params.state),
    });
  } catch (e) {
    if (e instanceof OAuthError) return <ErrorCard message={e.message} />;
    throw e;
  }

  const { client, request } = validated;
  const redirectHost = new URL(request.redirectUri).host;
  const writeRequested = request.scope.includes(SCOPE_WRITE);
  const readTools = ALL_TOOLS.filter((t) => t.scope !== SCOPE_WRITE);
  const writeTools = ALL_TOOLS.filter((t) => t.scope === SCOPE_WRITE);

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl border border-dark-slate-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#030386]/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#030386]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-slate-900">Zugriff für Claude freigeben</h1>
            <p className="text-sm text-dark-slate-500">
              {client.name ?? "Ein MCP-Client"} möchte sich mit dem CRM verbinden.
            </p>
          </div>
        </div>

        <dl className="text-sm mb-6 space-y-1">
          <div className="flex gap-2">
            <dt className="text-dark-slate-500 w-32 shrink-0">Weiterleitung an</dt>
            <dd className="font-mono text-dark-slate-800 break-all">{redirectHost}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-dark-slate-500 w-32 shrink-0">Client-ID</dt>
            <dd className="font-mono text-dark-slate-800 break-all">{client.clientId}</dd>
          </div>
        </dl>

        <form action={decideMcpAuthorizationAction} className="space-y-5">
          <input type="hidden" name="response_type" value="code" />
          <input type="hidden" name="client_id" value={client.clientId} />
          <input type="hidden" name="redirect_uri" value={request.redirectUri} />
          <input type="hidden" name="code_challenge" value={request.codeChallenge} />
          <input type="hidden" name="code_challenge_method" value="S256" />
          <input type="hidden" name="scope" value={request.scope.join(" ")} />
          {request.state && <input type="hidden" name="state" value={request.state} />}

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-dark-slate-200 bg-dark-slate-50">
              <input type="checkbox" checked disabled className="mt-1" />
              <div>
                <div className="flex items-center gap-2 font-semibold text-dark-slate-900">
                  <Eye className="w-4 h-4" /> Lesen
                </div>
                <p className="text-xs text-dark-slate-500 mt-1">
                  {readTools.map((t) => t.title).join(", ")}
                </p>
              </div>
            </label>

            {writeRequested && (
              <label className="flex items-start gap-3 p-4 rounded-xl border border-dark-slate-200 hover:border-[#030386]/40 cursor-pointer">
                <input type="checkbox" name="schreiben" defaultChecked className="mt-1" />
                <div>
                  <div className="flex items-center gap-2 font-semibold text-dark-slate-900">
                    <PencilLine className="w-4 h-4" /> Schreiben
                  </div>
                  <p className="text-xs text-dark-slate-500 mt-1">
                    {writeTools.map((t) => t.title).join(", ")}. Kein Löschen, keine Änderung
                    von Umsatz oder Rechnungsdaten. Jede Änderung erscheint in der Lead-Timeline.
                  </p>
                </div>
              </label>
            )}
          </div>

          <div className="text-xs text-dark-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Der Zugriff gilt 30 Tage und kann unter <span className="font-mono">/admin/mcp</span>{" "}
            jederzeit getrennt werden. Alle Aufrufe werden protokolliert.
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              name="entscheidung"
              value="erlauben"
              className="flex-1 py-3 bg-[#030386] hover:bg-[#05015B] text-white font-semibold rounded-xl transition-colors"
            >
              Zugriff erlauben
            </button>
            <button
              type="submit"
              name="entscheidung"
              value="ablehnen"
              className="px-5 py-3 border border-dark-slate-300 text-dark-slate-700 hover:bg-dark-slate-50 font-semibold rounded-xl transition-colors"
            >
              Ablehnen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8">
        <div className="flex items-center gap-3 text-red-600 mb-3">
          <AlertCircle className="w-6 h-6" />
          <h1 className="text-lg font-bold">Freigabe nicht möglich</h1>
        </div>
        <p className="text-sm text-dark-slate-700">{message}</p>
        <p className="text-xs text-dark-slate-500 mt-4">
          Bitte den Verbindungsversuch in Claude erneut starten. Bleibt der Fehler bestehen,
          Verbindung in Claude entfernen und neu anlegen.
        </p>
      </div>
    </div>
  );
}
