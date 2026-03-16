import { requireTasksAuth } from "@/lib/tasks-auth";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

const risks = [
  {
    risk: "ADN-Kooperation kommt nicht zustande",
    priority: "Hoch",
    mitigation: "Direkte Ansprache über LinkedIn, KI League, IAMCP",
  },
  {
    risk: "Kein Spezial-Angebot am Transformation Day möglich",
    priority: "Hoch",
    mitigation: "Standard-Early-Bird als Handout",
  },
  {
    risk: "Zu wenig Wartelisten-Leads bis 27.4.",
    priority: "Hoch",
    mitigation: "Paid Ads früher starten",
  },
  {
    risk: "Content-Produktion zu langsam",
    priority: "Mittel",
    mitigation: "Launch mit 3-4 Modulen",
  },
  {
    risk: "Microsoft Incentive Funding fällt weg",
    priority: "Mittel",
    mitigation: "ROI-Argumentation stärken",
  },
  {
    risk: "Webinar-Conversion zu niedrig",
    priority: "Mittel",
    mitigation: "A/B-Test, Reminder-Mails",
  },
  {
    risk: "Plattform-Probleme",
    priority: "Niedrig",
    mitigation: "Fallback-Plan",
  },
];

const prioIcon = {
  Hoch: ShieldAlert,
  Mittel: AlertTriangle,
  Niedrig: ShieldCheck,
};

const prioColor = {
  Hoch: {
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  Mittel: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
  },
  Niedrig: {
    bg: "bg-green-50",
    text: "text-green-700",
    badge: "bg-green-100 text-green-700",
  },
};

export default async function RisksPage() {
  await requireTasksAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-[#3B3B39] mb-2">
        Risiken & Gegenmaßnahmen
      </h1>
      <p className="text-gray-500 mb-6">
        Identifizierte Risiken für den Launch am 5. Mai 2026
      </p>

      <div className="space-y-4">
        {risks.map((r, i) => {
          const colors =
            prioColor[r.priority as keyof typeof prioColor] || prioColor.Niedrig;
          const Icon =
            prioIcon[r.priority as keyof typeof prioIcon] || ShieldCheck;

          return (
            <div
              key={i}
              className={`${colors.bg} rounded-xl border border-gray-200 p-5`}
            >
              <div className="flex items-start gap-4">
                <Icon className={`w-6 h-6 ${colors.text} mt-0.5 flex-shrink-0`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#3B3B39]">{r.risk}</h3>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}
                    >
                      {r.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-[#3B3B39]">
                      Gegenmaßnahme:{" "}
                    </span>
                    {r.mitigation}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
