import Link from "next/link";
import { Users, TrendingUp, AlarmClock, Euro, PhoneOutgoing } from "lucide-react";

interface KpiData {
  conversionRate: number;
  won: number;
  activeFunnel: number;
  revenueTotal: number;
  revenueByKlasse: { name: string; revenue: number; won: number }[];
  overdueFollowUpCount: number;
  coldOutreachCostTotal: number;
  coldOutreachCount: number;
}

function formatEuro(cents: number) {
  return `${(cents / 100).toLocaleString("de-DE")} €`;
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
      title: "Überfällige Follow-ups",
      value: data.overdueFollowUpCount,
      subtitle: "Follow-ups mit altem Datum",
      icon: AlarmClock,
      iconBg: data.overdueFollowUpCount > 0 ? "bg-red-50" : "bg-amber-50",
      iconColor: data.overdueFollowUpCount > 0 ? "text-red-600" : "text-amber-600",
      href: "/admin/tasks?faellig=ueberfaellig",
    },
    {
      title: "Kaltakquise-Kosten",
      value: formatEuro(data.coldOutreachCostTotal),
      subtitle: `${data.coldOutreachCount} Leads aus Kaltakquise`,
      icon: PhoneOutgoing,
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
    },
  ];

  const cardClass =
    "bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm";

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const content = (
          <>
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
          </>
        );

        return card.href ? (
          <Link
            key={card.title}
            href={card.href}
            className={`${cardClass} block hover:border-[#030386]/30 transition-colors`}
          >
            {content}
          </Link>
        ) : (
          <div key={card.title} className={cardClass}>
            {content}
          </div>
        );
      })}

      {/* Umsatz mit Aufschlüsselung je Klasse */}
      <div
        className={`${cardClass} sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Euro className="w-5 h-5 text-purple-600" />
          </div>
        </div>
        <p className="text-3xl font-extrabold text-dark-slate-900">
          {formatEuro(data.revenueTotal)}
        </p>
        <p className="text-dark-slate-500 text-sm mt-1">
          {data.won} gewonnene Deals
        </p>

        {data.revenueByKlasse.length > 0 && (
          <ul className="mt-4 pt-4 border-t border-dark-slate-100 space-y-2">
            {data.revenueByKlasse.map((k) => (
              <li
                key={k.name}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-dark-slate-600 truncate">
                  {k.name}
                  <span className="text-dark-slate-400"> · {k.won}</span>
                </span>
                <span className="font-semibold text-dark-slate-900 whitespace-nowrap">
                  {formatEuro(k.revenue)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
