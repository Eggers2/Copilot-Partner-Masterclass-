/**
 * Altdaten-Migration fuer Lead.followUpAt: naive Ortszeit → echtes UTC.
 *
 *   npx tsx scripts/tz-migrate-followup.ts                 Trockenlauf (Standard)
 *   npx tsx scripts/tz-migrate-followup.ts --sicherung=x.json --ausfuehren
 *
 * Der Trockenlauf schreibt nichts. Er zeigt je Lead den alten und den neuen
 * Wert sowie die angezeigte Uhrzeit vorher und nachher, und listet am Ende die
 * Faelle auf, die nicht anzeigeneutral migriert werden koennen.
 *
 * Regulaer laeuft die Migration als SQL-Migration mit dem Deployment
 * (prisma/migrations/20260911120000_zeitzonen_konvention_followup). Nur so
 * gehen Datenaenderung und Anzeigeumstellung gemeinsam live. Dieses Skript ist
 * die Trockenlauf- und Notfallvariante; beide teilen sich die Tabelle
 * zeitzonen_migration_followup und stoeren sich deshalb nicht gegenseitig.
 *
 * Idempotent: bereits migrierte Leads stehen in zeitzonen_migration_followup
 * und werden uebersprungen. Dieselbe Tabelle ist die Sicherung und die
 * Grundlage fuer das Zuruecknehmen.
 */

import { writeFileSync } from "fs";
import { prisma } from "../lib/prisma";
import {
  formatBerlinDateTime,
  migrationWouldShiftDisplay,
  naiveReading,
  reinterpretNaiveAsBerlin,
} from "../lib/datetime";

const AUSFUEHREN = process.argv.includes("--ausfuehren");

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "zeitzonen_migration_followup" (
      "lead_id"     UUID PRIMARY KEY,
      "alt_wert"    TIMESTAMP(3) NOT NULL,
      "neu_wert"    TIMESTAMP(3) NOT NULL,
      "migriert_am" TIMESTAMP(3) NOT NULL DEFAULT now()
    )`);

  const bereits = await prisma.$queryRawUnsafe<{ lead_id: string }[]>(
    `SELECT "lead_id"::text FROM "zeitzonen_migration_followup"`
  );
  const erledigt = new Set(bereits.map((r) => r.lead_id));

  const leads = await prisma.lead.findMany({
    where: { followUpAt: { not: null } },
    select: { id: true, email: true, status: true, followUpAt: true },
    orderBy: { followUpAt: "asc" },
  });

  const offen = leads.filter((l) => !erledigt.has(l.id));
  const zuMigrieren: typeof offen = [];
  const nichtNeutral: typeof offen = [];

  for (const l of offen) {
    (migrationWouldShiftDisplay(l.followUpAt!) ? nichtNeutral : zuMigrieren).push(l);
  }

  console.log(
    `${leads.length} Leads mit Follow-up-Datum, davon ${erledigt.size} bereits migriert, ` +
      `${offen.length} offen.\n`
  );

  console.log("Lead                                          alt (UTC)          neu (UTC)          Anzeige vorher → nachher");
  console.log("─".repeat(120));
  for (const l of zuMigrieren) {
    const alt = l.followUpAt!;
    const neu = reinterpretNaiveAsBerlin(alt);
    const vorher = naiveReading(alt);
    const nachher = formatBerlinDateTime(neu);
    const flag = vorher === nachher ? " " : "!";
    console.log(
      `${flag} ${l.email.padEnd(42)}  ${alt.toISOString().slice(0, 16)}   ` +
        `${neu.toISOString().slice(0, 16)}   ${vorher}  →  ${nachher}`
    );
  }

  const verschoben = zuMigrieren.filter(
    (l) => naiveReading(l.followUpAt!) !== formatBerlinDateTime(reinterpretNaiveAsBerlin(l.followUpAt!))
  );

  console.log("\n" + "─".repeat(120));
  console.log(`${zuMigrieren.length} Leads werden migriert, Anzeige bleibt identisch.`);
  if (verschoben.length > 0) {
    console.log(`FEHLER: ${verschoben.length} davon wuerden sich verschieben. Abbruch.`);
    process.exit(1);
  }

  if (nichtNeutral.length > 0) {
    console.log(
      `\n${nichtNeutral.length} Lead(s) werden NICHT angefasst, weil ihre gespeicherte Uhrzeit ` +
        `in die uebersprungene Stunde der Fruehjahrsumstellung faellt.\n` +
        `Diese Ortszeit existiert nicht, ihre Anzeige aendert sich so oder so. Bitte entscheiden:`
    );
    for (const l of nichtNeutral) {
      console.log(
        `  ${l.email}  (${l.status})  gespeichert ${l.followUpAt!.toISOString()}  ` +
          `zeigt heute ${naiveReading(l.followUpAt!)}, nach der Umstellung ` +
          `${formatBerlinDateTime(l.followUpAt!)}`
      );
    }
  }

  const sicherungsdatei = arg("sicherung");
  if (sicherungsdatei) {
    writeFileSync(
      sicherungsdatei,
      JSON.stringify(
        {
          erstelltAm: new Date().toISOString(),
          zeilen: zuMigrieren.map((l) => ({
            id: l.id,
            email: l.email,
            altUtc: l.followUpAt!.toISOString(),
            neuUtc: reinterpretNaiveAsBerlin(l.followUpAt!).toISOString(),
            anzeige: naiveReading(l.followUpAt!),
          })),
          nichtMigriert: nichtNeutral.map((l) => ({
            id: l.id,
            email: l.email,
            altUtc: l.followUpAt!.toISOString(),
          })),
        },
        null,
        2
      )
    );
    console.log(`\nSicherung geschrieben nach ${sicherungsdatei}`);
  }

  if (!AUSFUEHREN) {
    console.log("\nTrockenlauf. Es wurde nichts geschrieben.");
    console.log("Regulaer laeuft die Migration mit dem Deployment (prisma migrate deploy).");
    return;
  }

  if (!sicherungsdatei) {
    console.error("\n--ausfuehren nur zusammen mit --sicherung=<datei>. Abbruch.");
    process.exit(1);
  }

  let geschrieben = 0;
  for (const l of zuMigrieren) {
    const alt = l.followUpAt!;
    const neu = reinterpretNaiveAsBerlin(alt);
    await prisma.$transaction([
      prisma.$executeRawUnsafe(
        `INSERT INTO "zeitzonen_migration_followup" ("lead_id","alt_wert","neu_wert")
         VALUES ($1::uuid, $2, $3) ON CONFLICT ("lead_id") DO NOTHING`,
        l.id,
        alt,
        neu
      ),
      prisma.lead.update({ where: { id: l.id }, data: { followUpAt: neu } }),
    ]);
    geschrieben++;
  }
  console.log(`\n${geschrieben} Leads migriert. Alte Werte stehen in zeitzonen_migration_followup.`);
  console.log(
    `Zuruecknehmen:\n  UPDATE "waitlist" w SET "followUpAt" = m.alt_wert\n` +
      `  FROM zeitzonen_migration_followup m WHERE w.id = m.lead_id;`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
