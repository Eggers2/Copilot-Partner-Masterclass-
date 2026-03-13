import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getFollowUpTasks } from "@/lib/db/leads";
import { FollowUpWidget } from "@/components/admin/FollowUpWidget";

export default async function TasksPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const followUps = await getFollowUpTasks();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-slate-900">Follow-ups</h1>
        <p className="text-dark-slate-500 text-sm mt-1">
          Alle anstehenden Aufgaben und Erinnerungen
        </p>
      </div>

      <FollowUpWidget leads={followUps} showAll />
    </div>
  );
}
