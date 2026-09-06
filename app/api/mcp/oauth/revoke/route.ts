import { NextResponse } from "next/server";
import { revokeByTokenValue } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** RFC 7009: Token-Widerruf. Antwortet immer 200, damit keine Existenz-Information abfließt. */
export async function POST(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  let token: string | null = null;
  try {
    if (type.includes("application/json")) {
      const json = (await req.json()) as { token?: unknown };
      token = typeof json.token === "string" ? json.token : null;
    } else {
      token = new URLSearchParams(await req.text()).get("token");
    }
  } catch {
    token = null;
  }
  if (token) await revokeByTokenValue(token);
  return new NextResponse(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}
