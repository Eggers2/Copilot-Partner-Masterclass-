import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { getLead, getFirstCallScore } from "@/lib/db/leads";
import { LeadDetailPanel } from "@/components/admin/LeadDetailPanel";
import { FirstCallSection } from "@/components/admin/FirstCallSection";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { AddActivityForm } from "@/components/admin/AddActivityForm";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const { id } = await params;
  const [lead, firstCallScore] = await Promise.all([
    getLead(id),
    getFirstCallScore(id),
  ]);

  if (!lead) notFound();

  const serializedLead = {
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    followUpAt: lead.followUpAt?.toISOString() ?? null,
  };

  // First-Call-Score serialisieren (Datumswerte → ISO-Strings)
  const serializedFirstCallScore = firstCallScore
    ? {
        ...firstCallScore,
        calledAt: firstCallScore.calledAt.toISOString(),
        updatedAt: firstCallScore.updatedAt.toISOString(),
        followUpDate: firstCallScore.followUpDate?.toISOString() ?? null,
      }
    : null;

  const serializedActivities = lead.activities.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

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
          Lead-Details
        </h1>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <LeadDetailPanel lead={serializedLead} />
          <FirstCallSection leadId={lead.id} existingScore={serializedFirstCallScore} />
          <AddActivityForm leadId={lead.id} />
        </div>
        <div className="lg:col-span-2">
          <ActivityTimeline activities={serializedActivities} />
        </div>
      </div>
    </div>
  );
}
