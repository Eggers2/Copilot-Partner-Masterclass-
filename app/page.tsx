import { prisma } from "@/lib/prisma";
import LandingPage from "./LandingPage";

export const revalidate = 60;

// Marketing capacity — kept in code so the landing page reads consistently
// regardless of the Klasse.capacity value in the database.
const KLASSE_2_CAPACITY = 25;

export default async function Page() {
  let count = 0;
  try {
    const klasse = await prisma.klasse.findUnique({
      where: { slug: "klasse-2" },
      select: { _count: { select: { bestellungen: true } } },
    });
    count = klasse?._count.bestellungen ?? 0;
  } catch {
    // DB unavailable — fall back to safe defaults so the page still renders.
  }
  return <LandingPage klasse2Count={count} klasse2Capacity={KLASSE_2_CAPACITY} />;
}
