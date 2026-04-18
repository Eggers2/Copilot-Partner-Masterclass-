import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink } from "@/lib/auth/customer";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(
      new URL("/kundenportal?error=invalid", request.url)
    );
  }

  const result = await verifyMagicLink(token);
  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/kundenportal?error=${result.reason}`, request.url)
    );
  }

  return NextResponse.redirect(
    new URL("/kundenportal/bestellungen", request.url)
  );
}
