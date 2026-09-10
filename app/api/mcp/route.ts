import { NextResponse } from "next/server";
import { getMcpUrls, MCP_PROTOCOL_VERSIONS } from "@/lib/mcp/config";
import { authenticateAccessToken, cleanupExpired, extractBearer } from "@/lib/mcp/oauth";
import { handleJsonRpcBody } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;

/**
 * MCP-Endpunkt (Streamable HTTP, zustandslos). Claude sendet JSON-RPC per POST
 * mit Bearer-Token; ohne gültiges Token antwortet der Server mit 401 und dem
 * Verweis auf die OAuth-Metadaten, woraufhin Claude den Login-Flow startet.
 */
export async function POST(req: Request) {
  const urls = await getMcpUrls();

  // Bewusst keine Origin-Prüfung: Die MCP-Spezifikation empfiehlt sie gegen
  // DNS-Rebinding bei lokalen Servern. Hier schützt das Bearer-Token, und ohne
  // CORS-Header kann ein Browser die Antwort ohnehin nicht lesen. Power Platform
  // (Copilot Studio) sendet einen Origin-Header mit und wurde sonst mit 403 abgewiesen.
  const auth = await authenticateAccessToken(extractBearer(req));
  if (!auth) {
    return unauthorized(urls.protectedResourceMetadata, urls.mcp);
  }

  const version = req.headers.get("mcp-protocol-version");
  if (version && !(MCP_PROTOCOL_VERSIONS as readonly string[]).includes(version)) {
    return NextResponse.json(
      { error: "unsupported_protocol_version", supported: MCP_PROTOCOL_VERSIONS },
      { status: 400 }
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  // Gelegentlich abgelaufene Codes/Tokens aufräumen (fire-and-forget).
  if (Math.random() < 0.02) cleanupExpired().catch(() => undefined);

  const result = await handleJsonRpcBody(raw, auth);
  if (result.body === null) {
    return new Response(null, { status: result.status });
  }
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Kein SSE-Stream: Der Server ist zustandslos, GET wird laut Spezifikation mit 405 beantwortet. */
export async function GET(req: Request) {
  const urls = await getMcpUrls();
  const auth = await authenticateAccessToken(extractBearer(req));
  if (!auth) return unauthorized(urls.protectedResourceMetadata, urls.mcp);
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

function unauthorized(metadataUrl: string, resource: string) {
  return NextResponse.json(
    { error: "unauthorized", error_description: "Gültiges Bearer-Token erforderlich." },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer realm="${resource}", resource_metadata="${metadataUrl}", scope="crm:read crm:write"`,
        "Cache-Control": "no-store",
      },
    }
  );
}
