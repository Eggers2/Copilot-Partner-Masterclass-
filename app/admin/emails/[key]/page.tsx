import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getEmailTemplate } from "@/lib/db/emailTemplates";
import { sampleVarsFor } from "@/lib/email/renderTemplate";
import { isResendConfigured } from "@/lib/email/resend";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";

export default async function EmailTemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { key } = await params;
  const template = await getEmailTemplate(key);
  if (!template) notFound();

  return (
    <EmailTemplateEditor
      templateKey={template.key}
      initialName={template.name}
      initialBetreff={template.betreff}
      initialHtml={template.html}
      beschreibung={template.beschreibung}
      aktiv={template.aktiv}
      sampleVars={sampleVarsFor(template.key)}
      resendConfigured={isResendConfigured()}
    />
  );
}
