import { NextRequest, NextResponse } from "next/server";
import { resolveAppBaseUrl, verifyMagicLink } from "@/lib/auth/customer";

export async function GET(request: NextRequest) {
  const baseUrl = await resolveAppBaseUrl();
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/kundenportal?error=invalid", baseUrl));
  }

  const result = await verifyMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/kundenportal?error=${result.reason}`, baseUrl)
    );
  }

  return NextResponse.redirect(new URL("/kundenportal/bestellungen", baseUrl));
}
