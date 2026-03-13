import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getKpiStats, getLeads, getFollowUpTasks } from "@/lib/db/leads";
import { KpiCards } from "@/components/admin/KpiCards";
import { FunnelChart } from "@/components/admin/FunnelChart";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { FollowUpWidget } from "@/components/admin/FollowUpWidget";

export default async function AdminDashboard() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const [kpi, leads, followUps] = await Promise.all([
    getKpiStats(),
    getLeads(),
    getFollowUpTasks(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">Dashboard</h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Microsoft Copilot Partner Masterclass – Lead-Übersicht
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8">
        <KpiCards data={kpi} />
      </div>

      {/* Funnel + Follow-ups */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <FunnelChart byStatus={kpi.byStatus} />
        <FollowUpWidget leads={followUps} />
      </div>

      {/* Leads Table */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-dark-slate-900">
          Alle Leads
        </h2>
      </div>
      <LeadsTable
        leads={leads.map((l) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
