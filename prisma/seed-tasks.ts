import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding kanban board data...");

  // Check if already seeded
  const existingColumns = await prisma.taskColumn.count();
  if (existingColumns > 0) {
    console.log("✅ Kanban data already exists, skipping seed.");
    return;
  }

  // 1. Create columns
  const columns = await Promise.all([
    prisma.taskColumn.create({ data: { name: "Backlog", position: 1, color: "#DCDCEE" } }),
    prisma.taskColumn.create({ data: { name: "Diese Woche", position: 2, color: "#E3ECF8" } }),
    prisma.taskColumn.create({ data: { name: "In Arbeit", position: 3, color: "#030386" } }),
    prisma.taskColumn.create({ data: { name: "Review / Warten", position: 4, color: "#05015B" } }),
    prisma.taskColumn.create({ data: { name: "Erledigt ✅", position: 5, color: "#3B3B39" } }),
  ]);

  const colMap: Record<string, number> = {};
  for (const c of columns) colMap[c.name] = c.id;

  console.log("✅ Columns created");

  // 2. Create tags
  const tagData = [
    // Workstream
    { name: "Partnerschaften", color: "#030386", category: "workstream" },
    { name: "Plattform", color: "#05015B", category: "workstream" },
    { name: "Funnel", color: "#2D5F2D", category: "workstream" },
    { name: "Content", color: "#8B4513", category: "workstream" },
    { name: "Marketing", color: "#6B21A8", category: "workstream" },
    { name: "Sales Assets", color: "#B45309", category: "workstream" },
    { name: "Webinar", color: "#0369A1", category: "workstream" },
    { name: "Launch", color: "#DC2626", category: "workstream" },
    { name: "ADN Events", color: "#D97706", category: "workstream" },
    // Priority
    { name: "🔴 SOFORT", color: "#DC2626", category: "priority" },
    { name: "🟡 DIESE WOCHE", color: "#D97706", category: "priority" },
    { name: "🟢 GEPLANT", color: "#16A34A", category: "priority" },
    { name: "📅 EVENT", color: "#7C3AED", category: "priority" },
    // Responsible
    { name: "💻 ALEX", color: "#030386", category: "responsible" },
    { name: "🎨 DU", color: "#6B21A8", category: "responsible" },
    { name: "🤝 BEIDE", color: "#D97706", category: "responsible" },
  ];

  const tags: Record<string, number> = {};
  for (const t of tagData) {
    const tag = await prisma.taskTag.create({ data: t });
    tags[t.name] = tag.id;
  }

  console.log("✅ Tags created");

  // 3. Create admin user
  const adminPassword = process.env.TASKS_ADMIN_PASSWORD || "changeme123";
  if (!process.env.TASKS_ADMIN_PASSWORD) {
    console.log(`⚠️  No TASKS_ADMIN_PASSWORD set. Using default: ${adminPassword}`);
  }
  const hash = await bcrypt.hash(adminPassword, 12);
  const adminUser = await prisma.taskUser.create({
    data: { username: "alex", passwordHash: hash, displayName: "Alex", role: "admin" },
  });
  console.log("✅ Admin user created (username: alex)");

  // 4. Seed tasks
  // Helper to determine column
  function getColumnId(status: string, priority: string): number {
    if (status === "erledigt") return colMap["Erledigt ✅"];
    if (priority === "SOFORT" || priority === "DIESE_WOCHE") return colMap["Diese Woche"];
    if (priority === "EVENT") return colMap["Backlog"];
    return colMap["Backlog"]; // GEPLANT
  }

  // Priority tag name mapping
  const prioTag: Record<string, string> = {
    SOFORT: "🔴 SOFORT",
    DIESE_WOCHE: "🟡 DIESE WOCHE",
    GEPLANT: "🟢 GEPLANT",
    EVENT: "📅 EVENT",
  };
  const respTag: Record<string, string> = {
    ALEX: "💻 ALEX",
    DU: "🎨 DU",
    BEIDE: "🤝 BEIDE",
  };

  interface TaskSeed {
    title: string;
    weekLabel: string;
    deadline?: string;
    responsible: string;
    priority: string;
    status: string;
    workstream: string;
  }

  const taskSeeds: TaskSeed[] = [
    // WOCHE 1
    { title: "ADN-Gespräch: Kooperationsmodell, Incentives, Co-Marketing, Rolle am 5.5. klären", weekLabel: "WOCHE 1 — 14.–20. März", deadline: "2026-03-17", responsible: "BEIDE", priority: "SOFORT", status: "offen", workstream: "Partnerschaften" },
    { title: "KI League / Ingo Lücker: Kooperationsmodell besprechen", weekLabel: "WOCHE 1 — 14.–20. März", deadline: "2026-03-17", responsible: "BEIDE", priority: "SOFORT", status: "offen", workstream: "Partnerschaften" },
    { title: "Ergebnisse dokumentieren, nächste Schritte definieren", weekLabel: "WOCHE 1 — 14.–20. März", deadline: "2026-03-18", responsible: "BEIDE", priority: "SOFORT", status: "offen", workstream: "Partnerschaften" },
    { title: "Plattform-Entscheidung: Ablefy als Kursbereich (entschieden)", weekLabel: "WOCHE 1 — 14.–20. März", deadline: "2026-03-20", responsible: "ALEX", priority: "SOFORT", status: "erledigt", workstream: "Plattform" },
    { title: "Ablefy: Produkt anlegen, Pricing konfigurieren", weekLabel: "WOCHE 1 — 14.–20. März", deadline: "2026-03-20", responsible: "ALEX", priority: "SOFORT", status: "offen", workstream: "Plattform" },
    { title: "Klick-Tipp/N8N: Warteliste-Tag, Willkommens-Automation, Sofort-Bonus PDF", weekLabel: "WOCHE 1 — 14.–20. März", deadline: "2026-03-20", responsible: "ALEX", priority: "SOFORT", status: "offen", workstream: "Funnel" },
    // WOCHE 2
    { title: "Webinar Skript finalisieren", weekLabel: "WOCHE 2 — 21.–27. März", responsible: "BEIDE", priority: "SOFORT", status: "erledigt", workstream: "Webinar" },
    { title: "Webinar aufnehmen & schneiden", weekLabel: "WOCHE 2 — 21.–27. März", deadline: "2026-03-26", responsible: "BEIDE", priority: "SOFORT", status: "offen", workstream: "Webinar" },
    { title: "Webinar-Registrierungsseite bauen + N8N Automation", weekLabel: "WOCHE 2 — 21.–27. März", deadline: "2026-03-27", responsible: "ALEX", priority: "DIESE_WOCHE", status: "offen", workstream: "Webinar" },
    { title: "One-Pager PDF: Nutzenversprechen, Module, Pricing, CTA", weekLabel: "WOCHE 2 — 21.–27. März", deadline: "2026-03-25", responsible: "DU", priority: "DIESE_WOCHE", status: "offen", workstream: "Sales Assets" },
    { title: "Pitch Deck (5–7 Slides)", weekLabel: "WOCHE 2 — 21.–27. März", deadline: "2026-03-27", responsible: "DU", priority: "DIESE_WOCHE", status: "offen", workstream: "Sales Assets" },
    { title: "E-Mail-Sequenz Warteliste in Klick-Tipp einrichten", weekLabel: "WOCHE 2 — 21.–27. März", responsible: "ALEX", priority: "SOFORT", status: "erledigt", workstream: "Funnel" },
    // WOCHE 3-4
    { title: "Curriculum finalisieren: Modulstruktur & Lektionsreihenfolge", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-03-31", responsible: "BEIDE", priority: "DIESE_WOCHE", status: "offen", workstream: "Content" },
    { title: "Modul 1: Drehbuch + Filming", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-04-04", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Content" },
    { title: "Modul 2 produzieren + schneiden", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-04-10", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Content" },
    { title: "Kursplattform (Ablefy) einrichten: Struktur, Branding", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-04-04", responsible: "ALEX", priority: "GEPLANT", status: "offen", workstream: "Plattform" },
    { title: "LinkedIn Content-Plan starten: 3×/Woche", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-03-31", responsible: "DU", priority: "DIESE_WOCHE", status: "offen", workstream: "Marketing" },
    { title: "YouTube Teaser: 'Warum Systemhäuser jetzt handeln müssen'", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-04-07", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Content" },
    { title: "Landingpage copilotberater.de überarbeiten", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-04-04", responsible: "ALEX", priority: "GEPLANT", status: "offen", workstream: "Funnel" },
    { title: "ADN: Co-Marketing-Assets liefern", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-04-04", responsible: "DU", priority: "GEPLANT", status: "offen", workstream: "Partnerschaften" },
    { title: "KI League: Gemeinsame Aktion definieren", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-04-04", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Partnerschaften" },
    { title: "Testimonials / Social Proof sammeln", weekLabel: "WOCHE 3–4 — 28. März – 10. April", deadline: "2026-04-07", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Marketing" },
    // WOCHE 5-6
    { title: "Early Bird starten: Mail an Warteliste + LinkedIn", weekLabel: "WOCHE 5–6 — 11.–24. April", deadline: "2026-04-14", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Launch" },
    { title: "Paid Ads: LinkedIn Ads A/B Test", weekLabel: "WOCHE 5–6 — 11.–24. April", deadline: "2026-04-16", responsible: "ALEX", priority: "GEPLANT", status: "offen", workstream: "Marketing" },
    { title: "ADN-Kanal: Mail an Systemhäuser", weekLabel: "WOCHE 5–6 — 11.–24. April", deadline: "2026-04-18", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Partnerschaften" },
    { title: "IAMCP / Channelpartner Outreach", weekLabel: "WOCHE 5–6 — 11.–24. April", deadline: "2026-04-18", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Partnerschaften" },
    { title: "Module 3 & 4 produzieren", weekLabel: "WOCHE 5–6 — 11.–24. April", deadline: "2026-04-24", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Content" },
    { title: "ADN on Air Vorbereitung", weekLabel: "WOCHE 5–6 — 11.–24. April", deadline: "2026-04-22", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "ADN Events" },
    { title: "ADN Transformation Day Materialien", weekLabel: "WOCHE 5–6 — 11.–24. April", deadline: "2026-04-22", responsible: "DU", priority: "GEPLANT", status: "offen", workstream: "ADN Events" },
    { title: "27.4. ADN ON AIR — Live Event", weekLabel: "WOCHE 5–6 — 11.–24. April", deadline: "2026-04-27", responsible: "BEIDE", priority: "EVENT", status: "offen", workstream: "ADN Events" },
    // WOCHE 7
    { title: "Standard-Preis aktivieren", weekLabel: "WOCHE 7 — 28. April – 4. Mai", deadline: "2026-04-28", responsible: "ALEX", priority: "GEPLANT", status: "offen", workstream: "Launch" },
    { title: "Persönliche Outreach: Top-Kontakte anrufen", weekLabel: "WOCHE 7 — 28. April – 4. Mai", deadline: "2026-04-30", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Sales Assets" },
    { title: "Module 5 & 6 produzieren", weekLabel: "WOCHE 7 — 28. April – 4. Mai", deadline: "2026-05-02", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Content" },
    { title: "Kursplattform: Finale Checks, Testdurchlauf", weekLabel: "WOCHE 7 — 28. April – 4. Mai", deadline: "2026-05-02", responsible: "ALEX", priority: "GEPLANT", status: "offen", workstream: "Plattform" },
    { title: "Transformation Day: Druck, QR, Handout final", weekLabel: "WOCHE 7 — 28. April – 4. Mai", deadline: "2026-05-02", responsible: "DU", priority: "GEPLANT", status: "offen", workstream: "ADN Events" },
    { title: "5.5. ADN TRANSFORMATION DAY — Live Event", weekLabel: "WOCHE 7 — 28. April – 4. Mai", deadline: "2026-05-05", responsible: "BEIDE", priority: "EVENT", status: "offen", workstream: "ADN Events" },
    // WOCHE 8
    { title: "LAUNCH: Kurs öffnen, Willkommens-Mail, Community starten", weekLabel: "WOCHE 8 — 5.–11. Mai", deadline: "2026-05-05", responsible: "ALEX", priority: "GEPLANT", status: "offen", workstream: "Launch" },
    { title: "Follow-up ADN Transformation Day Kontakte", weekLabel: "WOCHE 8 — 5.–11. Mai", deadline: "2026-05-07", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Partnerschaften" },
    { title: "Warteliste Final-Push: Letzte E-Mail + Retargeting", weekLabel: "WOCHE 8 — 5.–11. Mai", deadline: "2026-05-08", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Funnel" },
    { title: "Testimonials von ersten Teilnehmern sammeln", weekLabel: "WOCHE 8 — 5.–11. Mai", deadline: "2026-05-11", responsible: "BEIDE", priority: "GEPLANT", status: "offen", workstream: "Marketing" },
  ];

  // Track positions per column
  const colPositions: Record<number, number> = {};

  for (const seed of taskSeeds) {
    const columnId = getColumnId(seed.status, seed.priority);
    colPositions[columnId] = (colPositions[columnId] || 0) + 1;

    const taskTagIds: number[] = [];
    // Add workstream tag
    if (tags[seed.workstream]) taskTagIds.push(tags[seed.workstream]);
    // Add priority tag
    if (prioTag[seed.priority] && tags[prioTag[seed.priority]]) taskTagIds.push(tags[prioTag[seed.priority]]);
    // Add responsible tag
    if (respTag[seed.responsible] && tags[respTag[seed.responsible]]) taskTagIds.push(tags[respTag[seed.responsible]]);

    await prisma.task.create({
      data: {
        title: seed.title,
        columnId,
        position: colPositions[columnId],
        workstream: seed.workstream,
        responsible: seed.responsible,
        priority: seed.priority,
        deadline: seed.deadline ? new Date(seed.deadline) : undefined,
        weekLabel: seed.weekLabel,
        createdBy: adminUser.id,
        tags: {
          create: taskTagIds.map((tagId) => ({ tagId })),
        },
      },
    });
  }

  console.log(`✅ ${taskSeeds.length} tasks created`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
