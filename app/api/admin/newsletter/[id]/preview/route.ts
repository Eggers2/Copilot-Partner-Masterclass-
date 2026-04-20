import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getNewsletter } from "@/lib/db/newsletters";
import { renderNewsletterHtml } from "@/lib/newsletter/render";
import type { NewsletterContent } from "@/lib/newsletter/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  }

  const { id } = await params;
  const nl = await getNewsletter(id);
  if (!nl) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const body = (await request.json()) as {
    content: NewsletterContent;
    titel?: string;
    subtitle?: string;
  };

  const html = renderNewsletterHtml(body.content, {
    ausgabeNr: nl.ausgabeNr,
    kw: nl.kw,
    jahr: nl.jahr,
    titel: body.titel ?? nl.titel,
    subtitle: body.subtitle ?? nl.subtitle,
  });

  return NextResponse.json({ html });
}
