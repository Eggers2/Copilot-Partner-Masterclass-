import { NextResponse } from "next/server";
import { loadMapPartners } from "@/lib/db/mapPartners";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const partners = await loadMapPartners();
    return NextResponse.json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
