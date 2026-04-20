import Link from "next/link";
import type { NewsletterStatus } from "@prisma/client";
import { Calendar, Mail } from "lucide-react";
import { NewsletterStatusBadge } from "./NewsletterStatusBadge";

interface NewsletterCardProps {
  id: string;
  ausgabeNr: number;
  kw: number;
  jahr: number;
  titel: string;
  status: NewsletterStatus;
  gesendetAm: Date | null;
  erstelltAm: Date;
}

export function NewsletterCard({
  id,
  ausgabeNr,
  kw,
  jahr,
  titel,
  status,
  gesendetAm,
  erstelltAm,
}: NewsletterCardProps) {
  const dateLabel = gesendetAm
    ? `Versandt am ${new Date(gesendetAm).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}`
    : `Erstellt am ${new Date(erstelltAm).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}`;

  return (
    <Link
      href={`/admin/newsletter/${id}`}
      className="block bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-dark-slate-400 font-semibold tracking-wide uppercase">
            Ausgabe #{ausgabeNr} · KW {kw}/{jahr}
          </div>
          <h3 className="text-lg font-semibold text-dark-slate-900 mt-1">
            {titel}
          </h3>
        </div>
        <NewsletterStatusBadge status={status} />
      </div>

      <div className="flex items-center gap-4 text-sm text-dark-slate-500">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {dateLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <Mail className="w-4 h-4" />
          Newsletter
        </span>
      </div>
    </Link>
  );
}
