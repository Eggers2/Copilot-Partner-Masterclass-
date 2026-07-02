/**
 * Race-Test für die Connect-Day-Kapazität.
 *
 * Feuert 10 parallele Anmeldungen (je 1 Person, verschiedene Bestellungen)
 * gegen ein Event mit Kapazität 5 und prüft, dass NIE überbucht wird –
 * zusätzlich 3 parallele Anmeldungen derselben Bestellung (genau 1 Gewinner).
 *
 * Aufruf (gegen eine Test-DB, NICHT Production!):
 *   DATABASE_URL="postgresql://postgres@localhost:5433/masterclass_test" \
 *     npx tsx scripts/test-connect-day-race.ts
 *
 * Der Test legt seine Fixtures selbst an und räumt sie am Ende wieder ab.
 */
import { prisma } from "../lib/prisma";
import { registerForConnectDay, RegisterError } from "../lib/events/connectDay";

const KAPAZITAET = 5;
const PARALLEL = 10;

async function main() {
  console.log("→ Fixtures anlegen …");
  const klasse = await prisma.klasse.upsert({
    where: { slug: "klasse-1" },
    update: {},
    create: {
      name: "Klasse 1",
      slug: "klasse-1",
      kickoffDate: new Date("2026-05-22T09:00:00Z"),
      startDate: new Date("2026-06-01T00:00:00Z"),
      endDate: new Date("2027-05-31T23:59:59Z"),
      status: "OPEN",
    },
  });

  // Testkapazität setzen und Zähler nullen
  const event = await prisma.event.update({
    where: { slug: "connect-day-2026" },
    data: { capacity: KAPAZITAET, seatsTaken: 0, status: "OPEN" },
  });

  const bestellungen = await Promise.all(
    Array.from({ length: PARALLEL }, (_, i) =>
      prisma.bestellung.create({
        data: {
          // bestell_nr ist VARCHAR(20) – kurz halten
          bestellNr: `RACE-${Date.now() % 1_000_000_000}-${i}`,
          paket: "starter",
          userAnzahl: 1,
          zahlungsmodell: "einmalig",
          preisNetto: 0,
          mwstSatz: 19,
          mwstBetrag: 0,
          preisBrutto: 0,
          firma: `Race Firma ${i}`,
          strasse: "Teststr. 1",
          plz: "60311",
          ort: "Frankfurt",
          vorname: "Test",
          nachname: `Nutzer${i}`,
          email: `race-${i}@example.com`,
          klasseId: klasse.id,
          teilnehmer: {
            create: {
              position: 0,
              vorname: "Test",
              nachname: `Nutzer${i}`,
              email: `race-${i}@example.com`,
            },
          },
        },
        include: { teilnehmer: true },
      })
    )
  );

  console.log(
    `→ ${PARALLEL} parallele Anmeldungen gegen Kapazität ${KAPAZITAET} …`
  );
  const results = await Promise.allSettled(
    bestellungen.map((b) =>
      registerForConnectDay({
        sessionEmail: b.email,
        bestellungId: b.id,
        teilnehmerIds: [b.teilnehmer[0].id],
      })
    )
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const full = results.filter(
    (r) =>
      r.status === "rejected" &&
      r.reason instanceof RegisterError &&
      r.reason.code === "event_full"
  ).length;

  const eventNachher = await prisma.event.findUniqueOrThrow({
    where: { id: event.id },
  });
  const summe = await prisma.eventRegistration.aggregate({
    where: { eventId: event.id, status: "CONFIRMED" },
    _sum: { personen: true },
  });

  console.log(
    `   Erfolgreich: ${ok}, event_full: ${full}, seatsTaken: ${eventNachher.seatsTaken}, Summe personen: ${summe._sum.personen}`
  );

  let failed = false;
  if (eventNachher.seatsTaken > KAPAZITAET) {
    console.error("✗ ÜBERBUCHT: seatsTaken > capacity!");
    failed = true;
  }
  if (ok !== KAPAZITAET || full !== PARALLEL - KAPAZITAET) {
    console.error("✗ Unerwartete Gewinner-/Verlierer-Verteilung!");
    failed = true;
  }
  if ((summe._sum.personen ?? 0) !== eventNachher.seatsTaken) {
    console.error("✗ Zähler inkonsistent zur Summe der Anmeldungen!");
    failed = true;
  }

  console.log("→ 3 parallele Doppel-Submits derselben Bestellung …");
  await prisma.event.update({
    where: { id: event.id },
    data: { capacity: KAPAZITAET + 10 },
  });
  // Eine Bestellung wählen, die in Runde 1 NICHT zum Zug gekommen ist
  const registered = new Set(
    (
      await prisma.eventRegistration.findMany({
        where: { eventId: event.id, status: "CONFIRMED" },
        select: { bestellungId: true },
      })
    ).map((r) => r.bestellungId)
  );
  const doppelt = bestellungen.find((b) => !registered.has(b.id))!;
  const dupes = await Promise.allSettled(
    Array.from({ length: 3 }, () =>
      registerForConnectDay({
        sessionEmail: doppelt.email,
        bestellungId: doppelt.id,
        teilnehmerIds: [doppelt.teilnehmer[0].id],
      })
    )
  );
  const dupeOk = dupes.filter((r) => r.status === "fulfilled").length;
  console.log(`   Gewinner: ${dupeOk} (erwartet: 1)`);
  if (dupeOk !== 1) {
    console.error("✗ Doppelanmeldung nicht verhindert!");
    failed = true;
  }

  console.log("→ Fixtures abräumen …");
  await prisma.eventRegistration.deleteMany({
    where: { bestellung: { bestellNr: { startsWith: "RACE-" } } },
  });
  await prisma.bestellung.deleteMany({
    where: { bestellNr: { startsWith: "RACE-" } },
  });
  await prisma.event.update({
    where: { id: event.id },
    data: { capacity: 100, seatsTaken: 0 },
  });

  if (failed) {
    console.error("✗ Race-Test FEHLGESCHLAGEN");
    process.exit(1);
  }
  console.log("✓ Race-Test bestanden: keine Überbuchung, Zähler konsistent.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
