import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, ChevronRight } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { listEmailTemplates } from "@/lib/db/emailTemplates";
import { isResendConfigured } from "@/lib/email/resend";

export default async function EmailTemplatesPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const templates = await listEmailTemplates();
  const resendConfigured = isResendConfigured();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">E-Mails</h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          HTML-Templates für transaktionale Mails. Aktive Templates versenden über Resend,
          inaktive laufen weiter über n8n.
        </p>
      </div>

      {!resendConfigured && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Resend ist noch nicht konfiguriert (RESEND_API_KEY / RESEND_FROM_EMAIL). Templates
          können bearbeitet werden; der Versand läuft bis dahin über n8n.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {templates.map((t) => (
          <Link
            key={t.key}
            href={`/admin/emails/${t.key}`}
            className="group flex items-center justify-between gap-4 bg-white rounded-2xl border border-dark-slate-100 p-5 shadow-sm hover:border-[#030386]/30 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#030386]/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[#030386]" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-dark-slate-900 truncate">{t.name}</p>
                <p className="text-xs text-dark-slate-400 truncate">{t.key}</p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-2 rounded-full text-xs font-semibold ${
                    t.aktiv
                      ? "bg-green-100 text-green-700"
                      : "bg-dark-slate-100 text-dark-slate-500"
                  }`}
                >
                  {t.aktiv ? "Resend aktiv" : "n8n (Fallback)"}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-dark-slate-300 group-hover:text-[#030386] transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
