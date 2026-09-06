import { NextResponse } from "next/server";
import { ALL_SCOPES, getMcpUrls } from "@/lib/mcp/config";

export const dynamic = "force-dynamic";

/** RFC 9728: Protected Resource Metadata für den MCP-Endpunkt. */
export async function GET() {
  const urls = await getMcpUrls();
  return NextResponse.json(
    {
      resource: urls.mcp,
      authorization_servers: [urls.issuer],
      scopes_supported: ALL_SCOPES,
      bearer_methods_supported: ["header"],
      resource_name: "Copilot Masterclass CRM",
      resource_documentation: `${urls.base}/admin/mcp`,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
