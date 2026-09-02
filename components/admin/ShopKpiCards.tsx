import { ShoppingCart, Euro, AlertCircle, Package } from "lucide-react";
import { PACKAGES } from "@/lib/packages";

interface ShopKpiData {
  total: number;
  neu: number;
  bearbeitet: number;
  abgeschlossen: number;
  revenueNetto: number;
  byPaket: Record<string, number>;
}

export function ShopKpiCards({ data }: { data: ShopKpiData }) {
  const paketSummary =
    Object.entries(data.byPaket)
      .map(([name, count]) => {
        const label = PACKAGES[name as keyof typeof PACKAGES]?.label ?? name;
        return `${label}: ${count}`;
      })
      .join(", ") || "Keine";

  const cards = [
    {
      title: "Bestellungen gesamt",
      value: data.total,
      subtitle: `${data.abgeschlossen} abgeschlossen`,
      icon: ShoppingCart,
      iconBg: "bg-[#E3ECF8]",
      iconColor: "text-[#030386]",
    },
    {
      title: "Neue Bestellungen",
      value: data.neu,
      subtitle: "Unbearbeitet",
      icon: AlertCircle,
      iconBg: data.neu > 0 ? "bg-red-50" : "bg-green-50",
      iconColor: data.neu > 0 ? "text-red-600" : "text-green-600",
      highlight: data.neu > 0,
    },
    {
      title: "Umsatz Netto",
      value: `${data.revenueNetto.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      subtitle: `${data.bearbeitet} in Bearbeitung`,
      icon: Euro,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Pakete",
      value: data.total,
      subtitle: paketSummary,
      icon: Package,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`bg-white rounded-2xl border p-6 shadow-sm ${
            "highlight" in card && card.highlight
              ? "border-red-200 ring-2 ring-red-100"
              : "border-dark-slate-100"
          }`}
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
