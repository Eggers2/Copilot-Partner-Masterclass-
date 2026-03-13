import type { LeadStatus, LeadSource } from "@prisma/client";

export const LEAD_TARGET = 20;
export const EARLY_BIRD_PRICE = 3490;

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; bg: string; order: number }
> = {
  NEW: { label: "Neu", color: "#030386", bg: "#E3ECF8", order: 0 },
  CONTACTED: { label: "Kontaktiert", color: "#05015B", bg: "#DCDCEE", order: 1 },
  QUALIFIED: { label: "Qualifiziert", color: "#0078D4", bg: "#dbeafe", order: 2 },
  PROPOSAL: { label: "Angebot", color: "#7c3aed", bg: "#ede9fe", order: 3 },
  WON: { label: "Gewonnen", color: "#16a34a", bg: "#dcfce7", order: 4 },
  LOST: { label: "Verloren", color: "#dc2626", bg: "#fef2f2", order: 5 },
};

export const LEAD_SOURCE_CONFIG: Record<LeadSource, { label: string }> = {
  WEBSITE: { label: "Website" },
  REFERRAL: { label: "Empfehlung" },
  LINKEDIN: { label: "LinkedIn" },
  WEBINAR: { label: "Webinar" },
  COLD_OUTREACH: { label: "Kaltakquise" },
  OTHER: { label: "Sonstiges" },
};

export const FUNNEL_STAGES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
];
