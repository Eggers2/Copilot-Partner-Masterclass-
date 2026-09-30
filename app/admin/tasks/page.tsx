import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getFollowUpTasks, getKpiStats } from "@/lib/db/leads";
import { FollowUpList, type Faelligkeit } from "@/components/admin/FollowUpList";
import { FunnelChart } from "@/components/admin/FunnelChart";

const FAELLIGKEITEN: Faelligkeit[] = ["alle", "ueberfaellig", "heute", "woche", "spaeter"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<{ faellig?: string }>;
}) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const params = (await searchParams) ?? {};
  const initialFaelligkeit = FAELLIGKEITEN.find((f) => f === params.faellig) ?? "alle";

  const [followUps, kpi] = await Promise.all([getFollowUpTasks(), getKpiStats()]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">Follow-ups</h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Alle anstehenden Aufgaben und Erinnerungen
        </p>
      </div>

      <div className="mb-8">
        <FunnelChart byStatus={kpi.byStatus} />
      </div>

      <FollowUpList
        key={initialFaelligkeit}
        initialFaelligkeit={initialFaelligkeit}
        leads={followUps.map((l) => ({
          ...l,
          followUpAt: l.followUpAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
