import { NextResponse } from "next/server";
import { ALL_SCOPES, getMcpUrls } from "@/lib/mcp/config";
import { CLIENT_AUTH_METHODS } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** RFC 8414: Authorization Server Metadata. */
export async function GET() {
  const urls = await getMcpUrls();
  return NextResponse.json(
    {
      issuer: urls.issuer,
      authorization_endpoint: urls.authorize,
      token_endpoint: urls.token,
      registration_endpoint: urls.register,
      revocation_endpoint: urls.revoke,
      scopes_supported: ALL_SCOPES,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: CLIENT_AUTH_METHODS,
      revocation_endpoint_auth_methods_supported: CLIENT_AUTH_METHODS,
      code_challenge_methods_supported: ["S256"],
      service_documentation: `${urls.base}/admin/mcp`,
      ui_locales_supported: ["de"],
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
