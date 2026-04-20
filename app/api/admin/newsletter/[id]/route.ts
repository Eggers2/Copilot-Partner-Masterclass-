import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getNewsletter, readContent } from "@/lib/db/newsletters";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { id } = await params;
  const nl = await getNewsletter(id);
  if (!nl) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json({
    id: nl.id,
    status: nl.status,
    content: readContent(nl),
    fehlerText: nl.fehlerText,
    aktualisiertAm: nl.aktualisiertAm.toISOString(),
  });
}
