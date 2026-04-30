import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewLeadForm } from "./new-lead-form";

interface PageProps {
  searchParams?: Promise<{ source?: string }>;
}

export default async function NewLeadPage({ searchParams }: PageProps) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const params = (await searchParams) ?? {};
  const isAdn = params.source === "adn";

  const klassen = await prisma.klasse.findMany({
    orderBy: { kickoffDate: "asc" },
    select: { id: true, name: true, slug: true, status: true },
  });

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-dark-slate-500 hover:text-[#030386] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-dark-slate-900">
          Lead anlegen
        </h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          {isAdn
            ? "Neuer Lead aus dem ADN-Vertriebskanal."
            : "Manuell einen neuen Lead erfassen (z.B. von ADN, Empfehlung oder Telefonat)."}
        </p>
      </div>

      <NewLeadForm
        klassen={klassen}
        defaultAdnChannel={isAdn ? "ADN_50" : "NONE"}
        defaultSource={isAdn ? "REFERRAL" : "OTHER"}
      />
    </div>
  );
}
