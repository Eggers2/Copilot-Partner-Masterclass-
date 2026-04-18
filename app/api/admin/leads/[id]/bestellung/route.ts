import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { isPaketKey, isZahlungsmodell } from "@/lib/packages";
import {
  createBestellungFromLead,
  BestellungCreateError,
} from "@/lib/db/bestellungen";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Body." }, { status: 400 });
  }

  const { paket, zahlungsmodell } = (body ?? {}) as {
    paket?: unknown;
    zahlungsmodell?: unknown;
  };

  if (!isPaketKey(paket)) {
    return NextResponse.json({ error: "Ungültiges Paket." }, { status: 400 });
  }
  if (!isZahlungsmodell(zahlungsmodell)) {
    return NextResponse.json({ error: "Ungültiges Zahlungsmodell." }, { status: 400 });
  }

  try {
    const result = await createBestellungFromLead(id, { paket, zahlungsmodell });
    return NextResponse.json({
      bestellNr: result.bestellNr,
      usedPlaceholders: result.usedPlaceholders,
    });
  } catch (err) {
    if (err instanceof BestellungCreateError) {
      if (err.code === "ALREADY_EXISTS") {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      if (err.code === "LEAD_NOT_FOUND") {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Bestellung-from-Lead error:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Interner Fehler beim Anlegen der Bestellung: ${detail}` },
      { status: 500 }
    );
  }
}
