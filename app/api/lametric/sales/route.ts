import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [leadRevenue, shopRevenue] = await Promise.all([
    prisma.lead.aggregate({
      where: { status: "WON" },
      _sum: { revenue: true },
    }),
    prisma.bestellung.aggregate({
      _sum: { preisNetto: true },
    }),
  ]);

  // Lead revenue is stored in cents, shop revenue in euros (netto)
  const leadTotal = Number(leadRevenue._sum.revenue ?? 0) / 100;
  const shopTotal = Number(shopRevenue._sum.preisNetto ?? 0);
  const totalRevenue = leadTotal + shopTotal;

  return NextResponse.json({
    frames: [
      {
        text: String(Math.round(totalRevenue)),
      },
    ],
  });
}
