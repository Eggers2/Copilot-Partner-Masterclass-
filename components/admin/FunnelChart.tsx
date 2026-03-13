"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  LEAD_STATUS_CONFIG,
  FUNNEL_STAGES,
} from "@/lib/constants/lead-config";

interface FunnelChartProps {
  byStatus: Record<string, number>;
}

export function FunnelChart({ byStatus }: FunnelChartProps) {
  const data = FUNNEL_STAGES.map((status) => ({
    name: LEAD_STATUS_CONFIG[status].label,
    value: byStatus[status] ?? 0,
    color: LEAD_STATUS_CONFIG[status].color,
  }));

  return (
    <div className="bg-white rounded-2xl border border-dark-slate-100 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-dark-slate-900 mb-4">
        Sales Funnel
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={100} fontSize={13} />
            <Tooltip
              formatter={(value) => [`${value} Leads`, "Anzahl"]}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
