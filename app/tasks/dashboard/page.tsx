import { requireTasksAuth } from "@/lib/tasks-auth";
import { getTaskStats } from "@/lib/db/tasks";
import { prisma } from "@/lib/prisma";
import type { Task, TaskTagAssignment, TaskTag, TaskColumn } from "@prisma/client";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Users,
  Calendar,
} from "lucide-react";

export default async function DashboardPage() {
  await requireTasksAuth();
  const [stats, wonCount, waitlistCount] = await Promise.all([
    getTaskStats(),
    // Count leads with status WON = zahlende Partner
    prisma.lead.count({ where: { status: "WON" } }),
    // Count all leads except WON and LOST = active waitlist
    prisma.lead.count({ where: { status: { notIn: ["WON", "LOST"] } } }),
  ]);

  const percent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  // Countdown to launch
  const launchDate = new Date("2026-05-05");
  const now = new Date();
  const daysUntilLaunch = Math.ceil(
    (launchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Build week stats
  const weekStats = stats.byWeek.map((w: { weekLabel: string | null; _count: number }) => {
    const doneEntry = stats.byWeekDone.find(
      (d: { weekLabel: string | null; _count: number }) => d.weekLabel === w.weekLabel
    );
    return {
      label: w.weekLabel || "Ohne Woche",
      total: w._count,
      done: (doneEntry as { _count: number } | undefined)?._count || 0,
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-[#3B3B39] mb-6">
        Launch Dashboard
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          icon={Calendar}
          label="Tage bis Launch"
          value={daysUntilLaunch > 0 ? daysUntilLaunch.toString() : "LAUNCH!"}
          sublabel="05. Mai 2026"
          color="#030386"
        />
        <KPICard
          icon={CheckCircle2}
          label="Fortschritt"
          value={`${percent}%`}
          sublabel={`${stats.done} von ${stats.total} erledigt`}
          color="#16A34A"
        />
        <KPICard
          icon={Users}
          label="Zahlende Partner"
          value={wonCount.toString()}
          sublabel="Status: Gewonnen"
          color="#05015B"
        />
        <KPICard
          icon={Target}
          label="Warteliste"
          value={waitlistCount.toString()}
          sublabel="Aktive Leads"
          color="#D97706"
        />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-[#3B3B39] mb-4">
          Gesamtfortschritt
        </h2>
        <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#030386] to-[#05015B]"
            style={{ width: `${percent}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
            {stats.done} / {stats.total} Aufgaben ({percent}%)
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks per week */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#3B3B39] mb-4">
            Aufgaben pro Woche
          </h2>
          <div className="space-y-3">
            {weekStats.map((w) => (
              <div key={w.label}>
                <div className="flex justify-between text-sm text-[#3B3B39] mb-1">
                  <span className="font-medium truncate">{w.label}</span>
                  <span className="text-gray-500 ml-2">
                    {w.done}/{w.total}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#030386] rounded-full transition-all"
                    style={{
                      width: `${w.total > 0 ? (w.done / w.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming deadlines */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#3B3B39] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#D97706]" />
            Nächste Deadlines
          </h2>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
              <AlertTriangle className="w-4 h-4" />
              {stats.overdue} überfällige Aufgabe{stats.overdue > 1 ? "n" : ""}
            </div>
          )}
          <div className="space-y-3">
            {stats.upcoming.length === 0 && (
              <p className="text-gray-500 text-sm">
                Keine anstehenden Deadlines.
              </p>
            )}
            {stats.upcoming.map((task: Task & { tags: (TaskTagAssignment & { tag: TaskTag })[]; column: TaskColumn }) => {
              const dl = task.deadline
                ? new Date(task.deadline)
                : null;
              const daysLeft = dl
                ? Math.ceil(
                    (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  )
                : null;

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#3B3B39]">
                      {task.title}
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      {task.tags.map(({ tag }: { tag: TaskTag }) => (
                        <span
                          key={tag.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    {dl && (
                      <span
                        className={`text-sm font-medium ${
                          daysLeft !== null && daysLeft <= 3
                            ? "text-orange-500"
                            : "text-green-600"
                        }`}
                      >
                        {dl.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    )}
                    {daysLeft !== null && (
                      <p className="text-xs text-gray-500">
                        {daysLeft === 0
                          ? "Heute"
                          : daysLeft === 1
                          ? "Morgen"
                          : `in ${daysLeft} Tagen`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  sublabel: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-[#3B3B39]">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
    </div>
  );
}
