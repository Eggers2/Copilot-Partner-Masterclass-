import { prisma } from "../lib/prisma";
import {
  createBestellungFromLead,
  detectBestellungFromLead,
  BestellungCreateError,
  type Evidence,
} from "../lib/db/bestellungen";

const APPLY = process.argv.includes("--apply");

interface Row {
  email: string;
  leadId: string;
  status: "created" | "skipped" | "review" | "error";
  bestellNr?: string;
  paket?: string;
  zahlungsmodell?: string;
  confidence?: string;
  placeholders?: string[];
  evidence?: Evidence[];
  message?: string;
}

function summarizeEvidence(ev: Evidence[]): string {
  if (ev.length === 0) return "(keine Hinweise gefunden)";
  return ev
    .map(
      (e) =>
        `  [${e.source}] ${e.createdAt.slice(0, 10)}: ` +
        `${e.paket ?? "–"}/${e.zahlungsmodell ?? "–"} — "${e.snippet}"`
    )
    .join("\n");
}

async function main() {
  console.log(`\n=== Lead → Bestellung Backfill ===`);
  console.log(`Modus: ${APPLY ? "APPLY (schreibend)" : "DRY-RUN (read-only)"}`);
  console.log();

  const leads = await prisma.lead.findMany({
    where: { status: "WON" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true },
  });

  console.log(`Gefundene WON-Leads: ${leads.length}\n`);

  const rows: Row[] = [];

  for (const lead of leads) {
    if (!APPLY) {
      try {
        const detection = await detectBestellungFromLead(lead.id);
        const existing = await prisma.bestellung.findFirst({
          where: { email: lead.email.toLowerCase() },
          select: { bestellNr: true },
        });
        if (existing) {
          rows.push({
            email: lead.email,
            leadId: lead.id,
            status: "skipped",
            message: `bereits vorhanden: ${existing.bestellNr}`,
          });
          continue;
        }
        if (detection.confidence === "high" && detection.paket && detection.zahlungsmodell) {
          rows.push({
            email: lead.email,
            leadId: lead.id,
            status: "created",
            paket: detection.paket,
            zahlungsmodell: detection.zahlungsmodell,
            confidence: detection.confidence,
            evidence: detection.evidence,
          });
        } else {
          rows.push({
            email: lead.email,
            leadId: lead.id,
            status: "review",
            paket: detection.paket ?? undefined,
            zahlungsmodell: detection.zahlungsmodell ?? undefined,
            confidence: detection.confidence,
            evidence: detection.evidence,
            message: "Heuristik unsicher → manueller Review im UI nötig",
          });
        }
      } catch (err) {
        rows.push({
          email: lead.email,
          leadId: lead.id,
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      try {
        const result = await createBestellungFromLead(lead.id);
        rows.push({
          email: lead.email,
          leadId: lead.id,
          status: "created",
          bestellNr: result.bestellNr,
          paket: result.evidence.find((e) => e.paket)?.paket ?? undefined,
          zahlungsmodell:
            result.evidence.find((e) => e.zahlungsmodell)?.zahlungsmodell ?? undefined,
          confidence: result.confidence,
          placeholders: result.usedPlaceholders,
          evidence: result.evidence,
        });
      } catch (err) {
        if (err instanceof BestellungCreateError) {
          if (err.code === "ALREADY_EXISTS") {
            rows.push({
              email: lead.email,
              leadId: lead.id,
              status: "skipped",
              message: err.message,
            });
          } else if (err.code === "NEEDS_REVIEW") {
            const details = err.details as { confidence?: string; evidence?: Evidence[] } | undefined;
            rows.push({
              email: lead.email,
              leadId: lead.id,
              status: "review",
              confidence: details?.confidence,
              evidence: details?.evidence,
              message: err.message,
            });
          } else {
            rows.push({
              email: lead.email,
              leadId: lead.id,
              status: "error",
              message: err.message,
            });
          }
        } else {
          rows.push({
            email: lead.email,
            leadId: lead.id,
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }

  const created = rows.filter((r) => r.status === "created");
  const skipped = rows.filter((r) => r.status === "skipped");
  const review = rows.filter((r) => r.status === "review");
  const errors = rows.filter((r) => r.status === "error");
  const withPlaceholders = created.filter((r) => r.placeholders && r.placeholders.length > 0);

  console.log(`\n─── ${APPLY ? "ERSTELLT" : "GEPLANT (würde erstellt)"} (${created.length}) ───`);
  for (const r of created) {
    const nr = r.bestellNr ?? "(dry-run)";
    console.log(
      `  ✓ ${r.email} → ${nr} | ${r.paket ?? "?"}/${r.zahlungsmodell ?? "?"}` +
        (r.placeholders?.length ? ` | Platzhalter: ${r.placeholders.join(", ")}` : "")
    );
  }

  console.log(`\n─── SKIP (bereits vorhanden) (${skipped.length}) ───`);
  for (const r of skipped) {
    console.log(`  ↻ ${r.email} — ${r.message}`);
  }

  console.log(`\n─── MANUELLE PRÜFUNG NÖTIG (${review.length}) ───`);
  for (const r of review) {
    console.log(
      `  🔍 ${r.email} (${r.confidence ?? "?"}) — Vorschlag: ${r.paket ?? "–"}/${r.zahlungsmodell ?? "–"}`
    );
    if (r.evidence) console.log(summarizeEvidence(r.evidence));
    console.log(`     → Admin-UI: /admin/leads/${r.leadId}`);
  }

  if (errors.length > 0) {
    console.log(`\n─── FEHLER (${errors.length}) ───`);
    for (const r of errors) {
      console.log(`  ✗ ${r.email}: ${r.message}`);
    }
  }

  console.log(`\n─── ZUSAMMENFASSUNG ───`);
  console.log(`  Gesamt WON-Leads:       ${leads.length}`);
  console.log(`  ✓ ${APPLY ? "Erstellt" : "Würde erstellt"}: ${created.length}`);
  console.log(`  ↻ Übersprungen:         ${skipped.length}`);
  console.log(`  🔍 Review nötig:         ${review.length}`);
  console.log(`  ✗ Fehler:                ${errors.length}`);
  console.log(`  ⚠ Mit Platzhaltern:     ${withPlaceholders.length}`);
  console.log();

  if (!APPLY) {
    console.log(`Dies war ein DRY-RUN. Mit --apply ausführen, um Änderungen zu schreiben:`);
    console.log(`  npm run migrate:leads-to-orders -- --apply\n`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});
