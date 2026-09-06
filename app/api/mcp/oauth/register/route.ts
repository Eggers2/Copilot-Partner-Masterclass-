import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { OAuthError, registerClient } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** RFC 7591: Dynamic Client Registration (nur Public Clients mit PKCE, Redirects auf claude.ai/Loopback). */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`mcp-register:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Zu viele Registrierungen." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "JSON erwartet." },
      { status: 400 }
    );
  }

  try {
    const client = await registerClient((body ?? {}) as Parameters<typeof registerClient>[0]);
    return NextResponse.json(
      {
        client_id: client.clientId,
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
        client_name: client.name ?? undefined,
        redirect_uris: client.redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    if (e instanceof OAuthError) {
      return NextResponse.json({ error: e.code, error_description: e.message }, { status: e.status });
    }
    console.error("[MCP] Registrierung fehlgeschlagen:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
