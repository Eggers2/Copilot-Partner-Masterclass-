import { Users, TrendingUp, Clock, Target } from "lucide-react";
import { LEAD_TARGET, EARLY_BIRD_PRICE } from "@/lib/constants/lead-config";

interface KpiData {
  total: number;
  conversionRate: number;
  followUpsDue: number;
  won: number;
}

export function KpiCards({ data }: { data: KpiData }) {
  const revenueEstimate = data.won * EARLY_BIRD_PRICE;
  const progressPercent = Math.min(
    Math.round((data.total / LEAD_TARGET) * 100),
    100
  );

  const cards = [
    {
      title: "Leads gesamt",
      value: data.total,
      subtitle: `${progressPercent}% vom Ziel (${LEAD_TARGET})`,
      icon: Users,
      iconBg: "bg-[#E3ECF8]",
      iconColor: "text-[#030386]",
    },
    {
      title: "Conversion Rate",
      value: `${data.conversionRate}%`,
      subtitle: `${data.won} gewonnen`,
      icon: TrendingUp,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Follow-ups fällig",
      value: data.followUpsDue,
      subtitle: "Offene Aufgaben",
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Umsatzpotenzial",
      value: `${(revenueEstimate / 100).toLocaleString("de-DE")} €`,
      subtitle: `${EARLY_BIRD_PRICE / 100} € × ${data.won} Kunden`,
      icon: Target,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}
            >
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-dark-slate-900">
            {card.value}
          </p>
          <p className="text-dark-slate-500 text-sm mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
