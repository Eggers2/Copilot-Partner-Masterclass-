import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const leadRevenue = await prisma.lead.aggregate({
    where: { status: "WON" },
    _sum: { revenue: true },
  });

  // Lead revenue is stored in cents
  const totalRevenue = Math.round(Number(leadRevenue._sum.revenue ?? 0) / 100);

  return NextResponse.json({
    frames: [
      {
        text: String(totalRevenue),
      },
    ],
  });
}
