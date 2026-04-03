import { prisma } from "@/lib/prisma";

export async function getBestellungen() {
  return prisma.bestellung.findMany({
    orderBy: { erstelltAm: "desc" },
  });
}

export async function deleteBestellung(id: number) {
  return prisma.bestellung.delete({ where: { id } });
}

export async function updateBestellungStatus(id: number, status: string) {
  return prisma.bestellung.update({
    where: { id },
    data: { status },
  });
}

export async function getShopKpis() {
  const [total, byStatus, byPaket, revenueAgg] = await Promise.all([
    prisma.bestellung.count(),
    prisma.bestellung.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.bestellung.groupBy({
      by: ["paket"],
      _count: { id: true },
    }),
    prisma.bestellung.aggregate({
      _sum: { preisNetto: true },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of byStatus) {
    statusMap[s.status] = s._count.id;
  }

  const paketMap: Record<string, number> = {};
  for (const p of byPaket) {
    paketMap[p.paket] = p._count.id;
  }

  return {
    total,
    neu: statusMap["neu"] ?? 0,
    bearbeitet: statusMap["bearbeitet"] ?? 0,
    abgeschlossen: statusMap["abgeschlossen"] ?? 0,
    revenueNetto: Number(revenueAgg._sum.preisNetto ?? 0),
    byPaket: paketMap,
  };
}
