import { prisma } from "@/lib/prisma";
import type { TerminStatus } from "@prisma/client";

export async function listTermineByKlasse(klasseId: string) {
  return prisma.klasseTermin.findMany({
    where: { klasseId },
    orderBy: { datum: "asc" },
  });
}

export async function createTermin(data: {
  klasseId: string;
  datum: Date;
  thema?: string | null;
  notizen?: string | null;
  status?: TerminStatus;
  videoUrl?: string | null;
  teamsLink?: string | null;
}) {
  return prisma.klasseTermin.create({ data });
}

export async function updateTermin(
  id: string,
  data: {
    datum?: Date;
    thema?: string | null;
    notizen?: string | null;
    status?: TerminStatus;
    videoUrl?: string | null;
    teamsLink?: string | null;
    zusammenfassung?: string | null;
    protokoll?: string | null;
    transkript?: string | null;
    transkriptDateiname?: string | null;
    protokollGesendetAm?: Date | null;
  }
) {
  return prisma.klasseTermin.update({ where: { id }, data });
}

export async function deleteTermin(id: string) {
  return prisma.klasseTermin.delete({ where: { id } });
}
