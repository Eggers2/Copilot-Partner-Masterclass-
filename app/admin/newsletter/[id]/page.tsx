import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { getNewsletter, readContent } from "@/lib/db/newsletters";
import { renderNewsletterHtml } from "@/lib/newsletter/render";
import { getMasterclassRecipients } from "@/lib/newsletter/recipients";
import { NewsletterEditor } from "@/components/admin/NewsletterEditor";

export default async function NewsletterEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { id } = await params;
  const nl = await getNewsletter(id);
  if (!nl) notFound();

  const content = readContent(nl);
  const [dbRecipients] = await Promise.all([getMasterclassRecipients()]);

  const previewHtml = renderNewsletterHtml(content, {
    ausgabeNr: nl.ausgabeNr,
    kw: nl.kw,
    jahr: nl.jahr,
    titel: nl.titel,
    subtitle: nl.subtitle,
  });

  return (
    <div>
      <Link
        href="/admin/newsletter"
        className="inline-flex items-center gap-1.5 text-sm text-dark-slate-500 hover:text-dark-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zur Liste
      </Link>
      <NewsletterEditor
        id={nl.id}
        ausgabeNr={nl.ausgabeNr}
        kw={nl.kw}
        jahr={nl.jahr}
        status={nl.status}
        titel={nl.titel}
        subtitle={nl.subtitle ?? ""}
        zusatzMails={nl.zusatzMails ?? ""}
        content={content}
        dbRecipientCount={dbRecipients.length}
        fehlerText={nl.fehlerText}
        previewHtml={previewHtml}
      />
    </div>
  );
}
