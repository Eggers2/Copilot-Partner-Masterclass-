import { prisma } from "@/lib/prisma";
import LandingPage from "./LandingPage";

export const revalidate = 60;

const DEFAULT_CAPACITY = 25;

export default async function Page() {
  let count = 0;
  let capacity = DEFAULT_CAPACITY;
  try {
    const klasse = await prisma.klasse.findUnique({
      where: { slug: "klasse-2" },
      select: { capacity: true, _count: { select: { bestellungen: true } } },
    });
    count = klasse?._count.bestellungen ?? 0;
    capacity = klasse?.capacity ?? DEFAULT_CAPACITY;
  } catch {
    // DB unavailable — fall back to safe defaults so the page still renders.
  }
  return <LandingPage klasse2Count={count} klasse2Capacity={capacity} />;
}
