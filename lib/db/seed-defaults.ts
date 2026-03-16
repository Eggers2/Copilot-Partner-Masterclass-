import { prisma } from "../prisma";

let seeded = false;

export async function ensureDefaults() {
  if (seeded) return;

  const colCount = await prisma.taskColumn.count();
  if (colCount > 0) {
    seeded = true;
    return;
  }

  // Create default columns
  await prisma.taskColumn.createMany({
    data: [
      { name: "Backlog", position: 1, color: "#DCDCEE" },
      { name: "Diese Woche", position: 2, color: "#E3ECF8" },
      { name: "In Arbeit", position: 3, color: "#030386" },
      { name: "Review / Warten", position: 4, color: "#05015B" },
      { name: "Erledigt ✅", position: 5, color: "#3B3B39" },
    ],
  });

  // Create default tags
  await prisma.taskTag.createMany({
    data: [
      { name: "Partnerschaften", color: "#030386", category: "workstream" },
      { name: "Plattform", color: "#05015B", category: "workstream" },
      { name: "Funnel", color: "#2D5F2D", category: "workstream" },
      { name: "Content", color: "#8B4513", category: "workstream" },
      { name: "Marketing", color: "#6B21A8", category: "workstream" },
      { name: "Sales Assets", color: "#B45309", category: "workstream" },
      { name: "Webinar", color: "#0369A1", category: "workstream" },
      { name: "Launch", color: "#DC2626", category: "workstream" },
      { name: "ADN Events", color: "#D97706", category: "workstream" },
      { name: "🔴 SOFORT", color: "#DC2626", category: "priority" },
      { name: "🟡 DIESE WOCHE", color: "#D97706", category: "priority" },
      { name: "🟢 GEPLANT", color: "#16A34A", category: "priority" },
      { name: "📅 EVENT", color: "#7C3AED", category: "priority" },
      { name: "💻 ALEX", color: "#030386", category: "responsible" },
      { name: "🎨 DU", color: "#6B21A8", category: "responsible" },
      { name: "🤝 BEIDE", color: "#D97706", category: "responsible" },
    ],
  });

  console.log("✅ Auto-seeded default columns and tags");
  seeded = true;
}
