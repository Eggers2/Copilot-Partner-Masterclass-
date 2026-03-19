import { Users, TrendingUp, Clock, Euro } from "lucide-react";

interface KpiData {
  total: number;
  conversionRate: number;
  waitlistCount: number;
  followUpCount: number;
  won: number;
  activeFunnel: number;
  revenueTotal: number;
}

export function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    {
      title: "Aktive Leads",
      value: data.activeFunnel,
      subtitle: "Im Funnel",
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
      title: "Offene Aufgaben",
      value: data.followUpCount,
      subtitle: "Follow-up Einträge",
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Umsatz",
      value: `${(data.revenueTotal / 100).toLocaleString("de-DE")} €`,
      subtitle: `${data.won} gewonnene Deals`,
      icon: Euro,
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
