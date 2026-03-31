import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Drop slug column from webinars table if it exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE webinars DROP CONSTRAINT IF EXISTS webinars_slug_key;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE webinars DROP COLUMN IF EXISTS slug;
    `);

    return NextResponse.json({ success: true, message: "Migration erfolgreich: slug-Spalte entfernt." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
