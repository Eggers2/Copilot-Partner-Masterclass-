import { prisma } from "@/lib/prisma";
import type { ParsedKursFortschritt } from "@/lib/kurs/fortschritt";

// Persistenz des Videokurs-Fortschritts (ablefy-Export): ein globaler
// Datenstand für alle Klassen. Ein erneuter Upload ersetzt den Stand
// komplett; die Import-Metadaten liegen als AppSetting (JSON), analog zur
// Ignorierliste des Anwesenheits-Abgleichs.

export const KURS_FORTSCHRITT_IMPORT_KEY = "kurs_fortschritt_import";

export interface KursFortschrittImportMeta {
  dateiname: string;
  importiertAm: Date;
  /** Anzahl importierter Einträge (eine Zeile je E-Mail). */
  eintraege: number;
}

/** Ersetzt den kompletten Videokurs-Datenstand durch den neuen Export. */
export async function replaceKursFortschritt(
  dateiname: string,
  eintraege: ParsedKursFortschritt[]
) {
  const meta = JSON.stringify({
    dateiname,
    importiertAm: new Date().toISOString(),
    eintraege: eintraege.length,
  });
  await prisma.$transaction([
    prisma.kursFortschritt.deleteMany({}),
    prisma.kursFortschritt.createMany({
      data: eintraege.map((e) => ({
        email: e.email,
        name: e.name,
        fortschritt: e.fortschritt,
      })),
    }),
    prisma.appSetting.upsert({
      where: { key: KURS_FORTSCHRITT_IMPORT_KEY },
      create: { key: KURS_FORTSCHRITT_IMPORT_KEY, value: meta },
      update: { value: meta },
    }),
  ]);
}

/** Entfernt den Videokurs-Datenstand vollständig. */
export async function clearKursFortschritt() {
  await prisma.$transaction([
    prisma.kursFortschritt.deleteMany({}),
    prisma.appSetting.deleteMany({
      where: { key: KURS_FORTSCHRITT_IMPORT_KEY },
    }),
  ]);
}

/** Lädt den aktuellen Datenstand samt Import-Metadaten (meta = null → noch
 *  kein Export hochgeladen). */
export async function getKursFortschrittStand(): Promise<{
  eintraege: ParsedKursFortschritt[];
  meta: KursFortschrittImportMeta | null;
}> {
  const [rows, setting] = await Promise.all([
    prisma.kursFortschritt.findMany({
      select: { email: true, name: true, fortschritt: true },
    }),
    prisma.appSetting.findUnique({
      where: { key: KURS_FORTSCHRITT_IMPORT_KEY },
    }),
  ]);

  let meta: KursFortschrittImportMeta | null = null;
  if (setting) {
    try {
      const parsed = JSON.parse(setting.value) as {
        dateiname?: string;
        importiertAm?: string;
        eintraege?: number;
      };
      meta = {
        dateiname: parsed.dateiname ?? "",
        importiertAm: parsed.importiertAm
          ? new Date(parsed.importiertAm)
          : setting.aktualisiertAm,
        eintraege: parsed.eintraege ?? rows.length,
      };
    } catch {
      meta = {
        dateiname: "",
        importiertAm: setting.aktualisiertAm,
        eintraege: rows.length,
      };
    }
  }

  return { eintraege: rows, meta };
}
