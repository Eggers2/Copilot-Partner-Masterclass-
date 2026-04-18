import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import {
  createBestellungFromLead,
  detectBestellungFromLead,
  BestellungCreateError,
  type Evidence,
  type Confidence,
} from "@/lib/db/bestellungen";

export const maxDuration = 60;

interface Row {
  leadId: string;
  email: string;
  name: string | null;
  status: "created" | "skipped" | "review" | "error";
  bestellNr?: string;
  paket?: string | null;
  zahlungsmodell?: string | null;
  confidence?: Confidence;
  placeholders?: string[];
  evidence?: Evidence[];
  message?: string;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const apply = !!(body as { apply?: boolean }).apply;

  const leads = await prisma.lead.findMany({
    where: { status: "WON" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true },
  });

  const rows: Row[] = [];

  for (const lead of leads) {
    if (apply) {
      try {
        const result = await createBestellungFromLead(lead.id);
        rows.push({
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          status: "created",
          bestellNr: result.bestellNr,
          paket: result.evidence.find((e) => e.paket)?.paket ?? null,
          zahlungsmodell:
            result.evidence.find((e) => e.zahlungsmodell)?.zahlungsmodell ?? null,
          confidence: result.confidence,
          placeholders: result.usedPlaceholders,
          evidence: result.evidence,
        });
      } catch (err) {
        if (err instanceof BestellungCreateError) {
          if (err.code === "ALREADY_EXISTS") {
            rows.push({
              leadId: lead.id,
              email: lead.email,
              name: lead.name,
              status: "skipped",
              message: err.message,
            });
          } else if (err.code === "NEEDS_REVIEW") {
            const d = err.details as
              | { paket?: string | null; zahlungsmodell?: string | null; confidence?: Confidence; evidence?: Evidence[] }
              | undefined;
            rows.push({
              leadId: lead.id,
              email: lead.email,
              name: lead.name,
              status: "review",
              paket: d?.paket ?? null,
              zahlungsmodell: d?.zahlungsmodell ?? null,
              confidence: d?.confidence,
              evidence: d?.evidence,
              message: err.message,
            });
          } else {
            rows.push({
              leadId: lead.id,
              email: lead.email,
              name: lead.name,
              status: "error",
              message: err.message,
            });
          }
        } else {
          rows.push({
            leadId: lead.id,
            email: lead.email,
            name: lead.name,
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else {
      try {
        const existing = await prisma.bestellung.findFirst({
          where: { email: lead.email.toLowerCase() },
          select: { bestellNr: true },
        });
        if (existing) {
          rows.push({
            leadId: lead.id,
            email: lead.email,
            name: lead.name,
            status: "skipped",
            message: `bereits vorhanden: ${existing.bestellNr}`,
          });
          continue;
        }
        const detection = await detectBestellungFromLead(lead.id);
        if (detection.confidence === "high" && detection.paket && detection.zahlungsmodell) {
          rows.push({
            leadId: lead.id,
            email: lead.email,
            name: lead.name,
            status: "created",
            paket: detection.paket,
            zahlungsmodell: detection.zahlungsmodell,
            confidence: detection.confidence,
            evidence: detection.evidence,
          });
        } else {
          rows.push({
            leadId: lead.id,
            email: lead.email,
            name: lead.name,
            status: "review",
            paket: detection.paket,
            zahlungsmodell: detection.zahlungsmodell,
            confidence: detection.confidence,
            evidence: detection.evidence,
            message: "Heuristik unsicher — manueller Review im Lead-Detail nötig",
          });
        }
      } catch (err) {
        rows.push({
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return NextResponse.json({
    apply,
    total: leads.length,
    created: rows.filter((r) => r.status === "created").length,
    skipped: rows.filter((r) => r.status === "skipped").length,
    review: rows.filter((r) => r.status === "review").length,
    errors: rows.filter((r) => r.status === "error").length,
    placeholders: rows.filter((r) => r.placeholders && r.placeholders.length > 0).length,
    rows,
  });
}
