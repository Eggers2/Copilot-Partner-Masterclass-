"use client";

import { getScoreTier } from "@/lib/constants/lead-config";

/** Zeigt ein farbiges Badge für den First-Call-Gesamtscore an */
export function FirstCallBadge({ totalScore }: { totalScore: number | null }) {
  const tier = getScoreTier(totalScore);
  if (!tier) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ color: tier.color, backgroundColor: tier.bg }}
    >
      {tier.emoji} {tier.label}
    </span>
  );
}
