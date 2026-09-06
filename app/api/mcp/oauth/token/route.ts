import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  exchangeAuthCode,
  OAuthError,
  readClientCredentials,
  refreshTokens,
} from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** RFC 6749 Token-Endpunkt: authorization_code (mit PKCE) und refresh_token. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`mcp-token:${ip}`, 60, 10 * 60 * 1000)) {
    return oauthError(new OAuthError("invalid_request", "Zu viele Anfragen.", 429));
  }

  const params = await readParams(req);
  if (!params) {
    return oauthError(
      new OAuthError("invalid_request", "Body muss application/x-www-form-urlencoded oder JSON sein.")
    );
  }

  try {
    const grantType = params.get("grant_type");
    // client_secret_basic (Header) oder client_secret_post (Formular); Public
    // Clients senden nur die client_id.
    const creds = readClientCredentials(params, req.headers.get("authorization"));
    let tokens;
    if (grantType === "authorization_code") {
      tokens = await exchangeAuthCode(
        {
          code: params.get("code"),
          redirect_uri: params.get("redirect_uri"),
          code_verifier: params.get("code_verifier"),
        },
        creds
      );
    } else if (grantType === "refresh_token") {
      tokens = await refreshTokens(
        {
          refresh_token: params.get("refresh_token"),
          scope: params.get("scope"),
        },
        creds
      );
    } else {
      throw new OAuthError("unsupported_grant_type", `grant_type nicht unterstützt: ${grantType}`);
    }
    return NextResponse.json(tokens, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (e) {
    if (e instanceof OAuthError) return oauthError(e);
    console.error("[MCP] Token-Endpunkt Fehler:", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function readParams(req: Request): Promise<URLSearchParams | null> {
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/x-www-form-urlencoded")) {
      return new URLSearchParams(await req.text());
    }
    if (type.includes("application/json")) {
      const json = (await req.json()) as Record<string, unknown>;
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(json)) {
        if (typeof v === "string") params.set(k, v);
      }
      return params;
    }
  } catch {
    return null;
  }
  return null;
}

function oauthError(e: OAuthError) {
  return NextResponse.json(
    { error: e.code, error_description: e.message },
    {
      status: e.status,
      headers: {
        "Cache-Control": "no-store",
        // RFC 6749 5.2: bei fehlgeschlagener Client-Authentifizierung per Basic
        ...(e.code === "invalid_client" ? { "WWW-Authenticate": 'Basic realm="mcp"' } : {}),
      },
    }
  );
}
